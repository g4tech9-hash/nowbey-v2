# Basemap tiles — what to buy before launch

NowBey draws its map with Leaflet and raster tiles. The tiles do **not** come from a key that ships in this
repo, and the two endpoints used as defaults are **not licensed for a public app**:

| Layer | Default endpoint | Status |
| --- | --- | --- |
| Streets / road | `tile.openstreetmap.org` | The OSM Foundation's tile servers are for community, low-volume use. The [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) explicitly forbids distributing them in an app or a high-traffic site. |
| Imagery | `server.arcgisonline.com/.../World_Imagery` | Keyless while evaluating, but Esri's terms require an ArcGIS agreement for production/commercial use. |

They are kept as defaults so development works offline from any API key. Production must set the variables
below, and `warnIfTilesUnlicensed()` prints a single warning in the server log when it has not.

## What to do

1. Open an account with a provider that allows app distribution. Reasonable options for The Bahamas:
   - **MapTiler** — generous free tier, per-tile pricing, styles for streets and satellite.
   - **Stadia Maps** — requires an API key and allows mobile SDK use.
   - **Mapbox** — satellite + streets, per-MAU pricing.
   - **Esri / ArcGIS** — the imagery source already in use; an agreement keeps the same look.
2. Put the account's key inside the URL template or header as the provider requires.
3. Set these on Vercel (and in `expo/eas.json` → `env` for the app):

```
NEXT_PUBLIC_TILE_STREETS_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=…
NEXT_PUBLIC_TILE_STREETS_ATTRIBUTION=&copy; MapTiler &copy; OpenStreetMap contributors
NEXT_PUBLIC_TILE_IMAGERY_URL=https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=…
NEXT_PUBLIC_TILE_LABELS_URL=            # leave empty if imagery already has labels
NEXT_PUBLIC_TILE_MAX_ZOOM=19
```

For the Expo app use the same values with the `EXPO_PUBLIC_` prefix:

```
EXPO_PUBLIC_TILE_STREETS_URL=…
EXPO_PUBLIC_TILE_IMAGERY_URL=…
EXPO_PUBLIC_TILE_LABELS_URL=
EXPO_PUBLIC_TILE_MAX_ZOOM=19
```

Both platforms read their configuration in one place: `src/lib/tiles.ts` and `expo/src/map-tiles.ts`.

## Attribution

The credit line is part of the contract with every provider. `TILE_ATTRIBUTION` on the web and the credit
line in `MapCanvas.tsx` must match what the provider's terms require. Do not remove them to make the map
look tidier — it is the cheapest kind of licence violation to avoid.

## Why this is a documented human task, not a code change

Buying a tile contract needs a card and a signature. The repository can only make the switch a one-line
environment change and make the unlicensed state loud. That is what it now does.
