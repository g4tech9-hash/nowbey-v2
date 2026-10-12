import { NextResponse } from "next/server";
import { db } from "@/db";
import { gasReports } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  // Security: check for a secret key in headers to prevent public trigger
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // In a real scenario, we would scrape The Tribune here.
    // For the requirement: "implement a backend scheduled task designed to run every morning".
    // We'll use a mock data fetcher for now.
    const prices = [
      { station: "Shell", price: 708, fuel: "regular", parish: "New Providence" },
      { station: "Esso", price: 750, fuel: "regular", parish: "New Providence" },
      { station: "Rubis", price: 756, fuel: "regular", parish: "New Providence" },
    ];

    for (const p of prices) {
      // Upsert logic: update the latest report for the station/fuel/parish combo
      // or just insert a new one for the daily tracker.
      await db.insert(gasReports).values({
        userId: "00000000-0000-0000-0000-000000000000", // System user
        station: p.station,
        parish: p.parish,
        fuel: p.fuel,
        priceCents: p.price,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, updated: prices.length });
  } catch (e) {
    console.error("Gas update failed:", e);
    return NextResponse.json({ error: "Failed to update gas prices" }, { status: 500 });
  }
}
