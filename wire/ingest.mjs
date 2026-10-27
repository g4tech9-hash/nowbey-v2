#!/usr/bin/env node
/**
 * npx nowbey-wire / node wire/ingest.mjs
 *
 *   node ingest.mjs                          # fetch every live source
 *   node ingest.mjs --fixtures               # offline run against fixtures/
 *   node ingest.mjs --civic --limit 12       # only actionable items
 *   node ingest.mjs --out data/wire.json     # write the feed payload
 *   node ingest.mjs --json                   # machine-readable run report
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ingest } from './lib/ingest.mjs';
import { bridgeToFeed } from './lib/feed.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    config: resolve(HERE, 'sources.json'),
    out: null,
    limit: 60,
    recency: 7,
    timeout: 9000,
    civic: false,
    fixtures: false,
    json: false,
    quiet: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--config':
        args.config = resolve(argv[++i]);
        break;
      case '--out':
        args.out = resolve(argv[++i]);
        break;
      case '--limit':
        args.limit = Number(argv[++i]);
        break;
      case '--recency':
        args.recency = Number(argv[++i]);
        break;
      case '--timeout':
        args.timeout = Number(argv[++i]);
        break;
      case '--civic':
        args.civic = true;
        break;
      case '--fixtures':
        args.fixtures = true;
        break;
      case '--json':
        args.json = true;
        break;
      case '--quiet':
        args.quiet = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return args;
}

const HELP = `NowBey civic wire — ingest

  --fixtures        run offline against fixtures/manifest.json
  --civic           return only actionable (civic) items
  --limit <n>       max items in the payload (default 60)
  --recency <days>  how far back to ask Google News (default 7)
  --timeout <ms>    per-request timeout (default 9000)
  --out <path>      write JSON payload (items + report + feed cards)
  --json            print the payload instead of a summary table
  --quiet           no per-source logging
  --config <path>   alternate sources.json
`;

async function loadFixtures() {
  const manifestPath = resolve(HERE, 'fixtures/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const fixtures = [];
  for (const entry of manifest.fixtures) {
    const xml = await readFile(resolve(HERE, 'fixtures', entry.file), 'utf8');
    fixtures.push({ source: entry.source, publisher: entry.publisher, xml });
  }
  return fixtures;
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const config = JSON.parse(await readFile(args.config, 'utf8'));
  const fixtures = args.fixtures ? await loadFixtures() : undefined;

  const { items, report } = await ingest({
    config,
    limit: args.limit,
    recencyDays: args.recency,
    timeoutMs: args.timeout,
    fixtures,
    log: args.quiet || args.json ? () => {} : (line) => process.stderr.write(`  ${line}\n`),
  });

  const selected = args.civic ? items.filter((i) => i.civic) : items;
  const { cards } = bridgeToFeed(selected, { allowNonCivic: args.civic });

  const payload = {
    generatedAt: report.fetchedAt,
    mode: args.fixtures ? 'fixtures' : 'live',
    counts: { ...report.totals, selected: selected.length, feedCards: cards.length },
    items: selected,
    feedCards: cards,
    report,
  };

  if (args.out) {
    await mkdir(dirname(args.out), { recursive: true });
    await writeFile(args.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const t = report.totals;
  process.stdout.write(
    `\nNowBey wire — ${report.fetchedAt} (${payload.mode})\n` +
      `${t.ok}/${t.sources} sources up · ${t.raw} items in · ${t.duplicatesRemoved} dupes merged · ` +
      `${selected.length} shown · ${t.civic} civic · ${cards.length} feed cards\n\n`,
  );

  process.stdout.write(`${pad('AGE', 9)}${pad('CATEGORY', 13)}${pad('ISLAND', 16)}${pad('CIV', 5)}TITLE\n`);
  process.stdout.write(`${'-'.repeat(100)}\n`);
  for (const item of selected.slice(0, 40)) {
    const flag = item.civic ? '✓' : ' ';
    process.stdout.write(
      `${pad(item.ageLabel, 9)}${pad(item.categoryLabel, 13)}${pad(item.island || '\u2014', 16)}${pad(flag, 5)}${item.title}\n` +
        (item.summary && item.civic ? `${pad('', 43)}${item.summary.slice(0, 72)}\n` : ''),
    );
  }

  const failed = report.sources.filter((s) => !s.ok);
  if (failed.length) {
    process.stdout.write(`\nSources that failed (soft):\n`);
    for (const source of failed) {
      process.stdout.write(`  ${source.id} — ${source.error}\n`);
    }
  }
  if (args.out) process.stdout.write(`\nWrote ${args.out}\n`);
}

main().catch((error) => {
  process.stderr.write(`wire ingest failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
