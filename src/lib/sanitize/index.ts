import DOMPurify from "isomorphic-dompurify";

/**
 * Cleans low-trust RSS article summaries before they are rendered with
 * dangerouslySetInnerHTML. DOMPurify does the real work (event handlers,
 * javascript: URLs, SVG/math vectors, style expressions); the raw-JS embed
 * pattern our feeds sometimes carry is stripped first.
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
