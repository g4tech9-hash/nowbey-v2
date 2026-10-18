/*
 * Admin management of the Facebook pages the Wire follows.
 *
 *   GET    /api/admin/facebook-pages          → { pages: [{ username, pageName }] }
 *   POST   { url: "<public page link>", name?: "Display name" }
 *   DELETE { username: "mybpl242" }
 *
 * The list is stored in site_settings ("fb_pages") and consumed by
 * src/lib/facebook-ingest.ts (stories on the wire) and /api/rss/facebook (the feed).
 */
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { readJson } from "@/lib/validate";
import { getAuxSetting, saveSetting } from "@/lib/settings";
import { fbPagesFromValue, fbUsernameFromUrl } from "@/lib/facebook";

const serialize = (pages: { username: string; pageName: string }[]) => pages.map((p) => `${p.username}|${p.pageName}`).join(",");

export async function GET() {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  return NextResponse.json({ pages: fbPagesFromValue(await getAuxSetting("fb_pages")) });
}

export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";

  const body = await readJson(req);
  const username = fbUsernameFromUrl(String(body.url ?? "").trim());
  if (!username) {
    return NextResponse.json(
      { error: "That is not a public Facebook page link. Paste something like https://www.facebook.com/mybpl242/" },
      { status: 400 },
    );
  }
  const name = String(body.name ?? "").trim().slice(0, 80);
  const pages = fbPagesFromValue(await getAuxSetting("fb_pages"));
  if (pages.some((p) => p.username === username)) {
    return NextResponse.json({ error: "That page is already on the list." }, { status: 409 });
  }
  const pageName = name || pages.find((p) => p.username === username)?.pageName || undefined;
  pages.push({ username, pageName: pageName || `${username} (Facebook)` });
  await saveSetting("fb_pages", serialize(pages), actor);
  await audit(actor, "facebook.page_add", "setting", "fb_pages", `${pageName ?? username} (@${username})`);
  return NextResponse.json({ ok: true, pages });
}

export async function DELETE(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";

  const body = await readJson(req);
  const username = String(body.username ?? "").trim();
  const pages = fbPagesFromValue(await getAuxSetting("fb_pages"));
  const next = pages.filter((p) => p.username !== username);
  if (next.length === pages.length) return NextResponse.json({ error: "That page is not on the list." }, { status: 404 });
  await saveSetting("fb_pages", serialize(next), actor);
  await audit(actor, "facebook.page_remove", "setting", "fb_pages", `@${username}`);
  return NextResponse.json({ ok: true, pages: next });
}
