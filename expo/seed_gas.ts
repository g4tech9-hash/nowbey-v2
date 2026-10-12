import { db } from "./src/db";
import { gasReports } from "./src/db/schema";

async function seed() {
  const prices = [
    { station: "Shell", price: 708, fuel: "regular", parish: "New Providence" },
    { station: "Esso", price: 750, fuel: "regular", parish: "New Providence" },
    { station: "Rubis", price: 756, fuel: "regular", parish: "New Providence" },
  ];

  for (const p of prices) {
    await db.insert(gasReports).values({
      userId: "00000000-0000-0000-0000-000000000000",
      station: p.station,
      parish: p.parish,
      fuel: p.fuel,
      priceCents: p.price,
      createdAt: new Date(),
    });
  }
  console.log("Gas prices seeded successfully!");
}

seed().catch(console.error);
