#!/usr/bin/env node
/*
 * RSS 2.0 QA harness — validates a Facebook→RSS conversion endpoint (or any RSS feed).
 *
 * Checks, in order:
 *   [1] Transport   — HTTP status + Content-Type (only with --url)
 *   [2] XML health  — strict XML 1.0 well-formedness (unescaped &, undefined entities,
 *                     control chars, mismatched/unclosed tags, DOCTYPE/XXE, mojibake)
 *   [3] RSS schema  — root/version, required <channel> children, item structure,
 *                     RFC-822 pubDate, <enclosure> attributes, element typos
 *   [4] Content     — channel title/link match the target FB page, recent posts exist,
 *                     CDATA / double-escaping quality, unsafe HTML
 *   [5] Data proof  — title/date/link of the most recent post
 *   [6] NowBey ingest compat — faithful re-run of src/lib/ingest.ts parseFeed()/fetchXml()
 *                     gates: which items would actually be ingested in production
 *   [7] Fixes       — line-referenced, copy-pasteable corrections
 *
 * Usage:
 *   node qa/rss-qa/validate.mjs --url "https://site/feed?url=https://www.facebook.com/mybpl242/"
 *   node qa/rss-qa/validate.mjs --url "..." [--expect-title "Bahamas Power"] [--expect-link "facebook.com/mybpl242"]
 *   node qa/rss-qa/validate.mjs --file path/to/feed.xml
 *   cat feed.xml | node qa/rss-qa/validate.mjs --stdin
 *   node qa/rss-qa/validate.mjs --selftest          # run the fixture suite, exit 1 on regression
 *
 * Exit codes: 0 = PASS, 2 = PASS WITH WARNINGS, 1 = FAIL (or harness error).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* ───────────────────────── constants ───────────────────────── */

const PREDEFINED = new Set(["amp", "lt", "gt", "quot", "apos"]);
const RFC822_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const RFC822_RE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}\s+\d{2}:\d{2}(?::\d{2})?\s*(?:[+-]\d{4}|UT|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)?$/;
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;
const KNOWN_CHANNEL = new Set([
  "title", "link", "description", "language", "copyright", "managingEditor", "webMaster",
  "pubDate", "lastBuildDate", "category", "generator", "docs", "cloud", "ttl", "image",
  "rating", "textInput", "skipHours", "skipDays", "item", "atom:link", "dc:date", "dc:language",
  "dc:rights", "dc:creator", "dc:publisher", "sy:updatePeriod", "sy:updateFrequency", "itunes:owner",
]);
const KNOWN_ITEM = new Set([
  "title", "link", "description", "author", "category", "comments", "enclosure",
  "guid", "pubDate", "source", "content:encoded", "dc:date", "dc:creator", "dc:content",
  "media:content", "media:thumbnail", "media:title", "media:description", "media:credit",
  "media:copyright", "media:group", "atom:link", "atom:updated", "atom:summary", "updated",
  "published", "summary", "content", "expiry", "fb:post", "fb:name", "fb:caption", "fb:description",
]);
const TYPO_MAP = new Map([
  ["pubdate", "pubDate"], ["pub_date", "pubDate"], ["lastbuilddate", "lastBuildDate"],
  ["descrption", "description"], ["descripton", "description"], ["titel", "title"],
  ["enclousre", "enclosure"], ["guld", "guid"], ["categorie", "category"],
]);

/* ───────────────────────── findings ───────────────────────── */

let FINDINGS = [];
const finding = (severity, code, message, { line, excerpt, fix, fixLang = "xml" } = {}) => {
  FINDINGS.push({ severity, code, message, line, excerpt, fix, fixLang });
};
const err = (code, message, extra) => finding("ERROR", code, message, extra);
const warn = (code, message, extra) => finding("WARN", code, message, extra);
const info = (code, message, extra) => finding("INFO", code, message, extra);

/* ───────────────────────── XML scanner ───────────────────────── */

/** Scan raw XML for well-formedness; build an element tree. Returns { root, ok, truncated }. */
function scanXml(src) {
  const n = src.length;
  const lineStarts = [0];
  for (let i = 0; i < n; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  const lineAt = (idx) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  const excerptAt = (idx) => {
    const start = lineStarts[lineAt(idx) - 1];
    const end = src.indexOf("\n", idx);
    return src.slice(start, end < 0 ? n : end).trim().slice(0, 160);
  };
  const at = (idx) => ({ line: lineAt(idx), excerpt: excerptAt(idx) });

  if (src.charCodeAt(0) === 0xfeff) info("ENC_BOM", "UTF-8 BOM present at byte 0 — tolerated by most readers, rejected by a few strict ones.", at(0));

  const root = { type: "root", children: [] };
  const stack = [];
  let rootEl = null;
  let sawRootClose = false;
  let i = 0;
  let truncated = false;

  /** Pure audit: entity references, control chars, mojibake, stray ']]>' — no tree mutation. */
  const auditChars = (text, idx) => {
    if (INVALID_XML_CHARS.test(text)) {
      const m = text.match(INVALID_XML_CHARS);
      err("WF_CTRL_CHAR", `Invalid XML control character U+${m[0].codePointAt(0).toString(16).padStart(4, "0").toUpperCase()} in content (strip it or use a numeric character reference).`, at(idx + text.indexOf(m[0])));
    }
    if (/Ã[©³±­«]|â€[˜™œ“]|\uFFFD/.test(text)) {
      warn("ENC_MOJIBAKE", "UTF-8 bytes appear to have been decoded as Latin-1 (Ã© / â€œ / � somewhere). Declare encoding=\"UTF-8\" and serve the bytes as UTF-8.", at(idx));
    }
    if (text.includes("]]>")) err("WF_CDATA_END", "Literal \"]]>' in text content is forbidden by XML — escape it as ]]&gt;.", at(idx + text.indexOf("]]>")));
    const re = /&(#[0-9]+;|#[xX][0-9a-fA-F]+;|[A-Za-z_:][A-Za-z0-9._:-]*;)?/g;
    let m;
    while ((m = re.exec(text))) {
      const abs = idx + m.index;
      if (!m[1]) {
        err("WF_AMP", "Unescaped '&' in content — XML requires &amp; (the feed will hard-fail strict parsers).", { ...at(abs), fix: text.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, "&amp;").trim().slice(0, 160) });
      } else if (m[1].startsWith("#")) {
        const num = m[1][1] === "x" || m[1][1] === "X" ? parseInt(m[1].slice(2, -1), 16) : parseInt(m[1].slice(1, -1), 10);
        if (!Number.isFinite(num) || num <= 0 || num > 0x10ffff || (num >= 0xd800 && num <= 0xdfff) || (num < 0x20 && num !== 9 && num !== 10 && num !== 13))
          err("WF_CHARREF", `Numeric character reference ${m[0]} resolves to an invalid XML character.`, at(abs));
      } else {
        const name = m[1].slice(0, -1);
        if (!PREDEFINED.has(name))
          err("WF_ENTITY_UNDEFINED", `Undefined entity &${name}; — plain XML has no DTD, so only &amp; &lt; &gt; &quot; &apos; and &#…; references are legal. Replace &${name}; with the literal characters or a numeric reference (e.g. &#160; for &nbsp;).`, { ...at(abs), fix: text.replace(new RegExp(`&${name};`, "g"), "&amp;" + name + ";").trim().slice(0, 160) });
      }
    }
  };

  const pushText = (text, idx) => {
    auditChars(text, idx);
    const parent = stack.length ? stack[stack.length - 1] : root;
    if (text.trim()) parent.children.push({ type: "text", value: text, line: lineAt(idx) });
  };

  const pushCdata = (value, idx) => {
    if (INVALID_XML_CHARS.test(value)) {
      const m = value.match(INVALID_XML_CHARS);
      err("WF_CTRL_CHAR", `Invalid XML control character U+${m[0].codePointAt(0).toString(16).padStart(4, "0").toUpperCase()} inside CDATA.`, at(idx + value.indexOf(m[0])));
    }
    if (/Ã[©³±­«]|â€[˜™œ“]|\uFFFD/.test(value)) warn("ENC_MOJIBAKE", "Likely UTF-8→Latin-1 mojibake inside CDATA (Ã© / â€œ / �). Serve the document as UTF-8 and declare it.", at(idx));
    const parent = stack.length ? stack[stack.length - 1] : root;
    parent.children.push({ type: "cdata", value, line: lineAt(idx) });
  };

  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) { pushText(src.slice(i), i); break; }
    if (lt > i) pushText(src.slice(i, lt), i);

    if (src.startsWith("<!--", lt)) {
      const end = src.indexOf("-->", lt + 4);
      if (end < 0) { err("WF_COMMENT", "Unterminated <!-- comment --> (no closing '-->').", at(lt)); truncated = true; break; }
      if (/--/.test(src.slice(lt + 4, end))) warn("WF_COMMENT", "XML comments must not contain '--'.", at(lt));
      i = end + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", lt)) {
      const end = src.indexOf("]]>", lt + 9);
      if (end < 0) { err("WF_CDATA", "Unterminated <![CDATA[ section (no closing ']]>').", at(lt)); truncated = true; break; }
      pushCdata(src.slice(lt + 9, end), lt + 9);
      i = end + 3;
      continue;
    }
    if (src.startsWith("<?", lt)) {
      const end = src.indexOf("?>", lt + 2);
      if (end < 0) { err("WF_PI", "Unterminated processing instruction (no closing '?>').", at(lt)); truncated = true; break; }
      const pi = src.slice(lt + 2, end);
      if (/^xml(\s|$)/i.test(pi)) {
        if (lt !== 0 && !(lt === 1 && src.charCodeAt(0) === 0xfeff))
          err("WF_DECL_POS", "The XML declaration <?xml …?> may only appear at the very start of the document.", at(lt));
        const enc = /encoding\s*=\s*["']([^"']+)["']/i.exec(pi);
        if (enc && !/^(utf-?8|utf-16le|utf-16be|us-ascii|iso-8859-1|windows-1252)$/i.test(enc[1]))
          warn("ENC_UNKNOWN", `Unusual declared encoding "${enc[1]}" — prefer UTF-8 for a feed.`, at(lt));
        info("ENC_DECL", enc ? `XML declaration found (encoding: ${enc[1]}).` : "XML declaration found without an encoding attribute — recipients assume UTF-8.", at(lt));
      }
      i = end + 2;
      continue;
    }
    if (src.startsWith("<!", lt)) {
      if (/^<!DOCTYPE/i.test(src.slice(lt, lt + 9))) {
        err("WF_DOCTYPE", "A DOCTYPE declaration is forbidden in a feed body (DTD/XXE / billion-laughs risk; every reader will reject or sandbox it). Remove it entirely.", at(lt));
        let depth = 0, j = lt;
        for (; j < n; j++) {
          if (src[j] === "[") depth++;
          else if (src[j] === "]") depth--;
          else if (src[j] === ">" && depth <= 0) break;
        }
        i = j + 1;
      } else {
        err("WF_BANG", `Unknown "<!" declaration at this position — only <!-- -->, <![CDATA[ and <!DOCTYPE are legal.`, at(lt));
        const end = src.indexOf(">", lt);
        i = end < 0 ? n : end + 1;
      }
      continue;
    }

    // element tag
    let j = lt + 1;
    const closing = src[j] === "/";
    if (closing) j++;
    const nameM = /^[A-Za-z_:][A-Za-z0-9._:-]*/.exec(src.slice(j, Math.min(n, j + 400)));
    if (!nameM) {
      err("WF_TAG_NAME", `'<' followed by "${src.slice(j, j + 12).replace(/\n/g, "\\n")}" is not a valid element name — a stray '<' must be escaped as &lt;.`, { ...at(lt), fix: "Escape the bare '<' as &lt; (or wrap the description content in <![CDATA[ … ]]>)." });
      const end = src.indexOf(">", lt);
      i = end < 0 ? n : end + 1;
      continue;
    }
    const name = nameM[0];
    j += name.length;

    if (closing) {
      // skip to '>'
      const end = src.indexOf(">", j);
      i = end < 0 ? n : end + 1;
      if (!stack.length) {
        err("WF_STRAY_CLOSE", `Closing </${name}> has no matching open element.`, at(lt));
        continue;
      }
      const top = stack[stack.length - 1];
      if (top.name === name) {
        stack.pop();
        if (!stack.length) sawRootClose = true;
      } else {
        const idx = [...stack].reverse().findIndex((s) => s.name === name);
        if (idx >= 0) {
          err("WF_MISMATCH", `</${name}> on this line closes past still-open <${top.name}> (opened on line ${top.line}).`, at(lt));
          stack.length = stack.length - 1 - idx; // resync
        } else {
          err("WF_MISMATCH", `</${name}> does not match open <${top.name}> (opened on line ${top.line}).`, at(lt));
        }
      }
      continue;
    }

    // opening tag: parse attributes
    const node = { type: "element", name, attrs: {}, children: [], line: lineAt(lt) };
    const attrOrder = [];
    let selfClose = false;
    for (;;) {
      while (j < n && /\s/.test(src[j])) j++;
      if (j >= n) { err("WF_TAG_EOF", `Tag <${name}> … hits end-of-document before '>' — the document is truncated.`, at(lt)); truncated = true; break; }
      if (src[j] === "/" && src[j + 1] === ">") { selfClose = true; j += 2; break; }
      if (src[j] === ">") { j++; break; }
      const aNameM = /^[A-Za-z_:][A-Za-z0-9._:-]*/.exec(src.slice(j, Math.min(n, j + 200)));
      if (!aNameM) {
        err("WF_ATTR_NAME", `Malformed attribute near <${name} … "${src.slice(j, j + 12)}". Attribute names must be XML names.`, at(j));
        const end = src.indexOf(">", j);
        j = end < 0 ? n : end;
        continue;
      }
      const aName = aNameM[0];
      j += aName.length;
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] !== "=") {
        err("WF_ATTR_EQ", `Attribute "${aName}" on <${name}> is missing '=' (XML requires attribute="value").`, at(j));
        continue;
      }
      j++;
      while (j < n && /\s/.test(src[j])) j++;
      const q = src[j];
      let aValue;
      if (q !== '"' && q !== "'") {
        err("WF_ATTR_QUOTES", `Attribute "${aName}" on <${name}> is unquoted — XML requires quoted values.`, at(j));
        const vm = /^[^\s>]+/.exec(src.slice(j, Math.min(n, j + 300)));
        aValue = vm ? vm[0] : "";
        j += aValue.length;
      } else {
        j++;
        const vEnd = src.indexOf(q, j);
        if (vEnd < 0) { err("WF_ATTR_QUOTES", `Attribute "${aName}" on <${name}> has an unterminated ${q} quote.`, at(j)); truncated = true; break; }
        aValue = src.slice(j, vEnd);
        j = vEnd + 1;
      }
      if (aValue.includes("<")) err("WF_ATTR_LT", `Attribute "${aName}" on <${name}> contains a raw '<' — use &lt; inside attribute values.`, at(lt));
      if (aName in node.attrs) err("WF_ATTR_DUP", `Duplicate attribute "${aName}" on <${name}> — forbidden by XML.`, at(lt));
      // same entity/char audit as text content, but without touching the tree
      const saved = FINDINGS;
      FINDINGS = [];
      auditChars(aValue, j);
      const attrFindings = FINDINGS;
      FINDINGS = saved;
      for (const f of attrFindings) if (f.code !== "ENC_MOJIBAKE") finding(f.severity, f.code, `In attribute ${aName} of <${name}>: ${f.message}`, { line: lt === 0 ? 1 : undefined, excerpt: f.excerpt, fix: f.fix, fixLang: f.fixLang });
      node.attrs[aName] = aValue;
      attrOrder.push(aName);
    }
    const parent = stack.length ? stack[stack.length - 1] : root;
    if (!stack.length) {
      if (rootEl && sawRootClose) err("WF_JUNK_AFTER", `Element <${name}> appears after the root element closed — nothing may follow it.`, at(lt));
      else if (rootEl) err("WF_MULTI_ROOT", `Second root element <${name}> — XML documents have exactly one root (first on line ${rootEl.line}).`, at(lt));
      if (!rootEl) rootEl = node;
    }
    parent.children.push(node);
    if (!selfClose) stack.push(node);
    if (truncated) break;
    i = j;
    if (i <= lt) i = lt + 1; // safety against loops
  }
  for (const open of stack) err("WF_UNCLOSED", `Element <${open.name}> (line ${open.line}) is never closed — the document ends while it is still open.`, { line: open.line, excerpt: undefined, fix: `Add </${open.name}> before the end of the document.` });
  // strip private fields
  const strip = (node) => { delete node._attrOrder; for (const c of node.children ?? []) if (c.type === "element") strip(c); };
  if (rootEl) strip(rootEl);
  return { root, rootEl, truncated };

  function pushTextIntoVoid(text, idx) { pushText(text, idx); }
}

/* ───────────────────────── helpers over the tree ───────────────────────── */

const elems = (node, name) => (node?.children ?? []).filter((c) => c.type === "element" && c.name === name);
const firstElem = (node, name) => elems(node, name)[0];
const textOf = (node) =>
  (node?.children ?? [])
    .map((c) => (c.type === "text" ? c.value : c.type === "cdata" ? c.value : ""))
    .join("")
    .trim();

/** Child elements of a description-like node that should have been escaped/CDATA-wrapped. */
function rawMarkupChildren(node) {
  return (node?.children ?? []).filter((c) => c.type === "element");
}
function serializeInner(node) {
  if (!node) return "";
  return node.children
    .map((c) =>
      c.type === "text" ? c.value :
      c.type === "cdata" ? `<![CDATA[${c.value}]]>` :
      `<${c.name}${Object.entries(c.attrs).map(([k, v]) => ` ${k}="${v}"`).join("")}>${serializeInner(c)}</${c.name}>`)
    .join("");
}

/* ───────────────────────── RFC-822 date check ───────────────────────── */

function dateCheck(raw, line, excerpt, { isLatest }) {
  const parsed = new Date(raw);
  const okShape = RFC822_RE.test(raw);
  if (Number.isNaN(parsed.getTime())) {
    if (raw) warn("DATE_UNPARSEABLE", `pubDate "${raw}" cannot be parsed by any reader (RFC-822 required).`, { line, excerpt, fix: formatRfc822(new Date()) });
    else warn("DATE_MISSING", `Item has no <pubDate>. RSS 2.0 marks it optional, but every consumer here needs it${isLatest ? " — and this is the newest item" : ""}; sort order will fall back to fetch time.`, { line, excerpt, fix: formatRfc822(new Date()) });
    return { parsed: null, raw };
  }
  if (!okShape) {
    warn("DATE_NOT_RFC822", `<pubDate> "${raw}" is parseable but is not RFC-822 ("Tue, 13 Oct 2026 14:30:00 +0000"). Strict RSS 2.0 validators flag this and some readers drop the date.`, { line, excerpt, fix: formatRfc822(parsed) });
  }
  if (parsed.getTime() > Date.now() + 3600_000)
    warn("DATE_FUTURE", `pubDate "${raw}" is in the future — NowBey's ingest clamps future dates to fetch time (posts appear out of order) and other readers may pin it forever.`, { line, excerpt, fix: formatRfc822(new Date()) });
  const ageDays = (Date.now() - parsed.getTime()) / 86_400_000;
  return { parsed, raw, ageDays };
}
function formatRfc822(d) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (x) => String(x).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

/* ───────────────────────── RSS 2.0 semantic validation ───────────────────────── */

function validateRss(rootEl, opts) {
  if (!rootEl) return;
  if (rootEl.name === "feed") {
    err("SCHEMA_ROOT", "Root element is <feed> — this is an Atom document, not RSS 2.0. Consumers configured for RSS 2.0 (and the spec section of this test) expect <rss version=\"2.0\">.", { line: rootEl.line, excerpt: undefined });
    return;
  }
  if (rootEl.name === "rdf:RDF") {
    err("SCHEMA_ROOT", "Root element is <rdf:RDF> — RSS 1.0/RDF, not RSS 2.0.", { line: rootEl.line, excerpt: undefined });
    return;
  }
  if (rootEl.name !== "rss") err("SCHEMA_ROOT", `Root element is <${rootEl.name}> — RSS 2.0 requires <rss>.`, { line: rootEl.line, excerpt: undefined });
  const version = rootEl.attrs?.version;
  if (version === undefined) warn("SCHEMA_VERSION", "<rss> has no version attribute — RSS 2.0 requires version=\"2.0\".", { line: rootEl.line, fix: `<rss version="2.0">` });
  else if (version !== "2.0") warn("SCHEMA_VERSION", `<rss version="${version}"> — expected "2.0".`, { line: rootEl.line, fix: `<rss version="2.0">` });

  const channels = elems(rootEl, "channel");
  if (channels.length === 0) { err("SCHEMA_NO_CHANNEL", "No <channel> element under <rss> — the feed has no metadata container.", { line: rootEl.line }); return; }
  if (channels.length > 1) err("SCHEMA_CHANNEL", `${channels.length} <channel> elements — exactly one is allowed.`, { line: channels[1].line });
  const channel = channels[0];

  // required channel children
  for (const req of ["title", "link", "description"]) {
    const list = elems(channel, req);
    if (list.length === 0) err("SCHEMA_CHANNEL_MISSING", `<channel> is missing its required <${req}> child.`, { line: channel.line, fix: req === "link" ? `<link>https://www.facebook.com/mybpl242/</link>` : req === "title" ? `<title>Bahamas Power and Light</title>` : `<description>Posts by Bahamas Power and Light</description>` });
    else if (list.length > 1) warn("SCHEMA_CHANNEL_DUP", `<${req}> appears ${list.length}× inside <channel>; keep exactly one.`, { line: list[1].line });
    else if (!textOf(list[0])) warn("SCHEMA_CHANNEL_EMPTY", `<${req}> is present but empty.`, { line: list[0].line });
  }

  // unknown / misspelled channel children
  for (const c of channel.children) {
    if (c.type !== "element" || KNOWN_CHANNEL.has(c.name)) continue;
    const lower = c.name.toLowerCase();
    if (TYPO_MAP.has(lower)) warn("SCHEMA_TYPO", `<${c.name}> looks like a misspelling of <${TYPO_MAP.get(lower)}> — XML element names are case-sensitive.`, { line: c.line, fix: `<${TYPO_MAP.get(lower)}>…</${TYPO_MAP.get(lower)}>` });
    else if (!c.name.includes(":")) info("SCHEMA_UNKNOWN", `Non-standard channel element <${c.name}> — legal, but namespace-qualified names (e.g. xmlns:media) are the proper way to extend RSS.`, { line: c.line });
  }

  const items = elems(channel, "item");
  if (items.length === 0)
    err("CONTENT_NO_ITEMS", "The channel contains zero <item> elements — the endpoint produced no posts (RSS 2.0 permits it, but this feed exists to carry recent posts, so it counts as a content failure).", { line: channel.line });

  const decodedItems = [];
  let newest = null;
  items.forEach((item, idx) => {
    const isLatestCandidate = true;
    // title/description presence
    const hasTitle = firstElem(item, "title");
    const hasDesc = firstElem(item, "description");
    if (!hasTitle && !hasDesc)
      err("SCHEMA_ITEM_EMPTY", `Item ${idx + 1} (line ${item.line}) has neither <title> nor <description> — RSS 2.0 requires at least one.`, { line: item.line });

    // unknown/misspelled item children
    for (const c of item.children) {
      if (c.type !== "element" || KNOWN_ITEM.has(c.name)) continue;
      const lower = c.name.toLowerCase();
      if (TYPO_MAP.has(lower)) warn("SCHEMA_TYPO", `<${c.name}> in item ${idx + 1} looks like a misspelling of <${TYPO_MAP.get(lower)}>.`, { line: c.line, fix: `<${TYPO_MAP.get(lower)}>…</${TYPO_MAP.get(lower)}>` });
      else if (!c.name.includes(":")) info("SCHEMA_UNKNOWN", `Non-standard item element <${c.name}> — prefer namespace-qualified extensions.`, { line: c.line });
    }

    // link
    const linkEl = firstElem(item, "link");
    const link = textOf(linkEl);
    if (!linkEl) warn("ITEM_NO_LINK", `Item ${idx + 1} (line ${item.line}) has no <link> — the user requirement is a working link back to the specific FB post.`, { line: item.line, fix: `<link>https://www.facebook.com/mybpl242/posts/<POST_ID></link>` });
    else if (!/^https?:\/\//i.test(link)) warn("ITEM_LINK_NOT_ABSOLUTE", `Item ${idx + 1}'s <link> "${link.slice(0, 80)}" is not an absolute http(s) URL.`, { line: linkEl.line, excerpt: undefined });

    // pubDate
    const pubEl = firstElem(item, "pubDate");
    const dateInfo = pubEl
      ? dateCheck(textOf(pubEl), pubEl.line, pubEl.line ? undefined : undefined, { isLatest: isLatestCandidate })
      : dateCheck("", item.line, undefined, { isLatest: isLatestCandidate });

    // guid
    const guid = firstElem(item, "guid");
    if (guid) {
      const v = guid.attrs?.isPermaLink;
      if (v !== undefined && v !== "true" && v !== "false") warn("SCHEMA_GUID", `<guid isPermaLink="${v}"> — value must be "true" or "false".`, { line: guid.line, fix: `<guid isPermaLink="false">…</guid>` });
    }

    // enclosure
    const encs = elems(item, "enclosure");
    encs.forEach((enc, ei) => {
      const { url, length, type } = enc.attrs ?? {};
      const missing = [];
      if (url === undefined) missing.push("url");
      if (length === undefined) missing.push("length");
      if (type === undefined) missing.push("type");
      if (missing.length)
        err("SCHEMA_ENCLOSURE", `<enclosure> on item ${idx + 1} is missing required attribute${missing.length > 1 ? "s" : ""}: ${missing.join(", ")} — RSS 2.0 requires all three.`, { line: enc.line, fix: `<enclosure url="https://scontent…jpg" length="184320" type="image/jpeg" />` });
      if (length !== undefined && !/^\d+$/.test(length)) warn("SCHEMA_ENCLOSURE", `<enclosure length="${length}"> must be the size in bytes (digits only).`, { line: enc.line });
      if (type !== undefined && !/^[a-z]+\/[a-z0-9.+-]+$/i.test(type)) warn("SCHEMA_ENCLOSURE", `<enclosure type="${type}"> is not a MIME type.`, { line: enc.line });
      if (ei > 0) info("SCHEMA_ENCLOSURE", `Item ${idx + 1} has ${encs.length} <enclosure> elements — RSS 2.0 allows at most one per item; readers take the first.`, { line: enc.line });
    });

    // escaping quality on description / content:encoded / title
    for (const tag of ["description", "content:encoded", "title"]) {
      for (const el of elems(item, tag)) escapingAudit(el, `item ${idx + 1} <${tag}>`);
    }
    // channel-level description too
    if (idx === 0) for (const el of elems(channel, "description")) escapingAudit(el, "<channel> <description>");

    const title = hasTitle ? textOf(hasTitle) : textOf(hasDesc).slice(0, 80);
    decodedItems.push({ idx: idx + 1, line: item.line, title, link, date: dateInfo.parsed, dateRaw: dateInfo.raw });
    if (dateInfo.parsed && (!newest || dateInfo.parsed > newest.date)) newest = decodedItems[decodedItems.length - 1];
  });

  if (items.length > 0 && newest) {
    if (newest.ageDays !== undefined && newest.ageDays > 30)
      warn("CONTENT_STALE", `The most recent post is ${Math.round(newest.ageDays)} days old (${newest.dateRaw}). Requirement says "recent posts" — verify the upstream conversion is not silently caching.`, { line: newest.line });
  }

  // channel metadata expectations (mandatory content verification)
  const chanTitle = textOf(firstElem(channel, "title"));
  const chanLink = textOf(firstElem(channel, "link"));
  if (opts.expectTitle && chanTitle && !chanTitle.toLowerCase().includes(opts.expectTitle.toLowerCase()))
    err("CONTENT_TITLE_MISMATCH", `<channel><title> is "${chanTitle}" — expected it to reflect the target page (must contain "${opts.expectTitle}").`, { line: firstElem(channel, "title")?.line, fix: `<title>Bahamas Power and Light</title>` });
  if (opts.expectTitle && !chanTitle)
    err("CONTENT_TITLE_MISMATCH", `<channel><title> is empty — it must contain "${opts.expectTitle}".`, { line: channel.line });
  if (opts.expectLink && chanLink && !chanLink.toLowerCase().includes(opts.expectLink.toLowerCase()))
    err("CONTENT_LINK_MISMATCH", `<channel><link> is "${chanLink}" — expected the Facebook profile URL (must contain "${opts.expectLink}").`, { line: firstElem(channel, "link")?.line, fix: `<link>https://www.facebook.com/mybpl242/</link>` });
  if (opts.expectLink && !chanLink)
    err("CONTENT_LINK_MISMATCH", `<channel><link> is empty — it must contain "${opts.expectLink}".`, { line: channel.line });

  return { channel, items, newest, chanTitle, chanLink };
}

function escapingAudit(el, label) {
  const markup = rawMarkupChildren(el);
  if (markup.length) {
    const inner = serializeInner(el);
    warn("CDATA_MISSING", `${label} contains raw child element${markup.length > 1 ? "s" : ""} (${markup.map((m) => `<${m.name}>`).join(", ")}) — unescaped HTML inside a plain-text RSS element. Wrap the HTML in <![CDATA[ … ]]> or entity-encode it; otherwise strict readers show the tags as text or drop the item.`, { line: el.line, fix: `<description><![CDATA[${inner.replace(/^\s+|\s+$/g, "").slice(0, 120)}]]></description>` });
  }
  const cdata = (el.children ?? []).filter((c) => c.type === "cdata").map((c) => c.value).join("");
  const text = (el.children ?? []).filter((c) => c.type === "text").map((c) => c.value).join("");
  if (cdata) {
    if (/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/i.test(cdata))
      warn("ESC_IN_CDATA", `${label}: CDATA content still contains entity references like "&amp;" — inside CDATA nothing is decoded, so readers will literally see "&amp;". Use the raw characters.`, { line: el.line, fix: `<![CDATA[${cdata.replace(/&(amp|lt|gt|quot|apos);/gi, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[m.toLowerCase()] ?? m)}]]>`.slice(0, 200) });
    if (/<\s*(script|iframe|object|embed)\b/i.test(cdata) || /\son\w+\s*=/i.test(cdata) || /javascript:/i.test(cdata))
      warn("SECURITY_HTML", `${label}: CDATA contains executable HTML (<script>/<iframe>/event handlers/javascript:). Sanitize before rendering (NowBey strips tags in decode()).`, { line: el.line });
    if (!text.trim()) info("ESC_CDATA_OK", `${label} is correctly CDATA-wrapped.`, { line: el.line });
  } else if (text) {
    if (/&amp;(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/i.test(text))
      warn("ESC_DOUBLE", `${label} is double-escaped (e.g. "&amp;amp;") — readers will display the literal "&amp;". Encode exactly once.`, { line: el.line, fix: text.replace(/&amp;/gi, "&").trim().slice(0, 160) });
    else if (/<[a-z][\s\S]*>/i.test(text) === false && /[<&]/.test(text) === false)
      info("ESC_PLAIN_OK", `${label} is plain text, correctly escaped (no CDATA needed).`, { line: el.line });
    else if (/&lt;|&gt;|&amp;/.test(text))
      info("ESC_ENTITY_OK", `${label} uses correctly entity-encoded markup — valid without CDATA.`, { line: el.line });
  }
}

/* ───────────────────────── NowBey ingest compatibility (faithful port) ───────────────────────── */

const NB_NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201c", rdquo: "\u201d", hellip: "\u2026", ndash: "\u2013", mdash: "\u2014" };
function nbDecode(input) {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => nbSafeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, x) => nbSafeChar(Number(x)))
    .replace(/&([a-z]+);/gi, (m, name) => NB_NAMED[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}
function nbSafeChar(code) { return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ""; }
const NB_JUNK_TITLE = /^\s*(profile\s*:|log\s?in|sign\s?in|register|subscribe|advertis|classified|sponsored|404|page not found)\b/i;

/** Re-runs src/lib/ingest.ts parseFeed() against the raw XML and reports what production would ingest. */
function nowbeyCompat(xml) {
  const out = { gate: false, accepted: [], dropped: [], clamped: 0, notes: [] };
  if (!/<item[\s>]|<entry[\s>]/.test(xml)) {
    out.notes.push("fetchXml() would throw: \"no stories in it (not a feed?)\" — the <item>/<entry> gate failed, so runIngest() marks the feed FAILED before parsing.");
    return out;
  }
  out.gate = true;
  const chunks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) ?? [];
  for (const chunk of chunks) {
    const raw = (tag) => chunk.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
    const grab = (tag) => nbDecode(raw(tag));
    const title = grab("title");
    const link =
      grab("link") ||
      chunk.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ||
      chunk.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      grab("guid") ||
      "";
    const words = title.replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean).length;
    if (!title) { out.dropped.push({ title: "(empty title)", reason: "no <title>" }); continue; }
    if (NB_JUNK_TITLE.test(title)) { out.dropped.push({ title, reason: "junk-title pattern (login/register/profile/sponsored…)" }); continue; }
    if (words < 2) { out.dropped.push({ title, reason: "title has fewer than two words (treated as a section label)" }); continue; }
    if (!/^https?:\/\//.test(link)) { out.dropped.push({ title, reason: `link "${link.slice(0, 60) || "(none)"}" is not absolute http(s)` }); continue; }
    const dateRaw = grab("pubDate") || grab("dc:date") || grab("published") || grab("updated");
    let publishedAt = dateRaw ? new Date(dateRaw) : new Date();
    let clamped = false;
    if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() > Date.now() + 3600_000) { publishedAt = new Date(); clamped = true; out.clamped++; }
    const body = raw("content:encoded") || raw("content") || raw("description") || raw("summary");
    const bodyHtml = body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    const imageMatch =
      chunk.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/i)?.[1] ??
      chunk.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i)?.[1] ??
      bodyHtml.match(/<img[^>]*\ssrc=["']([^"']+)["']/i)?.[1] ??
      null;
    if (bodyHtml.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i) && !imageMatch)
      out.notes.push("Enclosure lists type= before url= — NowBey's <enclosure> regex only matches url= followed by type=, so the image is missed (falls back to media: tags or <img> in the body).");
    out.accepted.push({
      title: title.slice(0, 300),
      url: link.slice(0, 600),
      publishedAt: publishedAt.toISOString(),
      clamped,
      hasSummary: Boolean(nbDecode(bodyHtml).slice(0, 480)),
      hasImage: Boolean(imageMatch && /^https?:\/\//.test(imageMatch)),
    });
  }
  return out;
}

/* ───────────────────────── transport (URL mode) ───────────────────────── */

async function httpCheck(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NowBeyQA/1.0; +https://nowbey-v2.vercel.app)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - t0;
    const ct = res.headers.get("content-type") ?? "";
    const findings = [];
    const ok = res.status >= 200 && res.status < 300;
    findings.push(ok ? { severity: "OK", code: "HTTP_STATUS", message: `HTTP ${res.status} in ${ms} ms (${res.url === url ? "no redirects" : `redirected → ${res.url}`}).` } : { severity: "ERROR", code: "HTTP_STATUS", message: `HTTP ${res.status} ${res.statusText} — expected 200 OK.` });
    const base = ct.split(";")[0].trim().toLowerCase();
    if (/(application|text)\/(rss|atom)?\+?xml/.test(base) || base === "text/xml")
      findings.push({ severity: "OK", code: "CONTENT_TYPE", message: `Content-Type: ${ct}` });
    else if (base === "text/html")
      findings.push({ severity: "WARN", code: "CONTENT_TYPE", message: `Content-Type: ${ct} — an RSS endpoint should declare application/rss+xml (or application/xml / text/xml). text/html makes some readers refuse the body and breaks feed autodiscovery.` });
    else if (base === "application/json")
      findings.push({ severity: "ERROR", code: "CONTENT_TYPE", message: `Content-Type: ${ct} — the endpoint returned JSON, not XML.` });
    else findings.push({ severity: "WARN", code: "CONTENT_TYPE", message: `Content-Type: ${ct || "(none)"} — expected application/rss+xml or application/xml.` });
    for (const h of ["cache-control", "last-modified", "etag"])
      if (res.headers.get(h)) findings.push({ severity: "INFO", code: "HEADER", message: `${h}: ${res.headers.get(h)}` });
    const xml = await res.text();
    return { status: res.status, contentType: ct, xml, findings };
  } catch (e) {
    return { error: `${e?.cause?.code ? e.cause.code + ": " : ""}${e?.message ?? e}` };
  }
}

/* ───────────────────────── report ───────────────────────── */

function statusOf() {
  if (FINDINGS.some((f) => f.severity === "ERROR")) return "FAIL";
  if (FINDINGS.some((f) => f.severity === "WARN")) return "PASS WITH WARNINGS";
  return "PASS";
}
const ICON = { ERROR: "✖", WARN: "▲", INFO: "·", OK: "✔" };
function renderTextReport(ctx) {
  const L = [];
  const now = new Date();
  const status = ctx.blocked ? "BLOCKED" : statusOf();
  L.push("═".repeat(78));
  L.push("RSS 2.0 QA DIAGNOSTIC — Facebook→RSS conversion endpoint");
  L.push(`Target : ${ctx.target}`);
  L.push(`Run    : ${now.toISOString()} (QA harness v1.0, node ${process.version})`);
  if (ctx.note) L.push(`Note   : ${ctx.note}`);
  L.push("═".repeat(78));
  L.push("");
  L.push(`OVERALL STATUS: ${status}`);
  if (!ctx.blocked) {
    const counts = { ERROR: 0, WARN: 0, INFO: 0 };
    for (const f of FINDINGS) counts[f.severity]++;
    L.push(`  ${counts.ERROR} error(s) · ${counts.WARN} warning(s) · ${counts.INFO} info`);
  }
  L.push("");
  if (ctx.compact) {
    L.push("The endpoint could not be reached, so no XML analysis was possible.");
    L.push("─".repeat(78));
    L.push("VERDICT: FAIL — endpoint unreachable. Check the URL, DNS and TLS, or run this harness from a machine that can reach the endpoint.");
    return L.join("\n");
  }

  // [1] transport
  L.push("[1] TRANSPORT & HEADERS");
  if (ctx.transportFindings) for (const f of ctx.transportFindings) L.push(`  ${ICON[f.severity]} ${f.message}`);
  else L.push("  – skipped (XML supplied directly; run with --url to exercise the endpoint itself)");
  L.push("");

  // [2] XML health
  L.push("[2] XML HEALTH (well-formedness)");
  const wf = FINDINGS.filter((f) => f.code.startsWith("WF_") || f.code.startsWith("ENC_"));
  if (!wf.length) L.push("  ✔ Document is well-formed XML 1.0 (no syntax errors found).");
  for (const f of wf) L.push(`  ${ICON[f.severity]} line ${f.line ?? "?"}: ${f.message}${f.excerpt ? `\n      at: ${f.excerpt}` : ""}`);
  L.push("");

  // [3] schema
  L.push("[3] RSS 2.0 SCHEMA");
  const sc = FINDINGS.filter((f) => f.code.startsWith("SCHEMA_") || f.code.startsWith("DATE_") || f.code.startsWith("ITEM_"));
  if (!sc.length) L.push("  ✔ Structure validates against RSS 2.0 (root/version, channel children, items, dates, enclosures).");
  for (const f of sc) L.push(`  ${ICON[f.severity]} line ${f.line ?? "?"}: ${f.message}`);
  L.push("");

  // [4] content verification
  L.push("[4] CONTENT VERIFICATION");
  const cv = FINDINGS.filter((f) => f.code.startsWith("CONTENT_") || f.code.startsWith("CDATA_") || f.code.startsWith("ESC_") || f.code.startsWith("SECURITY_"));
  for (const f of cv) L.push(`  ${ICON[f.severity]} line ${f.line ?? "?"}: ${f.message}`);
  if (ctx.meta) {
    const tOk = !FINDINGS.some((f) => f.code === "CONTENT_TITLE_MISMATCH");
    const lOk = !FINDINGS.some((f) => f.code === "CONTENT_LINK_MISMATCH");
    L.push(`  ${tOk ? "✔" : "✖"} Channel title : "${ctx.meta.chanTitle}"`);
    L.push(`  ${lOk ? "✔" : "✖"} Channel link  : "${ctx.meta.chanLink}"`);
    L.push(`  ${ctx.meta.items.length ? "✔" : "✖"} Post items    : ${ctx.meta.items.length}`);
  }
  L.push("");

  // [5] data proof
  L.push("[5] DATA PROOF — most recent post");
  const nb = ctx.meta?.items?.length ? ctx.newest : ctx.newest;
  if (ctx.newest) {
    const d = ctx.newest.date;
    L.push(`  Title : ${ctx.newest.title || "(none)"}`);
    L.push(`  Date  : ${ctx.newest.dateRaw || "(no pubDate)"}${d ? `   → parsed: ${d.toISOString()} (${Math.round((Date.now() - d.getTime()) / 86_400_000)} days ago)` : ""}`);
    L.push(`  Link  : ${ctx.newest.link || "(none)"}`);
    if (ctx.newestImage) L.push(`  Image : ${ctx.newestImage}`);
    if (ctx.newestSummary) L.push(`  Text  : ${ctx.newestSummary.slice(0, 220)}${ctx.newestSummary.length > 220 ? "…" : ""}`);
    L.push(`  Link format check: ${/^https?:\/\/(www\.)?facebook\.com\//i.test(ctx.newest.link) ? "✔ points at facebook.com (live click-through must be confirmed in a browser — FB post URLs are login-walled to bots)" : /^https?:\/\//.test(ctx.newest.link) ? "△ absolute URL, but not a facebook.com permalink" : "✖ not a usable link"}`);
  } else {
    L.push("  ✖ No items to prove data integrity.");
  }
  L.push("");

  // [6] NowBey ingest compatibility
  L.push("[6] NOWBEY INGEST COMPATIBILITY (src/lib/ingest.ts simulation)");
  if (!ctx.nowbey) L.push("  – skipped");
  else {
    L.push(`  fetchXml() <item|entry> gate : ${ctx.nowbey.gate ? "✔ passed" : "✖ FAILED"}`);
    for (const nt of ctx.nowbey.notes) L.push(`  ▲ ${nt}`);
    L.push(`  Items accepted by parseFeed(): ${ctx.nowbey.accepted.length}/${ctx.nowbey.accepted.length + ctx.nowbey.dropped.length}`);
    for (const a of ctx.nowbey.accepted.slice(0, 5))
      L.push(`    ✔ "${a.title.slice(0, 70)}" → ${a.clamped ? "date CLAMPED to fetch time" : a.publishedAt}${a.hasImage ? " · image" : " · no image"}${a.hasSummary ? "" : " · no summary"}`);
    for (const d of ctx.nowbey.dropped.slice(0, 5))
      L.push(`    ✖ dropped: "${String(d.title).slice(0, 60)}" — ${d.reason}`);
    L.push(`  Verdict: ${ctx.nowbey.gate && ctx.nowbey.accepted.length ? "✔ this feed would surface posts in NowBey's news pipeline" : "✖ this feed would show up in ingest stats as FAILED — nothing would reach the site"}`);
  }
  L.push("");

  // [7] fixes
  const fixable = FINDINGS.filter((f) => (f.severity === "ERROR" || f.severity === "WARN") && f.fix);
  L.push("[7] ACTIONABLE FIXES");
  if (!fixable.length) L.push("  None required.");
  fixable.forEach((f, i) => {
    const sentence = f.message.split(". ")[0].replace(/\.\s*$/, "");
    L.push(`  Fix ${i + 1} — ${f.code}${f.line ? ` (line ${f.line})` : ""}:`);
    L.push(`    ${sentence}.`);
    L.push(`    Replace with:`);
    for (const fl of String(f.fix).split("\n")) L.push(`      ${fl}`);
    L.push("");
  });

  L.push("─".repeat(78));
  const verdict =
    status === "PASS" ? "Feed is production-ready for NowBey's NEWS_FEEDS pipeline." :
    status === "PASS WITH WARNINGS" ? "Feed works, but fix the warnings above before relying on it." :
    status === "BLOCKED" ? "Live test blocked — supply the endpoint URL (or the XML payload) and re-run." :
    "Feed is NOT production-ready — fix every ERROR above, then re-run this harness.";
  L.push(`VERDICT: ${verdict}`);
  return L.join("\n");
}

/* ───────────────────────── main ───────────────────────── */

function parseArgs(argv) {
  const o = { expectTitle: "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true, json: false, url: null, file: null, stdin: false, selftest: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") o.url = argv[++i];
    else if (a === "--file") o.file = argv[++i];
    else if (a === "--stdin") o.stdin = true;
    else if (a === "--json") o.json = true;
    else if (a === "--selftest") o.selftest = true;
    else if (a === "--expect-title") o.expectTitle = argv[++i];
    else if (a === "--expect-link") o.expectLink = argv[++i];
    else if (a === "--no-nowbey") o.nowbey = false;
    else if (a === "--expect-none") { o.expectTitle = null; o.expectLink = null; }
    else if (a === "--help" || a === "-h") o.help = true;
    else { console.error(`Unknown argument: ${a}`); o.help = true; }
  }
  return o;
}

const HELP = `Usage:
  node qa/rss-qa/validate.mjs --url <endpoint-url> [--expect-title "..."] [--expect-link "..."] [--json]
  node qa/rss-qa/validate.mjs --file <feed.xml> [--expect-none]
  cat feed.xml | node qa/rss-qa/validate.mjs --stdin
  node qa/rss-qa/validate.mjs --selftest

Exit codes: 0 = PASS, 2 = PASS WITH WARNINGS, 1 = FAIL / harness error.`;

function validateXmlString(xml, opts, initialFindings = []) {
  FINDINGS = [...initialFindings];
  const { rootEl } = scanXml(xml);
  if (!rootEl && !initialFindings.some((f) => f.severity === "ERROR" && f.code === "HTTP_STATUS"))
    err("WF_NO_ROOT", "No XML root element found — the response body is not an XML document (an HTML error page, a JSON error, or an empty body?).", { line: 1 });
  let meta;
  if (rootEl) meta = validateRss(rootEl, opts) ?? undefined;
  let newestImage, newestSummary;
  if (meta?.newest) {
    const chunk = (xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [])[meta.newest.idx - 1] ?? "";
    newestImage =
      chunk.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/i)?.[1] ??
      chunk.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i)?.[1] ?? null;
    const body = chunk.match(/<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i)?.[1] ?? "";
    newestSummary = nbDecode(body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
  }
  return {
    status: statusOf(),
    findings: FINDINGS,
    meta,
    newest: meta?.newest ?? null,
    newestImage,
    newestSummary,
    nowbey: opts.nowbey ? nowbeyCompat(xml) : null,
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) { console.log(HELP); process.exit(1); }
  if (opts.selftest) process.exit(runSelftest());

  let xml, target, transportFindings, transportSeeds = [], note;
  if (opts.url) {
    target = opts.url;
    const res = await httpCheck(opts.url);
    if (res.error) {
      note = "endpoint unreachable from the QA sandbox";
      err("HTTP_STATUS", `Request failed: ${res.error}`);
      console.log(renderTextReport({ target, transportFindings: [{ severity: "ERROR", code: "HTTP_STATUS", message: `Request failed: ${res.error}` }], blocked: false, compact: true }));
      process.exit(1);
    }
    xml = res.xml;
    transportFindings = res.findings;
    // transport findings gate the overall status too: ERROR→FAIL, WARN→PASS WITH WARNINGS
    for (const f of transportFindings)
      transportSeeds.push({ severity: f.severity === "OK" ? "INFO" : f.severity, code: f.code, message: f.message });
  } else if (opts.file) {
    target = opts.file;
    xml = readFileSync(opts.file, "utf8");
  } else if (opts.stdin) {
    target = "stdin";
    xml = readFileSync(0, "utf8");
  } else {
    console.error("No input. Provide --url <endpoint>, --file <feed.xml> or --stdin.\n" + HELP);
    process.exit(1);
  }

  const result = validateXmlString(xml, opts, transportSeeds);
  const report = renderTextReport({
    target,
    transportFindings,
    blocked: false,
    meta: result.meta,
    newest: result.newest,
    newestImage: result.newestImage,
    newestSummary: result.newestSummary,
    nowbey: result.nowbey,
  });
  if (opts.json) console.log(JSON.stringify({ status: result.status, findings: result.findings, meta: { title: result.meta?.chanTitle, link: result.meta?.chanLink, items: result.meta?.items?.length ?? 0 }, newest: { title: result.newest?.title, date: result.newest?.dateRaw, link: result.newest?.link }, nowbey: result.nowbey }, null, 2));
  else console.log(report);
  process.exit(result.status === "PASS" ? 0 : result.status === "PASS WITH WARNINGS" ? 2 : 1);
}

/* ───────────────────────── selftest ───────────────────────── */

function runSelftest() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  const cases = [
    { file: "golden-bpl.xml", status: "PASS", codes: [], forbid: ["ERROR", "WARN"] },
    { file: "broken-unescaped-amp.xml", status: "FAIL", codes: ["WF_AMP"] },
    { file: "broken-undefined-entity.xml", status: "FAIL", codes: ["WF_ENTITY_UNDEFINED"] },
    { file: "broken-raw-html-in-description.xml", status: "PASS WITH WARNINGS", codes: ["CDATA_MISSING"] },
    { file: "broken-malformed-unclosed.xml", status: "FAIL", codes: ["WF_UNCLOSED"] },
    { file: "wrong-metadata.xml", status: "FAIL", codes: ["CONTENT_TITLE_MISMATCH", "CONTENT_LINK_MISMATCH"] },
    { file: "bad-dates.xml", status: "PASS WITH WARNINGS", codes: ["DATE_NOT_RFC822", "DATE_FUTURE", "DATE_MISSING"] },
    { file: "empty-feed.xml", status: "FAIL", codes: ["CONTENT_NO_ITEMS"] },
  ];
  let failures = 0;
  console.log("SELFTEST — harness against fixtures (known outcomes)\n");
  for (const c of cases) {
    FINDINGS = [];
    let xml;
    try { xml = readFileSync(join(dir, c.file), "utf8"); } catch { console.log(`  ✖ ${c.file}: fixture missing`); failures++; continue; }
    const { rootEl } = scanXml(xml);
    if (rootEl) validateRss(rootEl, { expectTitle: c.file === "wrong-metadata.xml" ? "Bahamas Power" : "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true });
    const status = statusOf();
    const codes = FINDINGS.map((f) => f.code);
    const missingStatus = status !== c.status ? `status "${status}" ≠ expected "${c.status}"` : null;
    const missingCodes = c.codes.filter((k) => !codes.includes(k));
    const forbidden = (c.forbid ?? []).filter((sev) => FINDINGS.some((f) => f.severity === sev));
    const ok = !missingStatus && !missingCodes.length && !forbidden.length;
    if (ok) console.log(`  ✔ ${c.file.padEnd(38)} ${status}${c.codes.length ? `  [${c.codes.join(", ")}]` : ""}`);
    else {
      failures++;
      console.log(`  ✖ ${c.file.padEnd(38)} ${missingStatus ?? ""} ${missingCodes.length ? `missing codes: ${missingCodes.join(",")}` : ""} ${forbidden.length ? `unexpected: ${forbidden.join(",")}` : ""}`);
      console.log(`     got: ${status} · ${codes.join(", ") || "(no findings)"}`);
    }
  }
  console.log(failures ? `\n${failures} selftest failure(s)` : "\nAll fixtures behaved as expected — the harness detects both valid and broken feeds.");
  return failures ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
