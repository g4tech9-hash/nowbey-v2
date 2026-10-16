import { db } from "./src/db/index";
import { places } from "./src/db/schema";
import fs from "fs";
import path from "path";

async function importPlaces() {
  const dataPath = path.join(process.cwd(), "src/data/places.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  
  let count = 0;
  for (const p of data) {
    try {
      await db.insert(places).values({
        name: p.name,
        kind: p.category || "tip",
        parish: p.parish || "Unknown",
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        externalId: p.id,
        source: "openplaces",
        imageUrls: p.imageUrls ? JSON.stringify(p.imageUrls) : null,
        menuLink: p.menuLink,
        contactNumber: p.contactNumber,
        email: p.email,
        socialLinks: p.socialLinks ? JSON.stringify(p.socialLinks) : null,
      });
      count++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`Successfully imported ${count} places!`);
}

void importPlaces();
