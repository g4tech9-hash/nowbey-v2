const NAMED: Record<string, string> = {
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
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

/**
 * Plain-text wire summaries for React Native (no DOMPurify available).
 * Mirrors src/lib/sanitize/index.ts#stripMarkup so web and mobile show the
 * same clean text — no <p>, <style>, smb(), or entity-encoded tags.
 */
export function stripMarkup(text: string): string {
  if (!text) return "";
  let out = text.replace(/smb\(['"].*?['"]\s*,\s*['"].*?['"].*?\);?/gim, "");
  out = out.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  out = out.replace(/<[^>]*>/g, " ");
  out = decodeEntities(out);
  out = out.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");
  // Event handlers and javascript: URLs can survive tag stripping as attribute text.
  out = out.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*')/gi, " ");
  out = out.replace(/javascript:[^\s"'<>]*/gi, "");
  out = out.replace(/\bAdvertisement\b/gi, "").replace(/\s+/g, " ").trim();
  out = out.replace(/\s*\[\.\.\.\]\s*$/g, "").replace(/\s*…\s*$/g, "").trim();
  return out;
}

/**
 * Back-compat alias: existing mobile call-sites import sanitizeArticleContent
 * and render inside <Text> (which cannot render HTML). They now get plain text.
 */
export function sanitizeArticleContent(text: string): string {
  return stripMarkup(text);
}

export const sanitizeSummary = stripMarkup;
