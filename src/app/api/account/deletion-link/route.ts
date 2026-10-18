import { NextResponse } from "next/server";
import { sendDeletionEmail } from "@/lib/account";
import { publicBase } from "@/lib/billing";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { mailConfigured } from "@/lib/mail";
import { sharedHit, tooMany } from "@/lib/ratelimit";
import { getViewer } from "@/lib/viewer";

/**
 * POST /api/account/deletion-link
 *
 * Emails the signed-in member a one-time link that opens the deletion confirmation. This is the door for
 * accounts opened with Google, which have no password to type — and the reason in-app account deletion now
 * works for every account, not just password ones.
 *
 * Sent only to the address already on the account, never to an address in the request body: otherwise this
 * endpoint would be a way to mail a deletion link to somebody else's inbox.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!viewer.email) {
    return NextResponse.json(
      { error: "This account has no email address on it, so we cannot send a confirmation link. Add one in Account settings first." },
      { status: 400 },
    );
  }
  // Three links an hour: enough for a person who mistyped their inbox, useless as a mail bomb.
  const gate = await sharedHit(`deletelink:${viewer.userId}`, 3, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "confirmation emails");

  const base = publicBase(req);
  if (!base || !mailConfigured()) {
    return NextResponse.json(
      {
        error:
          "This server cannot send email right now, so it cannot confirm it is you. Contact support and we will delete the account for you.",
      },
      { status: 503 },
    );
  }
  try {
    const status = await sendDeletionEmail({ id: viewer.userId, handle: viewer.handle, email: viewer.email }, base);
    if (status !== "sent") throw new Error(status);
  } catch {
    return NextResponse.json({ error: "We could not send that email just now. Please try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, mail: "sent" });
}
