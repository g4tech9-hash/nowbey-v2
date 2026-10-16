/**
 * Geospatial Notification -- send one alert to every device inside a circle.
 *
 * The public report flow pushes by island and category, which is right for a
 * report a member filed. This is the other case: "avoid Bay Street for the next
 * hour", which needs a centre point and a radius rather than a parish list.
 *
 * The map is the real NowBeyMap the public app uses, in its pick mode, loaded
 * through MapPanel so the low-data escape hatch and the skeleton come for free.
 * Placing the centre is a map click, not two number fields.
 *
 * The page itself only gates and fetches. The map and the form have to share
 * state -- a click on the map is what fills in the coordinates -- so both live
 * inside GeofenceConsole, which is one client component.
 */

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { GeofenceConsole } from "@/components/geofence-console";
import type { MapPin } from "@/components/map/NowBeyMap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Geofenced Alerts" };

/** Nassau: the busiest area on the island, so the map opens somewhere useful. */
const CENTER: [number, number] = [25.0629, -77.3417];

export default async function GeofencePage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();

  // Active incidents, so the composer's map can show what is already happening
  // where the admin is about to broadcast. Capped: this is context, not a feed.
  const active = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      status: incidents.status,
      severity: incidents.severity,
      category: incidents.category,
      lat: incidents.lat,
      lng: incidents.lng,
    })
    .from(incidents)
    .where(eq(incidents.status, "active"))
    .limit(200);

  return (
    <div className="mx-auto max-w-[1200px] py-6">
      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6e97a0]">Command</p>
        <h1 className="display mt-1 text-[26px] font-extrabold text-sand-100">Geofenced Alerts</h1>
        <p className="mt-1 max-w-[70ch] text-[13px] text-[#a9cdc9]">
          Click the map to place the centre, choose how wide the circle is, and write what people should do. Only devices inside
          the circle are notified — and each one hears it once, however many times you send.
        </p>
      </header>

      <GeofenceConsole
        center={CENTER}
        incidents={active.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category as MapPin["category"],
          status: i.status,
          severity: i.severity,
          lat: i.lat,
          lng: i.lng,
        }))}
      />
    </div>
  );
}
