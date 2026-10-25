/**
 * NOWBEY — brand preview page
 * ---------------------------------------------------------------------------
 * Builds branding/index.html: one page showing every asset at the size it is
 * meant to be seen at, with two switches that do the checking for you —
 *
 *   circle crop   what the avatar looks like in a round slot
 *   light stage   what the mark looks like on the opposite background
 *
 * Asset lists are read off disk, so the page can never link a file that the
 * build did not produce.
 *
 *   node scripts/build_preview.mjs
 */

import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");

const listing = (dir) => {
  const abs = join(OUT, dir);
  return existsSync(abs) ? readdirSync(abs).filter((f) => f.endsWith(".png")) : [];
};
const has = (dir, file) => listing(dir).includes(file);

const ui = "ui";
const png = "png";

/* ------------------------------------------------------------------ data */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** one card: image + name + meta + the file it points at */
function card(dir, file, { title, meta = "", stage = "dark", shape = "square", wide = false }) {
  return {
    dir,
    file,
    title,
    meta,
    stage,
    shape,
    wide,
    exists: has(dir, file),
  };
}

const groups = [
  {
    id: "primary",
    kicker: "01 — PRIMARY",
    title: "The profile picture",
    lede:
      "Drawn by the app's own code: the real backdrop, the real emblem, the product's three typefaces. " +
      "These are the files to upload.",
    cards: [
      card(ui, "nowbey-pfp-ui-night-1080.png", {
        title: "Night",
        meta: "1080 · emblem + wordmark + coverage line",
      }),
      card(ui, "nowbey-pfp-ui-day-1080.png", {
        title: "Daylight",
        meta: "1080 · deep-aqua disc on ivory",
        shape: "square",
      }),
      card(ui, "nowbey-pfp-ui-tile-night-1080.png", {
        title: "Header tile",
        meta: "1080 · the app mark itself, tile and all",
      }),
      card(ui, "nowbey-pfp-ui-tile-day-1080.png", {
        title: "Header tile · day",
        meta: "1080 · for light feeds and print",
      }),
    ],
  },
  {
    id: "ladder",
    kicker: "02 — SIZE LADDER",
    title: "Re-laid-out, not scaled down",
    lede:
      "Each rung is composed for the size it will be displayed at: the wordmark survives to 256, " +
      "drops at 128, and the emblem grows to fill the slot at 64. Use these files directly.",
    ladder: [
      ["nowbey-pfp-ui-night-256.png", 256, "mark + wordmark"],
      ["nowbey-pfp-ui-night-128.png", 128, "mark only"],
      ["nowbey-pfp-ui-night-64.png", 64, "mark only"],
      ["nowbey-pfp-ui-tile-night-128.png", 128, "tile"],
      ["nowbey-pfp-ui-tile-night-64.png", 64, "tile"],
    ],
  },
  {
    id: "alt",
    kicker: "03 — ALTERNATE",
    title: "3D set",
    lede:
      "The engine-style render — glossy pin, network constellation in the glass head, soundwave rings. " +
      "Kept for presence, not interface.",
    cards: [
      card(png, "nowbey-pfp-3d-night-1600.png", {
        title: "Night",
        meta: "1600 · cream “Now” + aquamarine “Bey”",
      }),
      card(png, "nowbey-pfp-3d-light-1600.png", { title: "Daylight", meta: "1600 · on ivory" }),
      card(png, "nowbey-icon-3d-night-1600.png", {
        title: "Mark only",
        meta: "1600 · text-free",
        shape: "square",
      }),
      card(png, "nowbey-pfp-flat-night-1080.png", {
        title: "Flat vector",
        meta: "1080 · favicon / tab bar",
        shape: "square",
      }),
    ],
  },
  {
    id: "lockups",
    kicker: "04 — LOCKUPS",
    title: "Headers and banners",
    lede: "Full-bleed strips for app-store headers, X and LinkedIn, and email signatures.",
    wide: [
      ["nowbey-lockup-3d-night-2074x800.png", "Night · spaced wordmark", "dark"],
      ["nowbey-lockup-3d-light-2074x800.png", "Daylight", "light"],
      ["nowbey-lockup-3d-night-2011x800.png", "Night · tight, no tagline", "dark"],
      ["nowbey-lockup-stacked-night.png", "Stacked", "dark"],
    ],
    cards: [],
  },
];

/* ---------------------------------------------------------------- palette */

const palette = [
  ["#3FD6C0", "Aquamarine", "the signal, the accent, “Bey”"],
  ["#6FEADB", "Aquamarine light", "night-mode “Bey”, highlight"],
  ["#0B6F64", "Aqua deep", "light-mode “Bey” — bright aqua vibrates on paper"],
  ["#0C151D", "Ocean night", "the app background"],
  ["#0A2A43", "Oceanic navy", "the 3D pin body"],
  ["#F4B942", "Sunshine gold", "node dots and pin tip only — never a field"],
  ["#F3F1EA", "Cream", "“Now”, primary type on dark"],
];

/* ------------------------------------------------------------------- html */

const css = `
@font-face{font-family:Brico;src:url("fonts/web/Brico800.ttf");font-weight:800;font-display:swap}
@font-face{font-family:Inter;src:url("fonts/web/Inter400.ttf");font-weight:400;font-display:swap}
@font-face{font-family:Inter;src:url("fonts/web/Inter500.ttf");font-weight:500;font-display:swap}
@font-face{font-family:Inter;src:url("fonts/web/Inter700.ttf");font-weight:700;font-display:swap}
@font-face{font-family:JB;src:url("fonts/web/JBMono400.ttf");font-weight:400;font-display:swap}
@font-face{font-family:JB;src:url("fonts/web/JBMono700.ttf");font-weight:700;font-display:swap}

:root{
  --bg:#0c151d; --raised:#152230; --elev:#1c2b39;
  --ink:#f3f1ea; --dim:#b9c8c9; --mut:#8fa5a9;
  --aqua:#3fd6c0; --gold:#f8cf6b;
  --line:rgba(148,206,202,.14); --line2:rgba(148,206,202,.28);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth; scroll-padding-top:96px}
body{
  margin:0; background:var(--bg); color:var(--ink);
  font:400 16px/1.6 Inter,system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
  background-image:
    radial-gradient(1100px 620px at 12% -6%, rgba(34,184,164,.16), transparent 62%),
    radial-gradient(900px 520px at 92% 4%, rgba(199,64,47,.10), transparent 60%),
    linear-gradient(rgba(122,186,190,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(122,186,190,.055) 1px, transparent 1px);
  background-size:auto,auto,54px 54px,54px 54px;
}
h1,h2,h3{font-family:Brico,Inter,sans-serif;font-weight:800;letter-spacing:-.03em;margin:0}
a{color:inherit}

/* sticky control bar */
.bar{
  position:sticky; top:0; z-index:50; display:flex; align-items:center; gap:26px;
  padding:14px 34px; background:rgba(9,22,31,.82); backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line);
}
.bar .mark{display:flex;align-items:center;gap:12px;font-family:Brico;font-size:19px;letter-spacing:-.02em}
.bar .mark img{width:28px;height:28px;border-radius:8px}
.nav{display:flex;gap:22px;margin-left:8px;flex-wrap:wrap}
.nav a{
  font-family:JB;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--mut);text-decoration:none;padding:6px 0;border-bottom:1px solid transparent;
}
.nav a:hover{color:var(--aqua);border-color:var(--aqua)}
.toggles{margin-left:auto;display:flex;gap:8px}
.tg{
  display:inline-flex;align-items:center;gap:9px;cursor:pointer;user-select:none;
  padding:8px 14px;border:1px solid var(--line2);border-radius:999px;
  font-family:JB;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);
  background:rgba(255,255,255,.03);transition:.16s;
}
.tg:hover{border-color:var(--aqua);color:var(--ink)}
.tg input{appearance:none;width:30px;height:17px;border-radius:999px;background:#2a3c4a;position:relative;transition:.16s;cursor:pointer;margin:0}
.tg input::after{content:"";position:absolute;top:2.5px;left:3px;width:12px;height:12px;border-radius:50%;background:#8ea6ad;transition:.16s}
.tg input:checked{background:var(--aqua)}
.tg input:checked::after{left:15px;background:#04211d}

/* hero */
.hero{padding:76px 34px 30px;max-width:1560px;margin:0 auto}
.hero .kick{font-family:JB;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--aqua);margin-bottom:20px}
.hero h1{font-size:clamp(38px,5.4vw,76px);line-height:.98;max-width:16ch}
.hero h1 em{font-style:normal;color:var(--aqua)}
.hero p{max-width:62ch;color:var(--dim);font-size:18px;margin:24px 0 0}
.hero .facts{display:flex;gap:36px;margin-top:38px;flex-wrap:wrap}
.hero .fact b{display:block;font-family:Brico;font-size:26px;letter-spacing:-.02em}
.hero .fact span{font-family:JB;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}

/* sections */
section{max-width:1560px;margin:0 auto;padding:64px 34px 8px}
.head{display:flex;align-items:flex-end;gap:24px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:26px;margin-bottom:34px}
.head .n{font-family:JB;font-size:11px;letter-spacing:.22em;color:var(--aqua);white-space:nowrap;padding-bottom:6px}
.head h2{font-size:clamp(26px,3vw,40px);line-height:1.05}
.head p{margin:0;max-width:60ch;color:var(--dim);font-size:15.5px;flex:1 1 340px}

/* grid */
.grid{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.grid.two{grid-template-columns:repeat(auto-fit,minmax(420px,1fr))}

.card{
  border:1px solid var(--line);border-radius:22px;overflow:hidden;
  background:rgba(21,34,48,.42);display:flex;flex-direction:column;
}
.stage{
  position:relative;display:grid;place-items:center;min-height:300px;padding:26px;
  transition:background .2s;
}
.stage.dark{background:radial-gradient(120% 120% at 50% 20%,#101e29,#080f16)}
.stage.light{background:radial-gradient(120% 120% at 50% 20%,#fffdf8,#efe7d9)}
.stage img{
  display:block;width:100%;max-width:330px;height:auto;
  transition:border-radius .2s;border-radius:18px;
}
body.circle .stage img{border-radius:50%}
.stage .badge{
  position:absolute;top:12px;right:12px;font-family:JB;font-size:9.5px;letter-spacing:.14em;
  text-transform:uppercase;padding:4px 9px;border-radius:999px;
  background:rgba(4,15,22,.6);color:#a9c3c6;border:1px solid rgba(148,206,202,.18);
}
.stage.light .badge{background:rgba(255,255,255,.7);color:#5d7278;border-color:rgba(52,38,20,.14)}
.meta{padding:15px 18px 17px;border-top:1px solid var(--line)}
.meta h3{font-size:17px}
.meta .sub{color:var(--mut);font-size:13px;margin-top:3px}
.meta .file{
  display:flex;align-items:center;gap:8px;margin-top:10px;
  font-family:JB;font-size:10.5px;color:#7b9398;letter-spacing:.02em;word-break:break-all;
}
.meta .dl{margin-left:auto;flex:none;color:var(--aqua);text-decoration:none;font-family:JB;font-size:10px;letter-spacing:.1em;border-bottom:1px solid transparent}
.meta .dl:hover{border-color:var(--aqua)}

/* ladder */
.ladder{display:flex;align-items:flex-end;gap:44px;flex-wrap:wrap;padding:34px 30px;
  border:1px solid var(--line);border-radius:22px;background:rgba(21,34,48,.42)}
.rung{text-align:center}
.rung img{display:block;border-radius:50%;margin:0 auto}
.rung .lbl{font-family:JB;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-top:14px}
.rung .px{font-family:Brico;font-size:15px;color:var(--ink);margin-top:2px}
.ladder .note{flex:1 1 260px;color:var(--dim);font-size:14px;max-width:34ch}
.ladder .note b{color:var(--ink);font-weight:500}

/* wide strips */
.wide{display:grid;gap:22px}
.strip{border:1px solid var(--line);border-radius:20px;overflow:hidden;background:rgba(21,34,48,.42)}
.strip img{display:block;width:100%;height:auto}
.strip .cap{display:flex;gap:12px;align-items:baseline;padding:12px 18px;border-top:1px solid var(--line);
  font-family:JB;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.strip .cap a{margin-left:auto;color:var(--aqua);text-decoration:none}

/* palette */
.sw{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.chip{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:rgba(21,34,48,.42)}
.chip .fill{height:88px}
.chip .txt{padding:12px 15px 15px}
.chip .hex{font-family:JB;font-size:12px;letter-spacing:.1em}
.chip .nm{font-family:Brico;font-size:15px;margin-top:2px}
.chip .use{color:var(--mut);font-size:12.5px;margin-top:5px;line-height:1.45}

/* rules */
.rules{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:8px}
.rule{padding:20px 22px;border:1px solid var(--line);border-radius:18px;background:rgba(21,34,48,.42)}
.rule b{display:block;font-family:Brico;font-size:15.5px;margin-bottom:6px}
.rule span{color:var(--dim);font-size:14px}

footer{max-width:1560px;margin:0 auto;padding:70px 34px 90px;color:var(--mut);font-size:13px}
footer code{font-family:JB;font-size:12px;background:rgba(255,255,255,.05);padding:2px 7px;border-radius:6px;color:var(--dim)}
footer a{color:var(--aqua);text-decoration:none}

@media(max-width:820px){
  .bar{padding:12px 16px;gap:14px;flex-wrap:wrap}
  .nav{display:none}
  .hero,section,footer{padding-left:18px;padding-right:18px}
  .ladder{gap:26px}
}
`;

const stageBadge = (s) => `<span class="badge">${s}</span>`;

function cardHtml(c) {
  if (!c.exists) return "";
  const shapeNote = c.shape === "square" ? "square" : "circle-safe";
  return `<article class="card">
    <div class="stage dark">
      ${stageBadge(shapeNote)}
      <img src="out/${c.dir}/${c.file}" alt="${esc(c.title)}" loading="lazy">
    </div>
    <div class="meta">
      <h3>${esc(c.title)}</h3>
      <div class="sub">${esc(c.meta)}</div>
      <div class="file"><span>${esc(c.file)}</span><a class="dl" href="out/${c.dir}/${c.file}" download>GET ↓</a></div>
    </div>
  </article>`;
}

const ladderHtml = (rows) => {
  const rungs = rows
    .filter(([f]) => has(ui, f))
    .map(
      ([f, px, note]) => `<div class="rung">
        <img src="out/ui/${f}" width="${px}" height="${px}" alt="${px}px avatar">
        <div class="px">${px}px</div>
        <div class="lbl">${esc(note)}</div>
      </div>`,
    )
    .join("");
  return `<div class="ladder">${rungs}
    <div class="note">Every rung is <b>drawn for its size</b>. Downscaling the 1080 instead is what makes an avatar look muddy in a tab bar.</div>
  </div>`;
};

const stripsHtml = (rows) =>
  `<div class="wide">${rows
    .filter(([f]) => has(png, f))
    .map(
      ([f, cap]) => `<figure class="strip" style="margin:0">
        <img src="out/png/${f}" alt="${esc(cap)}" loading="lazy">
        <figcaption class="cap"><span>${esc(cap)}</span><span>${esc(f)}</span>
        <a href="out/png/${f}" download>GET ↓</a></figcaption>
      </figure>`,
    )
    .join("")}</div>`;

const paletteHtml = palette
  .map(
    ([hex, name, use]) => `<div class="chip">
      <div class="fill" style="background:${hex}"></div>
      <div class="txt">
        <div class="hex">${hex}</div>
        <div class="nm">${esc(name)}</div>
        <div class="use">${esc(use)}</div>
      </div>
    </div>`,
  )
  .join("");

const rules = [
  ["Keep type inside the safe circle", "On the 1080 the coverage line sits at y = 0.792. Anything lower clips on a round crop."],
  ["Use the ladder, don't shrink", "Load the 128 and 64 exports. They drop the wordmark and enlarge the emblem."],
  ["Never put the 3D night master on light", "Its bloom is baked for dark. Use the 3D light master or the UI set."],
  ["Gold is an accent, never a field", "Node dots and pin tip only. It is the one warm note in the system."],
];

const rulesHtml = rules
  .map(([b, s]) => `<div class="rule"><b>${esc(b)}</b><span>${esc(s)}</span></div>`)
  .join("");

const nav = groups.map((g) => `<a href="#${g.id}">${esc(g.kicker.split("—")[1].trim())}</a>`).join("");

const sections = groups
  .map((g) => {
    const body = g.ladder
      ? ladderHtml(g.ladder)
      : g.wide
        ? stripsHtml(g.wide)
        : `<div class="grid">${g.cards.map(cardHtml).join("")}</div>`;
    return `<section id="${g.id}">
      <div class="head">
        <div class="n">${esc(g.kicker)}</div>
        <h2>${esc(g.title)}</h2>
        <p>${esc(g.lede)}</p>
      </div>
      ${body}
    </section>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NowBey — brand preview</title>
<meta name="description" content="Every NowBey icon, wordmark and lockup, generated from the product's own code.">
<style>${css}</style>
</head>
<body>

<div class="bar">
  <div class="mark"><img src="out/ui/nowbey-pfp-ui-night-64.png" alt="">NowBey</div>
  <nav class="nav">${nav}
    <a href="#palette">Palette</a>
    <a href="#rules">Rules</a>
  </nav>
  <div class="toggles">
    <label class="tg"><input type="checkbox" id="circle"> Circle crop</label>
    <label class="tg"><input type="checkbox" id="light"> Light stage</label>
  </div>
</div>

<div class="hero">
  <div class="kick">Brand assets · generated from the UI</div>
  <h1>Every crop of the mark, <em>drawn by the app itself.</em></h1>
  <p>The profile pictures here are not redrawn. They import the product's own backdrop, emblem geometry and typefaces, so a token change in the app repaints them. The 3D and flat sets are kept as alternates.</p>
  <div class="facts">
    <div class="fact"><b>26</b><span>UI avatars</span></div>
    <div class="fact"><b>3</b><span>layout tiers</span></div>
    <div class="fact"><b>2</b><span>grounds</span></div>
    <div class="fact"><b>1</b><span>command to rebuild</span></div>
  </div>
</div>

${sections}

<section id="palette">
  <div class="head">
    <div class="n">05 — PALETTE</div>
    <h2>Seven values, no more</h2>
    <p>Straight from the product tokens. The aqua family carries the brand; navy carries the weight; gold appears only in dots and tips.</p>
  </div>
  <div class="sw">${paletteHtml}</div>
</section>

<section id="rules">
  <div class="head">
    <div class="n">06 — RULES</div>
    <h2>The four that matter</h2>
    <p>Everything else is a preference. These are the ones that break the asset.</p>
  </div>
  <div class="rules">${rulesHtml}</div>
</section>

<footer>
  Rebuild everything with <code>./build.sh</code> · assets in <code>out/ui</code>, <code>out/png</code>, <code>out/svg</code><br>
  Reference sheets: <a href="out/nowbey-ui-avatar-sheet.png">UI avatars</a> ·
  <a href="out/nowbey-brand-sheet.png">brand sheet</a> ·
  <a href="out/nowbey-vector-sheet.png">vector sheet</a> ·
  <a href="README.md">README</a>
</footer>

<script>
  const body = document.body;
  document.getElementById('circle').addEventListener('change', e => body.classList.toggle('circle', e.target.checked));
  document.getElementById('light').addEventListener('change', e => {
    const on = e.target.checked;
    document.querySelectorAll('.stage').forEach(s => {
      s.classList.toggle('light', on);
      s.classList.toggle('dark', !on);
    });
  });

  // mark the current section in the nav
  const links = [...document.querySelectorAll('.nav a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.style.color = '');
      const link = links.find(a => a.getAttribute('href') === '#' + en.target.id);
      if (link) link.style.color = 'var(--aqua)';
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => io.observe(s));
</script>
</body>
</html>`;

writeFileSync(join(ROOT, "index.html"), html);
console.log("  → index.html", `${Math.round(html.length / 1024)} KB`);
