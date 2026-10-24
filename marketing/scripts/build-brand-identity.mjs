/**
 * NOWBEY — IDENTITY SET 2 (island × tech)
 * ---------------------------------------------------------------------------
 * A second, richer take on the brand presence, built to the "sun-drenched
 * Bahamas meets high-tech product" brief. Both assets share one palette:
 *
 *   turquoise  #3fd6c0 / #35d6e6      ocean   #0b3b4e → #06202b
 *   sunset     #ff8a5c / #ffb37a      sand    #f4d9a6
 *
 *   out/brand/pfp-n-1080.png            "N" monogram + frond + pin, 1:1
 *   out/brand/cover-gateway-1920x1080.png  photoreal Nassau coast + real UI, 16:9
 *   out/brand/identity-preview.png      both, at deployment sizes
 *
 * The cover composites the actual product screens rather than drawing a fake
 * UI, so the text inside the phone and laptop is crisp at any size. The frame
 * numbers are measured off the photograph in scripts/geometry.mjs.
 *
 *   node scripts/build-brand-identity.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { svgDoc, render } from "./lib.mjs";
import { T, text, rr, circle, measure, wordmark, mark } from "./postkit.mjs";
import { sceneMap, sceneFeed, sceneDesktop } from "./scenes.mjs";
import { device } from "./layouts.mjs";
import { QUADS } from "./geometry.mjs";
import { photoPath } from "./photos.mjs";
import { createCanvas, loadImage } from "./canvas.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out", "brand");

const TURQ = "#3fd6c0";
const CYAN = "#35d6e6";
const SUNSET = "#ff8a5c";
const GOLD = "#ffc46b";
const INK = "#04211d";

function save(name, svg, width) {
  mkdirSync(OUT, { recursive: true });
  const png = render(svg, width);
  writeFileSync(join(OUT, name), png);
  console.log(`  → brand/${name}  ${Math.round(png.length / 1024)} KB`);
  return png;
}

/* ============================================================ 1 · AVATAR */

/**
 * The monogram. An "N" drawn as three tapered strokes — two verticals and a
 * diagonal that sweeps out of the letterspace and becomes a palm frond, with
 * the pin sitting where the frond's stem crosses the right stem. Built from
 * paths, not set in a typeface, so it scales as a mark rather than as text.
 */
function monogram({ size = 1080 } = {}) {
  const S = size;
  const u = (n) => (n / 100) * S;
  const INK = "#04211d";

  /* ── ground: turquoise → ocean → sunset ──────────────────────────────── */
  const defs = `
    <defs>
      <linearGradient id="ground" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#37d6c2"/>
        <stop offset="0.34" stop-color="#1ea6b4"/>
        <stop offset="0.62" stop-color="#105f79"/>
        <stop offset="0.85" stop-color="#0a3446"/>
        <stop offset="1" stop-color="#07222e"/>
      </linearGradient>
      <radialGradient id="sunGlow" cx="0.22" cy="0.1" r="0.66">
        <stop offset="0" stop-color="#ffe9c4" stop-opacity="0.5"/>
        <stop offset="0.42" stop-color="#ffc46b" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#ffc46b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sunsetGlow" cx="0.86" cy="0.95" r="0.6">
        <stop offset="0" stop-color="${SUNSET}" stop-opacity="0.58"/>
        <stop offset="0.5" stop-color="${SUNSET}" stop-opacity="0.16"/>
        <stop offset="1" stop-color="${SUNSET}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="letter" x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="0.5" stop-color="#f2fffd"/>
        <stop offset="0.78" stop-color="#c9f7f0"/>
        <stop offset="1" stop-color="#93e9ea"/>
      </linearGradient>
      <linearGradient id="frond" x1="1" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#0e6b60"/>
        <stop offset="0.5" stop-color="#2bbb9f"/>
        <stop offset="1" stop-color="#9df3d9"/>
      </linearGradient>
      <linearGradient id="pinFill" x1="0.1" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="#ffe0b4"/>
        <stop offset="0.42" stop-color="${GOLD}"/>
        <stop offset="1" stop-color="${SUNSET}"/>
      </linearGradient>
      <radialGradient id="pinGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${GOLD}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="dots" width="${u(3.6)}" height="${u(3.6)}" patternUnits="userSpaceOnUse">
        <circle cx="${u(1.1)}" cy="${u(1.1)}" r="${u(0.34)}" fill="#ffffff" opacity="0.10"/>
      </pattern>
    </defs>`;

  /* ── the N: two stems and a diagonal, drawn as explicit polygons ──────── */
  const stem = u(11.5);
  const xL = u(30);
  const xR = u(70);
  const yT = u(29);
  const yB = u(71);

  const leftStem = `M ${xL} ${yT} L ${xL + stem} ${yT} L ${xL + stem} ${yB} L ${xL} ${yB} Z`;
  const rightStem = `M ${xR - stem} ${yT} L ${xR} ${yT} L ${xR} ${yB} L ${xR - stem} ${yB} Z`;
  // diagonal: top of the left stem to the foot of the right stem
  const diag = `M ${xL} ${yT} L ${xL + stem} ${yT} L ${xR} ${yB} L ${xR - stem} ${yB} Z`;

  /* ── the frond: a spine arcing off the N's shoulder, leaflets both sides ── */
  const spineP0 = [u(34), u(29.5)];
  const spineP1 = [u(47), u(12.5)];
  const spineP2 = [u(62.5), u(19.5)];
  const bez = (t) => {
    const mt = 1 - t;
    return [
      mt * mt * spineP0[0] + 2 * mt * t * spineP1[0] + t * t * spineP2[0],
      mt * mt * spineP0[1] + 2 * mt * t * spineP1[1] + t * t * spineP2[1],
    ];
  };
  const tangent = (t) => {
    const mt = 1 - t;
    const dx = 2 * mt * (spineP1[0] - spineP0[0]) + 2 * t * (spineP2[0] - spineP1[0]);
    const dy = 2 * mt * (spineP1[1] - spineP0[1]) + 2 * t * (spineP2[1] - spineP1[1]);
    return Math.atan2(dy, dx);
  };
  const leaf = (x, y, ang, len, wid) => {
    const tx = x + Math.cos(ang) * len;
    const ty = y + Math.sin(ang) * len;
    const mx = (x + tx) / 2;
    const my = (y + ty) / 2;
    const nx = -Math.sin(ang) * wid;
    const ny = Math.cos(ang) * wid;
    return `M ${x.toFixed(1)} ${y.toFixed(1)}
      Q ${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}
      Q ${(mx - nx * 0.62).toFixed(1)} ${(my - ny * 0.62).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} Z`;
  };

  const leaves = [];
  const N_LEAF = 8;
  for (let i = 0; i < N_LEAF; i++) {
    const t = 0.1 + (i / (N_LEAF - 1)) * 0.86;
    const [px, py] = bez(t);
    const a = tangent(t);
    const len = u(13.5) * (1 - 0.5 * t);
    const wid = len * 0.19;
    leaves.push(
      `<path d="${leaf(px, py, a - 0.78, len, wid)}" fill="url(#frond)" opacity="${(0.94 - t * 0.14).toFixed(2)}"/>`,
      `<path d="${leaf(px, py, a + 0.72, len * 0.94, wid * 0.92)}" fill="url(#frond)" opacity="${(0.88 - t * 0.14).toFixed(2)}"/>`,
    );
  }

  const pinX = u(70.5);
  const pinY = u(11.5);
  const pinH = u(17.5);

  return svgDoc(
    S,
    S,
    `<g>
      ${defs}
      <rect width="${S}" height="${S}" fill="url(#ground)"/>
      <g>
        ${Array.from({ length: 13 }, (_, i) => `<line x1="${(i * S) / 12}" y1="0" x2="${(i * S) / 12}" y2="${S}" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>`).join("")}
        ${Array.from({ length: 13 }, (_, i) => `<line x1="0" y1="${(i * S) / 12}" x2="${S}" y2="${(i * S) / 12}" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>`).join("")}
      </g>
      <rect width="${S}" height="${S}" fill="url(#dots)"/>
      <rect width="${S}" height="${S}" fill="url(#sunGlow)"/>
      <rect width="${S}" height="${S}" fill="url(#sunsetGlow)"/>

      <!-- ocean contours, bottom -->
      <g fill="none" stroke="${CYAN}" stroke-linecap="round" opacity="0.26">
        <path d="M ${u(-4)} ${u(88)} C ${u(16)} ${u(82)}, ${u(32)} ${u(94)}, ${u(54)} ${u(88)} S ${u(86)} ${u(81)}, ${u(104)} ${u(89)}" stroke-width="${u(1.6)}"/>
        <path d="M ${u(-4)} ${u(95)} C ${u(18)} ${u(89)}, ${u(36)} ${u(100)}, ${u(58)} ${u(94)} S ${u(88)} ${u(88)}, ${u(104)} ${u(95)}" stroke-width="${u(1.2)}" opacity="0.7"/>
      </g>

      <!-- connectivity graph, behind the mark -->
      <g fill="none" stroke="${CYAN}" stroke-opacity="0.32" stroke-width="${u(0.32)}">
        <path d="M ${u(12)} ${u(22)} L ${u(26)} ${u(28)} L ${u(20)} ${u(44)}"/>
        <path d="M ${u(80)} ${u(64)} L ${u(90)} ${u(56)} L ${u(82)} ${u(42)}"/>
      </g>
      <g fill="${CYAN}" opacity="0.72">
        ${[[12, 22], [20, 44], [90, 56], [82, 42], [16, 66], [86, 18]]
          .map(([x, y]) => `<circle cx="${u(x)}" cy="${u(y)}" r="${u(0.8)}"/>`)
          .join("")}
      </g>

      <g transform="translate(540,540) scale(0.9) translate(-540,-540)">
      <!-- the N, with a soft drop so it lifts off the field -->
      <g transform="translate(${u(1)},${u(1.7)})" opacity="0.32" fill="#04211d">
        <path d="${leftStem}"/><path d="${diag}"/><path d="${rightStem}"/>
      </g>
      <g fill="url(#letter)">
        <path d="${leftStem}"/>
        <path d="${diag}"/>
        <path d="${rightStem}"/>
      </g>

      <!-- frond -->
      ${leaves.join("")}
      <path d="M ${spineP0[0]} ${spineP0[1]} Q ${spineP1[0]} ${spineP1[1]} ${spineP2[0]} ${spineP2[1]}"
        stroke="url(#frond)" stroke-width="${u(2.2)}" fill="none" stroke-linecap="round"/>

      <!-- the pin, where the frond meets the right stem -->
      <circle cx="${pinX}" cy="${pinY + pinH * 0.42}" r="${u(15)}" fill="url(#pinGlow)"/>
      <path d="M ${pinX} ${pinY + pinH}
        C ${pinX - pinH * 0.66} ${pinY + pinH * 0.5}, ${pinX - pinH * 0.5} ${pinY}, ${pinX} ${pinY}
        C ${pinX + pinH * 0.5} ${pinY}, ${pinX + pinH * 0.66} ${pinY + pinH * 0.5}, ${pinX} ${pinY + pinH} Z"
        fill="url(#pinFill)" stroke="${INK}" stroke-opacity="0.12" stroke-width="${u(0.3)}"/>
      <circle cx="${pinX}" cy="${pinY + pinH * 0.34}" r="${pinH * 0.115}" fill="${INK}"/>
      <circle cx="${pinX - pinH * 0.11}" cy="${pinY + pinH * 0.29}" r="${pinH * 0.035}" fill="#ffffff" opacity="0.6"/>
      </g>

      <!-- sun glint along the top edge -->
      <rect x="0" y="0" width="${S}" height="${u(1.6)}" fill="#ffffff" opacity="0.55"/>
    </g>`,
  );
}

/* ============================================================= 2 · COVER */

/**
 * The banner. The photograph supplies the atmosphere (left and centre), the
 * product screens supply the proof (right and centre-right), and a set of glass
 * panels ties the two together. All copy lives in the centre column so nothing
 * important is ever behind the avatar, which sits bottom-left.
 */
function cover({ W = 1920, H = 1080 } = {}) {
  const photo = readFileSync(photoPath("photo-nassau-coast.png"));
  const pad = 96;

  // cover-fit the 1376×768 plate into 16:9, biased right so the water stays in
  const scale = Math.max(W / 1376, H / 768);
  const dw = 1376 * scale;
  const dh = 768 * scale;
  const dx = (W - dw) * 0.62;
  const dy = (H - dh) * 0.5;

  const map = render(svgDoc(390, 744, sceneMap(390, 744, {})), 1200);
  const desk = render(svgDoc(1440, 860, sceneDesktop(1440, 860)), 1500);

  /* ── laptop: screen plus a base, both fully inside the frame ───────────── */
  const lapW = 620;                              // visible screen width
  const lapH = lapW * (860 / 1440);
  const lapX = W - lapW - 186;
  const lapY = 318;

  const phoneW = 244;
  const phoneH = phoneW * (744 / 390);
  const phX = lapX - 132;
  const phY = H - phoneH - 118;
  const phone = device(map.toString("base64"), 0, 0, phoneW, 390 / 744, { radius: 60, bezel: 8 });

  /* ── text column, lifted so the avatar corner stays clear ──────────────── */
  const top = 104;
  const headSize = 72;
  const lines = ["YOUR DIGITAL", "GATEWAY TO", "THE BAHAMAS"];
  const headY = top + 112;

  return svgDoc(
    W,
    H,
    `<defs>
      <linearGradient id="scrimL" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#04202a" stop-opacity="0.88"/>
        <stop offset="0.28" stop-color="#062a34" stop-opacity="0.62"/>
        <stop offset="0.5" stop-color="#062a34" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#04202a" stop-opacity="0.16"/>
      </linearGradient>
      <linearGradient id="scrimB" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#04161d" stop-opacity="0.62"/>
        <stop offset="0.4" stop-color="#04161d" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#04161d" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="tealWash" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${TURQ}" stop-opacity="0.30"/>
        <stop offset="0.5" stop-color="${CYAN}" stop-opacity="0.04"/>
        <stop offset="1" stop-color="${SUNSET}" stop-opacity="0.22"/>
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#eafcfa" stop-opacity="0.24"/>
        <stop offset="0.55" stop-color="#062a34" stop-opacity="0.42"/>
        <stop offset="1" stop-color="#04202a" stop-opacity="0.52"/>
      </linearGradient>
      <linearGradient id="goldPill" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#ffd9a8"/>
        <stop offset="0.5" stop-color="${GOLD}"/>
        <stop offset="1" stop-color="${SUNSET}"/>
      </linearGradient>
      <filter id="glassBlur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="16"/>
      </filter>
      <filter id="softShadow" x="-30%" y="-30%" width="170%" height="170%">
        <feDropShadow dx="0" dy="26" stdDeviation="34" flood-color="#02141a" flood-opacity="0.55"/>
      </filter>
      <filter id="screenGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="26" flood-color="${TURQ}" flood-opacity="0.35"/>
      </filter>
      <pattern id="tech" width="64" height="64" patternUnits="userSpaceOnUse">
        <path d="M64 0H0V64" fill="none" stroke="#eafcfa" stroke-opacity="0.10" stroke-width="1"/>
      </pattern>
      <pattern id="techFine" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M16 0H0V16" fill="none" stroke="#eafcfa" stroke-opacity="0.045" stroke-width="1"/>
      </pattern>
    </defs>

    <!-- 1 · the photograph -->
    <rect width="${W}" height="${H}" fill="#06202b"/>
    <image href="data:image/png;base64,${photo.toString("base64")}" x="${dx.toFixed(1)}" y="${dy.toFixed(1)}"
      width="${dw.toFixed(1)}" height="${dh.toFixed(1)}" preserveAspectRatio="none"/>

    <!-- 2 · grade + scrims -->
    <rect width="${W}" height="${H}" fill="url(#scrimL)"/>
    <rect width="${W}" height="${H}" fill="url(#scrimB)"/>
    <rect width="${W}" height="${H}" fill="url(#tealWash)" opacity="0.42"/>
    <rect width="${W}" height="${H}" fill="url(#techFine)" opacity="0.6"/>
    <rect width="${W}" height="${H}" fill="url(#tech)" opacity="0.32"/>

    <!-- 3 · translucent wave bands, tying photo to product -->
    <g opacity="0.45" fill="none">
      <path d="M ${-40} ${H * 0.76} C ${W * 0.2} ${H * 0.67}, ${W * 0.34} ${H * 0.87}, ${W * 0.56} ${H * 0.78} S ${W * 0.9} ${H * 0.64}, ${W + 40} ${H * 0.74}"
        stroke="#eafcfa" stroke-opacity="0.20" stroke-width="2"/>
      <path d="M ${-40} ${H * 0.84} C ${W * 0.22} ${H * 0.76}, ${W * 0.4} ${H * 0.96}, ${W * 0.62} ${H * 0.87} S ${W * 0.94} ${H * 0.74}, ${W + 40} ${H * 0.83}"
        stroke="${CYAN}" stroke-opacity="0.26" stroke-width="2.4"/>
    </g>

    <!-- 4 · connectivity graph over the water side -->
    <g stroke="${CYAN}" stroke-opacity="0.42" stroke-width="1.6" fill="none">
      <path d="M ${W * 0.055} ${H * 0.66} L ${W * 0.145} ${H * 0.56} L ${W * 0.235} ${H * 0.66}"/>
      <path d="M ${W * 0.145} ${H * 0.56} L ${W * 0.2} ${H * 0.44}"/>
    </g>
    <g fill="${CYAN}">
      ${[[0.055, 0.66], [0.145, 0.56], [0.235, 0.66], [0.2, 0.44]]
        .map(([x, y]) => `<circle cx="${W * x}" cy="${H * y}" r="5" opacity="0.85"/>
          <circle cx="${W * x}" cy="${H * y}" r="13" fill="none" stroke="${CYAN}" stroke-opacity="0.40" stroke-width="1.4"/>`)
        .join("")}
    </g>

    <!-- 5 · laptop -->
    <g filter="url(#softShadow)">
      <path d="M ${lapX - 66} ${lapY + lapH + 34} L ${lapX + lapW + 66} ${lapY + lapH + 34}
        L ${lapX + lapW + 40} ${lapY + lapH + 6} L ${lapX - 40} ${lapY + lapH + 6} Z"
        fill="#0d2129" stroke="#8fb0b9" stroke-opacity="0.30" stroke-width="2"/>
      <rect x="${lapX + lapW / 2 - 60}" y="${lapY + lapH + 14}" width="120" height="8" rx="4" fill="#7f99a3" opacity="0.22"/>
      <rect x="${lapX - 16}" y="${lapY - 16}" width="${lapW + 32}" height="${lapH + 32}" rx="16"
        fill="#08161d" stroke="#8fb0b9" stroke-opacity="0.42" stroke-width="2"/>
      <image href="data:image/png;base64,${desk.toString("base64")}" x="${lapX}" y="${lapY}"
        width="${lapW}" height="${lapH}" preserveAspectRatio="none"/>
    </g>

    <!-- 6 · phone, in front, fully inside the frame -->
    <g transform="translate(${phX},${phY})" filter="url(#softShadow)">
      ${phone.svg}
    </g>

    <!-- 7 · glass chips, clear of the type column -->
    <g>
      <g filter="url(#glassBlur)" opacity="0.38">
        <rect x="${lapX + lapW - 238}" y="${lapY - 88}" width="206" height="72" rx="22" fill="#04202a"/>
      </g>
      <rect x="${lapX + lapW - 250}" y="${lapY - 100}" width="228" height="92" rx="24"
        fill="url(#glass)" stroke="#eafcfa" stroke-opacity="0.5"/>
      <circle cx="${lapX + lapW - 216}" cy="${lapY - 72}" r="7" fill="${TURQ}"/>
      <circle cx="${lapX + lapW - 216}" cy="${lapY - 72}" r="13" fill="none" stroke="${TURQ}" stroke-opacity="0.55"/>
      ${text("Live map", lapX + lapW - 194, lapY - 66, { family: T.font.sans, weight: 700, size: 22, fill: "#ffffff" })}
      ${text("5 reports now", lapX + lapW - 194, lapY - 38, { family: T.font.sans, weight: 500, size: 18, fill: "#dcefee" })}
    </g>

    <g>
      <rect x="${lapX + lapW - 336}" y="${lapY + lapH + 62}" width="252" height="78" rx="20"
        fill="url(#glass)" stroke="#eafcfa" stroke-opacity="0.42"/>
      <g transform="translate(${lapX + lapW - 314},${lapY + lapH + 82})" stroke="${TURQ}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 11 10 19 23 3"/>
      </g>
      ${text("Neighbour confirmed", lapX + lapW - 276, lapY + lapH + 90, { family: T.font.sans, weight: 700, size: 19, fill: "#ffffff" })}
      ${text("Bay Street · just now", lapX + lapW - 276, lapY + lapH + 116, { family: T.font.sans, weight: 400, size: 17, fill: "#cfe4e4" })}
    </g>

    <!-- 8 · brand -->
    <g transform="translate(${pad},${top})">
      ${mark(0, -30, 52, { tile: "rgba(6,32,43,0.55)" })}
      ${wordmark(70, 6, 33)}
    </g>

    <!-- 9 · eyebrow -->
    <g>
      ${circle(pad + 5, top + 52, 4.5, TURQ)}
      ${text("COMMUNITY SAFETY MAP · THE BAHAMAS", pad + 22, top + 58, {
        family: T.font.mono, weight: 700, size: 16, fill: "#d7ecec", tracking: 0.16,
      })}
    </g>

    <!-- 10 · headline -->
    ${lines
      .map((line, i) =>
        text(line, pad, headY + i * headSize * 1.03, {
          family: T.font.display, weight: 800, size: headSize,
          fill: i === 2 ? GOLD : "#ffffff", tracking: -0.02,
        }),
      )
      .join("")}

    <!-- 11 · sub-line and promise -->
    ${text("Discover. Connect. Experience.", pad, headY + 256, {
      family: T.font.sans, weight: 600, size: 29, fill: "#eafcfa", tracking: -0.005,
    })}
    ${text("Neighbour-confirmed hazards, road conditions and local news —", pad, headY + 298, {
      family: T.font.sans, weight: 400, size: 21, fill: "#c9e2e0",
    })}
    ${text("one clear map, free to look, no account needed.", pad, headY + 326, {
      family: T.font.sans, weight: 400, size: 21, fill: "#c9e2e0",
    })}

    <!-- 12 · CTAs -->
    ${(() => {
      const y = headY + 362;
      const label = "Download the app";
      const w = measure(label, T.font.sans, 700, 23) + 88;
      const ghostW = measure("Open the map", T.font.sans, 700, 22) + 62;
      return `<g>
        <rect x="${pad}" y="${y}" width="${w}" height="64" rx="32" fill="url(#goldPill)"/>
        <g transform="translate(${pad + 26},${y + 19})" fill="${INK}">
          <path d="M9 0v18M3 12l6 6 6-6" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M0 24h18" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        </g>
        ${text(label, pad + 52, y + 41, { family: T.font.sans, weight: 700, size: 23, fill: INK })}
        <rect x="${pad + w + 18}" y="${y}" width="${ghostW}" height="64" rx="32"
          fill="rgba(255,255,255,0.10)" stroke="#eafcfa" stroke-opacity="0.55"/>
        ${text("Open the map", pad + w + 18 + 31, y + 41, { family: T.font.sans, weight: 700, size: 22, fill: "#ffffff" })}
      </g>`;
    })()}

    <!-- 13 · footing: coverage honesty, clear of the avatar corner -->
    <g>
      ${circle(W - pad - measure("Live for New Providence · other islands soon", T.font.sans, 500, 18) - 26, top + 4, 4.5, TURQ)}
      ${text("Live for New Providence · other islands soon", W - pad, top + 10, {
        family: T.font.sans, weight: 500, size: 18, fill: "#d7ecec", anchor: "end",
      })}
    </g>
  `,
  );
}

/* ============================================================ 3 · PROOF */

async function previews(pfpPng, coverPng) {
  // 1 · deployment sheet: avatar in a circle at real sizes, covers at 1:1 header
  const W = 1500;
  const H = 1060;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#07141b";
  ctx.fillRect(0, 0, W, H);

  const pfp = await loadImage(pfpPng);
  const cover = await loadImage(coverPng);

  const bw = 880;
  const bh = bw * (1080 / 1920);
  ctx.save();
  ctx.beginPath();
  ctx.rect(60, 92, bw, bh);
  ctx.clip();
  ctx.drawImage(cover, 60, 92, bw, bh);
  ctx.restore();

  const as = 150;
  const ax = 60 + 34;
  const ay = 92 + bh - as * 0.45;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax + as / 2, ay + as / 2, as / 2 + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#07141b";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(pfp, ax, ay, as, as);
  ctx.restore();

  ctx.fillStyle = "#3fd6c0";
  ctx.font = "700 15px JBMono700, JetBrains Mono";
  ctx.fillText("COVER · 1920×1080 · FACEBOOK / X HEADER", 60, 72);

  // avatar column
  ctx.fillText("AVATAR · 1:1 · CIRCLE CROP", 1010, 100);
  let y = 130;
  for (const s of [200, 120, 72, 44, 32]) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(1010 + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(pfp, 1010, y, s, s);
    ctx.restore();
    ctx.fillStyle = "rgba(185,200,201,0.75)";
    ctx.font = "500 15px JBMono700, JetBrains Mono";
    ctx.fillText(`${s}px`, 1010 + s + 18, y + s / 2 + 5);
    y += s + 22;
  }

  // square crop strip
  ctx.fillStyle = "#3fd6c0";
  ctx.font = "700 15px JBMono700, JetBrains Mono";
  ctx.fillText("SQUARE CROP · APP STORE / X", 60, 700);
  let x = 60;
  for (const s of [132, 96, 64]) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, 726, s, s, s * 0.22) : ctx.rect(x, 726, s, s);
    ctx.clip();
    ctx.drawImage(pfp, x, 726, s, s);
    ctx.restore();
    x += s + 26;
  }

  ctx.fillStyle = "rgba(154,175,179,0.9)";
  ctx.font = "400 17px Inter400, Inter";
  ctx.fillText("Monogram, frond and pin all hold at 44px; nothing important sits in the avatar's corner of the banner.", 60, 930);

  writeFileSync(join(OUT, "identity-preview.png"), await c.encode("png"));
  console.log("  → brand/identity-preview.png");
}

/* ------------------------------------------------------------------- run */

console.log("Identity set 2");
const pfp = save("pfp-n-1080.png", monogram({ size: 1080 }), 1080);
const cov = save("cover-gateway-1920x1080.png", cover({ W: 1920, H: 1080 }), 1920);
await previews(pfp, cov);
