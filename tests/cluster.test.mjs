/**
 * Clustering keeps city-zoom pins readable: pins sharing a screen cell become
 * one count badge, street-zoom pins never merge, and the selected pin is
 * always rendered as itself. Hermetic — no map, no database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterPins } from "../src/lib/cluster.ts";

const pin = (id, lat, lng) => ({ id, lat, lng });

// Three reports on effectively the same Nassau corner, one far away in Freeport.
const corner = [pin("a", 25.0629, -77.3417), pin("b", 25.063, -77.3416), pin("c", 25.0628, -77.3418)];
const far = pin("d", 26.533, -78.6999);

test("pins on the same corner collapse to one group at city zoom", () => {
  const groups = clusterPins([...corner, far], 14);
  assert.equal(groups.length, 2);
  const cluster = groups.find((g) => g.pins.length === 3);
  assert.ok(cluster, "the three corner pins should be one cluster");
  assert.equal(groups.find((g) => g.pins.length === 1)?.pins[0].id, "d");
  // The badge sits at the group's mean, not on any one report.
  assert.ok(Math.abs(cluster.lat - 25.0629) < 0.001 && Math.abs(cluster.lng - -77.3417) < 0.001);
});

test("nothing is clustered at street zoom", () => {
  const groups = clusterPins([...corner, far], 17);
  assert.equal(groups.length, 4);
  assert.ok(groups.every((g) => g.pins.length === 1));
});

test("zooming in separates pins that shared a cell", () => {
  const spread = [pin("a", 25.0629, -77.3417), pin("b", 25.07, -77.335)];
  assert.equal(clusterPins(spread, 10).length, 1);
  assert.equal(clusterPins(spread, 17).length, 2);
});

test("the kept-apart pin is never swallowed by a cluster", () => {
  const groups = clusterPins(corner, 14, new Set(["b"]));
  const solo = groups.find((g) => g.pins.length === 1);
  assert.equal(solo?.pins[0].id, "b");
  assert.equal(groups.find((g) => g.pins.length === 2)?.pins.map((p) => p.id).join(","), "a,c");
});

test("empty and single inputs pass through", () => {
  assert.deepEqual(clusterPins([], 14), []);
  assert.equal(clusterPins([far], 3).length, 1);
});
