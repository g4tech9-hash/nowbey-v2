import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { classify } from '../lib/classify.mjs';
import { dedupe, canonicalUrl } from '../lib/dedupe.mjs';
import { bridgeToFeed, isFeedEligible } from '../lib/feed.mjs';
import { ingest } from '../lib/ingest.mjs';
import { detectIsland } from '../lib/islands.mjs';
import { googleNewsUrl, parseFeed } from '../lib/rss.mjs';
import { dropEchoedTitle, stripHtml, truncate } from '../lib/text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFile(resolve(HERE, file), 'utf8');

const classifyTitle = (title, summary = '') => classify({ title, summary });

test('classify: a road closure is Road and civic', () => {
  const result = classifyTitle(
    'Major road closures announced for King Charles III’s visit',
    'Police have announced a series of road closures and traffic diversions across New Providence.',
  );
  assert.equal(result.category, 'road');
  assert.equal(result.civic, true);
  assert.ok(result.civicScore >= 0.7, `expected strong civic score, got ${result.civicScore}`);
});

test('classify: utilities map to water, power and sanitation', () => {
  assert.equal(
    classifyTitle(
      'Water interruption scheduled for eastern New Providence on Thursday',
      'The Water and Sewerage Corporation says customers in Fox Hill will have no water from 9am.',
    ).category,
    'water',
  );
  assert.equal(classifyTitle('BPL schedules load shedding across New Providence').category, 'power');
  assert.equal(
    classifyTitle('Garbage collection resumes in Grand Bahama after truck repairs').category,
    'sanitation',
  );
  assert.equal(
    classifyTitle('Small craft warning in effect for the northwest Bahamas').category,
    'storm',
  );
  assert.equal(
    classifyTitle('Ferry services to the Family Islands suspended as swell builds').category,
    'marine',
  );
});

test('classify: court and politics stay out of the feed', () => {
  const court = classifyTitle(
    'Court of Appeal Orders Retrial For Man Accused Of Killing Ex’s New Boyfriend',
    'The court of appeal has ordered a retrial, quashing his murder conviction and 35-year sentence.',
  );
  assert.equal(court.category, 'safety');
  assert.equal(court.civic, false, 'court reporting is not service information');

  const politics = classifyTitle(
    'FNM’s “petty” Pintard “least popular” leader',
    'A poll of party members put the opposition leader last among four candidates.',
  );
  assert.equal(politics.civic, false);
});

test('classify: a civic-adjacent notice with no action language is not civic', () => {
  const result = classifyTitle(
    'The Bahamas first to sign new UN Cooperation Framework',
    'The Ministry of Foreign Affairs signed the framework at a ceremony in Nassau.',
  );
  assert.equal(result.category, 'notice');
  assert.equal(result.civic, false);
});

test('classify: community stories are labelled, not promoted', () => {
  const regatta = classifyTitle(
    'Knowles Defends Sunfish Junior National Title in Exuma',
    'Drake Knowles is back on top of Bahamian junior sailing in Exuma.',
  );
  assert.equal(regatta.category, 'community');
  assert.equal(regatta.civic, false);

  const brunch = classifyTitle(
    'The Lure of Bollywood & Bubbles',
    'The fifth annual Bahamas Culinary & Arts Festival brunch at the Rosewood Ballroom.',
  );
  assert.equal(brunch.category, 'community');
});

test('classify: noise terms are flagged', () => {
  assert.equal(classifyTitle('Your weekend horoscope').noise, true);
});

test('islands: towns resolve to their island', () => {
  assert.equal(detectIsland('Sailing results from George Town').island, 'Exuma');
  assert.equal(detectIsland('Roadworks on Carmichael Road').island, 'New Providence');
  assert.equal(detectIsland('Apprentices return to Freeport').island, 'Grand Bahama');
  assert.equal(detectIsland('Ferry suspended to Clarence Town').island, 'Long Island');
  assert.equal(detectIsland('A budget statement in Parliament').island, null);
});

test('islands: the first place named wins over a passing mention', () => {
  const { island } = detectIsland(
    'Ferry services to the Family Islands suspended: mailboat operators halted crossings to Exuma and Long Island',
  );
  assert.equal(island, 'Exuma');
});

test('rss: parses RSS 2.0 with CDATA, entities and relative dates', async () => {
  const { items } = parseFeed(await read('../fixtures/tribune242.xml'), {
    source: { name: 'Tribune242' },
  });
  assert.equal(items.length, 4);
  const closure = items[0];
  assert.equal(closure.title, "Major road closures announced for King Charles III's visit");
  assert.match(closure.url, /tribune242\.com/);
  assert.equal(closure.publishedAt, '2026-10-26T09:41:00.000Z');
  assert.match(closure.summary, /traffic diversions/);
});

test('rss: parses Atom entries and their href links', async () => {
  const { items } = parseFeed(await read('../fixtures/nassau-guardian-atom.xml'));
  assert.equal(items.length, 3);
  assert.equal(items[0].publisher, 'The Nassau Guardian');
  assert.match(items[0].url, /^https:\/\/thenassauguardian\.com\//);
  assert.equal(items[0].publishedAt, '2026-10-26T09:12:00.000Z');
});

test('rss: Google News titles lose the publisher suffix and echoed summary', async () => {
  const { items } = parseFeed(await read('../fixtures/google-news-road-closures.xml'));
  const street = items.find((i) => i.title.includes('East Street'));
  assert.equal(street.title, 'Portion of East Street closed to traffic for three weeks');
  assert.equal(street.publisher, 'The Nassau Guardian');
  assert.equal(street.summary, '', 'a summary that only repeats the headline is dropped');
});

test('text: echoed titles are stripped, real standfirsts survive', () => {
  assert.equal(
    dropEchoedTitle('Road closed for three weeks  The Nassau Guardian', 'Road closed for three weeks', 'The Nassau Guardian'),
    '',
  );
  assert.equal(
    dropEchoedTitle('Crews will replace a culvert.', 'Road closed', 'The Nassau Guardian'),
    'Crews will replace a culvert.',
  );
  assert.equal(stripHtml('<p>Hello &amp; <b>welcome</b></p>'), 'Hello & welcome');
  assert.match(truncate('One sentence. Two sentence. Three sentence.', 24), /One sentence\.$/);
});

test('dedupe: the same closure from an outlet and an aggregator collapses', async () => {
  const outlet = parseFeed(await read('../fixtures/tribune242.xml'), {
    source: { name: 'Tribune242' },
  }).items[0];
  const aggregator = parseFeed(await read('../fixtures/google-news-road-closures.xml')).items[0];
  const decorated = {
    id: 'a',
    url: outlet.url,
    title: outlet.title,
    publisher: 'Tribune242',
    summary: outlet.summary,
    publishedAt: outlet.publishedAt,
    category: 'road',
    island: 'New Providence',
  };
  const duplicate = {
    id: 'b',
    url: aggregator.url,
    title: aggregator.title,
    publisher: 'Tribune242',
    summary: '',
    publishedAt: aggregator.publishedAt,
    category: 'road',
    island: 'New Providence',
  };
  const { items, merged } = dedupe([decorated, duplicate]);
  assert.equal(items.length, 1);
  assert.equal(merged.length, 1);
  assert.match(items[0].url, /tribune242\.com\/news/, 'the outlet URL wins over the redirect');
});

test('dedupe: tracking parameters do not create a second copy', () => {
  assert.equal(
    canonicalUrl('https://www.tribune242.com/news/story/?utm_source=rss&utm_medium=feed'),
    canonicalUrl('https://tribune242.com/news/story'),
  );
});

test('ingest: the fixture run returns a civic-first wire', async () => {
  const config = JSON.parse(await readFile(resolve(HERE, '../sources.json'), 'utf8'));
  const manifest = JSON.parse(await read('../fixtures/manifest.json'));
  const fixtures = [];
  for (const entry of manifest.fixtures) {
    fixtures.push({ source: entry.source, publisher: entry.publisher, xml: await read(resolve(HERE, '../fixtures', entry.file)) });
  }

  const { items, report } = await ingest({
    config,
    fixtures,
    now: new Date(manifest.capturedAt),
    limit: 60,
  });

  assert.equal(report.totals.sources, fixtures.length);
  assert.equal(report.totals.failed, 0);
  assert.ok(items.length >= 12, `expected a populated wire, got ${items.length}`);
  assert.ok(report.totals.civic >= 7, `expected civic coverage, got ${report.totals.civic}`);
  assert.ok(report.totals.duplicatesRemoved >= 2);

  // The civic items lead the ranking.
  const topFive = items.slice(0, 5).map((i) => i.civic);
  assert.ok(topFive.filter(Boolean).length >= 4, 'civic stories should outrank routine news');

  const road = items.find((i) => /King Charles/.test(i.title));
  assert.equal(road.category, 'road');
  assert.equal(road.island, 'New Providence');
  assert.equal(road.civic, true);
  assert.ok(road.publishedAt, 'publication time is preserved');
  assert.ok(road.ageLabel.length > 0);
});

test('ingest: a failing source costs only its own items', async () => {
  const config = JSON.parse(await readFile(resolve(HERE, '../sources.json'), 'utf8'));
  const xml = await read('../fixtures/tribune242.xml');
  const failing = {
    outlets: [],
    civicQueries: [],
    googleNews: {},
  };
  const { items, report } = await ingest({
    config,
    now: new Date('2026-10-26T10:00:00Z'),
    fetchImpl: async (url) => {
      if (url.includes('google')) throw new Error('socket hang up');
      return { ok: true, text: async () => xml };
    },
    limit: 10,
  });
  assert.ok(items.length >= 3);
  assert.ok(report.sources.some((s) => !s.ok && /socket hang up/.test(s.error)));
  // Unused fixture config, kept honest so the test documents intent.
  assert.deepEqual(failing.outlets, []);
});

test('feed bridge: only actionable stories become feed cards', async () => {
  const config = JSON.parse(await readFile(resolve(HERE, '../sources.json'), 'utf8'));
  const manifest = JSON.parse(await read('../fixtures/manifest.json'));
  const fixtures = [];
  for (const entry of manifest.fixtures) {
    fixtures.push({ source: entry.source, publisher: entry.publisher, xml: await read(resolve(HERE, '../fixtures', entry.file)) });
  }
  const now = new Date(manifest.capturedAt);
  const { items } = await ingest({ config, fixtures, now, limit: 60 });
  const { cards } = bridgeToFeed(items, { now });

  assert.ok(cards.length >= 7, `expected civic cards, got ${cards.length}`);
  assert.ok(cards.every((c) => c.kind === 'wire' && c.civic));
  assert.ok(cards.every((c) => c.source.name && c.cta.href));
  assert.equal(cards[0].actions.confirm, false, 'wire items are not neighbour reports');
  assert.ok(cards.some((c) => c.island === 'Exuma'));

  const court = items.find((i) => /Retrial/.test(i.title));
  assert.equal(isFeedEligible(court, { now }), false);
});

test('feed bridge: stale civic items fall out of the feed', () => {
  const item = {
    id: 'x',
    title: 'Road closed',
    civic: true,
    civicScore: 0.9,
    noise: false,
    publishedAt: '2026-10-20T00:00:00Z',
  };
  assert.equal(isFeedEligible(item, { now: new Date('2026-10-26T00:00:00Z') }), false);
});

test('google news url carries the locale and recency window', () => {
  const url = googleNewsUrl('road closure Bahamas', {
    params: { hl: 'en-US', gl: 'BS', ceid: 'BS:en' },
  });
  assert.match(url, /q=road\+closure\+Bahamas/);
  assert.match(url, /gl=BS/);
  assert.match(url, /ceid=BS%3Aen/);
});
