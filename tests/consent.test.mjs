/**
 * C2: consent must be a record, and every surface that creates an account must send it.
 *
 * These are static checks on purpose. The runtime test (tests/auth.test.mjs) proves the API refuses a
 * sign-up without consent; this one proves the *clients* actually ask, so nobody can ship a button that the
 * server silently rejects. The failure this prevents is quiet: the form looks fine, the API returns 400, and
 * sign-up is broken for everyone on that platform.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the web sign-up form sends termsAccepted and links both documents", () => {
  const form = read("src/app/login/login-form.tsx");
  assert.match(form, /termsAccepted:\s*agreed/, "the sign-up body must carry the consent flag");
  assert.match(form, /href="\/terms"/, "the Terms must be one tap from the checkbox");
  assert.match(form, /href="\/privacy"/, "so must the Privacy Policy");
  assert.match(form, /disabled=\{busy \|\| \(mode === "signup" && !agreed\)\}/, "the button stays off until the box is ticked");
});

test("the app sign-up sends the same flag", () => {
  const app = read("expo/app/(tabs)/you.tsx");
  assert.match(app, /termsAccepted:\s*agreed/, "the app must send it too, or sign-up breaks when the API enforces it");
  assert.match(app, /onSignUp\(\{[^}]*termsAccepted/, "passed through the session hook, not dropped on the floor");
});

test("the API records the server's own version, never one from the request", () => {
  const route = read("src/app/api/session/route.ts");
  assert.match(route, /termsAccepted !== true/, "consent is enforced server-side");
  assert.match(route, /termsVersion:\s*TERMS_VERSION/, "the stored version comes from lib/legal");
  assert.doesNotMatch(route, /termsVersion:\s*body\./, "a client cannot claim a version the server does not have");
});

test("Google sign-up records consent as well, since the callback creates the account", () => {
  const google = read("src/app/api/auth/google/callback/route.ts");
  assert.match(google, /termsVersion:\s*TERMS_VERSION/, "an account made by the callback still needs a consent record");
});

test("the policy discloses the two collectors the old version omitted", () => {
  const privacy = read("src/app/privacy/page.tsx");
  assert.match(privacy, /client_errors|crash report/i, "the crash reporter and its breadcrumbs must be disclosed");
  assert.match(privacy, /funnel_daily/i, "the anonymous counters must be disclosed");
  assert.match(privacy, /hash/i, "the IP address is stored hashed, and that must be said");
  assert.match(privacy, /Gemini|Vercel|Neon|Stripe/, "processors are named, not waved at");
});

test("no legal page still calls itself a template", () => {
  for (const page of ["src/app/terms/page.tsx", "src/app/privacy/page.tsx"]) {
    assert.doesNotMatch(read(page), /\/\/\s*TEMPLATE/, `${page} must not ship a placeholder marker`);
  }
});
