import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Says whether the Google button can work on this deployment. The sign-in page asks first, so it
 * never shows a button that would only bounce back with "not switched on yet".
 * No secrets here: whether the integration exists is not sensitive, and the client id is public.
 */
export async function GET() {
  return NextResponse.json(
    { enabled: googleConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
