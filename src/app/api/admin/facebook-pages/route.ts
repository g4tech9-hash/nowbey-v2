/*
 * Admin management of the Facebook pages the Wire follows.
 *
 *   GET    /api/admin/facebook-pages          → { pages, bridges, status }
 *   POST   { url: "<public page link>", name?: "Display name" }
 *   PATCH  { username, bridgeUrl }            → set/clear that page's bridge feed
 *   DELETE { username: "mybpl242" }
 *
 * The page list is stored in site_settings ("fb_pages"), the bridge feeds in "fb_bridges",
 * and the last refresh's outcome in "fb_ingest_status". All three are consumed by
 * src/lib/facebook-ingest.ts (stories on the wire) and /api/rss/facebook (the feed).
 */
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { readJson } from "@/lib/validate";
import { getAuxSetting, saveSetting } from "@/lib/settings";
import { fbBridgesFromValue, fbBridgesToValue, fbPagesFromValue, fbUsernameFromUrl, isPrivateHostname } from "@/lib/facebook";
import { parseFbIngestStatus } from "@/lib/facebook-ingest-core";

const serialize = (pages: { username: string; pageName: string }[]) => pages.map((p) => `${p.username}|${p.pageName}`).join(",");

export async function GET() {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const [pagesRaw, bridgesRaw, statusRaw] = await Promise.all([
    getAuxSetting("fb_pages"),
    getAuxSetting("fb_bridges"),
    getAuxSetting("fb_ingest_status"),
  ]);
  return NextResponse.json({
    pages: fbPagesFromValue(pagesRaw),
    bridges: fbBridgesFromValue(bridgesRaw),
    status: parseFbIngestStatus(statusRaw),
  });
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
  const pageName = name || `${username} (Facebook)`;
  pages.push({ username, pageName });
  await saveSetting("fb_pages", serialize(pages), actor);
  await audit(actor, "facebook.page_add", "setting", "fb_pages", `${pageName} (@${username})`);
  return NextResponse.json({ ok: true, pages });
}

export async function PATCH(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";

  const body = await readJson(req);
  const username = String(body.username ?? "").trim();
  const bridgeUrl = String(body.bridgeUrl ?? "").trim();

  const pages = fbPagesFromValue(await getAuxSetting("fb_pages"));
  if (!pages.some((p) => p.username === username)) {
    return NextResponse.json({ error: "That page is not on the list." }, { status: 404 });
  }

  let host = "";
  if (bridgeUrl) {
    if (!/^https?:\/\/[^\s]+$/i.test(bridgeUrl)) {
      return NextResponse.json({ error: "The bridge must be an http(s) feed address." }, { status: 400 });
    }
    if (/[|,]/.test(bridgeUrl)) {
      return NextResponse.json({ error: "Bridge addresses cannot contain a comma or a pipe — save one address per page." }, { status: 400 });
    }
    try {
      host = new URL(bridgeUrl).hostname;
    } catch {
      return NextResponse.json({ error: "That is not a readable address." }, { status: 400 });
    }
    if (/(^|\.)(facebook\.com|fb\.com)$/i.test(host)) {
      return NextResponse.json(
        { error: "That is the Facebook page itself — Facebook blocks server reads. Paste the RSS address a bridge service (rss.app, fetchrss, RSS-Bridge) gives you for the page." },
        { status: 400 },
      );
    }
    if (isPrivateHostname(host)) {
      return NextResponse.json({ error: "That address points inside the server's own network. A bridge must be a public feed." }, { status: 400 });
    }
  }

  const bridges = fbBridgesFromValue(await getAuxSetting("fb_bridges"));
  if (bridgeUrl) bridges[username] = bridgeUrl.slice(0, 600);
  else delete bridges[username];

  await saveSetting("fb_bridges", fbBridgesToValue(bridges), actor);
  await audit(actor, bridgeUrl ? "facebook.bridge_set" : "facebook.bridge_clear", "setting", "fb_bridges", bridgeUrl ? `@${username} via ${host}` : `@${username}`);
  return NextResponse.json({ ok: true, bridges });
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

  // A removed page should not leave its bridge behind, where it would apply again if the page returns.
  const bridges = fbBridgesFromValue(await getAuxSetting("fb_bridges"));
  if (bridges[username]) {
    delete bridges[username];
    await saveSetting("fb_bridges", fbBridgesToValue(bridges), actor);
  }

  await audit(actor, "facebook.page_remove", "setting", "fb_pages", `@${username}`);
  return NextResponse.json({ ok: true, pages: next });
}
