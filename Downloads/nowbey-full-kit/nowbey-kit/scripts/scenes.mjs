/**
 * NOWBEY MARKETING — APP SCENES
 * ---------------------------------------------------------------------------
 * The five product screens, laid out in the same order and with the same
 * vocabulary as the real app (src/app/{feed,map,report,wire,alerts}): status
 * bar → app header → page title → content → tab bar. Every screen is drawn at
 * a nominal 390pt width (the phone breakpoint) and fills whatever height it is
 * given, so the same scene drops into a photo of a phone, a square post or a
 * 9:16 story without a second implementation.
 *
 * Honesty rules these scenes inherit from the product:
 *  · nothing is labelled "live" unless it is the map (which is live for
 *    New Providence today);
 *  · the alert channel on screen is email — there is no SMS or push claim;
 *  · report cards are examples, marked as examples.
 */

import {
  T,
  text,
  paragraph,
  rr,
  circle,
  line,
  label,
  h1,
  chip,
  catBadge,
  button,
  toggle,
  card,
  mapView,
  tabBar,
  statusBar,
  appHeader,
  mark,
  measure,
  hexA,
  pin,
} from "./ui.mjs";

const PAD = 18;

/* ---------------------------------------------------------------- chrome */

export function screen(W, H, o = {}) {
  const { tab = "map", children = "", tabs = true, glow = true } = o;
  return `<g>
    ${rr(0, 0, W, H, 0, T.bgBase)}
    ${glow
      ? `<defs><radialGradient id="screenglow" cx="0.15" cy="0.0" r="0.9">
           <stop offset="0" stop-color="#22b8a4" stop-opacity="0.20"/>
           <stop offset="0.55" stop-color="#1494d6" stop-opacity="0.05"/>
           <stop offset="1" stop-color="#0c151d" stop-opacity="0"/>
         </radialGradient></defs>
         <rect width="${W}" height="${H * 0.6}" fill="url(#screenglow)"/>`
      : ""}
    ${statusBar(0, 10, W)}
    ${appHeader(0, 42, W)}
    <g clip-path="url(#screenclip${Math.round(W)}${Math.round(H)})">${children}</g>
    <defs><clipPath id="screenclip${Math.round(W)}${Math.round(H)}"><rect x="0" y="96" width="${W}" height="${H - (tabs ? 96 + 62 : 96)}"/></clipPath></defs>
    ${tabs ? tabBar(0, H - 62, W, tab) : ""}
  </g>`;
}

/* ------------------------------------------------------------- fragments */

/** A hazard card: category spine, badge, title, place, freshness line. */
export function incidentCard(x, y, w, o = {}) {
  const {
    cat = "flooding",
    catLabel = "Flooding",
    title = "Water across the lane",
    where = "Bay Street · Nassau",
    fresh = "Confirmed in the last few hours",
    freshColor = T.accent,
    confirms = 3,
    h = 118,
    example = true,
    active = false,
  } = o;
  const color = T.cat[cat] ?? T.accent;
  let out = card(x, y, w, h, {
    spine: color,
    fill: active ? T.bgElevated : T.bgRaised,
    border: active ? hexA(color, 0.45) : T.borderDefault,
  });
  const badge = catBadge(cat, catLabel, x + 16, y + 14);
  out += badge.svg;
  if (example) out += text("EXAMPLE", x + w - 16, y + 28, { family: T.font.mono, weight: 700, size: 7.5, fill: T.textTertiary, anchor: "end", tracking: 0.14 });
  out += text(title, x + 16, y + 54, { family: T.font.display, weight: 700, size: 15.5, fill: T.textPrimary, tracking: -0.02 });
  out += text(where, x + 16, y + 72, { family: T.font.sans, weight: 400, size: 11.5, fill: T.textSecondary });
  out += circle(x + 20, y + h - 20, 2.6, freshColor);
  out += text(fresh, x + 28, y + h - 16, { family: T.font.sans, weight: 600, size: 10.5, fill: T.textTertiary });
  out += text(`${confirms} confirmations`, x + w - 16, y + h - 16, {
    family: T.font.mono,
    weight: 700,
    size: 9.5,
    fill: T.textTertiary,
    anchor: "end",
    tracking: 0.06,
  });
  return out;
}

function pageHead(x, y, eyebrow, title, sub) {
  let out = label(eyebrow, x, y);
  out += h1(title, x, y + 28, { size: 25 });
  if (sub) out += text(sub, x, y + 46, { family: T.font.sans, weight: 400, size: 11.5, fill: T.textSecondary });
  return out;
}

function chipRail(x, y, items, activeIndex = 0, o = {}) {
  let out = "";
  let cx = x;
  const gap = 7;
  items.forEach((it, i) => {
    const c = chip(it, cx, y, { active: i === activeIndex, size: o.size ?? 10.5, h: o.h ?? 26, padX: 10 });
    out += c.svg;
    cx += c.width + gap;
  });
  return out;
}

/* ---------------------------------------------------------------- screens */

/** 01 · Community map — the hero screen. */
export function sceneMap(W, H, o = {}) {
  const { zoom = 1, shiftY = 0, reveal = 1, showConfirm = true, scroll = 0, active = 0 } = o;
  const mapH = 262;
  let body = pageHead(PAD + 4, 132, "COMMUNITY MAP", "New Providence", "Neighbour reports and local news, in one view.");
  body += `<g transform="translate(0,${-scroll})">`;
  body += mapView(PAD + 4, 196, W - (PAD + 4) * 2, mapH, { zoom, shiftY, id: "heroMap" });
  // overlay: live pill, top-left of the map
  body += `<g opacity="${reveal}">
    ${rr(PAD + 14, 206, 82, 22, 11, "rgba(8,20,28,0.9)", { stroke: hexA(T.danger, 0.5) })}
    ${circle(PAD + 26, 217, 3.4, T.danger)}
    ${text("LIVE MAP", PAD + 35, 220.5, { family: T.font.mono, weight: 700, size: 8, fill: T.textPrimary, tracking: 0.14 })}
  </g>`;
  // floating confirmation chip over the map's lower edge
  if (showConfirm)
    body += `<g transform="translate(${PAD + 12},${196 + mapH - 34})">
      ${rr(0, 0, W - (PAD + 12) * 2 - 8, 46, 14, "rgba(12,26,36,0.95)", { stroke: T.borderDefault })}
      ${rr(10, 10, 26, 26, 9, hexA(T.accent, 0.16), { stroke: hexA(T.accent, 0.4) })}
      <g transform="translate(17,17)" stroke="${T.accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M1 5.5 5 9.5 12 1.5"/></g>
      ${text("A neighbour confirmed", 44, 22, { family: T.font.sans, weight: 700, size: 11.5, fill: T.textPrimary })}
      ${text("Bay Street flooding · just now", 44, 35, { family: T.font.sans, weight: 400, size: 9.5, fill: T.textTertiary })}
    </g>`;
  body += chipRail(PAD + 4, 476, ["All", "Flooding", "Power", "Road", "Water"], 0);
  body += incidentCard(PAD + 4, 514, W - (PAD + 4) * 2, {
    cat: "flooding",
    catLabel: "Flooding",
    title: "Water across the lane",
    where: "Bay Street · Nassau",
    fresh: "Confirmed in the last few hours",
    confirms: 4,
    active: active === 0,
  });
  body += incidentCard(PAD + 4, 640, W - (PAD + 4) * 2, {
    cat: "power",
    catLabel: "Power",
    title: "Lines down on Prince Charles",
    where: "Prince Charles Drive · Nassau",
    fresh: "Needs a fresh check",
    freshColor: T.warning,
    confirms: 1,
  });
  body += `</g>`;
  return screen(W, H, { tab: "map", children: body });
}

/** 02 · The feed — what neighbours are seeing right now. */
export function sceneFeed(W, H, o = {}) {
  const { scroll = 0 } = o;
  let body = pageHead(PAD + 4, 132, "COMMUNITY FEED", "New Providence", "Today · reports from around the island.");
  body += `<g transform="translate(0,${-scroll})">`;
  body += chipRail(PAD + 4, 184, ["All reports", "Flooding", "Power", "Road"], 0);
  body += incidentCard(PAD + 4, 222, W - (PAD + 4) * 2, { cat: "flooding", catLabel: "Flooding", title: "Water across the lane", where: "Bay Street · Nassau", fresh: "Confirmed in the last few hours", confirms: 4 });
  body += incidentCard(PAD + 4, 348, W - (PAD + 4) * 2, { cat: "power", catLabel: "Power", title: "Lines down on Prince Charles", where: "Prince Charles Drive · Nassau", fresh: "A neighbour confirmed", freshColor: T.accent, confirms: 2 });
  body += incidentCard(PAD + 4, 474, W - (PAD + 4) * 2, { cat: "road", catLabel: "Road", title: "Debris across the corner", where: "Blake Road · Nassau", fresh: "Seen by neighbours", freshColor: T.warning, confirms: 1 });
  body += `<g>${rr(PAD + 4, 600, W - (PAD + 4) * 2, 64, 16, hexA(T.warning, 0.1), { stroke: hexA(T.warning, 0.3) })}
    ${text("Storm warnings", PAD + 20, 622, { family: T.font.sans, weight: 700, size: 12, fill: T.textPrimary })}
    ${text("Always sent. Free for everyone.", PAD + 20, 640, { family: T.font.sans, weight: 400, size: 10.5, fill: T.textTertiary })}
    ${circle(W - PAD - 22, 632, 13, hexA(T.warning, 0.16), { stroke: hexA(T.warning, 0.4) })}
    <g transform="translate(${W - PAD - 30},623)" stroke="${T.warning}" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M8 0v16M0 4l16 8M0 12l16-8"/></g>
  </g>`;
  body += `</g>`;
  return screen(W, H, { tab: "feed", children: body });
}

/** 03 · Report a hazard — the four-step flow, with real state. */
export function sceneReport(W, H, o = {}) {
  const { step = 0, typed = 0, typedText = null, pressed = false, scroll = 0 } = o;
  const steps = ["What", "Where", "Details", "Check"];
  let body = h1("Report a hazard", PAD + 4, 132, { size: 24 });
  body += text("Four steps, twenty seconds.", PAD + 4, 150, { family: T.font.sans, weight: 400, size: 11.5, fill: T.textSecondary });
  body += `<g transform="translate(0,${-scroll})">`;
  // stepper
  const sy = 170;
  body += rr(PAD + 4, sy, W - (PAD + 4) * 2, 44, 14, "rgba(255,255,255,0.03)", { stroke: T.borderSubtle });
  const cellW = (W - (PAD + 4) * 2) / 4;
  steps.forEach((s, i) => {
    const cx = PAD + 4 + cellW * i + cellW / 2;
    const done = i < step;
    const on = i === step;
    body += circle(cx, sy + 15, 8.5, done ? T.accent : on ? hexA(T.accent, 0.18) : "rgba(255,255,255,0.05)", {
      stroke: done ? T.accent : on ? T.accent : T.borderDefault,
    });
    body += text(done ? "" : String(i + 1), cx, sy + 18.8, { family: T.font.mono, weight: 700, size: 9.5, fill: on ? T.accent : T.textTertiary, anchor: "middle" });
    if (done) body += `<g transform="translate(${cx - 4.5},${sy + 11})" stroke="${T.textOnAccent}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M0 4 3.6 7.6 9.5 0.6"/></g>`;
    body += text(s, cx, sy + 35, { family: T.font.sans, weight: 700, size: 8.5, fill: on ? T.accent : T.textTertiary, anchor: "middle" });
    if (i < 3) body += line(PAD + 4 + cellW * (i + 1), sy + 8, PAD + 4 + cellW * (i + 1), sy + 36, T.borderSubtle, 1);
  });
  // map picker
  body += mapView(PAD + 4, 228, W - (PAD + 4) * 2, 190, { pinSet: "report", id: "reportMap", caption: false });
  body += `<g transform="translate(${PAD + 4 + (W - (PAD + 4) * 2) / 2 - 9},${228 + 95 - 9})" stroke="${T.accent}" stroke-width="2" fill="none">
    <circle cx="9" cy="9" r="9" opacity="0.5"/><path d="M9 2v14M2 9h14" stroke-width="1.6"/></g>`;
  body += rr(PAD + 4 + 10, 400, 168, 22, 11, "rgba(8,20,28,0.92)", { stroke: T.borderSubtle });
  body += text("Tap the map to move the pin", PAD + 24, 414.5, { family: T.font.sans, weight: 600, size: 9.5, fill: T.textTertiary });
  // category selection
  body += label("WHAT IS IT", PAD + 4, 448);
  const cats = [
    ["flooding", "Flooding"],
    ["power", "Power"],
    ["road", "Road"],
    ["water", "Water"],
    ["safety", "Safety"],
    ["storm", "Storm"],
  ];
  let cx = PAD + 4;
  let cy = 460;
  cats.forEach(([key, lbl], i) => {
    const w = measure(lbl, T.font.sans, 700, 10.5) + 46;
    if (cx + w > W - PAD - 4) {
      cx = PAD + 4;
      cy += 34;
    }
    const on = i === 0;
    body += rr(cx, cy, w, 26, 13, on ? hexA(T.cat[key], 0.14) : "rgba(255,255,255,0.035)", { stroke: on ? hexA(T.cat[key], 0.55) : T.borderSubtle });
    body += circle(cx + 13, cy + 13, 3.2, T.cat[key]);
    body += text(lbl, cx + 22, cy + 16.5, { family: T.font.sans, weight: 700, size: 10.5, fill: on ? T.cat[key] : T.textSecondary });
    cx += w + 8;
  });
  // field with typed text
  const fy = cy + 38;
  body += label("WHAT HAPPENED", PAD + 4, fy);
  body += rr(PAD + 4, fy + 8, W - (PAD + 4) * 2, 46, 14, T.bgSunken, { stroke: T.borderStrong });
  const phrase = "Water across the lane";
  const shown = typedText ?? phrase.slice(0, Math.round(phrase.length * typed));
  body += text(shown, PAD + 16, fy + 36, {
    family: T.font.sans,
    weight: 600,
    size: 13,
    fill: T.textPrimary,
  });
  if (shown.length > 0 && shown.length < phrase.length) {
    const tw = measure(shown, T.font.sans, 600, 13);
    body += rr(PAD + 17 + tw, fy + 22, 1.6, 20, 0.8, T.accent);
  }
  if (typed === 0) body += text("Say what you can see — one line is enough.", PAD + 16, fy + 36, { family: T.font.sans, weight: 400, size: 12, fill: T.textTertiary });
  // continue
  const by = H - 62 - 66;
  body += button("Continue", PAD + 4, by, W - (PAD + 4) * 2, 50, { variant: "primary" });
  body += `</g>`;
  return screen(W, H, { tab: "report", children: body });
}

/** 04 · Email alerts — the toggles hold the state they are given. */
export function sceneAlerts(W, H, o = {}) {
  const { flooding = true, power = false, roads = true, pressed = null } = o;
  let body = pageHead(PAD + 4, 132, "ALERTS", "Email alerts", "Choose your island and the updates you want.");
  body += `<g transform="translate(0,${-0}">`;
  body += card(PAD + 4, 196, W - (PAD + 4) * 2, 176, {});
  const rows = [
    ["Flooding", flooding, "flooding"],
    ["Road hazards", roads, "road"],
    ["Power outages", power, "power"],
  ];
  let ry = 214;
  body += label("YOUR ISLAND", PAD + 20, ry);
  body += text("New Providence", W - PAD - 20, ry, { family: T.font.sans, weight: 700, size: 12, fill: T.textPrimary, anchor: "end" });
  body += `<g transform="translate(${W - PAD - 20 - 74},${ry + 8})" stroke="${T.accent}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M0 4.5 4.5 9 11 1"/></g>`;
  ry += 22;
  body += line(PAD + 20, ry, W - PAD - 20, ry, T.borderSubtle, 1);
  rows.forEach(([lbl, on], i) => {
    ry += 22;
    body += circle(PAD + 24, ry - 4, 3, T.cat[["flooding", "road", "power"][i]]);
    body += text(lbl, PAD + 34, ry, { family: T.font.sans, weight: 600, size: 12.5, fill: T.textSecondary });
    body += toggle(W - PAD - 20 - 42, ry - 13, on);
    ry += 22;
    if (i < 2) body += line(PAD + 20, ry, W - PAD - 20, ry, T.borderSubtle, 1);
  });
  // storm card — free, always sent
  body += rr(PAD + 4, 390, W - (PAD + 4) * 2, 74, 16, hexA(T.warning, 0.08), { stroke: hexA(T.warning, 0.32) });
  body += circle(PAD + 30, 427, 18, hexA(T.warning, 0.12), { stroke: hexA(T.warning, 0.3) });
  body += `<g transform="translate(${PAD + 22},419)" stroke="${T.warning}" stroke-width="1.7" fill="none" stroke-linecap="round"><path d="M8 0v16M0 4l16 8M0 12l16-8"/></g>`;
  body += text("Storm warnings", PAD + 58, 420, { family: T.font.sans, weight: 700, size: 12.5, fill: T.textPrimary });
  body += text("Always sent. Free for everyone.", PAD + 58, 438, { family: T.font.sans, weight: 400, size: 10.5, fill: T.textTertiary });
  body += `<g>
    ${circle(PAD + 10, 483, 2.6, T.accent)}
    ${text("Email is the alert channel available today", PAD + 20, 486.5, { family: T.font.sans, weight: 600, size: 10.5, fill: T.textTertiary })}
  </g>`;
  // where alerts are sent + coverage, so the screen reads as a full page
  body += card(PAD + 4, 508, W - (PAD + 4) * 2, 92, {});
  body += label("ALERTS GO TO", PAD + 20, 530);
  body += text("you@example.com", PAD + 20, 550, { family: T.font.sans, weight: 600, size: 12.5, fill: T.textPrimary });
  body += text("Change", W - PAD - 20, 550, { family: T.font.sans, weight: 700, size: 11, fill: T.accent, anchor: "end" });
  body += line(PAD + 20, 564, W - PAD - 20, 564, T.borderSubtle, 1);
  body += text("Live for New Providence. Other islands soon.", PAD + 20, 584, { family: T.font.sans, weight: 400, size: 10.5, fill: T.textTertiary });
  body += text("Storm warnings are never paywalled.", PAD + 20, 632, { family: T.font.sans, weight: 400, size: 10.5, fill: T.textTertiary });
  body += button("Save my alerts", PAD + 4, H - 62 - 54, W - (PAD + 4) * 2, 50, {});
  body += `</g>`;
  return screen(W, H, { tab: "alerts", children: body });
}

/** 05 · The news wire. */
export function sceneWire(W, H, o = {}) {
  let body = pageHead(PAD + 4, 132, "NEWS WIRE", "The news wire", "Bahamian headlines, collected in one place.");
  body += `<g>`;
  const stories = [
    ["T", "Heavy rain floods low-lying streets", "Bahamian outlet · Reviewed", "flooding"],
    ["B", "BPL schedules repairs across the island", "Bahamian outlet · Reviewed", "power"],
    ["N", "Ferry services resume after swell", "Bahamian outlet · Reviewed", "marine"],
  ];
  let y = 196;
  stories.forEach(([initial, title, meta, cat], i) => {
    const h = 118;
    body += card(PAD + 4, y, W - (PAD + 4) * 2, h, { fill: i === 0 ? T.bgRaised : T.bgRaised });
    body += rr(PAD + 18, y + 16, 34, 34, 10, hexA(T.cat[cat], 0.14), { stroke: hexA(T.cat[cat], 0.3) });
    body += text(initial, PAD + 35, y + 38.5, { family: T.font.display, weight: 800, size: 15, fill: T.cat[cat], anchor: "middle" });
    body += text("REVIEWED", W - PAD - 16, y + 34, { family: T.font.mono, weight: 700, size: 7.5, fill: T.accent, anchor: "end", tracking: 0.14 });
    const t = paragraph(title, PAD + 18, y + 70, W - (PAD + 18) * 2 - 30, { family: T.font.display, weight: 700, size: 14, lineHeight: 1.25, fill: T.textPrimary });
    body += t.svg;
    body += text(meta, PAD + 18, y + 100, { family: T.font.sans, weight: 400, size: 10, fill: T.textTertiary });
    body += `<g transform="translate(${W - PAD - 30},${y + 94})" stroke="${T.accent}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M0 9 9 0M3 0h6v6"/></g>`;
    y += h + 12;
  });
  body += `</g>`;
  return screen(W, H, { tab: "wire", children: body });
}

/** 06 · Confirmation — the last beat of the report flow. */
export function sceneSuccess(W, H, o = {}) {
  const { pop = 1 } = o;
  const cx = W / 2;
  let body = "";
  body += `<g transform="translate(${cx},${H * 0.34}) scale(${pop}) translate(${-cx},${-H * 0.34})">`;
  body += circle(cx, H * 0.34, 46, hexA(T.accent, 0.12), { stroke: hexA(T.accent, 0.4) });
  body += circle(cx, H * 0.34, 30, T.accent);
  body += `<g transform="translate(${cx - 13},${H * 0.34 - 10})" stroke="${T.textOnAccent}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M0 11 9 20 26 2"/></g>`;
  body += `</g>`;
  body += text("Report posted", cx, H * 0.34 + 84, { family: T.font.display, weight: 800, size: 25, fill: T.textPrimary, anchor: "middle", tracking: -0.03 });
  body += text("Neighbours nearby will see it on the map.", cx, H * 0.34 + 108, { family: T.font.sans, weight: 400, size: 11.5, fill: T.textSecondary, anchor: "middle" });
  body += card(PAD + 4, H * 0.34 + 130, W - (PAD + 4) * 2, 92, {});
  body += catBadge("flooding", "Flooding", PAD + 20, H * 0.34 + 146).svg;
  body += text("Water across the lane", PAD + 20, H * 0.34 + 192, { family: T.font.display, weight: 700, size: 15, fill: T.textPrimary });
  body += text("Bay Street · Nassau", PAD + 20, H * 0.34 + 210, { family: T.font.sans, weight: 400, size: 11, fill: T.textSecondary });
  return screen(W, H, { tab: "report", children: body });
}

export { PAD };

/* ------------------------------------------------------- desktop / web app */

/**
 * The website at 1440×880 — what a laptop actually shows. Composition
 * follows the app shell: sticky header, left nav rail, the map, and a
 * live feed column on the right, plus the "Report a hazard" primary action.
 */
export function sceneDesktop(W = 1440, H = 880, o = {}) {
  const railW = 232;
  const feedW = 372;
  const pad = 20;
  let body = "";
  body += rr(0, 0, W, H, 0, T.bgBase);

  /* header */
  body += rr(0, 0, W, 64, 0, "rgba(12,21,29,0.92)");
  body += line(0, 64, W, 64, T.borderSubtle, 1);
  body += mark(20, 14, 36);
  body += text("Now", 66, 42, { family: T.font.display, weight: 800, size: 21, fill: T.textPrimary, tracking: -0.02 });
  body += text("Bey", 66 + measure("Now", T.font.display, 800, 21, -0.02), 42, { family: T.font.display, weight: 800, size: 21, fill: T.accent, tracking: -0.02 });
  const navItems = ["Community feed", "Map", "News wire", "Alerts"];
  let nx = 220;
  navItems.forEach((n, i) => {
    const on = i === 1;
    if (on) body += rr(nx - 12, 18, measure(n, T.font.sans, 600, 13.5) + 24, 28, 14, "rgba(63,214,192,0.12)", { stroke: "rgba(63,214,192,0.35)" });
    body += text(n, nx, 37, { family: T.font.sans, weight: 600, size: 13.5, fill: on ? T.accent : T.textSecondary });
    nx += measure(n, T.font.sans, 600, 13.5) + 38;
  });
  body += rr(W - 168, 16, 96, 32, 16, T.accent);
  body += text("Sign in", W - 120, 37, { family: T.font.sans, weight: 700, size: 13, fill: T.textOnAccent, anchor: "middle" });
  body += circle(W - 34, 32, 15, T.bgElevated, { stroke: T.borderDefault });

  /* left rail */
  body += rr(0, 64, railW, H - 64, 0, "rgba(10,19,26,0.6)");
  body += line(railW, 64, railW, H, T.borderSubtle, 1);
  body += text("NEW PROVIDENCE", 22, 96, { family: T.font.mono, weight: 700, size: 9, fill: T.textTertiary, tracking: 0.18 });
  body += text("Island overview", 22, 124, { family: T.font.display, weight: 800, size: 19, fill: T.textPrimary, tracking: -0.02 });
  const rail = [
    ["All reports", 12, true],
    ["Flooding", 3],
    ["Power", 2],
    ["Road", 2],
    ["Water", 1],
    ["Marine", 1],
  ];
  let ry = 150;
  rail.forEach(([lbl, n, on], i) => {
    if (on) body += rr(12, ry - 4, railW - 24, 34, 10, "rgba(63,214,192,0.10)", { stroke: "rgba(63,214,192,0.28)" });
    if (typeof n === "number") body += circle(28, ry + 12, 3.4, Object.values(T.cat)[i + 1] ?? T.accent);
    body += text(lbl, typeof n === "number" ? 42 : 28, ry + 17, { family: T.font.sans, weight: on ? 700 : 500, size: 13, fill: on ? T.textPrimary : T.textSecondary });
    if (typeof n === "number") body += text(String(n), railW - 30, ry + 17, { family: T.font.mono, weight: 700, size: 11.5, fill: T.textTertiary, anchor: "end" });
    ry += 42;
  });
  body += line(20, ry + 10, railW - 20, ry + 10, T.borderSubtle, 1);
  body += text("WIRE", 22, ry + 40, { family: T.font.mono, weight: 700, size: 9, fill: T.textTertiary, tracking: 0.18 });
  body += text("Reviewed sources only", 22, ry + 62, { family: T.font.sans, weight: 400, size: 11, fill: T.textTertiary });

  /* map */
  const mapX = railW + pad;
  const mapY = 64 + pad;
  const mapW = W - railW - feedW - pad * 3;
  const mapH = H - mapY - pad;
  body += mapView(mapX, mapY, mapW, mapH, { id: "deskMap", caption: false });
  body += rr(mapX + 16, mapY + 16, 214, 40, 12, "rgba(10,22,30,0.92)", { stroke: T.borderDefault });
  body += circle(mapX + 34, mapY + 36, 4, T.danger);
  body += text("LIVE · NEW PROVIDENCE", mapX + 46, mapY + 40, { family: T.font.mono, weight: 700, size: 9.5, fill: T.textPrimary, tracking: 0.14 });
  // map controls
  ["+", "−"].forEach((s, i) => {
    body += rr(mapX + mapW - 46, mapY + 16 + i * 40, 32, 32, 9, "rgba(10,22,30,0.92)", { stroke: T.borderDefault });
    body += text(s, mapX + mapW - 30, mapY + 38 + i * 40, { family: T.font.sans, weight: 700, size: 17, fill: T.textSecondary, anchor: "middle" });
  });

  /* feed column */
  const fx = W - feedW - pad;
  let fy = 64 + pad;
  body += text("Right now", fx, fy + 16, { family: T.font.display, weight: 800, size: 19, fill: T.textPrimary, tracking: -0.02 });
  body += text("12 open reports", fx + feedW - 4, fy + 16, { family: T.font.mono, weight: 700, size: 10, fill: T.textTertiary, anchor: "end" });
  fy += 34;
  const items = [
    ["Flooding", "Water across the lane", "Bay Street · Nassau", "Confirmed 4 min ago", T.accent],
    ["Power", "Lines down on Prince Charles", "Prince Charles Dr · Nassau", "Needs a fresh check", T.warning],
    ["Road", "Debris across the corner", "Blake Road · Nassau", "Seen by neighbours", T.textTertiary],
  ];
  items.forEach(([cat, title, where, meta, color], i) => {
    const h = 118;
    body += card(fx, fy, feedW, h, { fill: T.bgRaised, spine: T.cat[cat.toLowerCase()] ?? T.accent });
    body += catBadge(cat.toLowerCase(), cat, fx + 16, fy + 14).svg;
    body += text("EXAMPLE", fx + feedW - 16, fy + 28, { family: T.font.mono, weight: 700, size: 7.5, fill: T.textTertiary, anchor: "end", tracking: 0.14 });
    body += text(title, fx + 16, fy + 54, { family: T.font.display, weight: 700, size: 14.5, fill: T.textPrimary, tracking: -0.02 });
    body += text(where, fx + 16, fy + 72, { family: T.font.sans, weight: 400, size: 11, fill: T.textSecondary });
    body += circle(fx + 20, fy + h - 20, 2.6, color);
    body += text(meta, fx + 28, fy + h - 16, { family: T.font.sans, weight: 600, size: 10.5, fill: T.textTertiary });
    fy += h + 12;
  });
  body += rr(fx, fy, feedW, 56, 16, T.accent);
  body += text("Report a hazard", fx + feedW / 2, fy + 35, { family: T.font.sans, weight: 700, size: 14.5, fill: T.textOnAccent, anchor: "middle" });
  return body;
}
