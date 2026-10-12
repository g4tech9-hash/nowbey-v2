const { OpenPlaces } = require('openplaces');
const fs = require('fs');

async function main() {
    // Initialize OpenPlaces without an API key. 
    // This triggers the free scraping fallback mode automatically.
    const client = new OpenPlaces();

    console.log("Fetching restaurants, bars, and clubs in The Bahamas...");
    console.log("This may take a moment as it is scraping the web...");

    try {
        // Using the OpenPlaces native multi-query syntax
        const results = await client.places.search(
            "restaurants AND bars AND clubs IN The Bahamas", 
            { limit: 150 } // You can increase this limit if you need more locations
        );
const dir = 'src/data';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}
        // Save the rich data (names, addresses, websites, phone numbers, ratings, etc.)
        fs.writeFileSync('src/data/places.json', JSON.stringify(results, null, 2));
        
        console.log(`\nSuccess! Saved ${results.length} places to src/data/places.json`);
    } catch (error) {
        console.error("Error fetching places:", error);
    }
}

main();