#!/usr/bin/env node
/**
 * Mobile width audit for the NowBey website.
 *
 * There is no headless browser in this environment, so this is an honest, reproducible
 * *markup and CSS* audit rather than a pixel one:
 *
 *   1. It fetches every page route from a running dev/prod server with a phone User-Agent.
 *   2. It reads the compiled stylesheet the page ships (Next dev and Next build both link one).
 *   3. It parses the rendered HTML with jsdom and checks each page against the phone rules that
 *      actually bite at 320–412px:
 *
 *        W1  a hard-coded minimum/fixed width wider than the narrowest phone (320px)
 *        W2  a grid/flex track with a fixed px width that cannot shrink (grid-cols-[340px_1fr])
 *        W3  a fixed-height box whose content can exceed it (overflow hidden + text)
 *        W4  an interactive control whose declared minimum height is under 40px
 *        W5  an icon-only control with no accessible name
 *        W6  text declared under 12px (readability floor on a phone)
 *        W7  a table or <pre> that is not inside a scroll container
 *        W8  a long unbreakable string (URL, handle, email) with no wrapping and no truncation
 *        W9  an input whose font-size is under 16px (iOS zooms the page on focus)
 *        W10 an element pinned to the viewport bottom without accounting for the fixed bottom nav
 *
 * Usage:
 *   node scripts/mobile-audit.mjs                      # audits http://localhost:3000
 *   BASE=https://nowbey-v2.vercel.app node scripts/mobile-audit.mjs
 *   node scripts/mobile-audit.mjs --json > audit.json
 *   node scripts/mobile-audit.mjs --report audit/2026-10-15_mobile/MOBILE_AUDIT.md
 *
 * Exit code is 1 when anything at all is found, so it can gate a release.
 */
import { JSDOM } from "jsdom";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const JSON_OUT = process.argv.includes("--json");
const REPORT_AT = process.argv.includes("--report") ? process.argv[process.argv.indexOf("--report") + 1] : null;
const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Mobile Safari/537.36";

const ROUTES = [
  "/",
  "/map",
  "/wire",
  "/report",
  "/open-now",
  "/alerts",
  "/you",
  "/you/settings",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/support",
  "/credits",
  "/mobile",
  "/terms",
  "/privacy",
  "/incident/__sample__",
  "/wire/__sample__",
  "/missing-page-404",
];

/** Widths a phone actually reports, narrowest first. */
const VIEWPORTS = [320, 360, 390, 412];
const NARROWEST = Math.min(...VIEWPORTS);

const findings = [];
const add = (route, rule, severity, selector, detail) =>
  findings.push({ route, rule, severity, selector: selector.slice(0, 120), detail });

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { "user-agent": UA, accept: "text/html" } });
  return { status: res.status, html: await res.text() };
}

/** All CSS the page can reach: <link rel=stylesheet> plus anything inline. */
async function collectCss(html) {
  let css = "";
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)) {
    const href = m[0].match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    const url = href.startsWith("http") ? href : `${BASE}${href}`;
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.ok) css += await res.text();
    } catch {
      /* a stylesheet we cannot read is reported by the caller as a gap, not a failure */
    }
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) css += m[1];
  return css;
}

const px = (v) => {
  const n = parseFloat(String(v).replace(/px$/, ""));
  return Number.isFinite(n) ? n : null;
};

/** min-width / width declarations in the compiled CSS, keyed by nothing — used for class-level checks. */
function fixedWidthsIn(css) {
  const out = [];
  for (const m of css.matchAll(/(min-width|width|flex-basis)\s*:\s*(-?[\d.]+)px\b/g)) {
    const value = px(m[2]);
    if (value !== null && value > NARROWEST) out.push({ prop: m[1], value });
  }
  return out;
}

/** True when the stylesheet raises every form field to 16px on a phone. */
/**
 * True when the stylesheet renders phone form fields at 16px.
 *
 * Selector order is not trusted: the minifier emits `input,textarea,select` where the source says
 * `input, select, textarea`, and an order-sensitive match here would report 21 invented findings on a
 * site that is behaving exactly as intended.
 */
function phoneFieldsAreSixteen(css) {
  for (const [, selector, body] of css.replace(/\s+/g, " ").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/font-size:\s*16px/.test(body)) continue;
    const names = selector.split(",").map((s) => s.trim().toLowerCase());
    if (["input", "select", "textarea"].every((tag) => names.includes(tag))) return true;
  }
  return false;
}

/**
 * Classes that globals.css always ships. If the stylesheet this audit fetched does not define them,
 * the CSS is stale or truncated (a Turbopack dev cache does this) and every rule below would be
 * measuring the wrong file — so say that, instead of inventing findings about the code.
 */
const CSS_ANCHORS = ["nb-fill-view", "nb-clear-nav"];

function cssLooksComplete(css) {
  return CSS_ANCHORS.every((anchor) => css.includes(anchor));
}

function checkPage(route, status, html, css) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  if (status >= 400 && route !== "/missing-page-404") {
    add(route, "S1", "info", "page", `HTTP ${status}`);
  }

  // ---- viewport meta (W0)
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) add(route, "W0", "high", "head", "no viewport meta tag — phones render at 980px");
  else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(viewport.getAttribute("content") ?? ""))
    add(route, "W0", "medium", "meta[viewport]", "zoom is disabled — a WCAG 1.4.4 failure on a map app");

  // ---- eslint-disable-next-line no-script-url
  const interactive = [...document.querySelectorAll("a[href], button, [role=button], input, select, textarea")];

  for (const el of interactive) {
    const cls = el.getAttribute("class") ?? "";
    const style = el.getAttribute("style") ?? "";
    const label = (el.textContent ?? "").trim();
    const aria = el.getAttribute("aria-label") ?? el.getAttribute("title") ?? "";
    const tag = el.tagName.toLowerCase();

    // W4 — tap targets. WCAG 2.2 asks for 24px; 40px is the workable thumb minimum on a phone.
    const minH = cls.match(/min-h-\[(\d+)px\]/)?.[1] ?? style.match(/min-height:\s*(\d+)px/)?.[1];
    const h = cls.match(/\bh-(\d+)\b/)?.[1];
    const declared = minH ? Number(minH) : h ? Number(h) * 4 : null;
    if (declared !== null && declared < 40 && (tag === "button" || tag === "a" || el.getAttribute("role") === "button")) {
      // icon-sized controls are the ones that matter; a text link inside a paragraph is fine
      const iconOnly = !label && !aria ? false : label.length <= 3;
      if (iconOnly || declared < 32) {
        add(route, "W4", declared < 32 ? "high" : "medium", `${tag}.${cls.split(" ")[0] || "(no class)"}`, `tap target declared ${declared}px high (want >= 40px)`);
      }
    }

    // W5 — icon-only control with no accessible name
    if ((tag === "button" || el.getAttribute("role") === "button") && !label && !aria) {
      add(route, "W5", "high", `${tag}.${cls.split(" ")[0] || "(no class)"}`, "control has no text and no aria-label");
    }

    // W9 — iOS zooms the page when a field under 16px gets focus. A site-wide phone rule
    // (globals.css) fixes this for every field, so only complain when that rule is absent.
    if ((tag === "input" || tag === "textarea" || tag === "select") && !phoneFieldsAreSixteen(css)) {
      const size = Number(cls.match(/text-\[(\d+(?:\.\d+)?)px\]/)?.[1] ?? 0);
      if (size && size < 16 && !/text-\[16px\]/.test(cls)) {
        add(route, "W9", "low", `${tag}.${cls.split(" ")[0]}`, `field text ${size}px — iOS zooms on focus (16px avoids it)`);
      }
    }

    // W6 — readability floor
    const fonts = [...cls.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
    const smallest = fonts.length ? Math.min(...fonts) : null;
    if (smallest !== null && smallest < 11.5 && label.length > 12) {
      add(route, "W6", "low", `${tag}.${cls.split(" ")[0]}`, `text ${smallest}px on a label of ${label.length} characters`);
    }
  }

  // ---- W1/W2 — fixed widths in class names and inline styles
  for (const el of document.querySelectorAll("[class],[style]")) {
    const cls = el.getAttribute("class") ?? "";
    const style = el.getAttribute("style") ?? "";
    for (const m of cls.matchAll(/(?:^|\s)(?:min-)?w-\[(\d+)px\]/g)) {
      const value = Number(m[1]);
      if (value > NARROWEST && !/shrink-0|min-w-0/.test(cls)) {
        add(route, "W1", value > 360 ? "high" : "medium", `${el.tagName.toLowerCase()}.${cls.split(" ")[0]}`, `fixed width ${value}px wider than a 320px phone`);
      }
    }
    for (const m of style.matchAll(/(?:min-)?width:\s*(\d+)px/g)) {
      const value = Number(m[1]);
      if (value > NARROWEST) add(route, "W1", "high", el.tagName.toLowerCase(), `inline width ${value}px`);
    }
    // grid/flex tracks like lg:grid-cols-[340px_minmax(0,1fr)] are desktop-only, so only flag
    // the ones that apply below the lg breakpoint (no lg: prefix) or are genuinely immovable.
    for (const m of cls.matchAll(/(?:^|\s)grid-cols-\[(\d+)px/g)) {
      const value = Number(m[1]);
      if (value > 240) add(route, "W2", "medium", `${el.tagName.toLowerCase()}.${cls.split(" ")[0]}`, `grid track fixed at ${value}px at every width`);
    }
  }

  // ---- W2b — a no-wrap row whose fixed-width children cannot fit on the narrowest phone
  for (const row of document.querySelectorAll('[class*="flex"]')) {
    const cls = row.getAttribute("class") ?? "";
    if (/flex-wrap|overflow-x-(auto|scroll)|nb-no-scrollbar|grid/.test(cls)) continue;
    if (!/(^|\s)flex(\s|$)/.test(cls)) continue;
    let fixed = 0;
    const kids = [...row.children];
    for (const kid of kids) {
      const kcls = kid.getAttribute("class") ?? "";
      const style = kid.getAttribute("style") ?? "";
      const w = Number(kcls.match(/(?:min-)?w-\[(\d+)px\]/)?.[1] ?? style.match(/(?:min-)?width:\s*(\d+)px/)?.[1] ?? 0);
      fixed += w;
    }
    if (kids.length >= 2 && fixed > NARROWEST - 32) {
      add(route, "W2", "high", `${row.tagName.toLowerCase()}.${cls.split(" ")[0]}`, `row of ${kids.length} fixed-width children needs ${fixed}px, more than a ${NARROWEST}px phone has`);
    }
  }

  // ---- W3 — fixed height + hidden overflow around text
  for (const el of document.querySelectorAll('[class*="h-["]')) {
    const cls = el.getAttribute("class") ?? "";
    const h = Number(cls.match(/\bh-\[(\d+)px\]/)?.[1] ?? 0);
    if (h && h < 120 && /overflow-hidden/.test(cls) && (el.textContent ?? "").trim().length > 60) {
      add(route, "W3", "medium", el.tagName.toLowerCase(), `${h}px tall with overflow hidden around ${(el.textContent ?? "").trim().length} characters`);
    }
  }

  // ---- W7 — wide content that must scroll on its own
  for (const el of document.querySelectorAll("table, pre")) {
    let node = el;
    let scrollable = false;
    while (node && node !== document.body) {
      const cls = node.getAttribute("class") ?? "";
      if (/overflow-x-(auto|scroll)|nb-scroll/.test(cls)) scrollable = true;
      node = node.parentElement;
    }
    if (!scrollable) add(route, "W7", el.tagName === "TABLE" ? "high" : "medium", el.tagName.toLowerCase(), "wide element without a scrolling container");
  }

  // ---- W8 — long unbreakable strings
  const walker = document.createTreeWalker(document.body, dom.window.NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").trim();
    if (text.length < 24 || !/\S{24,}/.test(text)) continue;
    const el = node.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    const cls = el.getAttribute("class") ?? "";
    if (/truncate|break-all|break-words|overflow-wrap|nb-scroll|nb-no-scrollbar/.test(cls)) continue;
    if (el.closest("[class*=truncate], [class*=break-]")) continue;
    add(route, "W8", "low", el.tagName.toLowerCase(), `unbreakable run in “${text.slice(0, 40)}…”`);
  }

  // ---- W10 — anything fixed to the viewport bottom must leave room for the bottom nav
  const bottomFixed = [...document.querySelectorAll('[class*="fixed"][class*="bottom-0"]')];
  for (const el of bottomFixed) {
    const cls = el.getAttribute("class") ?? "";
    if (/nb-pad-bottom|nb-clear-nav|z-\[700\]/.test(cls)) continue;
    add(route, "W10", "medium", el.tagName.toLowerCase(), "fixed to the viewport bottom without nav clearance");
  }

  return { dom: true };
}

/** Replaces the __sample__ placeholders with real record ids, so detail pages are audited too. */
async function resolveSamples(routes) {
  const pick = async (path) => {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { "user-agent": UA } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.incidents?.[0]?.id ?? data.items?.[0]?.id ?? null;
    } catch {
      return null;
    }
  };
  const [incidentId, wireId] = await Promise.all([pick("/api/incidents?limit=1&status=all"), pick("/api/news?limit=1")]);
  return routes
    .map((r) => (r.startsWith("/incident/") ? r.replace("__sample__", incidentId ?? "") : r.startsWith("/wire/") ? r.replace("__sample__", wireId ?? "") : r))
    .filter((r) => !r.endsWith("/"));
}

/** Routes whose stylesheet was missing the anchor classes; empty is normal. */
const INCOMPLETE_CSS = [];

async function main() {
  const report = [];
  const resolved = await resolveSamples(ROUTES);
  for (const route of resolved) {
    let html = "";
    let status = 0;
    try {
      const res = await get(route);
      status = res.status;
      html = res.html;
    } catch (err) {
      add(route, "S0", "high", "route", `could not be fetched: ${err.message}`);
      report.push({ route, status: 0, bytes: 0 });
      continue;
    }
    const css = await collectCss(html);
    if (!cssLooksComplete(css) && !INCOMPLETE_CSS.length) {
      INCOMPLETE_CSS.push(route);
    }
    checkPage(route, status, html, css);
    const widths = fixedWidthsIn(css);
    if (route === "/" && widths.length && !/overflow-x:\s*clip/.test(css)) {
      add(route, "W1", "low", "css", `${widths.length} fixed px widths in the stylesheet and no horizontal overflow guard`);
    }
    report.push({ route, status, bytes: html.length, cssBytes: css.length });
  }

  if (INCOMPLETE_CSS.length) {
    console.error(
      `The stylesheet fetched for ${INCOMPLETE_CSS[0]} is missing ${CSS_ANCHORS.join("/")}, so it is stale or\n` +
        "truncated (a dev-server CSS cache does this). No findings were computed against it.\n" +
        "Fix: stop the dev server, delete .next, start it again, then re-run this audit.",
    );
    process.exit(2);
  }

  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;

  const ranAt = new Date().toISOString();
  if (REPORT_AT) {
    const line = (f) => `| ${f.severity} | ${f.rule} | \`${f.route}\` | \`${f.selector}\` | ${f.detail} |`;
    const md = `# NowBey mobile audit — 320–412px

Run ${ranAt} against \`${BASE}\`.
Pages fetched with a phone User-Agent (${UA}), compiled stylesheet read from each page, DOM parsed with jsdom.

**Widths checked:** ${VIEWPORTS.join("px, ")}px
**Findings:** ${findings.length}${findings.length ? "" : " — clean"}

| status | route | html | css |
| --- | --- | --- | --- |
${report.map((r) => `| ${r.status} | \`${r.route}\` | ${r.bytes} B | ${r.cssBytes} B |`).join("\n")}

${findings.length ? `## Findings\n\n| severity | rule | route | element | detail |\n| --- | --- | --- | --- | --- |\n${findings.map(line).join("\n")}` : "## Findings\n\nNone."}

## Rules applied

| rule | what it catches |
| --- | --- |
| W1 | a hard-coded width wider than the narrowest phone (320px) |
| W2 | a grid or flex track with a fixed px width that cannot shrink |
| W2b | a no-wrap row of fixed-width children that cannot fit 320px |
| W3 | a fixed-height box whose content can overflow it |
| W4 | an interactive control declared under 40px tall |
| W5 | an icon-only control with no accessible name |
| W6 | text declared under 11.5px |
| W7 | a table or \`<pre>\` that is not inside a scroll container |
| W8 | a long unbreakable string with no wrapping or truncation |
| W9 | a form field under 16px (iOS zooms the page on focus) |
| W10 | something pinned to the viewport bottom that ignores the fixed bottom nav |

## Limits, stated plainly

* There is **no browser** in this environment. This audit reads markup and CSS; it cannot measure a
  real layout, so "fits at 320px" here means "no rule above fires", not "pixels were observed".
* Client-rendered content (the pin list on /map and the Leaflet canvas) is not in the HTML this audit
  sees; it is covered by the source-level checks in \`tests/ui.test.mjs\`.
* Height maths that depends on the viewport (for example "is the pin list above the fold") is checked
  as a CSS contract (\`.nb-map-split\` clamp values) plus the DOM order of the map and the list.
* Real-device pass conditions — touch targets under a thumb, iOS Home Screen push, Android APK push —
  stay on the human checklist in \`TODO_HUMAN.md\`.
`;
    mkdirSync(dirname(REPORT_AT), { recursive: true });
    writeFileSync(REPORT_AT, md);
    console.log(`Report written to ${REPORT_AT}`);
  }
  if (JSON_OUT) {
    console.log(JSON.stringify({ base: BASE, ranAt, pages: report, findings, byRule }, null, 2));
  } else {
    console.log(`Mobile audit — ${BASE}`);
    console.log(`Viewports considered: ${VIEWPORTS.join(", ")}px\n`);
    console.log("Pages");
    for (const p of report) console.log(`  ${String(p.status).padEnd(4)} ${p.route.padEnd(26)} ${p.bytes} bytes html, ${p.cssBytes} bytes css`);
    console.log(`\nFindings: ${findings.length}`);
    for (const f of findings) {
      console.log(`  [${f.severity.toUpperCase().padEnd(6)}] ${f.rule} ${f.route} ${f.selector} — ${f.detail}`);
    }
    console.log("\nBy rule:", byRule);
  }
  process.exit(findings.length ? 1 : 0);
}

main().catch((err) => {
  console.error("audit failed:", err);
  process.exit(2);
});
