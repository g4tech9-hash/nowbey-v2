/**
 * The front door.
 *
 * A visitor who is not signed in must see the landing page at "/"; a member must skip it and land
 * on the live feed, exactly as before. These are source-level assertions so they run in the
 * hermetic `npm test` gate without a browser, a database or a server, the same way
 * tests/redirect.test.mjs and tests/map-layout.test.mjs do. The end-to-end proof lives in
 * tests/endpoints.test.mjs (guest) and tests/auth.test.mjs (member), which run against the local
 * stack.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/app/page.tsx");
const landing = read("src/components/landing.tsx");
const snapshot = read("src/lib/landing.ts");
const shell = read("src/components/app-shell.tsx");
const nav = read("src/components/nav-links.tsx");
const layout = read("src/app/layout.tsx");

test("the home route sends signed-out visitors to the landing page before it loads the feed", () => {
  const homeFnAt = page.indexOf("export default async function Home");
  const gateAt = page.indexOf("if (!viewer.signedIn) return <Landing />", homeFnAt);
  const feedAt = page.indexOf("await loadHome(query)", homeFnAt);
  assert.ok(page.includes('import { Landing } from "@/components/landing"'), "the home route must import the landing page");
  assert.ok(homeFnAt > -1 && gateAt > homeFnAt, 'the home route must return <Landing /> for a viewer who is not signed in');
  assert.ok(feedAt > gateAt, "the feed query must run only after the viewer passed the gate");
  assert.ok(!page.slice(homeFnAt, gateAt).includes("loadHome("), "no feed query may run before the gate");
  assert.ok(!page.includes("Promise.all([loadHome(query), getViewer()])"), "the viewer must be checked before the feed is loaded");
});

test("the landing page offers the three honest ways in", () => {
  for (const phrase of [
    "Create your account",
    "Sign in",
    "Browse the map without an account",
  ]) {
    assert.ok(landing.includes(phrase), `the landing page should offer: ${phrase}`);
  }
  assert.ok(landing.includes('href="/login?mode=signup"'), "the primary call to action opens the sign-up tab");
  assert.ok(landing.includes('href="/login?mode=signin"'), "the secondary call to action opens the sign-in tab");
  assert.ok(landing.includes('href="/map"'), "a guest must be able to read the map without an account");
});

test("the landing page keeps every promise it makes", () => {
  // The app cannot sell push, text alerts or payments that are not shipped. These are the truthful
  // wordings the rest of the site uses, and the landing page must not drift from them.
  assert.ok(landing.includes("the Android app has its own push switch"), "push is described as Android-only");
  assert.ok(!/text alerts? (are|is) (live|ready|available)/i.test(landing), "text alerts are not sold");
  assert.ok(!/push notifications? (are|is) (live|enabled|working)/i.test(landing), "push is not claimed as delivered");
  assert.match(landing, /no account|without an account/i, "the free, account-free path must be stated");
  assert.ok(landing.includes("EmergencyNotice"), "the emergency number notice stays on the front door");
});

test("a database problem cannot take the front door down", () => {
  assert.match(landing, /try\s*\{[\s\S]*?landingSnapshot\(\)[\s\S]*?\}\s*catch/, "the snapshot must be optional");
  assert.ok(landing.includes('"—"'), "with no database the numbers fall back to a dash instead of an error");
});

test("the landing snapshot is small, cached and hides withdrawn reports", () => {
  assert.ok(snapshot.includes("unstable_cache"), "the landing numbers are cached like the home feed");
  assert.match(snapshot, /revalidate:\s*30/, "half a minute is enough for a launch-day crowd");
  assert.ok(snapshot.includes("HIDDEN_STATUSES"), "archived and unfounded reports must not be counted or shown");
  assert.ok(snapshot.includes('.limit(3)'), "only three headlines belong on the front door");
  assert.ok(!snapshot.includes("authorHandle"), "the landing page never names the person who filed a report");
});

test("the landing page uses a bare shell, while the feed keeps the app furniture", () => {
  const proxy = read("src/proxy.ts");
  assert.ok(
    proxy.includes('requestHeaders.set("x-pathname", new URL(req.url).pathname)'),
    "the proxy must tell the layout which route is rendering",
  );
  assert.ok(layout.includes('const bare = !viewer.signedIn && h.get("x-pathname") === "/"'), "only a guest on / gets the bare shell");
  assert.ok(layout.includes("bare={bare}"), "the layout must pass the bare decision to the shell");
  assert.ok(shell.includes("if (bare)"), "the shell must have a bare branch");
  assert.ok(shell.includes('<main id="main">{children}</main>'), "the bare branch keeps the skip link and the main landmark");
  assert.ok(landing.includes("<header"), "the landing page brings its own header");
  assert.ok(landing.includes("<footer"), "the landing page brings its own footer");
  // A client navigation keeps the layout of the route it started from, so entering or leaving the
  // landing page must be a full document load; otherwise a guest could get the app shell around
  // the landing page, or the bare shell around the map.
  assert.ok(!landing.includes('from "next/link"'), "the landing page's links must be full page loads");
  assert.ok(!landing.includes("<Link"), "no client-router link may leave the bare shell behind");
  assert.ok(shell.includes('<a href="/" className="flex items-center gap-2.5">'), "a guest's logo link must reload the document");
  assert.ok(read("src/app/error.tsx").includes('<a href="/"'), "the error page's way home must reload the document");
  assert.ok(read("src/app/not-found.tsx").includes('<a href="/"'), "the 404's way home must reload the document");
});

test("signed-out navigation does not point at a feed they cannot see", () => {
  assert.ok(layout.includes("signedIn={viewer.signedIn}"), "the shell must be told who is signed in");
  assert.ok(shell.includes("signedIn: boolean"), "the shell takes the signed-in state");
  assert.ok(shell.includes("<NavLinks showFeed={signedIn} />"), "the top nav follows the signed-in state");
  assert.ok(shell.includes('<NavLinks variant="bar" showFeed={signedIn} />'), "the phone nav follows too");
  assert.ok(nav.includes('showFeed = true'), "the nav defaults to the member layout");
  assert.ok(nav.includes('LINKS.filter((l) => l.href !== "/")'), "a guest's nav drops the Feed link");
});
