import { createHash } from "node:crypto";
import { serverSecret } from "@/lib/auth";
import { clientIp } from "@/lib/ratelimit";
import type { Viewer } from "@/lib/viewer";

/** Who is acting: the signed-in account, or a one-way hash of the visitor's address. */
export function actorKey(req: Request, viewer: Viewer): string {
  if (viewer.userId) return `u:${viewer.userId}`;
  const digest = createHash("sha256").update(`${serverSecret()}|${clientIp(req)}`).digest("hex").slice(0, 24);
  return `ip:${digest}`;
}
