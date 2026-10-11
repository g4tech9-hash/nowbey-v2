import { NextResponse } from "next/server";
import { readJson } from "@/lib/validate";
import { audit } from "@/lib/audit";
import { getSiteSettings, saveSetting } from "@/lib/settings";
import { requireStaff } from "@/lib/staff";
import { isThemeKey } from "@/lib/themes";

export const dynamic = "force-dynamic";

/** Switch the look of the site, or the opening splash screen, on or off. Admins only. */
export async function PATCH(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";

  const body = await readJson(req);
  if (body.theme === undefined && body.splash === undefined) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }
  if (body.theme !== undefined && !isThemeKey(body.theme)) {
    return NextResponse.json({ error: "Choose Island or Classic." }, { status: 400 });
  }
  if (body.splash !== undefined && typeof body.splash !== "boolean") {
    return NextResponse.json({ error: "Splash must be on or off." }, { status: 400 });
  }

  if (isThemeKey(body.theme)) {
    await saveSetting("theme", body.theme, actor);
    await audit(actor, "settings.theme", "setting", "theme", "Site look", body.theme);
  }
  if (typeof body.splash === "boolean") {
    await saveSetting("splash", body.splash ? "on" : "off", actor);
    await audit(actor, "settings.splash", "setting", "splash", "Splash screen", body.splash ? "on" : "off");
  }
  return NextResponse.json({ ok: true, settings: await getSiteSettings() });
}
