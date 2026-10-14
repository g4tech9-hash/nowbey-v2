import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Disabled: the installed openplaces@0.3.5 API no longer matches this
  // route (its `Places` export is gone and its sqlite helper ships broken),
  // so importing it fails the production build. The previous WIP is kept in
  // git history. Wire a verified import source before scheduling this route.
  return NextResponse.json(
    { success: false, error: "Places import has no verified source configured." },
    { status: 501 },
  );
}
