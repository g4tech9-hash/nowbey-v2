/**
 * Where the browser is allowed to be sent back to.
 *
 * A `next` parameter is written by whoever sent the link, so it is treated as hostile: it is only
 * used when it provably stays inside this site. The check is not a pattern match against the text,
 * because a browser does not read a path the way it looks. The value is resolved the way a browser
 * resolves it, and anything that ends up on another site is refused.
 */

/** The origin the check resolves against. Any constant will do: only the shape of the result matters. */
const PROBE_ORIGIN = "http://nowbey.invalid";

/**
 * Only ever send the browser back inside this site.
 *
 * Refused, because a browser reads each of these as a different site:
 *   "//evil.com"        a protocol-relative absolute URL
 *   "/\evil.com"        a backslash is a slash to a browser, so this is "//evil.com"
 *   "/.//evil.com"      the "." segment is dropped, leaving "//evil.com"
 *   "/<tab>/evil.com"   the URL parser drops tabs and newlines, leaving "//evil.com"
 *
 * Anything that cannot be read as a path inside the site falls back to `fallback`.
 */
export function safeNext(raw: string | null, fallback = "/map"): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.length > 200) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(value, `${PROBE_ORIGIN}/`);
  } catch {
    return fallback;
  }
  // The same origin, and a path that does not begin with "//" — which is a host, not a path.
  if (resolved.origin !== PROBE_ORIGIN) return fallback;
  if (!resolved.pathname.startsWith("/") || resolved.pathname.startsWith("//")) return fallback;

  return value;
}
