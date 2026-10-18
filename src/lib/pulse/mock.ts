import type { IncidentRow } from "@/components/incident-card";

/**
 * PULSE MOCKS
 * ---------------------------------------------------------------------------
 * Flows the design system specifies that the API does not serve yet (a saved /
 * watch list, related signals beside a report) are built against these fixtures
 * so the redesign is testable end-to-end on a checkout with no database — which
 * is how a reviewer sees the empty, loading and populated states side by side.
 *
 * The rows are typed as `IncidentRow`, i.e. exactly the shape
 * GET /api/incidents returns, so nothing here has to change when a real
 * endpoint replaces it. `withMocks()` is only consulted when the database is
 * absent (see hasDatabase() in src/db).
 */

const HOUR = 3_600_000;

function at(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * HOUR).toISOString();
}

function row(partial: Partial<IncidentRow> & Pick<IncidentRow, "id" | "title" | "category">): IncidentRow {
  return {
    details: null,
    severity: 2,
    lat: 25.0629,
    lng: -77.3417,
    accuracyMeters: 45,
    address: null,
    street: null,
    parish: "New Providence",
    status: "active",
    confirmations: 3,
    sightings: 1,
    sourceKind: "resident",
    sourceName: null,
    sourceUrl: null,
    photoNote: null,
    authorHandle: "nassau_local",
    createdAt: at(1),
    updatedAt: at(0.4),
    ...partial,
  };
}

export const MOCK_INCIDENTS: IncidentRow[] = [
  row({
    id: "mock-critical-1",
    title: "Mary's Walk flooded to knee height, cars stopping",
    details:
      "Water is across both lanes from the bus shelter to the corner. Two taxis have turned back. If the rain keeps up the whole stretch under the bridge will be impassable.",
    category: "flood",
    severity: 4,
    street: "Mary's Walk",
    address: "Near the underbridge, Nassau",
    lat: 25.0551,
    lng: -77.3512,
    accuracyMeters: 28,
    confirmations: 14,
    sightings: 6,
    photoNote: "Two neighbours attached a photo of the water line.",
    createdAt: at(0.7),
    updatedAt: at(0.1),
  }),
  row({
    id: "mock-power-1",
    title: "Outage across Village Road — lines down at the junction",
    details: "Power has been off since the squall. A pole is leaning over the junction; the area is taped off.",
    category: "power",
    severity: 3,
    street: "Village Road",
    confirmations: 9,
    sightings: 4,
    createdAt: at(2.2),
    updatedAt: at(0.6),
  }),
  row({
    id: "mock-road-1",
    title: "Sinkhole opening on West Bay Street near the fuel terminal",
    details: "About a metre across and getting wider. One lane is closed by a contractor's cone, no signage yet.",
    category: "road",
    severity: 3,
    street: "West Bay Street",
    confirmations: 5,
    sightings: 2,
    createdAt: at(5),
    updatedAt: at(3.5),
  }),
  row({
    id: "mock-water-1",
    title: "No water on Pink Road since 4am",
    details: "Three houses affected. The main was dug up last week in the same place.",
    category: "water",
    severity: 2,
    street: "Pink Road",
    confirmations: 7,
    sightings: 0,
    createdAt: at(7),
    updatedAt: at(2),
  }),
  row({
    id: "mock-marine-1",
    title: "Debris field off Horton Road — containers adrift",
    details: "Two floating containers about 300 m off the shore road, drifting north with the current. Small craft should keep clear.",
    category: "marine",
    severity: 3,
    street: "Horton Road offshore",
    confirmations: 4,
    sightings: 1,
    sourceKind: "official",
    sourceName: "Bahamas Trade Winds bulletin",
    createdAt: at(9),
    updatedAt: at(4),
  }),
  row({
    id: "mock-safety-1",
    title: "Break-ins on Malcolm Box Road, second one this week",
    details: "Back windows forced on two houses after dark. Nothing taken from the second.",
    category: "crime",
    severity: 3,
    street: "Malcolm Box Road",
    confirmations: 6,
    sightings: 3,
    createdAt: at(14),
    updatedAt: at(11),
  }),
  row({
    id: "mock-health-1",
    title: "Need a ride to the clinic for an elderly neighbour",
    details: "Stranded since the road flooded. Any spare seat this afternoon would do.",
    category: "health",
    severity: 2,
    street: "Montagu Foreshore",
    confirmations: 2,
    sightings: 0,
    createdAt: at(20),
    updatedAt: at(18),
  }),
  row({
    id: "mock-sanitation-1",
    title: "Missed pickup on Sherbourne Street, third week running",
    details: "Bins are still on the kerb and the smell is drawing rats near the school.",
    category: "trash",
    severity: 1,
    street: "Sherbourne Street",
    confirmations: 11,
    sightings: 2,
    status: "active",
    createdAt: at(30),
    updatedAt: at(26),
  }),
  row({
    id: "mock-resolved-1",
    title: "Traffic light out on Bay Street at Carmichael — fixed",
    details: "Utility crew repainted the timing box and the light is back.",
    category: "road",
    severity: 2,
    street: "Bay Street & Carmichael Rd",
    confirmations: 8,
    sightings: 1,
    status: "resolved",
    resolvedAt: at(1.2),
    createdAt: at(26),
    updatedAt: at(1.2),
  }),
];

export const MOCK_TICKER = [
  { id: "t1", label: "Mary's Walk flooded — 14 confirmations", tone: "var(--cat-flooding)", href: "/incident/mock-critical-1", meta: "8 min ago" },
  { id: "t2", label: "Village Road outage continues", tone: "var(--cat-power)", href: "/incident/mock-power-1", meta: "36 min ago" },
  { id: "t3", label: "Sinkhole reported on West Bay St", tone: "var(--cat-road)", href: "/incident/mock-road-1", meta: "2 h ago" },
  { id: "t4", label: "Containers adrift off Horton Road", tone: "var(--cat-marine)", href: "/incident/mock-marine-1", meta: "4 h ago" },
];

/** The drawer's "related signals" block, until an endpoint provides them. */
export function relatedTo(current: IncidentRow, pool: IncidentRow[] = MOCK_INCIDENTS, limit = 3): IncidentRow[] {
  return pool
    .filter((r) => r.id !== current.id)
    .map((r) => ({
      r,
      score:
        (r.category === current.category ? 2 : 0) +
        (r.parish === current.parish ? 1 : 0) +
        (Math.abs(r.lat - current.lat) + Math.abs(r.lng - current.lng) < 0.02 ? 2 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}

/** Verification timeline for the drawer, built from the fields the row has. */
export function timelineFor(row: IncidentRow): { at: string; kind: string; note: string }[] {
  const stamp = (v: string | Date) => (v instanceof Date ? v.toISOString() : String(v));
  const out = [{ at: stamp(row.createdAt), kind: "Reported", note: `Filed by @${row.authorHandle ?? "someone"} on ${row.street ?? row.parish ?? "The Bahamas"}` }];
  if (row.sightings > 0) out.push({ at: stamp(row.updatedAt), kind: "Seen too", note: `${row.sightings} neighbour${row.sightings === 1 ? "" : "s"} saw it too` });
  if (row.confirmations > 0) out.push({ at: stamp(row.updatedAt), kind: "Confirmed", note: `${row.confirmations} confirmed it is still there` });
  if (row.status === "resolved") out.push({ at: stamp(row.resolvedAt ?? row.updatedAt), kind: "Cleared", note: "Marked cleared by the community" });
  return out;
}
