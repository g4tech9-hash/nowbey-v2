import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/viewer";

export type Gate = { viewer: Viewer; error: null } | { viewer: null; error: NextResponse };

/**
 * Use at the top of every admin route. "editor" lets moderators in (reports and the wire);
 * "admin" is for managing members and settings.
 */
export async function requireStaff(level: "editor" | "admin"): Promise<Gate> {
  const viewer = await getViewer();
  const allowed = level === "admin" ? viewer.isAdmin : viewer.isEditor;
  if (allowed) return { viewer, error: null };
  return {
    viewer: null,
    error: NextResponse.json(
      { error: viewer.signedIn ? "You do not have permission to do that." : "Sign in first." },
      { status: viewer.signedIn ? 403 : 401 },
    ),
  };
}
