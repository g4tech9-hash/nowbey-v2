import { NextResponse } from "next/server";

export const dynamic = "force-static";

/*
 * NowBey offline worker. Two jobs only:
 *  1. Keep the last public feed (anonymous, viewer-independent data) so a dropped signal still shows something.
 *  2. Show a saved offline page instead of the browser's error page when a page cannot be loaded.
 * Nothing personal is cached: the feed route is public, and every other request goes to the network.
 * The push worker (/firebase-messaging-sw.js) imports this file, so both live under one registration.
 */
const WORKER = `/* NowBey offline worker. Generated from src/app/sw.js/route.ts. */
var SHELL_CACHE = "nb-shell-v1";
var FEED_CACHE = "nb-feed-v1";
var OFFLINE_URL = "/offline";
var FEED_KEY = "/__nowbey_last_feed__";

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.add(OFFLINE_URL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== SHELL_CACHE && k !== FEED_CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isFeedRequest(url) {
  return url.origin === self.location.origin &&
    url.pathname === "/api/incidents" &&
    (url.searchParams.get("status") || "active") === "active" &&
    !url.searchParams.get("q");
}

function offlinePage() {
  return caches.open(SHELL_CACHE).then(function (cache) { return cache.match(OFFLINE_URL); }).then(function (hit) {
    return hit || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(offlinePage));
    return;
  }

  if (isFeedRequest(url)) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          event.waitUntil(
            res.clone().blob().then(function (body) {
              var headers = new Headers(res.headers);
              headers.set("X-Saved-At", new Date().toISOString());
              return caches.open(FEED_CACHE).then(function (cache) {
                return cache.put(FEED_KEY, new Response(body, { status: 200, headers: headers }));
              });
            }).catch(function () {})
          );
        }
        return res;
      }).catch(function () {
        return caches.open(FEED_CACHE).then(function (cache) { return cache.match(FEED_KEY); }).then(function (hit) {
          if (!hit) return new Response("{\\"incidents\\":[],\\"counts\\":[],\\"offline\\":true}", { status: 503, headers: { "Content-Type": "application/json" } });
          return hit.blob().then(function (body) {
            var headers = new Headers(hit.headers);
            headers.set("X-Served-From", "cache");
            return new Response(body, { status: 200, headers: headers });
          });
        });
      })
    );
  }
});
`;

export function GET() {
  return new NextResponse(WORKER, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
