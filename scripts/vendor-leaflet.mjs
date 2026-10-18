#!/usr/bin/env node
/**
 * Regenerates expo/src/leaflet-assets.ts from node_modules/leaflet.
 *
 * The app must not fetch its mapping library from a CDN at runtime: it fails offline and puts a third party's
 * code inside the WebView. Run this after `npm install leaflet@<version>` and commit the result.
 */
import { readFileSync, writeFileSync } from "node:fs";

const version = JSON.parse(readFileSync("node_modules/leaflet/package.json", "utf8")).version;
const js = readFileSync("node_modules/leaflet/dist/leaflet.js", "utf8");
const css = readFileSync("node_modules/leaflet/dist/leaflet.css", "utf8").replace(/url\([^)]*\)/g, "none");

const header = `/**
 * Leaflet ${version}, vendored.
 *
 * Loaded from these strings instead of https://unpkg.com. Two reasons, both from the audit:
 *  - H4: a shipped app that fetches its mapping library from a CDN at runtime fails offline and trusts a
 *    third party with code execution inside the WebView. A store build must not depend on unpkg being up.
 *  - Supply chain: even with an SRI hash, the app is one CDN compromise away from running someone else's JS.
 *
 * Generated from node_modules/leaflet (BSD-2-Clause, © Volodymyr Agafonkin and contributors). Regenerate with
 * \`node scripts/vendor-leaflet.mjs\` after upgrading Leaflet. Do not hand-edit.
 */
`;

writeFileSync(
  "expo/src/leaflet-assets.ts",
  header +
    `export const LEAFLET_VERSION = ${JSON.stringify(version)};\n\n` +
    `export const LEAFLET_CSS: string = ${JSON.stringify(css)};\n\n` +
    `export const LEAFLET_JS: string = ${JSON.stringify(js)};\n`,
);
console.log(`expo/src/leaflet-assets.ts written from Leaflet ${version}`);
