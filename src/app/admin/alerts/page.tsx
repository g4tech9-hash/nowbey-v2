import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { BAHAMAS_CENTER } from "@/lib/geo";
import { AlertComposer } from "@/components/admin-alert-composer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Geofenced alerts" };

/**
 * Geospatial Notification module. Admin only — this page sends real emails and pushes.
 * Shows active incidents on the map and a form for a custom geofenced blast.
 */
export default async function AlertsAdmin() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const pins = await db
    .select({ id: incidents.id, lat: incidents.lat, lng: incidents.lng, title: incidents.title, status: incidents.status })
    .from(incidents)
    .where(eq(incidents.status, "active"))
    .orderBy(desc(incidents.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-secondary">
        A manual blast emails confirmed subscribers inside the circle (plus island-wide subscribers of that island) and
        pushes the island. Limited to 5 per hour, 5,000 recipients per blast, and every send is written to the activity log.
      </p>
      <AlertComposer incidents={pins} defaultLat={BAHAMAS_CENTER[0]} defaultLng={BAHAMAS_CENTER[1]} />
    </div>
  );
}
