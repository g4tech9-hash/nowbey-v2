#!/usr/bin/env node
/**
 * Local preview for the civic wire.
 *
 *   npm run preview          -> http://0.0.0.0:4180
 *
 * Renders the classified wire and the feed cards the app would receive, using
 * the fixture corpus by default (so it works with no network) and the live
 * sources on /api/wire?mode=live.
 *
 * Bound to 0.0.0.0 with no host allowlist so it works behind a proxy preview.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ingest } from '../lib/ingest.mjs';
import { bridgeToFeed } from '../lib/feed.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4180);
const HOST = '0.0.0.0';

const configPromise = readFile(resolve(HERE, '../sources.json'), 'utf8').then(JSON.parse);

async function loadFixtures() {
  const manifest = JSON.parse(await readFile(resolve(HERE, '../fixtures/manifest.json'), 'utf8'));
  const fixtures = [];
  for (const entry of manifest.fixtures) {
    fixtures.push({
      source: entry.source,
      publisher: entry.publisher,
      xml: await readFile(resolve(HERE, '../fixtures', entry.file), 'utf8'),
    });
  }
  return { fixtures, capturedAt: manifest.capturedAt };
}

async function buildPayload(mode) {
  const config = await configPromise;
  let fixtures;
  let now = new Date();
  if (mode === 'live') {
    fixtures = undefined;
  } else {
    const loaded = await loadFixtures();
    fixtures = loaded.fixtures;
    // Pin "now" to the fixture capture time so the relative ages read correctly.
    now = new Date(loaded.capturedAt);
  }

  const { items, report } = await ingest({ config, fixtures, now, limit: 60 });
  const { cards } = bridgeToFeed(items, { now });
  return {
    generatedAt: report.fetchedAt,
    mode: fixtures ? 'fixtures' : 'live',
    counts: { ...report.totals, feedCards: cards.length },
    items,
    feedCards: cards,
    report,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/wire') {
    const mode = url.searchParams.get('mode') === 'live' ? 'live' : 'fixtures';
    try {
      const payload = await buildPayload(mode);
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      });
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = await readFile(resolve(HERE, 'ui.html'), 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`NowBey civic wire preview → http://${HOST}:${PORT}\n`);
});
