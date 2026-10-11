import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handleProblem, normalizeHandle } from "@/lib/handles";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Lets the sign-up form say "taken" while someone is still typing. Handles are public, so this reveals nothing private. */
export async function GET(req: Request) {
  const gate = hit(`handlecheck:${clientIp(req)}`, 60, 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "lookups");
  const handle = normalizeHandle(new URL(req.url).searchParams.get("h"));
  const problem = handleProblem(handle);
  if (problem) return NextResponse.json({ available: false, reason: problem });
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1);
  return NextResponse.json(row ? { available: false, reason: "That handle is taken." } : { available: true });
}
