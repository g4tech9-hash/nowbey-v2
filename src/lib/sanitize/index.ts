import DOMPurify from "isomorphic-dompurify";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201c",
  rdquo: "\u201d",
  hellip: "\u2026",
  ndash: "\u2013",
  mdash: "\u2014",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const c = parseInt(h, 16);
      return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : "";
    })
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number(n);
      return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : "";
    })
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Cleans low-trust RSS article summaries before they are rendered with
 * dangerouslySetInnerHTML. DOMPurify does the real work (event handlers,
 * javascript: URLs, SVG/math vectors, style expressions); the raw-JS embed
 * pattern our feeds sometimes carry is stripped first.
 *
 * Kept for call-sites that intentionally render HTML (none of the wire list
 * uses it after this change — the wire now uses stripMarkup for plain text).
 */
export function sanitizeArticleContent(text: string): string {
  if (!text) return "";

  // Raw JS embed strings some feeds carry, e.g. smb('loadExternalVideo', ...).
  const pre = text.replace(/smb\(['"].*?['"]\s*,\s*['"].*?['"].*?\);?/gim, "");

  try {
    return DOMPurify.sanitize(pre, {
      ALLOWED_TAGS: ["p", "br", "b", "i", "em", "strong", "u", "a", "ul", "ol", "li", "blockquote"],
      ALLOWED_ATTR: ["href", "title", "target", "rel"],
      ALLOW_DATA_ATTR: false,
    }).trim();
  } catch {
    // If the sanitizer itself ever fails, fail closed: plain text, never raw HTML.
    return pre.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

/**
 * Plain-text wire summaries: no markup ever reaches the UI.
 *
 * Feed summaries are already plain-texted by ingest's decode(), but defence in
 * depth matters — a double-escaped feed, a manually-seeded row, or an old row
 * that predates the style-strip can still carry <p>, <style>, smb() or
 * &lt;entity&gt; fragments. The Wire screen (web + mobile) and the story detail
 * page all use this helper so every surface shows the same clean text.
 *
 * Steps: strip smb(), strip script/style blocks, strip any remaining tags,
 * decode numeric + named entities (so &lt; &amp; etc. do not re-create tags
 * visually), strip tags again in case entities decoded into them, normalize
 * whitespace. Also drops the Advertisement prefix some feeds prepend.
 */
export function stripMarkup(text: string): string {
  if (!text) return "";
  let out = text.replace(/smb\(['"].*?['"]\s*,\s*['"].*?['"].*?\);?/gim, "");
  // Remove script/style content entirely (BPL press releases embed full stylesheets).
  out = out.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  // Strip any HTML tag that remains.
  out = out.replace(/<[^>]*>/g, " ");
  // Decode entities so &lt;b&gt; does not appear as a literal tag, and &amp; etc.
  // are readable. Numeric entities first (they can encode any codepoint).
  out = decodeEntities(out);
  // Entities may have decoded into new tags — strip again.
  out = out.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");
  // Collapse whitespace and drop the Advertisement boilerplate some feeds prepend.
  out = out.replace(/\bAdvertisement\b/gi, "").replace(/\s+/g, " ").trim();
  // Trailing ellipsis / bracket markers that feeds append (already handled in
  // ingest's cleanSnippet, repeated here for direct DB rows).
  out = out.replace(/\s*\[\.\.\.\]\s*$/g, "").replace(/\s*…\s*$/g, "").trim();
  return out;
}

/**
 * @deprecated Use stripMarkup for wire summaries. Kept as an alias so call-sites
 * outside the wire that still expect a “sanitized but plain” result keep working
 * without a major bump.
 */
export const sanitizeSummary = stripMarkup;
