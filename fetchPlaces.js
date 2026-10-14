const { OpenPlaces } = require('openplaces');
const fs = require('fs');

async function main() {
    const client = new OpenPlaces();

    // We'll use a more comprehensive list of queries to ensure we cover all of Nassau
    // and the rest of the Bahamas, as a single general query often hits a cap.
    const queries = [
        "restaurants IN Nassau, Bahamas",
        "bars IN Nassau, Bahamas",
        "clubs IN Nassau, Bahamas",
        "restaurants IN Freeport, Bahamas",
        "bars IN Freeport, Bahamas",
        "clubs IN Freeport, Bahamas",
        "restaurants IN The Bahamas",
        "bars IN The Bahamas",
        "clubs IN The Bahamas"
    ];

    let allResults = [];
    const seenIds = new Set();

    console.log("Performing comprehensive deep scrape of Bahamas places...");

    for (const query of queries) {
        console.log(`Fetching: ${query}...`);
        try {
            const results = await client.places.search(query, {
                limit: 500,
                deepScrape: true,
                requireFields: ['hours_of_operation', 'contact_number', 'website', 'menu_links']
            });

            for (const place of results) {
                if (!seenIds.has(place.id)) {
                    seenIds.add(place.id);
                    allResults.push(place);
                }
            }
            console.log(`Found ${results.length} places for this query.`);
        } catch (error) {
            console.error(`Error fetching ${query}:`, error);
        }
    }

    const dir = 'src/data';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync('src/data/places.json', JSON.stringify(allResults, null, 2));
    console.log(`\nSuccess! Total unique places saved: ${allResults.length} to src/data/places.json`);
}

main();
