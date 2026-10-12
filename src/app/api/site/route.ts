import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** The public look-and-feel settings, so the mobile app can follow the same theme as the website. */
export async function GET() {
  const s = await getSiteSettings();
  return NextResponse.json({ theme: s.theme, mode: s.mode, splash: s.splash, tagline: BRAND.tagline, promise: BRAND.promise });
}
