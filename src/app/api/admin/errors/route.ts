import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors } from "@/db/schema";
import { audit } from "@/lib/audit";
import { analyzeErrorGroup, analyzePendingErrorGroups, approveAndCreateIssue, dismissAnalysis } from "@/lib/error-ai";
import { requireStaff } from "@/lib/staff";
import { dbInt, readJson } from "@/lib/validate";

/**
 * The human gate of the AI log pipeline (Admin → Logs). Admins only.
 * POST actions:
 * - "analyze"        Gemini diagnosis for one group (or "analyze-all" for the queued batch)
 * - "approve"        Approve the proposal → create the GitHub issue an implementer picks up
 * - "dismiss-analysis" Reject the proposal (the crash group itself stays on record)
 */
export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";
  const body = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "analyze-all") {
    const stats = await analyzePendingErrorGroups(10);
    await audit(actor, "errors.analyze-all", "error", null, "ran AI log analysis", `${stats.analyzed} diagnosed, ${stats.unavailable} unavailable`);
    return NextResponse.json({ ok: true, stats });
  }

  const id = dbInt(body.id);
  if (id === null) return NextResponse.json({ error: "Unknown record." }, { status: 400 });

  if (action === "analyze") {
    const row = await analyzeErrorGroup(id);
    if (!row) return NextResponse.json({ error: "Could not analyze that group. Check GEMINI_API_KEY, then try again." }, { status: 502 });
    await audit(actor, "errors.analyze", "error", String(id), row.summary.slice(0, 160), `status ${row.status}, severity ${row.severity}`);
    return NextResponse.json({ ok: true, status: row.status, severity: row.severity, summary: row.summary });
  }

  if (action === "approve") {
    const result = await approveAndCreateIssue(id, actor);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    await audit(
      actor,
      "errors.approve",
      "error",
      String(id),
      `GitHub issue #${result.issueNumber}`,
      result.alreadyExisted ? "issue already existed" : result.issueUrl,
    );
    return NextResponse.json({ ok: true, issueUrl: result.issueUrl, issueNumber: result.issueNumber, alreadyExisted: Boolean(result.alreadyExisted) });
  }

  if (action === "dismiss-analysis") {
    const done = await dismissAnalysis(id, actor);
    if (done) await audit(actor, "errors.dismiss-analysis", "error", String(id), "rejected the AI proposal");
    return NextResponse.json({ ok: done });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/** Clear crash groups from the admin overview once they are fixed or understood. Admins only. */
export async function DELETE(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";
  const body = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;

  if (body.all === true) {
    await db.delete(clientErrors);
    await audit(actor, "errors.clear", "error", null, "cleared all crash records");
    return NextResponse.json({ ok: true });
  }
  const id = dbInt(body.id);
  if (id === null) return NextResponse.json({ error: "Unknown record." }, { status: 400 });
  const done = await db.delete(clientErrors).where(eq(clientErrors.id, id)).returning({ id: clientErrors.id });
  if (done.length) await audit(actor, "errors.delete", "error", String(id), "dismissed a crash group");
  return NextResponse.json({ ok: done.length > 0 });
}
