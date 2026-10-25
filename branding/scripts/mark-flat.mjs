/**
 * NowBey — flat, two-ink construction of the 3D icon.
 * Pin (thick ring + point) · network constellation · flanking wave arcs.
 * Everything is drawn on a 100×100 grid so it stays crisp down to 32px.
 */

export const INK = {
  navy: "#0A2A43",
  aqua: "#3FD6C0",
  aquaBright: "#6EEADB",
  gold: "#F4B942",
  goldBright: "#FFD166",
  ivory: "#F3F1EA",
};

/* the app's pin, on its own 40-unit grid, scaled 3.1× onto the 100-grid */
const S = 3.1;
const TX = -11.82;
const TY = -6.32;
const PIN = `M20 7.2c-4.3 0-7.8 3.4-7.8 7.6 0 5.5 7.8 12.6 7.8 12.6s7.8-7.1 7.8-12.6c0-4.2-3.5-7.6-7.8-7.6Z`;
const HEAD = { cx: TX + 20 * S, cy: TY + 14.8 * S, r: 10.2 };

/* network nodes, in 100-space, sitting in the lower body of the pin */
const NODES = [
  [43.9, 60.1, 1.36],
  [50.6, 55.8, 1.76],
  [57.1, 60.8, 1.36],
  [47.0, 66.6, 1.5],
  [54.0, 67.5, 1.5],
  [50.6, 72.2, 1.32],
];
const EDGES = [
  [0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 5],
];

const round = (v) => Math.round(v * 10) / 10;

/** point on a circle centred on the mark */
const pt = (deg, r, cx = 50, cy = 47) => [
  cx + r * Math.cos((deg * Math.PI) / 180),
  cy - r * Math.sin((deg * Math.PI) / 180),
];

/** one flanking arc, mirrored by `side` (-1 = left, 1 = right) */
function arc(r, spread, side) {
  const [x0, y0] = pt(180 - spread, r);
  const [x1, y1] = pt(180 + spread, r);
  const mx = (x) => (side < 0 ? x : 100 - x);
  const sweep = side < 0 ? 0 : 1;
  return `M${round(mx(x0))} ${round(y0)}A${r} ${r} 0 0 ${sweep} ${round(mx(x1))} ${round(y1)}`;
}

/**
 * @param {"light"|"night"} mode  light = navy ink for light paper,
 *                                night = aqua ink with the nodes knocked out
 */
export function flatMark({ mode = "light", size = 100, arcs = true } = {}) {
  const night = mode === "night";
  const body = night ? INK.aqua : INK.navy;
  const node = night ? "white" : INK.gold;

  const arcSvg = !arcs
    ? ""
    : [-1, 1]
        .flatMap((side) => [arc(41, 47, side), arc(33.5, 38.5, side)])
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${body}" stroke-width="4.4" stroke-linecap="round"${
              night ? ' opacity="0.85"' : ""
            }/>`,
        )
        .join("");

  /* on night the nodes are punched out of the aqua body, so they read dark */
  const edges = EDGES.map(([a, b]) => {
    const [x0, y0] = NODES[a];
    const [x1, y1] = NODES[b];
    return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${node}" stroke-width="${
      night ? 1.1 : 1.25
    }" stroke-linecap="round"/>`;
  }).join("");

  const dots = NODES.map(
    ([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r + 0.6}" fill="${node}"/>`,
  ).join("");

  const holeFill = night ? "black" : "black";
  const mask = `<mask id="knock" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect x="0" y="0" width="100" height="100" fill="white"/>
      <circle cx="${round(HEAD.cx)}" cy="${round(HEAD.cy)}" r="${HEAD.r}" fill="${holeFill}"/>
    </mask>`;

  const paint = night
    ? `<g mask="url(#knock)"><path d="${PIN}" transform="translate(${TX} ${TY}) scale(${S})" fill="${body}"/></g>
       <g mask="url(#nodes)"><g mask="url(#knock)">
         <path d="${PIN}" transform="translate(${TX} ${TY}) scale(${S})" fill="${node}"/>
       </g></g>`
    : `<g mask="url(#knock)"><path d="${PIN}" transform="translate(${TX} ${TY}) scale(${S})" fill="${body}"/></g>`;

  const nodeMask = `<mask id="nodes" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
      <rect x="0" y="0" width="100" height="100" fill="black"/>
      ${edges}${dots}
    </mask>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <defs>${mask}${night ? nodeMask : ""}</defs>
  ${arcSvg}
  ${paint}
  ${!night ? `<g>${edges}${dots}</g>` : ""}
</svg>`;
}
