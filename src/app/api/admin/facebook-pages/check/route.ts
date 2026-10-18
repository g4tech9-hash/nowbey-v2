/*
 * "Check now" on /admin/wire: run the Facebook page ingest immediately and report what it saw.
 * This is how an admin verifies a bridge feed the moment they paste it: the response carries,
 * per page, how many posts were found, how many were new, and the converter's own note.
 *
 *   POST {}                → check every configured page
 *   POST { username }      → check one page
 */
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/staff";
import { readJson } from "@/lib/validate";
import { configuredFbPageList, runFacebookIngest } from "@/lib/facebook-ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;

  const body = await readJson(req);
  const only = String(body?.username ?? "").trim() || undefined;
  if (only) {
    // A one-page check must name a page that is actually followed (the default BPL page counts).
    const followed = await configuredFbPageList();
    if (!followed.some((p) => p.username === only)) {
      return NextResponse.json({ error: "That page is not on the list." }, { status: 404 });
    }
  }

  try {
    const stats = await runFacebookIngest({ ...(only ? { only } : {}), force: true });
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error(`[fb] manual check failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ ok: false, error: "The check could not run. Try again in a moment." }, { status: 500 });
  }
}
