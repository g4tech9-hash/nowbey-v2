import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ingest,
  extractPersonFields,
  urgencyOf,
  isAlertCandidate,
  healWrappedUrls,
  validateAlertSubmission,
} from '../lib/alerts.mjs';
import { classify } from '../lib/classify.mjs';
import { detectIsland } from '../lib/islands.mjs';
import { mergeFeedItems } from '../lib/merge.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFile(resolve(HERE, file), 'utf8');

test("alerts: parses Nikita Smith's 29 Oct 2026 Marco's Alert accurately", () => {
  const body = `Nikita Smith (Female) 17yrs of Pride Estate, New Providence. Last seen Wednesday, 28th October, 2026: @ her residence. Complexion: Light Brown, Medium Build: If seen contact police @ 919 or CID 502-9991 502-9992: See Photo: https://www.facebook.com/share/p/1Fnp3UugWB/`;
  const fields = extractPersonFields(body, { title: "Marco's Alert" });

  assert.equal(fields.alertType, 'marco');
  assert.equal(fields.person.name, 'Nikita Smith');
  assert.equal(fields.person.gender, 'Female');
  assert.equal(fields.person.age, 17);
  assert.equal(fields.person.residence, 'Pride Estate, New Providence');
  assert.equal(fields.person.complexion, 'Light Brown');
  assert.equal(fields.person.build, 'Medium Build');
  assert.equal(fields.person.height, null);
  assert.equal(fields.lastSeen.when, 'Wednesday, 28th October, 2026');
  assert.equal(fields.lastSeen.where, 'her residence (Pride Estate, New Providence)');
  assert.equal(fields.contact, '919 or CID 502-9991 502-9992');
  assert.deepEqual(fields.phones, ['919', '502-9991', '502-9992']);
  assert.equal(fields.photo, 'https://www.facebook.com/share/p/1Fnp3UugWB/');
  assert.equal(fields.photoKind, 'page');
  assert.equal(detectIsland('Pride Estate').island, 'New Providence');
  assert.equal(urgencyOf({ title: "Marco's Alert", summary: body, person: fields.person }), 'high');
});

test('alerts: heals OCR line-wrapped Facebook URLs from phone screenshots', () => {
  const ocrBody = `Nikita Smith (Female) 17yrs of Pride Estate, New Providence. Last seen Wednesday, 28th October, 2026: @ her residence. Complexion: Light Brown, Medium Build: If seen contact police @ 919 or CID 502-9991\n502-9992: See Photo: https://www.facebook\n.com/share/p/1Fnp3UugWB/`;
  assert.match(healWrappedUrls(ocrBody), /https:\/\/www\.facebook\.com\/share\/p\/1Fnp3UugWB\//);
  const fields = extractPersonFields(ocrBody);
  assert.equal(fields.photo, 'https://www.facebook.com/share/p/1Fnp3UugWB/');
});

test("alerts: parses Marco's Alert with explicit street and height (Clore Simon)", () => {
  const body = `Clore Simon (Female) 17yrs of Roland Street, Ridgeland Park, New Providence. Last seen Monday, 26th October, 2026: @ Roland Street . Complexion: Dark Brown, Slim Build, Height 4' 11": If seen contact police @ 919 or CID 502-9991 502-9992: See Photo: https://www.facebook.com/share/p/1BtjVU4m7P/`;
  const fields = extractPersonFields(body);

  assert.equal(fields.person.name, 'Clore Simon');
  assert.equal(fields.person.gender, 'Female');
  assert.equal(fields.person.age, 17);
  assert.equal(fields.person.complexion, 'Dark Brown');
  assert.equal(fields.person.build, 'Slim Build');
  assert.equal(fields.person.height, "4' 11");
  assert.equal(fields.lastSeen.when, 'Monday, 26th October, 2026');
  assert.equal(fields.lastSeen.where, 'Roland Street');
  assert.equal(fields.contact, '919 or CID 502-9991 502-9992');
  assert.equal(fields.photo, 'https://www.facebook.com/share/p/1BtjVU4m7P/');
});

test('alerts: candidate gate filters out non-person "missing", court convictions and foreign noise', () => {
  assert.equal(
    isAlertCandidate(
      {
        title: 'Attorney loses appeal over $862k missing funds',
        summary: 'The Court of Appeal upheld a decision in Nassau.',
      },
      { bahamian: true },
    ),
    false,
  );
  assert.equal(
    isAlertCandidate(
      {
        title: 'Voters face missing names despite short election lines',
        summary: 'Complaints about voters missing from the register in New Providence.',
      },
      { bahamian: true },
    ),
    false,
  );
  assert.equal(
    isAlertCandidate(
      {
        title: 'Three Eleuthera residents charged with the murder of missing mother',
        summary: 'Three people were arraigned in Magistrate Court in Nassau.',
      },
      { bahamian: true },
    ),
    false,
  );
  assert.equal(
    isAlertCandidate(
      {
        title: 'Federal fugitive law may end up costing missing ex-school building chief',
        summary: 'Hartford Courant report from Connecticut.',
      },
      { bahamian: false },
    ),
    false,
  );
  assert.equal(
    isAlertCandidate(
      {
        title: 'Police searching for missing 15-year-old girl in Freeport',
        summary: 'Royal Bahamas Police Force in Grand Bahama asks anyone with information to call 919.',
      },
      { bahamian: false },
    ),
    true,
  );
});

test('alerts: ingest merges bulletins with RSS and strips general-news noise', async () => {
  const xml = await read('../fixtures/alerts/marcos-alert.xml');
  const bulletinsFile = JSON.parse(await read('../bulletins.json'));

  const { items, report } = await ingest({
    config: { sources: [], alertQueries: [] },
    bulletins: bulletinsFile.bulletins,
    fixtures: [{ source: 'marco-alert', publisher: 'Royal Bahamas Police Force', xml }],
    now: '2026-10-29T17:00:00Z',
  });

  // 2 real Marco's Alerts (Nikita Smith + Clore Simon); "missing funds" appeal is filtered out,
  // and Nikita Smith appearing in both bulletins.json and fixture XML collapses to 1 record.
  assert.equal(items.length, 2);
  assert.equal(report.totals.duplicatesRemoved, 1);

  const nikita = items.find((i) => i.person.name === 'Nikita Smith');
  assert.ok(nikita, 'expected Nikita Smith Marco\'s Alert');
  assert.equal(nikita.island, 'New Providence');
  assert.equal(nikita.location, 'Pride Estate, New Providence');
  assert.equal(nikita.urgency, 'high');
  assert.equal(nikita.alertType, 'marco');
  assert.equal(nikita.photoKind, 'page');
});

test('alerts: validateAlertSubmission accepts Cell Broadcast text and rejects junk', () => {
  const good = validateAlertSubmission({
    text: `Nikita Smith (Female) 17yrs of Pride Estate, New Providence. Last seen Wednesday, 28th October, 2026: @ her residence. Complexion: Light Brown, Medium Build: If seen contact police @ 919 or CID 502-9991 502-9992: See Photo: https://www.facebook.com/share/p/1Fnp3UugWB/`,
  });
  assert.equal(good.ok, true);
  assert.equal(good.item.person.name, 'Nikita Smith');
  assert.equal(good.item.island, 'New Providence');

  const bad = validateAlertSubmission({
    text: 'Check out our weekend brunch deals on Bay Street!',
  });
  assert.equal(bad.ok, false);
});

test('alerts: multiple concurrent Marco\'s Alerts both survive mergeFeedItems at the top of /feed', () => {
  const reports = [
    { id: 'r1', kind: 'report', category: 'flooding', createdAt: '2026-10-29T16:50:00Z' },
    { id: 'r2', kind: 'report', category: 'road', createdAt: '2026-10-29T16:40:00Z' },
  ];
  const alertsAndWire = [
    { id: 'a-nikita', kind: 'alert', category: 'safety', urgency: 'high', sortWeight: 98 },
    { id: 'a-clore', kind: 'alert', category: 'safety', urgency: 'high', sortWeight: 94 },
    { id: 'w-road', kind: 'wire', category: 'road', sortWeight: 82 },
  ];

  const merged = mergeFeedItems(reports, alertsAndWire, { window: 6, maxWireShare: 0.4, maxPerCategory: 1 });
  assert.equal(merged.placedAlerts, 2);
  assert.equal(merged.items[0].id, 'a-nikita');
  assert.equal(merged.items[1].id, 'a-clore');
});

test('classify: wire engine promotes Marco\'s Alerts as civic while keeping court stories non-civic', () => {
  const marco = classify({
    title: "Marco's Alert — Nikita Smith, 17, reported missing in Pride Estate",
    summary: 'If seen contact police @ 919 or CID 502-9991.',
  });
  assert.equal(marco.category, 'safety');
  assert.equal(marco.civic, true);

  const court = classify({
    title: 'Three charged with the murder of missing woman in Magistrate Court',
    summary: 'Three suspects were arraigned in Nassau.',
  });
  assert.equal(court.civic, false);
});

test('alerts: ingest fails soft on a dead source', async () => {
  const { items, report } = await ingest({
    config: {
      sources: [{ id: 'dead', name: 'Dead Outlet', url: 'http://127.0.0.1:1/nope.xml' }],
    },
    now: '2026-10-29T17:00:00Z',
  });
  assert.equal(items.length, 0);
  assert.equal(report.sources[0].ok, false);
  assert.ok(report.sources[0].error);
});
