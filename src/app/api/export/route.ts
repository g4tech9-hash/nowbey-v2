import { desc, eq, or, and } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v); // real numbers, including negative longitudes, are safe as they are
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Cells starting with these characters can run as formulas when opened in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Admiral members download their own reports as a spreadsheet. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) {
    return new Response("Sign in to download your reports.", { status: 401 });
  }
  if (viewer.tier !== "admiral" && !viewer.isAdmin) {
    return new Response("Downloading reports is part of the Admiral plan.", { status: 403 });
  }

  const rows = await db
    .select()
    .from(incidents)
    .where(or(eq(incidents.userId, viewer.userId), and(eq(incidents.authorHandle, viewer.handle), eq(incidents.anonymous, false))))
    .orderBy(desc(incidents.createdAt));

  const head = ["Filed", "Headline", "Category", "Severity", "Status", "Street", "Island", "Latitude", "Longitude", "Confirmations", "Details"];
  const lines = [head.map(cell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.createdAt, r.title, r.category, r.severity, r.status, r.street, r.parish, r.lat, r.lng, r.confirmations, r.details]
        .map(cell)
        .join(","),
    );
  }
  return new Response("\ufeff" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nowbey-reports-${viewer.handle}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
