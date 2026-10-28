import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { ingest, extractPersonFields, urgencyOf } from '../lib/alerts.mjs';

const HERE = resolve('.');
const read = (file) => readFile(resolve(HERE, file), 'utf8');

test('alerts: parses Marco\'s Alert into structured fields', () => {
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

test('alerts: urgency is high for a missing teenager', () => {
  const body = `Clore Simon (Female) 17yrs of Roland Street, New Providence. Last seen Monday.`;
  const fields = extractPersonFields(body);
  assert.equal(urgencyOf({ title: '', summary: body, person: fields.person }), 'high');
});

test('alerts: ingest collapses duplicate alerts across outlets', async () => {
  const xml = await read('fixtures/alerts/marcos-alert.xml');
  const { items, report } = await ingest({
    config: {
      sources: [
        {
          id: 'rbp',
          name: 'Royal Bahamas Police Force',
          url: 'data:text/xml;base64,' + Buffer.from(xml).toString('base64'),
        },
      ],
    },
    fixtures: [{ source: 'rbp', publisher: 'Royal Bahamas Police Force', xml }],
    now: '2026-10-28T10:00:00Z',
  });

  assert.ok(items.length >= 1, 'expected at least one alert');
  const marco = items.find((i) => i.person.name === 'Clore Simon');
  assert.ok(marco, 'expected Clore Simon alert');
  assert.equal(marco.category, 'safety');
  assert.equal(marco.island, 'New Providence');
  assert.equal(marco.civic, true);
  assert.ok(marco.photo, 'expected a photo URL');
  assert.equal(report.totals.highUrgency, 2, 'expected both teenagers to be high urgency');
  assert.equal(marco.urgency, 'high');
});

test('alerts: ingest fails soft on a dead source', async () => {
  const { items, report } = await ingest({
    config: {
      sources: [
        { id: 'dead', name: 'Dead Outlet', url: 'http://127.0.0.1:1/nope.xml' },
      ],
    },
    now: '2026-10-28T10:00:00Z',
  });
  assert.equal(items.length, 0);
  assert.equal(report.sources[0].ok, false);
  assert.ok(report.sources[0].error);
});
