import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeFeedItems } from '../lib/merge.mjs';
import { createWireHandlers } from '../adapters/next-route.mjs';

const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60000).toISOString();

function reports(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    kind: 'report',
    category: i % 3 === 0 ? 'flooding' : 'water',
    createdAt: minutesAgo(i * 8 + 1),
  }));
}

function wireCards(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    kind: 'wire',
    category: ['road', 'power', 'marine'][i % 3],
    sortWeight: 90 - i * 5,
    publishedAt: minutesAgo(60 + i * 30),
  }));
}

test('merge: wire stories sit inside the feed', () => {
  const { items, placed } = mergeFeedItems(reports(12), wireCards(3));
  assert.equal(items.length, 15);
  assert.equal(placed, 3);
  assert.ok(items.some((i) => i.kind === 'wire'));
});

test('merge: the news wire never takes over the feed', () => {
  const { items } = mergeFeedItems(reports(20), wireCards(20), { window: 6, maxWireShare: 0.4 });
  for (let start = 0; start + 6 <= items.length; start += 1) {
    const slice = items.slice(start, start + 6);
    const wire = slice.filter((i) => i.kind === 'wire').length;
    assert.ok(wire <= 3, `window at ${start} had ${wire} wire items`);
  }
});

test('merge: one wire story per category per window', () => {
  const cards = [
    { id: 'a', kind: 'wire', category: 'road', sortWeight: 90, publishedAt: minutesAgo(60) },
    { id: 'b', kind: 'wire', category: 'road', sortWeight: 89, publishedAt: minutesAgo(61) },
    { id: 'c', kind: 'wire', category: 'road', sortWeight: 88, publishedAt: minutesAgo(62) },
  ];
  const { items, held } = mergeFeedItems(reports(12), cards, { window: 6, maxPerCategory: 1 });
  assert.equal(items.filter((i) => i.kind === 'wire').length, 1);
  assert.equal(held.length, 2, 'duplicate category stories are held back, not deleted');
});

test('merge: with no wire items the feed is untouched', () => {
  const feed = reports(8);
  const { items, placed } = mergeFeedItems(feed, []);
  assert.equal(placed, 0);
  assert.deepEqual(items.map((i) => i.id), feed.map((i) => i.id));
});

test('next adapter: memoises the ingest run and forces a refresh on cron', async () => {
  const config = {
    outlets: [],
    civicQueries: [],
    googleNews: {},
  };
  const { wireGet, wireRefresh, store } = createWireHandlers(config, { ttlMs: 60000 });
  const first = await wireGet({ url: 'https://nowbey.com/api/wire?civic=1' });
  assert.equal(first.status, 200);
  assert.ok(store.get().value, 'payload is stored for reuse');
  const second = await wireRefresh({ headers: new Map() });
  assert.equal(second.status, 200);
});

test('next adapter: cron route rejects a missing secret', async () => {
  const config = { outlets: [], civicQueries: [], googleNews: {} };
  const { wireRefresh } = createWireHandlers(config, { cronSecret: 'shh' });
  const unauthorised = await wireRefresh({ headers: { get: () => null } });
  assert.equal(unauthorised.status, 401);
  const ok = await wireRefresh({ headers: { get: () => 'Bearer shh' } });
  assert.equal(ok.status, 200);
});
