#!/usr/bin/env node
/**
 * Read-only check of the LIVE site after a deploy. It creates nothing and signs nobody in: every
 * request is one a stranger could make. Run by .github/workflows/deploy.yml after deploy-web, or by hand:
 *
 *   node scripts/smoke-prod.mjs                                  # https://nowbey-v2.vercel.app
 *   SMOKE_BASE=https://example.com EXPECT_SHA=<commit> node scripts/smoke-prod.mjs
 *
 * EXPECT_SHA (optional): wait up to SMOKE_WAIT_S seconds (default 300) until /api/health reports that
 * commit, so the checks run against the new release rather than the one it replaced.
 * Prints one line per check and a summary; exit 1 if any required check fails. Warnings (things the
 * owner still has to do, like running the SQL) are listed but do not fail the run.
 */
const BASE = (process.env.SMOKE_BASE ?? "https://nowbey-v2.vercel.app").replace(/\/+$/, "");
const EXPECT = (process.env.EXPECT_SHA ?? "").trim().slice(0, 12);
const WAIT_S = Number(process.env.SMOKE_WAIT_S ?? 300);
const FOREIGN = "https://evil.example";

const results = [];
const pass = (name, detail = "") => results.push({ level: "PASS", name, detail });
const fail = (name, detail = "") => results.push({ level: "FAIL", name, detail });
const warn = (name, detail = "") => results.push({ level: "WARN", name, detail });
const check = (ok, name, detail) => (ok ? pass : fail)(name, detail);

async function get(path, init = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", signal: AbortSignal.timeout(20_000), ...init });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { res, status: res.status, text, json, h: (k) => res.headers.get(k) };
}

async function waitForRelease() {
  const deadline = Date.now() + WAIT_S * 1000;
  let last = "";
  for (;;) {
    try {
      const r = await get(`/api/health?smoke=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
      const version = String(r.json?.version ?? "");
      last = version || `HTTP ${r.status}`;
      if (!EXPECT || version === EXPECT) return r;
      // A deployment made without Git metadata reports a package version instead of a commit; it cannot be
      // matched, so say so rather than waiting it out and failing.
      if (r.status === 200 && version && !/^[0-9a-f]{7,}$/.test(version)) {
        warn("release could not be confirmed", `site reports version "${version}", not a commit`);
        return r;
      }
    } catch (e) {
      last = String(e?.cause?.code ?? e?.message ?? e);
    }
    if (Date.now() > deadline) {
      fail("release is live", `expected ${EXPECT}, site still reports ${last} after ${WAIT_S}s`);
      return null;
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

async function main() {
  console.log(`smoke-checking ${BASE}${EXPECT ? ` for release ${EXPECT}` : ""}`);
  const health = await waitForRelease();
  if (health) {
    check(health.status === 200 && health.json?.ok === true, "health: database reachable", `HTTP ${health.status} status=${health.json?.status}`);
    if (EXPECT && health.json?.version === EXPECT) pass("release is live", health.json.version);
    if (health.json?.checks?.rateLimits === true) pass("security SQL applied (rate_limits table present)");
    else if (health.json?.checks?.rateLimits === false)
      warn("security SQL not applied yet", "run src/db/add-security-fixes.sql in Neon (TODO_HUMAN §0a step 2); per-instance limits until then");
    else warn("health does not report rateLimits", "older release?");
    if (health.json?.status !== "ready") warn("health status is not ready", JSON.stringify(health.json?.checks));
  }

  const home = await get("/");
  check(home.status === 200, "home page renders", `HTTP ${home.status}`);
  check(home.h("x-frame-options") === "DENY", "X-Frame-Options: DENY", home.h("x-frame-options") ?? "missing");
  check(/frame-ancestors 'none'/.test(home.h("content-security-policy") ?? ""), "CSP frame-ancestors 'none'", home.h("content-security-policy") ?? "missing");
  check(/max-age=\d{7,}/.test(home.h("strict-transport-security") ?? ""), "HSTS", home.h("strict-transport-security") ?? "missing");
  check(home.h("x-content-type-options") === "nosniff", "X-Content-Type-Options: nosniff");
  check(!/Application error|Internal Server Error/i.test(home.text), "home page has no error screen");

  const plain = await get("/api/health");
  check(plain.h("access-control-allow-origin") !== "*", "API no longer answers Access-Control-Allow-Origin: *", plain.h("access-control-allow-origin") ?? "none");
  const foreignRead = await get("/api/health", { headers: { origin: FOREIGN } });
  check(!foreignRead.h("access-control-allow-origin"), "foreign origin gets no CORS grant", foreignRead.h("access-control-allow-origin") ?? "none");
  check(!foreignRead.h("access-control-allow-credentials"), "never Access-Control-Allow-Credentials");

  const foreignWrite = await get("/api/session", {
    method: "POST",
    headers: { origin: FOREIGN, "content-type": "application/json" },
    body: JSON.stringify({ handle: "smoke_check_nobody", password: "x" }),
  });
  check(foreignWrite.status === 403 && /Bad origin/.test(foreignWrite.text), "cross-site sign-in refused (403 Bad origin)", `HTTP ${foreignWrite.status}`);

  // The Android app sends no Origin. One sign-in attempt for a handle that cannot exist must reach the
  // route and be answered normally (401), proving the origin wall does not lock the app out.
  const native = await get("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json", "x-nowbey-client": "native" },
    body: JSON.stringify({ handle: "smoke_check_nobody", password: "not-a-password" }),
  });
  check(native.status === 401 || native.status === 429, "app sign-in path still open (no Origin → 401, not 403)", `HTTP ${native.status}`);

  const checkout = await get("/api/billing/checkout", {
    method: "POST",
    headers: { origin: BASE, "content-type": "application/json" },
    body: JSON.stringify({ tier: "admiral", interval: "month" }),
  });
  check(checkout.status === 401 || checkout.status === 503, "anonymous checkout grants nothing", `HTTP ${checkout.status}`);

  const support = await get("/support");
  check(support.status === 200 && /Plans open soon/.test(support.text), "plans page says Plans open soon", `HTTP ${support.status}`);
  check(!/Sign in to choose|>Get (Conch|Rock Sound|Admiral)</.test(support.text), "plans page offers no pretend purchase button");

  const cron = await get("/api/cron/gas-update");
  check(cron.status === 401 || cron.status === 404, "gas cron refuses strangers", `HTTP ${cron.status}`);

  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) console.log(`${r.level}  ${r.name.padEnd(width)}  ${r.detail}`);
  const failed = results.filter((r) => r.level === "FAIL").length;
  const warned = results.filter((r) => r.level === "WARN").length;
  console.log(`\n${results.length - failed - warned} passed, ${warned} warnings, ${failed} failed`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Live site check (${BASE})\n\n| | Check | Detail |\n|---|---|---|\n` +
        results.map((r) => `| ${r.level === "PASS" ? "✅" : r.level === "WARN" ? "⚠️" : "❌"} | ${r.name} | ${String(r.detail).replace(/\|/g, "\\|").slice(0, 200)} |`).join("\n") +
        "\n",
    );
    for (const r of results.filter((x) => x.level !== "PASS")) console.log(`::${r.level === "FAIL" ? "error" : "warning"} title=${r.name}::${String(r.detail).slice(0, 300)}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
