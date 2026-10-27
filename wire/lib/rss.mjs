/**
 * Tolerance-first RSS 2.0 / Atom / RDF reader.
 *
 * Bahamian newsroom feeds are inconsistent: some emit Atom, some emit RSS 2.0
 * with content:encoded, some drop the channel title, Tribune242's titles carry
 * the outlet as a suffix. Rather than depend on a strict XML parser (and fail
 * on the one malformed entity in a feed), this walks the item blocks and pulls
 * fields defensively.
 */

import {
  decodeEntities,
  dropEchoedTitle,
  splitPublisherSuffix,
  stripCdata,
  stripHtml,
  truncate,
} from './text.mjs';

/** Raw inner text of the first tag among `names` (handles CDATA + entities). */
function tagText(block, ...names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
    const m = block.match(re);
    if (m) {
      const value = stripHtml(stripCdata(m[1]));
      if (value) return value;
    }
  }
  return '';
}

/** Atom-style self-closing <link href="..."/>, else RSS <link>inner</link>. */
function firstLink(block) {
  const selfClosing = block.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\/?>/i);
  if (selfClosing) return decodeEntities(selfClosing[1].trim());
  const inner = tagText(block, 'link');
  if (inner) return inner;
  const guid = block.match(/<guid\b[^>]*isPermaLink\s*=\s*["']true["'][^>]*>([\s\S]*?)<\/guid>/i);
  if (guid) return decodeEntities(stripCdata(guid[1])).trim();
  return '';
}

function attr(block, tag, name) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${name}\\s*=\\s*["']([^"']*)["'][^>]*>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

export function parseDate(input) {
  if (!input) return null;
  const value = stripCdata(String(input)).trim();
  const ms = Date.parse(value);
  if (Number.isFinite(ms)) return new Date(ms).toISOString();
  // Some feeds emit "Mon, 26 Oct 2026 09:41:00 +0000 (UTC)" or trailing junk.
  const trimmed = value.replace(/\s*\([^)]*\)\s*$/, '');
  const retry = Date.parse(trimmed);
  return Number.isFinite(retry) ? new Date(retry).toISOString() : null;
}

/**
 * @returns {{ feedTitle: string, items: RawItem[] }}
 */
export function parseFeed(xml, { source = null } = {}) {
  const doc = String(xml || '');
  const feedTitle =
    tagText(doc.match(/<channel\b[^>]*>[\s\S]*?<\/channel>/i)?.[0] || doc, 'title') || '';

  const blocks = [...doc.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  const fallbackPublisher =
    (source && source.name) || stripTitleSuffix(feedTitle) || attr(doc, 'source', 'url');

  const items = [];
  for (const block of blocks) {
    const declared = tagText(block, 'source');
    const publisher = declared || fallbackPublisher || '';
    const rawTitle = tagText(block, 'title');
    const { title, stripped } = splitPublisherSuffix(rawTitle, declared);
    const link = firstLink(block);
    const summarySource = tagText(block, 'content:encoded', 'description', 'summary', 'content');
    const published =
      parseDate(tagText(block, 'pubDate', 'published', 'updated', 'dc:date')) || null;

    if (!title || !link) continue;

    items.push({
      title,
      url: link,
      publisher,
      summary: truncate(dropEchoedTitle(summarySource, title, declared || publisher), 280),
      publishedAt: published,
      guid: tagText(block, 'guid', 'id') || link,
      titleSuffixStripped: stripped,
    });
  }
  return { feedTitle: feedTitle || '', items };
}

function stripTitleSuffix(title) {
  const clean = stripHtml(title);
  if (!clean) return '';
  const parts = clean.split(/\s+[-\u2013]\s+/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : clean;
}

/** Google News search RSS URL for a query. */
export function googleNewsUrl(query, options = {}) {
  const base = options.base || 'https://news.google.com/rss/search';
  const params = new URLSearchParams({ q: query });
  for (const [k, v] of Object.entries(options.params || {})) params.set(k, v);
  return `${base}?${params.toString()}`;
}
