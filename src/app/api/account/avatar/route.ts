import { sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { hasBadOrigin, badOrigin } from "@/lib/http";
import { getViewer } from "@/lib/viewer";
import { hit, tooMany } from "@/lib/ratelimit";
import { processPhoto, PhotoError } from "@/lib/images";
import { missingAvatarTable } from "@/lib/avatar";
import { readAvatarBody } from "@/lib/avatar-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function change(req: Request, remove: boolean) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return Response.json({ error: "Sign in first." }, { status: 401 });
  const gate = hit(`avatar:${viewer.userId}`, 10, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "profile photo changes");
  try {
    if (remove) {
      await db.execute(sql`delete from member_avatars where user_id = ${viewer.userId}::uuid`);
    } else {
      let input: Buffer;
      try { input = await readAvatarBody(req); }
      catch { return Response.json({ error: "Choose a JPEG, PNG or WebP photo under 3 MB." }, { status: 400 }); }
      // Existing decoder validates magic bytes, bounds pixels, and strips EXIF/GPS metadata.
      const photo = await processPhoto(input);
      const data = await sharp(photo.data).resize(320, 320, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      await db.execute(sql`insert into member_avatars (user_id, data) values (${viewer.userId}::uuid, ${data})
        on conflict (user_id) do update set data = excluded.data, updated_at = now()`);
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PhotoError) return Response.json({ error: error.message }, { status: 400 });
    if (missingAvatarTable(error)) return Response.json({ error: "Profile photos need a database update. Ask the site administrator to apply add-profile-photos.sql." }, { status: 503 });
    return Response.json({ error: "Could not save the photo. Please try again." }, { status: 500 });
  }
}
export async function POST(req: Request) { return change(req, false); }
export async function DELETE(req: Request) { return change(req, true); }
