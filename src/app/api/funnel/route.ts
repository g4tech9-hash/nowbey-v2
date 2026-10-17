import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { funnelDaily } from "@/db/schema";
import { isFunnelStep } from "@/lib/funnel";
import { clientIp, sharedHit, tooMany } from "@/lib/ratelimit";
import { readJson } from "@/lib/validate";

/**
 * POST { step } adds one to today's count for that funnel step. The stored row is only the day, the step and a count.
 * The rate limit keys on the client IP for a short window, so one address cannot inflate the numbers.
 */
export async function POST(req: Request) {
  const gate = await sharedHit(`funnel:${clientIp(req)}`, 120, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "events");

  const body = await readJson(req);
  if (!isFunnelStep(body.step)) return NextResponse.json({ error: "Unknown step." }, { status: 400 });

  const day = new Date().toISOString().slice(0, 10);
  await db
    .insert(funnelDaily)
    .values({ day, step: body.step, n: 1 })
    .onConflictDoUpdate({
      target: [funnelDaily.day, funnelDaily.step],
      set: { n: sql`${funnelDaily.n} + 1` },
    });

  return NextResponse.json({ ok: true });
}
