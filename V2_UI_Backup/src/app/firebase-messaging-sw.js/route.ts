import { NextResponse } from "next/server";
import { pushPublicConfig } from "@/lib/push";

export const dynamic = "force-dynamic";

/*
 * The Firebase messaging service worker must live at a stable root URL, but its config comes from
 * env vars — so this route serves the JS with the config baked in. 404 when push is not set up,
 * which is also how the page knows push is off. The version pins must match the "firebase" package
 * in package.json so the page and the worker speak the same protocol.
 */
const FIREBASE_VERSION = "11.10.0";

export function GET() {
  const pub = pushPublicConfig();
  if (!pub) return new NextResponse("Push is not configured.", { status: 404 });

  const js = `/* NowBey push worker — generated from server env, do not edit by hand. */
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(pub.config)});
var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  // Messages that carry a "notification" key are displayed by the SDK itself; only render data-only ones.
  if (payload && payload.notification) return;
  var data = (payload && payload.data) || {};
  var title = data.title || "NowBey";
  self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/icon.svg",
    data: { url: data.url || "/" },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(self.registration.scope) === 0 && "focus" in list[i]) {
          list[i].navigate(url);
          return list[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Browsers re-check the worker on every registration anyway, but never let a CDN hold a stale config.
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
