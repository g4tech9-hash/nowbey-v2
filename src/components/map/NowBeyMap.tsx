"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  CATEGORIES,
  LAYERS,
  type CategoryKey,
  type LayerKey,
  formatCoord,
  metersPerPixel,
  precisionLabel,
} from "@/lib/geo";
import { pulseCategoryMeta } from "@/ui/pulse/glyph";
import { clusterPins } from "@/lib/cluster";

/**
 * Leaflet draws markers as bare elements with no name, so a screen reader hears "button" with nothing to say.
 * Name each marker once it is on the map (the element does not exist before that).
 */
function nameMarker(label: string) {
  return {
    add: (e: { target: { getElement?: () => HTMLElement | undefined } }) => {
      e.target.getElement?.()?.setAttribute("aria-label", label);
    },
  };
}

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  category: CategoryKey;
  title: string;
  meta?: string;
  status?: string;
  href?: string;
  /** The words on the popup link. Defaults to "Open report". */
  hrefLabel?: string;
  live?: boolean;
  /** Overrides the category colour and label, for pins that are not reports. */
  color?: string;
  label?: string;
};

export type PickResult = {
  lat: number;
  lng: number;
  street?: string;
  address?: string;
  parish?: string;
  precisionM: number;
};

type Props = {
  /** Changing this re-frames the view on `fitPoints` (the page passes its filter here). The first value keeps the default view. */
  fitKey?: string;
  fitPoints?: [number, number][];
  pins?: MapPin[];
  mode?: "browse" | "pick";
  value?: { lat: number; lng: number } | null;
  onChange?: (p: PickResult) => void;
  center?: [number, number];
  zoom?: number;
  initialLayer?: LayerKey;
  className?: string;
  /**
   * A short map (the phone split view on /map, the pin preview on /report).
   * In compact the map keeps only what it needs to be readable at 130–260px tall:
   * no search box, no layer pills, no pegman/street-view buttons, no zoom readout.
   * Tiles, pins, popups, the scale bar and the required attribution stay.
   */
  compact?: boolean;
  focusId?: string | null;
  /** Change this to fly to the focused pin again (for example when its row is tapped twice). */
  focusNonce?: number;
  googleKey?: string;
};

const PIN_PX = 30;

function pinHtml(pin: MapPin, selected: boolean) {
  const isApprox = (pin as any).approximate === true;
  const c = pin.color ?? pulseCategoryMeta(pin.category).token;
  const raw = pin.label ?? CATEGORIES[pin.category]?.pin ?? "NT";
  const code = raw.length <= 2 ? raw.toUpperCase() : raw.split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase();
  const size = code.length > 1 ? 9.5 : 13;
  // Approximate island-level pins: hollow, larger radius, no 4-decimal coords in popup
  if (isApprox) {
    return `<div class="nb-pin nb-pin-approx ${pin.live ? "nb-pin-live" : ""}" style="border:3px solid ${c};background:transparent;color:${c};width:38px;height:38px;border-radius:999px;display:grid;place-items:center;${selected ? "outline:3px solid var(--accent);outline-offset:2px;" : ""}"><span style="font-size:${size}px;color:${c}">${code}</span></div>`;
  }
  return `<div class="nb-pin ${pin.live ? "nb-pin-live" : ""}" style="background:${c};color:${c};${
    selected ? "outline:3px solid var(--accent);outline-offset:2px;box-shadow:0 0 0 6px var(--accent-muted);" : ""
  }"><span style="font-size:${size}px">${code}</span></div>`;
}

function makeClusterIcon(count: number) {
  return L.divIcon({
    className: "",
    html: `<div class="nb-cluster"><span>${count}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function makePinIcon(pin: MapPin, selected: boolean) {
  return L.divIcon({
    className: "",
    html: pinHtml(pin, selected),
    iconSize: [PIN_PX, PIN_PX],
    iconAnchor: [PIN_PX / 2, PIN_PX / 2],
    popupAnchor: [0, -PIN_PX / 2],
  });
}

function makePickIcon(zoomed: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [46, 58],
    iconAnchor: [23, 54],
    html: `<svg width="46" height="58" viewBox="0 0 46 58" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 56C23 56 42 34.7 42 21.5C42 10.3 33.5 2 23 2S4 10.3 4 21.5C4 34.7 23 56 23 56Z" style="fill:var(--bg-overlay);stroke:var(--accent)" stroke-width="3"/>
      <circle cx="23" cy="21" r="8.5" style="fill:${zoomed ? "var(--accent)" : "var(--warning)"}"/>
      <circle cx="23" cy="21" r="3" style="fill:var(--bg-base)"/>
    </svg>`,
  });
}

// Leaflet swaps a marker's whole DOM node whenever it receives a new icon object, so icons are cached by what they
// look like instead of being rebuilt on every render. Only a handful of combinations exist, so the cache stays small.
const ICON_CACHE = new Map<string, L.DivIcon>();
function iconFor(pin: MapPin, selectedNow: boolean): L.DivIcon {
  const key = `${pin.category}|${pin.color ?? ""}|${pin.label ?? ""}|${pin.live ? 1 : 0}|${selectedNow ? 1 : 0}`;
  let icon = ICON_CACHE.get(key);
  if (!icon) {
    icon = makePinIcon(pin, selectedNow);
    ICON_CACHE.set(key, icon);
  }
  return icon;
}

const PICK_FAR = makePickIcon(false);
const PICK_NEAR = makePickIcon(true);

/** Bridges react-leaflet's map instance to the React state in this component. */
function Bridge({
  onMap,
  onClick,
  onTileError,
}: {
  onMap: (m: L.Map) => void;
  onClick: (e: L.LeafletMouseEvent) => void;
  onTileError: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    map.on("click", onClick);
    map.on("tileerror", onTileError);
    return () => {
      map.off("click", onClick);
      map.off("tileerror", onTileError);
    };
  }, [map, onMap, onClick, onTileError]);
  return null;
}

export default function NowBeyMap({
  fitKey,
  fitPoints,
  pins = [],
  mode = "browse",
  value,
  onChange,
  center = [25.0629, -77.3417],
  zoom = 13,
  initialLayer = "hybrid",
  className = "",
  compact = false,
  focusId,
  focusNonce = 0,
  googleKey,
}: Props) {
  const [layer, setLayer] = useState<LayerKey>(initialLayer);
  const [map, setMap] = useState<L.Map | null>(null);
  const [zoomNow, setZoomNow] = useState(zoom);
  const [centerPt, setCenterPt] = useState<[number, number]>(center);
  const [aim, setAim] = useState(false);
  const [selected, setSelected] = useState<string | null>(focusId ?? null);
  // When the page asks for a different pin to be focused, select it (adjusting state while rendering, not in an effect).
  const focusKey = `${focusId ?? ""}|${focusNonce}`;
  const [seenFocusKey, setSeenFocusKey] = useState(focusKey);
  if (focusKey !== seenFocusKey) {
    setSeenFocusKey(focusKey);
    if (focusId) setSelected(focusId);
  }
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(value ?? null);
  const [query, setQuery] = useState("");
  type Hit = { label: string; lat: number; lng: number; street?: string; address?: string; parish?: string };
  const [found, setFound] = useState<{ q: string; items: Hit[] } | null>(null);
  // The search box shows results only for what is typed right now. They are worked out from the last answer plus the
  // text, rather than copied into state, so old results never sit under new text.
  const wanted = query.trim();
  const searchable = wanted.length >= 3;
  const results: Hit[] = searchable && found?.q === wanted ? found.items : [];
  const searching = searchable && found?.q !== wanted;
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [streetView, setStreetView] = useState<{ lat: number; lng: number } | null>(null);
  const [svError, setSvError] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [pegman, setPegman] = useState<{ x: number; y: number; over: boolean } | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [step, setStep] = useState(1);
  const tileErrors = useRef(0);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastEmit = useRef(0);
  const pinsRef = useRef(pins);

  const emit = useCallback(
    (lat: number, lng: number, z: number) => {
      if (!onChange) return;
      const precisionM = Number((metersPerPixel(z, lat) * 6).toFixed(2));
      onChange({ lat, lng, precisionM });
    },
    [onChange],
  );

  /* Reverse geocode the pin so "Area" can be prefilled with a real street name. */
  const reverse = useCallback(
    async (lat: number, lng: number, z: number) => {
      setGeoNote("Matching this spot to the nearest street…");
      try {
        const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { cache: "no-store" });
        const data = await r.json();
        if (data?.error) throw new Error(data.error);
        setGeoNote(null);
        onChange?.({
          lat,
          lng,
          precisionM: Number((metersPerPixel(z, lat) * 6).toFixed(2)),
          street: data.street,
          address: data.address,
          parish: data.parish,
        });
      } catch {
        setGeoNote("Live geocoder unreachable — using local Bahamas place names.");
        try {
          const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}&fallback=1`, { cache: "no-store" });
          const data = await r.json();
          onChange?.({
            lat,
            lng,
            precisionM: Number((metersPerPixel(z, lat) * 6).toFixed(2)),
            street: data.street,
            address: data.address,
            parish: data.parish,
          });
        } catch {
          /* leave coordinates only */
        }
      }
    },
    [onChange],
  );

  const placePin = useCallback(
    (lat: number, lng: number, opts: { fly?: boolean; zoomTo?: number } = {}) => {
      const z = opts.zoomTo ?? map?.getZoom() ?? zoom;
      setPick({ lat, lng });
      if (opts.fly && map) map.flyTo([lat, lng], Math.max(z, 17), { duration: 0.6 });
      if (mode === "pick") void reverse(lat, lng, z);
      else emit(lat, lng, z);
    },
    [map, mode, reverse, emit, zoom],
  );

  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (!map) return;
      if (mode === "pick") placePin(e.latlng.lat, e.latlng.lng);
    },
    [map, mode, placePin],
  );

  const handleTileError = useCallback(() => {
    tileErrors.current += 1;
    if (tileErrors.current > 8 && layer !== "road") {
      setLayer("road");
      setFallbackNote(
        "Aerial tile server did not answer, so NowBey switched to the OpenStreetMap road layer. Pins and search still work.",
      );
    }
  }, [layer]);

  // The zoom and scale readout only needs to change when the map stops moving.
  useEffect(() => {
    if (!map) return;
    const sync = () => {
      const c = map.getCenter();
      setCenterPt([c.lat, c.lng]);
      setZoomNow(map.getZoom());
    };
    map.on("moveend zoomend", sync);
    return () => {
      map.off("moveend zoomend", sync);
    };
  }, [map]);

  // Aim mode: the crosshair is the pin. Follow the centre while the map moves, then look up the
  // street once it settles so "Area" is filled in for the spot you actually chose.
  useEffect(() => {
    if (!map || !aim || mode !== "pick") return;
    const follow = () => {
      const c = map.getCenter();
      setPick({ lat: c.lat, lng: c.lng });
      if (Date.now() - lastEmit.current > 120) {
        lastEmit.current = Date.now();
        emit(c.lat, c.lng, map.getZoom());
      }
    };
    const settle = () => {
      const c = map.getCenter();
      setPick({ lat: c.lat, lng: c.lng });
      void reverse(c.lat, c.lng, map.getZoom());
    };
    map.on("move", follow);
    map.on("moveend", settle);
    return () => {
      map.off("move", follow);
      map.off("moveend", settle);
    };
  }, [map, aim, mode, emit, reverse]);

  // Follow the position the page gives us, and clear the marker when the page clears it. Before this the yellow
  // pin stayed on the map after a report was published or cancelled.
  const valueKey = value ? `${value.lat},${value.lng}` : "";
  const [seenValueKey, setSeenValueKey] = useState(valueKey);
  if (valueKey !== seenValueKey) {
    setSeenValueKey(valueKey);
    setPick(value ?? null);
  }

  useEffect(() => {
    pinsRef.current = pins;
  });

  // Fly to the focused pin when it changes (or is tapped again), never just because the parent re-rendered.
  // Before this, placing a new pin while a report was selected threw the map back to the selected report.
  const focusPinExists = focusId ? pins.some((p) => p.id === focusId) : false;
  useEffect(() => {
    if (!focusId || !map || !focusPinExists) return;
    const pin = pinsRef.current.find((p) => p.id === focusId);
    if (!pin) return;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 17), { duration: 0.7 });
  }, [focusId, focusNonce, map, focusPinExists]);

  /* Debounced forward geocoding for the search box. */
  useEffect(() => {
    if (!searchable) return;
    let alive = true;
    const t = setTimeout(async () => {
      let items: Hit[] = [];
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(wanted)}`, { cache: "no-store" });
        const data = await r.json();
        items = data.results ?? [];
      } catch {
        items = [];
      }
      if (alive) setFound({ q: wanted, items });
    }, 320);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [wanted, searchable]);

  /* Pegman drag: pointer capture on the badge, drop anywhere on the map. */
  useEffect(() => {
    if (!pegman) return;
    const move = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const over =
        !!rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      setPegman({ x: e.clientX, y: e.clientY, over });
    };
    const up = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const map2 = map;
      if (rect && map2 && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const pt = map2.containerPointToLatLng(L.point(e.clientX - rect.left, e.clientY - rect.top));
        setSvError(false);
        setStreetView({ lat: pt.lat, lng: pt.lng });
        if (!map2.getBounds().contains(pt)) map2.panTo(pt, { animate: true });
      }
      setPegman(null);
      dragOrigin.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [pegman, map]);

  const openStreetView = useCallback(() => {
    const at = pick ?? (map ? { lat: map.getCenter().lat, lng: map.getCenter().lng } : null);
    if (!at) return;
    setSvError(false);
    setStreetView(at);
  }, [pick, map]);

  const nudge = useCallback(
    (metersNorth: number, metersEast: number) => {
      const at = pick ?? (map ? { lat: map.getCenter().lat, lng: map.getCenter().lng } : null);
      if (!at || !map) return;
      const dLat = metersNorth / 111320;
      const dLng = metersEast / (111320 * Math.cos((at.lat * Math.PI) / 180));
      const lat = at.lat + dLat;
      const lng = at.lng + dLng;
      setPick({ lat, lng });
      map.panTo([lat, lng], { animate: true, duration: 0.2 });
      if (mode === "pick") void reverse(lat, lng, map.getZoom());
      else emit(lat, lng, map.getZoom());
    },
    [pick, map, mode, reverse, emit],
  );

  // Finding a pin is easier when the map starts on the member's own spot. Asked once, only when they are placing a
  // pin with nothing chosen yet, and only if they say yes to the browser's location prompt.
  // Re-frame the view when the page's filter changes. The first run keeps the default view.
  const lastFit = useRef<string | null>(null);
  useEffect(() => {
    if (!map || fitKey === undefined) return;
    if (lastFit.current === null) {
      lastFit.current = fitKey;
      return;
    }
    if (lastFit.current === fitKey) return;
    lastFit.current = fitKey;
    if (!fitPoints || fitPoints.length === 0) return;
    if (fitPoints.length === 1) map.setView(fitPoints[0], Math.max(map.getZoom(), 15));
    else map.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 40], maxZoom: 16 });
  }, [map, fitKey, fitPoints]);

  // "Locate me": one position read, shown on the map and never stored.
  const [locating, setLocating] = useState<string | null>(null);
  function locateMe() {
    if (!map) return;
    if (!("geolocation" in navigator)) {
      setLocating("This device cannot share a location.");
      return;
    }
    setLocating("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], Math.max(map.getZoom(), 16), { duration: 0.8 });
        setLocating(null);
      },
      () => setLocating("Could not get your location. Check the browser's location permission."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const locatedOnce = useRef(false);
  useEffect(() => {
    if (!map || mode !== "pick" || value || locatedOnce.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    locatedOnce.current = true;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        // Only centre on a spot inside The Bahamas. Anywhere else, the map stays where it was.
        if (lat > 20.5 && lat < 27.5 && lng > -80.8 && lng < -72.5) map.setView([lat, lng], Math.max(map.getZoom(), 16));
      },
      () => {
        /* refused or unavailable: the map stays where it was */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [map, mode, value]);

  const mPerPx = useMemo(() => metersPerPixel(zoomNow, centerPt[0]), [zoomNow, centerPt]);
  const def = LAYERS[layer];

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border border-accent/20 bg-raised ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        maxZoom={20}
        zoomControl={false}
        attributionControl
        scrollWheelZoom
        doubleClickZoom
        className="h-full w-full"
      >
        <TileLayer
          key={def.url}
          url={def.url}
          subdomains={def.subdomains ?? "abc"}
          attribution={def.attribution}
          maxZoom={20}
          maxNativeZoom={def.maxZoom}
        />
        {def.overlay ? (
          <TileLayer
            key={def.overlay}
            url={def.overlay}
            attribution={def.overlayAttribution}
            maxZoom={20}
            maxNativeZoom={def.maxZoom}
            className="nb-halo"
            opacity={0.95}
          />
        ) : null}
        <Bridge onMap={setMap} onClick={handleMapClick} onTileError={handleTileError} />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" metric imperial />

        {showPins
          ? clusterPins(pins, zoomNow, selected ? new Set([selected]) : null).map((group) =>
              group.pins.length > 1 ? (
                <Marker
                  key={group.key}
                  position={[group.lat, group.lng]}
                  icon={makeClusterIcon(group.pins.length)}
                  zIndexOffset={400}
                  eventHandlers={{
                    click: () => map?.flyTo([group.lat, group.lng], Math.min(18, zoomNow + 2), { duration: 0.6 }),
                    ...nameMarker(`${group.pins.length} reports near here. Press to zoom in.`),
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold leading-snug">{group.pins.length} reports near here</p>
                      <p className="text-[12px] text-secondary">Tap the badge to zoom in and separate them.</p>
                    </div>
                  </Popup>
                </Marker>
              ) : (
                (() => {
                  const pin = group.pins[0];
                  return (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={iconFor(pin, selected === pin.id)}
                zIndexOffset={selected === pin.id ? 800 : 0}
                eventHandlers={{
                  click: () => setSelected(pin.id),
                  ...nameMarker(`${pin.label ?? CATEGORIES[pin.category]?.label ?? pin.category}: ${pin.title}`),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: pin.color ?? CATEGORIES[pin.category]?.color }}>
                      {pin.label ?? CATEGORIES[pin.category]?.label ?? pin.category}
                    </p>
                    <p className="font-semibold leading-snug">{pin.title}</p>
                    {pin.meta ? <p className="text-[12px] text-secondary">{pin.meta}</p> : null}
                    {(pin as any).approximate ? (
                      <p className="text-[11.5px] font-semibold text-amber-600">Island-level — approximate</p>
                    ) : (
                      <p className="text-[11.5px] text-tertiary">
                        {formatCoord(pin.lat, "lat")} · {formatCoord(pin.lng, "lng")}
                      </p>
                    )}
                    {pin.href ? (
                      <a className="mt-1 inline-block text-[12px] font-bold text-text-accent underline" href={pin.href}>
                        {pin.hrefLabel ?? "Open report"}
                      </a>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
                  );
                })()
              ),
            )
          : null}

        {pick ? (
          <Marker
            position={[pick.lat, pick.lng]}
            icon={zoomNow >= 17 ? PICK_NEAR : PICK_FAR}
            draggable={mode === "pick" && !aim}
            autoPan
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                setPick({ lat: ll.lat, lng: ll.lng });
                if (mode === "pick") void reverse(ll.lat, ll.lng, map?.getZoom() ?? zoomNow);
                else emit(ll.lat, ll.lng, map?.getZoom() ?? zoomNow);
              },
            }}
          />
        ) : null}
      </MapContainer>
      {mode === "browse" ? (
        <div className="absolute bottom-[96px] right-2.5 z-[500] flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={locateMe}
            disabled={!map}
            className="min-h-[40px] rounded-full bg-base/90 px-3 py-2 text-[12.5px] font-bold text-text-accent shadow-[0_8px_20px_rgba(0,0,0,.45)] hover:bg-base disabled:opacity-50"
          >
            Locate me
          </button>
          <p role="status" aria-live="polite" className="rounded bg-base/80 px-1.5 text-[11.5px] font-semibold text-primary">
            {locating ?? ""}
          </p>
        </div>
      ) : null}

      {/* crosshair for pin-to-center precision */}
      {aim ? (
        <div className="nb-crosshair">
          <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden>
            <circle cx="43" cy="43" r="20" fill="none" stroke="#2ee6d0" strokeWidth="1.6" strokeDasharray="4 5" />
            <path d="M43 4v20M43 62v20M4 43h20M62 43h20" stroke="#2ee6d0" strokeWidth="1.6" />
            <circle cx="43" cy="43" r="2.4" fill="#ffc531" />
          </svg>
        </div>
      ) : null}

      {/* top bar: search + layers. Stacked on narrow phones so nothing clips;
          side by side from sm up, with the pills scrolling instead of wrapping. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-1.5 p-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-2 sm:p-2.5">
        {mode === "pick" || compact ? null : (
          <div className="pointer-events-auto relative w-full sm:w-[min(320px,38vw)]">
            <div className="glass flex min-h-[42px] items-center gap-2 rounded-xl px-3 py-2 shadow-[0_14px_34px_rgba(0,0,0,.45)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#74f3e3" strokeWidth="2.4" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) {
                    placePin(results[0].lat, results[0].lng, { fly: true, zoomTo: 18 });
                    setQuery("");
                  }
                }}
                placeholder="Search street, dock, landmark…"
                aria-label="Search for a street or landmark"
                className="w-full bg-transparent text-[13px] text-primary outline-none placeholder:text-tertiary"
              />
              {searching ? <span className="text-[11.5px] text-text-accent">…</span> : null}
            </div>
            {results.length ? (
              <ul className="glass nb-scroll absolute mt-1.5 max-h-64 w-full overflow-auto rounded-xl py-1 text-left shadow-[0_20px_44px_rgba(0,0,0,.55)]">
                {results.map((r) => (
                  <li key={`${r.lat},${r.lng},${r.label}`}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-accent/15"
                      onClick={() => {
                        placePin(r.lat, r.lng, { fly: true, zoomTo: 18 });
                        setQuery("");
                      }}
                    >
                      <span className="block text-[13px] font-semibold">{r.label}</span>
                      <span className="block text-[11.5px] text-tertiary">
                        {formatCoord(r.lat, "lat")} · {formatCoord(r.lng, "lng")}
                        {r.parish ? ` · ${r.parish}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <div className={`nb-no-scrollbar pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 sm:ml-auto sm:max-w-[56%] ${compact ? "hidden" : ""}`}>
          <div className="glass flex shrink-0 rounded-xl p-1 text-[11.5px] font-bold">
            {(Object.keys(LAYERS) as LayerKey[]).map((key) => (
              <button
                key={key}
                type="button"
                title={LAYERS[key].hint}
                aria-pressed={layer === key}
                onClick={() => setLayer(key)}
                className={`min-h-[40px] rounded-lg px-2.5 py-1.5 transition ${
                  layer === key ? "bg-accent text-on-accent" : "text-secondary hover:bg-white/10"
                }`}
              >
                <span className="sm:hidden">{LAYERS[key].short}</span>
                <span className="hidden sm:inline">{LAYERS[key].label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowPins((v) => !v)}
            title={showPins ? "Hide other pins" : "Show other pins"}
            aria-pressed={showPins}
            className={`glass min-h-[40px] shrink-0 rounded-xl px-2.5 py-2 text-[11.5px] font-bold ${showPins ? "text-text-accent" : "text-tertiary"}`}
          >
            Pins
          </button>
        </div>
      </div>

      {/* bottom-left: pegman + street view + zoom readout. Lifted just enough to clear the
          scale bar. Hidden on a compact map: at 130–260px tall these would cover the pins. */}
      <div className={`absolute bottom-9 left-2.5 z-[500] flex-col items-start gap-2 ${compact ? "hidden" : "flex"}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              dragOrigin.current = { x: e.clientX, y: e.clientY };
              setPegman({ x: e.clientX, y: e.clientY, over: false });
            }}
            title="Drag me onto a road for street level"
            aria-label="Drag to street level view"
            className="glass grid h-11 w-11 cursor-grab touch-none place-items-center rounded-full active:cursor-grabbing"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="4.6" r="2.6" fill="#ffc531" />
              <path
                d="M12 8c-2.6 0-3.6 1.3-3.6 3.1V14H7v6h2.5v-5h5v5H17v-6h-1.4v-2.9C15.6 9.3 14.6 8 12 8Z"
                fill="#ffc531"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={openStreetView}
            className="glass rounded-full px-3 py-2 text-[12px] font-bold text-primary"
          >
            Street View
          </button>
        </div>

        <div className="glass hidden rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold text-secondary sm:block">
          zoom {zoomNow} · {precisionLabel(zoomNow, centerPt[0])} on screen · {mPerPx.toFixed(2)} m/px
        </div>
      </div>

      {/* Pick mode keeps this one control even on a compact map — it is how the pin tip
          lands on the right kerb, and on a phone there is no room for the full cluster. */}
      {mode === "pick" ? (
        <div className={`absolute left-2.5 z-[500] flex items-center gap-2 ${compact ? "bottom-8" : "bottom-9"}`}>
          <button
            type="button"
            onClick={() => {
              setAim((v) => !v);
              if (!aim && map) {
                const c = map.getCenter();
                const z = Math.max(map.getZoom(), 18);
                map.setView([c.lat, c.lng], z, { animate: true });
                placePin(c.lat, c.lng, { zoomTo: z });
              }
            }}
            className={`glass min-h-[40px] rounded-full px-3 py-2 text-[12px] font-bold ${
              aim ? "bg-warn-500 text-on-accent" : "text-primary"
            }`}
          >
            {aim ? "Aim locked" : "Aim at centre"}
          </button>
        </div>
      ) : null}

      {/* pin control deck. On phones it sits under the single-row pick header so the aim
          crosshair stays clear; on wider screens it docks bottom-right, left of the zoom control. */}
      {mode === "pick" ? (
        <div className={`absolute right-2.5 z-[500] w-[min(300px,84vw)] sm:bottom-2.5 sm:right-14 sm:top-auto ${compact ? "top-2.5" : "top-[68px]"}`}>
          <div className="nb-surface rounded-xl2 p-2.5 text-[12px] shadow-[0_18px_40px_rgba(0,0,0,.5)]">
            {pick ? (
              <>
                <p className="font-mono text-[11.5px] text-text-accent">
                  {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-secondary">
                  {geoNote ?? (aim ? "Nudge the map, not the pin — the crosshair is the pin." : "Drag the pin tip, or use the arrows.")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
                    {[
                      { g: "", dN: 0, dE: 0 },
                      { g: "\u2191", dN: 1, dE: 0 },
                      { g: "", dN: 0, dE: 0 },
                      { g: "\u2190", dN: 0, dE: -1 },
                      { g: "\u25c7", dN: 0, dE: 0 },
                      { g: "\u2192", dN: 0, dE: 1 },
                      { g: "", dN: 0, dE: 0 },
                      { g: "\u2193", dN: -1, dE: 0 },
                      { g: "", dN: 0, dE: 0 },
                    ].map((cell, i) =>
                      cell.g && cell.dN + cell.dE !== 0 ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => nudge(cell.dN * step, cell.dE * step)}
                          className="h-6 w-6 rounded-md bg-white/10 text-[11.5px] font-bold text-primary hover:bg-accent hover:text-on-accent"
                          title={`Move ${Math.abs(cell.dN * step)} m`}
                        >
                          {cell.g}
                        </button>
                      ) : (
                        <span key={i} className="grid h-6 w-6 place-items-center text-[9px] text-tertiary">
                          {cell.g || "\u00b7"}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-[11.5px] leading-tight text-tertiary">
                      Nudge the pin tip onto the kerb, gate or drain.
                    </p>
                    <div className="flex gap-1">
                      {[1, 5, 25].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStep(s)}
                          className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-bold ${
                            step === s ? "bg-accent text-on-accent" : "bg-white/10 text-secondary"
                          }`}
                        >
                          {s} m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!map) return;
                      map.setView([pick.lat, pick.lng], 19, { animate: true });
                    }}
                    className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11.5px] font-bold hover:bg-white/20"
                  >
                    Zoom to 19
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${pick.lat.toFixed(6)},${pick.lng.toFixed(6)}`);
                    }}
                    className="rounded-lg bg-white/10 px-2 py-1.5 text-[11.5px] font-bold hover:bg-white/20"
                  >
                    Copy
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-secondary">
                Tap the exact spot on the map, or search a street. Then drag the pin tip onto the kerb, gate or pothole.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {fallbackNote ? (
        <div className={`absolute inset-x-2.5 z-[500] ${compact ? "bottom-2.5" : "top-[118px] sm:top-[64px]"}`}>
          <p className="glass flex items-start gap-2 rounded-lg border-l-[3px] border-warn-500 px-3 py-2 text-[11.5px] text-primary">
            <span className="flex-1">{fallbackNote}</span>
            <button
              type="button"
              onClick={() => setFallbackNote(null)}
              aria-label="Dismiss"
              className="min-h-[32px] min-w-[32px] rounded-md text-[13px] font-bold text-tertiary hover:bg-white/10"
            >
              ✕
            </button>
          </p>
        </div>
      ) : null}

      {pegman ? (
        <div
          className="pointer-events-none fixed z-[900] -translate-x-1/2 -translate-y-1/2"
          style={{ left: pegman.x, top: pegman.y }}
        >
          <div className={`grid h-10 w-10 place-items-center rounded-full ${pegman.over ? "bg-accent" : "bg-warn-500"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="4.6" r="2.6" fill="#03121b" />
              <path d="M12 8c-2.6 0-3.6 1.3-3.6 3.1V14H7v6h2.5v-5h5v5H17v-6h-1.4v-2.9C15.6 9.3 14.6 8 12 8Z" fill="#03121b" />
            </svg>
          </div>
          {pegman.over ? <p className="mt-1 rounded bg-base/85 px-2 py-0.5 text-[11.5px] font-bold">Drop for street level</p> : null}
        </div>
      ) : null}

      {streetView ? (
        <div className="absolute inset-0 z-[600] flex flex-col bg-base/92 p-2.5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="display text-[15px] font-bold">Street level</p>
              <p className="text-[11.5px] text-tertiary">
                {formatCoord(streetView.lat, "lat")} · {formatCoord(streetView.lng, "lng")}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  placePin(streetView.lat, streetView.lng, { zoomTo: 19 });
                  map?.flyTo([streetView.lat, streetView.lng], 19, { duration: 0.5 });
                  setStreetView(null);
                }}
                className="rounded-lg bg-accent px-2.5 py-1.5 text-[11.5px] font-bold text-on-accent"
              >
                Pin here
              </button>
              <button
                type="button"
                onClick={() => setStreetView(null)}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
          <div className="relative mt-2 flex-1 overflow-hidden rounded-xl border border-accent/25 bg-raised">
            {googleKey && !svError ? (
              // eslint-disable-next-line @next/next/no-img-element -- an external Google Street View photo, not a local asset
              <img
                src={`https://maps.googleapis.com/maps/api/streetview?size=800x480&location=${streetView.lat},${streetView.lng}&fov=85&heading=0&pitch=0&key=${googleKey}`}
                alt="Street level photo at the pin"
                className="h-full w-full object-cover"
                onError={() => setSvError(true)}
              />
            ) : (
              <div className="grid h-full place-items-center p-5 text-center">
                <div className="max-w-[420px] space-y-2">
                  <p className="display text-[15px] font-bold text-warn-600">
                    {googleKey ? "No Street View photos at this exact spot" : "Street level opens in Google Maps"}
                  </p>
                  <p className="text-[12.5px] text-secondary">
                    {googleKey
                      ? "Coverage in The Bahamas is strongest around Nassau, Paradise Island and Freeport. Zoom the satellite layer for the closest thing to a photo."
                      : "Street photos are not built into NowBey yet. Open this exact spot in Google Maps to look around at street level."}
                  </p>
                  <a
                    className="inline-block rounded-lg bg-accent px-3 py-2 text-[12.5px] font-bold text-on-accent"
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetView.lat},${streetView.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open street level in Google Maps
                  </a>
                  <p className="text-[11.5px] text-tertiary">
                    This opens Google Maps in a new tab.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
