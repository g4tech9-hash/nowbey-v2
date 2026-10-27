/**
 * Plain-text helpers for feed extraction and classification.
 * No dependencies: the ingest has to run inside a serverless function with no
 * build step, so everything here is hand-rolled and synchronous.
 */

const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  laquo: '\u00ab',
  raquo: '\u00bb',
  bull: '\u2022',
  middot: '\u00b7',
  deg: '\u00b0',
  times: '\u00d7',
  eacute: '\u00e9',
  egrave: '\u00e8',
  agrave: '\u00e0',
  ccedil: '\u00e7',
  uuml: '\u00fc',
  ouml: '\u00f6',
  auml: '\u00e4',
  shy: '',
  zwj: '',
  zwnj: '',
};

export function decodeEntities(input = '') {
  return String(input).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = NAMED[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

export function stripCdata(input = '') {
  return String(input).replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
}

/** Remove tags, scripts, styles and entities; collapse whitespace. */
export function stripHtml(input = '') {
  let out = String(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  out = stripCdata(out);
  out = decodeEntities(out);
  return out.replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}

export function truncate(input = '', max = 220) {
  const s = stripHtml(input);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop >= Math.floor(max * 0.5)) return cut.slice(0, stop + 1).trim();
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 0 ? space : max).trim()}\u2026`;
}

/** Lowercase, strip punctuation and diacritics, keep word boundaries. */
export function normalise(input = '') {
  return decodeEntities(String(input))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(
  `a an the and or but of for to in on at by with from as is are was were be been being
   it its this that these those his her their our your they we he she you i not no nor
   after before over under about into than then so if has have had do does did can will
   says said say new more most less least who whom what when where why how`
    .split(/\s+/)
    .filter(Boolean),
);

export function tokens(input = '') {
  return normalise(input)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function wordCount(input = '') {
  const s = stripHtml(input);
  return s ? s.split(/\s+/).length : 0;
}

/** Jaccard similarity over token sets — used for de-duplication. */
export function similarity(a = '', b = '') {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / (A.size + B.size - shared);
}

/**
 * Google News descriptions repeat the headline, then the outlet name:
 *   "Portion of East Street closed  The Nassau Guardian"
 * Posting that as a standfirst makes every card say the same thing twice, so
 * strip a summary that merely echoes the title and trim the trailing byline.
 */
export function dropEchoedTitle(summary = '', title = '', publisher = '') {
  let s = stripHtml(summary);
  const t = stripHtml(title);
  if (!s) return '';
  if (t && s.toLowerCase().startsWith(t.toLowerCase())) {
    s = s.slice(t.length).trim();
  }
  if (publisher) {
    const p = new RegExp(`\\s*[-\\u2013|]?\\s*${escapeRegExp(publisher)}\\s*$`, 'i');
    s = s.replace(p, '').trim();
  }
  // If nothing meaningful is left, there is no standfirst worth showing.
  return s.replace(/^[-|·\s]+/, '').trim().length < 12 ? '' : s;
}

function escapeRegExp(input = '') {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Google News titles arrive as "Headline - Publisher". */
export function splitPublisherSuffix(title = '', publisher = '') {
  const clean = decodeEntities(String(title)).trim();
  if (!publisher) return { title: clean, stripped: false };
  const suffix = ` - ${publisher}`;
  const suffixLong = ` \u2013 ${publisher}`;
  for (const s of [suffixLong, suffix]) {
    if (clean.toLowerCase().endsWith(s.toLowerCase())) {
      return { title: clean.slice(0, -s.length).trim(), stripped: true };
    }
  }
  return { title: clean, stripped: false };
}
