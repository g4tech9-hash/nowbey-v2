/**
 * Pin clustering for the map.
 *
 * Nassau pins sit on top of each other at city zoom (a dozen reports can share
 * two streets), so rendering every pin at zoom 14 draws an unreadable stack of
 * overlapping circles — the fault in the 2026-10-16 screenshot. Pins are grouped
 * by the screen cell they fall in at the current zoom: a cell with one pin
 * renders that pin, a cell with more renders one count badge that zooms in.
 *
 * The maths is plain Web Mercator, the same projection Leaflet uses, so a cell
 * is a constant number of *screen* pixels at any latitude. Pure and dependency
 * free on purpose, so it can be unit tested without a map (tests/cluster.test.mjs).
 */

export type Clusterable = { id: string; lat: number; lng: number };

export type PinCluster<T extends Clusterable> = {
  /** "pin:<id>" for a single pin, "cluster:<cell>" for a group. */
  key: string;
  lat: number;
  lng: number;
  /** The pins in this cell, in input order. Length 1 means render the pin itself. */
  pins: T[];
};

/** Screen size of one cluster cell, in pixels. A pin is 30px, so ~56px keeps neighbours apart. */
export const CLUSTER_CELL_PX = 56;

/** At street zoom the user is reading individual kerbs; clustering would only hide pins. */
export const CLUSTER_MAX_ZOOM = 16;

function worldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Group `pins` into screen cells at `zoom`.
 *
 * `keepApart` pins (the selected one, typically) are never merged into a
 * cluster, so the pin the user just tapped in the list is always on the map
 * as itself. Input order is preserved inside and across groups, so rendering
 * stays stable between refreshes.
 */
export function clusterPins<T extends Clusterable>(
  pins: readonly T[],
  zoom: number,
  keepApart?: ReadonlySet<string> | null,
): PinCluster<T>[] {
  if (zoom > CLUSTER_MAX_ZOOM) return pins.map((p) => ({ key: `pin:${p.id}`, lat: p.lat, lng: p.lng, pins: [p] }));

  const cells = new Map<string, T[]>();
  const order: PinCluster<T>[] = [];
  for (const pin of pins) {
    if (keepApart?.has(pin.id)) {
      order.push({ key: `pin:${pin.id}`, lat: pin.lat, lng: pin.lng, pins: [pin] });
      continue;
    }
    const { x, y } = worldPixel(pin.lat, pin.lng, zoom);
    const cell = `${Math.floor(x / CLUSTER_CELL_PX)}:${Math.floor(y / CLUSTER_CELL_PX)}`;
    const group = cells.get(cell);
    if (group) {
      group.push(pin);
    } else {
      const fresh = [pin];
      cells.set(cell, fresh);
      order.push({ key: `cluster:${cell}`, lat: pin.lat, lng: pin.lng, pins: fresh });
    }
  }
  // A group's badge sits at the mean of its pins, not on the first pin, so it
  // does not appear to "be" a report that lives somewhere else.
  for (const group of order) {
    if (group.pins.length > 1) {
      group.lat = group.pins.reduce((s, p) => s + p.lat, 0) / group.pins.length;
      group.lng = group.pins.reduce((s, p) => s + p.lng, 0) / group.pins.length;
    }
  }
  return order;
}
