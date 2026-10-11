import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { reissueSession } from "@/lib/account";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** "Sign out my other devices": every other session stops working, this one carries on. */
export async function DELETE(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const [row] = await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, viewer.userId))
    .returning({ v: users.sessionVersion });
  const reissued = await reissueSession(req, viewer.userId, viewer.handle, row.v);
  return NextResponse.json({ ok: true, ...reissued });
}
