import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGithubIssue,
  cleanPath,
  digestFor,
  sanitizeBreadcrumbs,
  scrubText,
  shouldAnalyze,
  validateAnalysis,
} from "../src/lib/error-core.ts";

const err = {
  kind: "client",
  platform: "web",
  message: "Cannot read properties of undefined (reading 'lat')",
  stack: "TypeError: x\n at Map (/map:1:1) https://nowbey.example/reset?token=abc123",
  url: "/map",
  count: 12,
  firstSeenAt: new Date("2026-10-14T00:00:00Z"),
  lastSeenAt: new Date("2026-10-15T00:00:00Z"),
  userAgent: "Mozilla/5.0",
  context: JSON.stringify({ breadcrumbs: [{ type: "navigation", detail: "/map", at: "2026-10-15T00:00:00.000Z" }] }),
  appVersion: "web",
};

test("scrubText redacts credential query values and bearer tokens", () => {
  assert.match(scrubText("go https://x.test/reset?token=abc123&ok=1"), /token=\[redacted\]/);
  assert.doesNotMatch(scrubText("go https://x.test/reset?token=abc123"), /abc123/);
  assert.match(scrubText("Authorization: Bearer abcdefgh123456"), /Bearer \[redacted\]/);
  assert.equal(scrubText("a\0b").includes("\0"), false);
});

test("cleanPath keeps only the path", () => {
  assert.equal(cleanPath("https://x.test/map?a=1#top"), "/map");
  assert.equal(cleanPath("/life?token=secret"), "/life");
  assert.equal(cleanPath(""), null);
});

test("digest separates platforms so web and app crashes are two groups", () => {
  assert.notEqual(digestFor("client", "boom", "/map", "web"), digestFor("client", "boom", "/map", "android"));
  assert.equal(digestFor("app", "boom", "/map", "android"), digestFor("app", "boom", "/map", "android"));
});

test("sanitizeBreadcrumbs caps, strips queries and drops junk", () => {
  const small = sanitizeBreadcrumbs([
    { type: "navigation", detail: "/map?token=abc", at: "2026-10-15T00:00:00.000Z" },
    { type: "api", detail: "GET /api/news → 500", at: "2026-10-15T00:00:01.000Z" },
    "junk",
    { detail: "" },
  ]);
  assert.deepEqual(
    small.map((c) => c.detail),
    ["/map", "GET /api/news → 500"],
  );
  // Over the cap, the newest breadcrumbs win — the ones right before the crash matter.
  const big = sanitizeBreadcrumbs(Array.from({ length: 30 }, (_, i) => ({ type: "tap", detail: `b${i}`, at: "2026-10-15T00:00:02.000Z" })));
  assert.equal(big.length, 20);
  assert.equal(big.at(-1).detail, "b29");
});

test("validateAnalysis requires a real diagnosis and honest enums", () => {
  const ok = validateAnalysis({ severity: "HIGH", summary: "Map crashes", likelyCause: "pin without coords", suggestedFix: "guard lat", affectedArea: "map", confidence: "medium" });
  assert.equal(ok.severity, "high");
  assert.equal(validateAnalysis({ severity: "high", summary: "x" }), null);
  assert.equal(validateAnalysis(null), null);
  const fallback = validateAnalysis({ severity: "catastrophic", summary: "s", likelyCause: "c", suggestedFix: "f", confidence: "sure" });
  assert.equal(fallback.severity, "low");
  assert.equal(fallback.confidence, "low");
});

test("shouldAnalyze: new, revived and stale-unavailable groups only", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  assert.equal(shouldAnalyze({ count: 1 }, null, now), true);
  assert.equal(shouldAnalyze({ count: 3 }, { status: "pending_review", analyzedCount: 1, updatedAt: new Date(now) }, now), false);
  assert.equal(shouldAnalyze({ count: 6 }, { status: "pending_review", analyzedCount: 1, updatedAt: new Date(now) }, now), true);
  assert.equal(shouldAnalyze({ count: 6 }, { status: "unavailable", analyzedCount: 1, updatedAt: new Date(now - 60_000) }, now), false);
  assert.equal(shouldAnalyze({ count: 6 }, { status: "unavailable", analyzedCount: 1, updatedAt: new Date(now - 7 * 3_600_000) }, now), true);
  assert.equal(shouldAnalyze({ count: 99 }, { status: "issue_created", analyzedCount: 1, updatedAt: new Date(now) }, now), false);
  assert.equal(shouldAnalyze({ count: 99 }, { status: "dismissed", analyzedCount: 1, updatedAt: new Date(now) }, now), false);
});

test("buildGithubIssue carries evidence and the ask-first checklist, scrubbed", () => {
  const analysis = validateAnalysis({ severity: "high", summary: "Map crashes on old pins", likelyCause: "missing lat", suggestedFix: "filter pins", affectedArea: "web map", confidence: "high" });
  const issue = buildGithubIssue(err, analysis, "digest123");
  assert.match(issue.title, /^\[AI log fix\] Map crashes/);
  assert.match(issue.body, /\*\*12\*\*/);
  assert.match(issue.body, /Do not start work until the owner confirms/);
  assert.match(issue.body, /npm run typecheck/);
  assert.doesNotMatch(issue.body, /abc123/, "tokens from the stack must not reach GitHub");
});
