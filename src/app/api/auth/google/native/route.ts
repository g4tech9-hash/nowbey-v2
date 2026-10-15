import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeToken } from "@/lib/account";
import { makeToken } from "@/lib/auth";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson, text } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * The mobile app's half of "Sign in with Google".
 *
 * The app sends the member to the system browser, where the normal web handshake runs; when it is
 * done, the callback redirects to `nowbey://auth?code=…`. The app then trades that one-time code
 * (five minutes, single use) for the same bearer token a password sign-in would have produced.
 * The app never sees a Google code or a Google token — only its own.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`google:native:${clientIp(req)}`, 30, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "sign-in attempts");

  const body = await readJson(req);
  const code = text(body.code, 200);
  if (!code) return NextResponse.json({ error: "Missing code." }, { status: 400 });

  const used = await consumeToken(code, "native_handoff");
  if (!used) return NextResponse.json({ error: "That sign-in link has expired. Please try again." }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.id, used.userId)).limit(1);
  if (!user) return NextResponse.json({ error: "That sign-in link has expired. Please try again." }, { status: 400 });
  if (user.status === "suspended") {
    return NextResponse.json(
      { error: "This account has been suspended. If you think that is a mistake, please contact NowBey." },
      { status: 403 },
    );
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({
    token: makeToken(user.id, user.handle, user.sessionVersion),
    user: { handle: user.handle, displayName: user.displayName },
  });
}
