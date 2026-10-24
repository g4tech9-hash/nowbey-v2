/**
 * NOWBEY MARKETING — FEED POSTS (1080×1080)
 * ---------------------------------------------------------------------------
 * Ten square posts for Instagram / Facebook, one per launch idea. Each is a
 * real app screen inside a real photograph (or inside a device frame on the
 * ambient room), framed with the product's own type system.
 *
 * Copy rules inherited from the product, not invented for marketing:
 *  · British spelling — "neighbour", "harbour".
 *  · No claim beyond the build: email alerts are live, SMS and iOS push are
 *    not; the map is live for New Providence only.
 *  · Storm warnings are free — a promise the code keeps
 *    (src/lib/alerts.ts, stormOverride).
 */

import { svgDoc, render } from "./lib.mjs";
import { photoLayer, placeInRect, embed } from "./photos.mjs";
import { quadBox } from "./composite.mjs";
import { QUADS } from "./geometry.mjs";
import { sceneMap, sceneFeed, sceneAlerts, sceneReport, sceneWire, sceneSuccess, sceneDesktop } from "./scenes.mjs";
import { splitLayout, posterLayout, deviceLayout } from "./layouts.mjs";

const W = 1080;
const H = 1080;

/** Render an app screen at a phone quad's aspect, in app logical units. */
function appScreen(scene, aspect, opts = {}, width = 1560) {
  const w = 390;
  const h = Math.round(w / aspect);
  return render(svgDoc(w, h, scene(w, h, opts)), width);
}

const aspectOf = (photo) => quadBox(QUADS[photo].quad).aspect;

/* ------------------------------------------------------------------ posts */

export const POSTS = {
  /* 01 — the map, as a phone in a street. Type left, photo panel right. */
  "01-map": async () => {
    const photo = "photo-closeup-square.png";
    const rect = { x: Math.round(W * 0.42), y: 0, w: Math.round(W * 0.58), h: H };
    const f = placeInRect(photo, rect, 0.5, 0.5, 1.05);
    const png = await photoLayer({ photo, rect, ...f, screen: appScreen(sceneMap, aspectOf(photo), { zoom: 1.05 }) });
    return svgDoc(
      W,
      H,
      splitLayout(W, H, {
        photoPng: png,
        eyebrowStr: "Community map",
        headlineStr: "See what's|happening|on your island.",
        subStr: "Neighbour reports and local news on one clear map. Confirm what you see, and know before you drive.",
        ctaStr: "Explore the map",
        footStr: "Live for New Providence",
        headSize: 74,
        panelW: Math.round(W * 0.58),
      }),
    );
  },

  /* 02 — reporting, in the hand. Photo on top, type beneath. */
  "02-report": async () => {
    const photo = "photo-closeup-square.png";
    const rect = { x: 0, y: 0, w: W, h: 690 };
    const f = placeInRect(photo, rect, 0.5, 0.5, 0.82);
    const png = await photoLayer({ photo, rect, ...f, screen: appScreen(sceneReport, aspectOf(photo), { step: 2, typed: 0.7 }) });
    return svgDoc(
      W,
      H,
      posterLayout(W, H, {
        photoPng: png,
        photoH: 690,
        eyebrowStr: "Report a hazard",
        headlineStr: "Twenty seconds|from seeing it to|warning neighbours.",
        subStr: "A guided four-step report. Post your name, or stay anonymous.",
        ctaStr: "Report a hazard",
        footStr: "Your draft survives a dropped signal",
        headSize: 66,
        maxLines: 2,
      }),
    );
  },

  /* 03 — email alerts, as a device on the room. The retention hook. */
  "03-alerts": async () => {
    const aspect = 390 / 744;
    const png = appScreen(sceneAlerts, aspect, {}, 1560);
    return svgDoc(
      W,
      H,
      deviceLayout(W, H, {
        screenPng: png,
        eyebrowStr: "Email alerts",
        headlineStr: "Your island.|Your alerts.",
        subStr: "Choose your island and the updates you want. Storm warnings are always sent, and always free.",
        ctaStr: "Set up email alerts",
        footStr: "Email is the channel available today",
        deviceW: 430,
        bleed: 130,
        headSize: 62,
        maxLines: 1,
        callouts: [{ at: "right", dy: 250, w: 300, title: "Flooding on", line: "Bay Street", icon: "pin", color: "#6fd0ff" }],
      }),
    );
  },

  /* 04 — the news wire, photographed, type beneath. */
  "04-wire": async () => {
    const photo = "photo-closeup-square.png";
    const rect = { x: 0, y: 0, w: W, h: 700 };
    const f = placeInRect(photo, rect, 0.46, 0.42, 0.62);
    const png = await photoLayer({ photo, rect, ...f, screen: appScreen(sceneWire, aspectOf(photo)) });
    return svgDoc(
      W,
      H,
      posterLayout(W, H, {
        photoPng: png,
        photoH: 700,
        eyebrowStr: "The news wire",
        headlineStr: "Bahamian headlines|with the map underneath.",
        subStr: "Local outlets, reviewed before publishing, linked to where it happened.",
        ctaStr: "Read the news wire",
        footStr: "Sources named on every story",
        headSize: 66,
        maxLines: 2,
      }),
    );
  },

  /* 05 — the closed loop. Confirmation is the product's whole idea. */
  "05-confirmed": async () => {
    const photo = "photo-map-square.png";
    const rect = { x: Math.round(W * 0.44), y: 0, w: Math.round(W * 0.56), h: H };
    const f = placeInRect(photo, rect, 0.5, 0.6, 0.7);
    const png = await photoLayer({ photo, rect, ...f, screen: appScreen(sceneSuccess, aspectOf(photo)) });
    return svgDoc(
      W,
      H,
      splitLayout(W, H, {
        photoPng: png,
        eyebrowStr: "Confirmation",
        headlineStr: "Somebody saw it too.|That's the whole idea.",
        subStr: "Neighbours confirm what's real, so a rumour becomes a signal you can act on.",
        ctaStr: "See the map",
        footStr: "No account needed to look",
        headSize: 62,
        maxLines: 4,
        panelW: Math.round(W * 0.56),
      }),
    );
  },

  /* 06 — the feed, as a device. "What neighbours are reporting right now." */
  "06-feed": async () => {
    const png = appScreen(sceneFeed, 390 / 744, {}, 1560);
    return svgDoc(
      W,
      H,
      deviceLayout(W, H, {
        screenPng: png,
        eyebrowStr: "Community feed",
        headlineStr: "What neighbours|are reporting,|right now.",
        subStr: "Every report shows who confirmed it and when. Old ones are labelled, never quietly deleted.",
        ctaStr: "Open the feed",
        footStr: "Verify before you act",
        deviceW: 420,
        bleed: 140,
        headSize: 58,
        maxLines: 2,
        callouts: [{ at: "left", dy: 340, w: 300, title: "4 confirmations", line: "Bay Street · Nassau", icon: "check" }],
      }),
    );
  },

  /* 07 — no download. The website is the app. */
  "07-web": async () => {
    const photo = "photo-laptop.png";
    const rect = { x: 0, y: 0, w: W, h: 720 };
    // the laptop screen aspect is ~1.62:1
    const aspect = quadBox(QUADS[photo].quad).aspect;
    const webPng = render(svgDoc(1440, Math.round(1440 / aspect), sceneDesktop(1440, Math.round(1440 / aspect))), 2200);
    const f = placeInRect(photo, rect, 0.52, 0.52, 0.62);
    const png = await photoLayer({ photo, rect, ...f, screen: webPng });
    return svgDoc(
      W,
      H,
      posterLayout(W, H, {
        photoPng: png,
        photoH: 720,
        eyebrowStr: "No download required",
        headlineStr: "The whole map,|in a browser tab.",
        subStr: "Open it on a laptop, a tablet or a phone. No app store, no update to wait for.",
        ctaStr: "Open the map",
        footStr: "nowbey.com",
        headSize: 70,
        maxLines: 2,
      }),
    );
  },

  /* 08 — trust, as a typographic poster on the ambient room. */
  "08-trust": async () => {
    const png = appScreen(sceneMap, 390 / 744, { zoom: 1.02 }, 1400);
    return svgDoc(
      W,
      H,
      deviceLayout(W, H, {
        screenPng: png,
        eyebrowStr: "Why we built this",
        headlineStr: "A rumour travels fast.|So should the correction.",
        subStr: "Every pin shows who confirmed it, and when. Unconfirmed stays labelled unconfirmed.",
        ctaStr: "How confirmation works",
        footStr: "Built in The Bahamas, for The Bahamas",
        deviceW: 410,
        bleed: 150,
        headSize: 54,
        maxLines: 3,
        callouts: [{ at: "right", dy: 430, w: 296, title: "Needs a recheck", line: "Nobody has looked in days", icon: "up", color: "#f8cf6b" }],
      }),
    );
  },
};
