#!/usr/bin/env node
/**
 * Junk-request tool. Throws malformed, oversized and hostile requests at every API route the
 * repository defines and reports anything that answers with a server error, leaks a stack trace or
 * takes too long. Local server only — never point this at production.
 *
 *   node tests/fuzz.mjs                      # against http://localhost:3000, signed out and signed in
 *   TEST_BASE=http://localhost:3001 node tests/fuzz.mjs
 *   node tests/fuzz.mjs --json out.json      # also write every finding as JSON
 *
 * Exit code 0 = no findings, 1 = findings (listed), 2 = could not reach the server.
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.TEST_BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const ROOT = fileURLToPath(new URL("../src/app/api", import.meta.url));
const SLOW_MS = Number(process.env.FUZZ_SLOW_MS ?? 8000);
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;

if (/vercel\.app|nowbey\.(app|com)/i.test(BASE)) {
  console.error("Refusing to fuzz what looks like a production address:", BASE);
  process.exit(2);
}

/** Every route.ts under src/app/api, turned into a URL path with its dynamic segments marked. */
function routes(dir = ROOT) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...routes(full));
    else if (name === "route.ts") out.push("/api/" + relative(ROOT, dir).split(sep).join("/"));
  }
  return out.map((p) => p.replace(/\/$/, ""));
}

const SEGMENTS = [
  "00000000-0000-0000-0000-000000000000",
  "not-a-uuid",
  "%27%20OR%201%3D1--",
  "..%2F..%2Fetc%2Fpasswd",
  "9".repeat(400),
  "%E2%80%AE",
  "%00",
];

const LONG = "A".repeat(200_000);
const BODIES = [
  { raw: "{", type: "application/json" },
  { raw: "", type: "application/json" },
  { raw: "null", type: "application/json" },
  { raw: "[]", type: "application/json" },
  { raw: "12345", type: "application/json" },
  { raw: '"just a string"', type: "application/json" },
  { raw: "<xml>?</xml>", type: "application/xml" },
  { raw: "a=1&b=2", type: "application/x-www-form-urlencoded" },
  { raw: "--x\r\nContent-Disposition: form-data; name=\"f\"\r\n\r\n\r\n--x--", type: "multipart/form-data; boundary=x" },
  { raw: "--broken", type: "multipart/form-data" },
  { json: { __proto__: { isAdmin: true }, constructor: { prototype: { isAdmin: true } } } },
  { json: { handle: LONG, email: LONG, password: LONG, body: LONG, title: LONG, url: LONG } },
  {
    json: {
      intent: "signin",
      handle: "' OR 1=1 --",
      password: { $ne: null },
      email: ["a@b.c"],
      id: { length: 1e9 },
      tier: "admiral",
      role: "admin",
      action: "setRole",
      lat: "NaN",
      lng: Infinity,
      limit: -1,
      page: 1e308,
      parishes: "New Providence",
      categories: [null, 1, {}],
      kind: "\u0000",
      targetId: "00000000-0000-0000-0000-000000000000",
    },
  },
  { json: { a: Array.from({ length: 2000 }, (_, i) => ({ i, s: "x".repeat(20) })) } },
  { json: JSON.parse("{" + '"a":{'.repeat(200) + "}".repeat(200) + "}") },
  { json: { text: "\ud800\udfff\u202e<script>alert(1)</script>🙂", note: "javascript:alert(1)", url: "javascript:alert(1)" } },
];

const QUERIES = ["", "?limit=-5&page=abc", "?limit=99999999999999999999", "?q=" + "%".repeat(5), "?parish[]=x&status[$ne]=1", "?h=" + "a".repeat(5000)];
const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"];

/** Patterns that should never reach a visitor. */
const LEAKS = [/\bat [\w.<>]+ \(.*:\d+:\d+\)/, /node_modules\//, /ECONNREFUSED/, /password_hash/i, /DATABASE_URL=/, /Failed query:/];

const findings = [];
/** Deliberate "not set up on this server" replies (503 with a JSON error) are listed, not counted as findings. */
const unavailable = new Set();
/** Signed-in requests that would end the fuzz session itself and blind the rest of the signed-in pass. */
const SESSION_ENDERS = /^(DELETE \/api\/session|\w+ \/api\/account\/sessions|DELETE \/api\/account|POST \/api\/account\/password)$/;
let sent = 0;

async function send(method, path, body, cookie, ip) {
  const headers = { origin: BASE, "x-forwarded-for": ip };
  if (cookie) headers.cookie = cookie;
  let payload;
  if (body && method !== "GET" && method !== "HEAD") {
    if (body.json !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body.json);
    } else {
      headers["content-type"] = body.type;
      payload = body.raw;
    }
  }
  const started = Date.now();
  let status = 0;
  let text = "";
  try {
    const res = await fetch(BASE + path, { method, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(30_000) });
    status = res.status;
    text = method === "HEAD" ? "" : (await res.text()).slice(0, 20_000);
  } catch (e) {
    status = -1;
    text = String(e?.cause?.code ?? e?.message ?? e);
  }
  sent += 1;
  const ms = Date.now() - started;
  const what = `${method} ${path}${body ? ` body#${BODIES.indexOf(body)}` : ""}${cookie ? " (signed in)" : ""}`;
  if (status === 503 && /"error"/.test(text)) unavailable.add(`${method} ${path.split("?")[0]} → 503 ${text.slice(0, 80)}`);
  else if (status >= 500 || status === -1) findings.push({ kind: "server-error", what, status, sample: text.slice(0, 300) });
  else if (ms > SLOW_MS) findings.push({ kind: "slow", what, status, ms });
  for (const re of LEAKS) {
    if (re.test(text)) findings.push({ kind: "leak", what, status, pattern: String(re), sample: text.match(re)?.[0] });
  }
}

/** A run of requests at a time: enough to be quick, few enough not to trip every limiter at once. */
async function pool(tasks, width = 8) {
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (queue.length) await queue.shift()();
    }),
  );
}

async function signIn() {
  const handle = `fz_${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, "x-forwarded-for": `10.250.${Math.floor(Math.random() * 250)}.1` },
    body: JSON.stringify({ intent: "signup", termsAccepted: true, handle, email: `${handle}@example.test`, password: `Junk-Request_Conch9-${Math.random().toString(36).slice(2, 10)}` }),
  });
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  return res.ok ? cookie : null;
}

async function main() {
  try {
    await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(15_000) });
  } catch {
    console.error(`Cannot reach ${BASE}. Start the local stack first (bash tests/run-local.sh).`);
    process.exit(2);
  }
  const list = routes();
  const cookie = await signIn();
  console.log(`fuzzing ${list.length} routes at ${BASE} ${cookie ? "(signed out and signed in)" : "(signed out only)"}`);

  let n = 0;
  const ip = () => `10.${200 + (n % 50)}.${Math.floor(n / 50) % 250}.${(n++ % 250) + 1}`;
  const tasks = [];
  for (const route of list) {
    const concrete = route.includes("[")
      ? SEGMENTS.map((s) => route.replace(/\[\.\.\.[^\]]+\]/g, `${s}/${s}`).replace(/\[[^\]]+\]/g, s))
      : [route];
    for (const path of concrete) {
      for (const method of METHODS) {
        for (const q of method === "GET" ? QUERIES : [""]) tasks.push(() => send(method, path + q, null, null, ip()));
        if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
          for (const body of BODIES) {
            tasks.push(() => send(method, path, body, null, ip()));
            if (cookie && !SESSION_ENDERS.test(`${method} ${path}`)) tasks.push(() => send(method, path, body, cookie, ip()));
          }
        }
      }
    }
  }
  // Header-level junk against a few representative routes.
  for (const path of ["/api/session", "/api/incidents", "/api/comments", "/api/account"]) {
    for (const h of [
      { origin: "null" },
      { cookie: "nowbey_session=" + "x".repeat(4000) },
      { cookie: "nowbey_session=v1.eyJ1aWQiOiJhZG1pbiJ9.forged" },
      { authorization: "Bearer " + "y".repeat(3000) },
      { authorization: "Bearer v1.e30.x" },
      { "content-length": "99999999" },
    ]) {
      tasks.push(async () => {
        const started = Date.now();
        let status = -1;
        let text = "";
        try {
          const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip(), ...h }, body: "{}", signal: AbortSignal.timeout(30_000) });
          status = res.status;
          text = await res.text();
        } catch (e) {
          text = String(e?.cause?.code ?? e?.message);
          // A lying content-length is rejected by the client library itself; that is not a server finding.
          if (h["content-length"]) status = 400;
        }
        sent += 1;
        if (status >= 500 || status === -1) findings.push({ kind: "server-error", what: `POST ${path} header ${Object.keys(h)[0]}`, status, sample: text.slice(0, 300) });
        if (Date.now() - started > SLOW_MS) findings.push({ kind: "slow", what: `POST ${path} header ${Object.keys(h)[0]}`, status });
      });
    }
  }

  const t0 = Date.now();
  await pool(tasks);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const counts = findings.reduce((m, f) => ((m[f.kind] = (m[f.kind] ?? 0) + 1), m), {});
  console.log(`${sent} requests in ${secs}s — ${findings.length} findings ${JSON.stringify(counts)}`);
  const seen = new Set();
  for (const f of findings) {
    const key = `${f.kind} ${f.what.replace(/ body#\d+| \(signed in\)/g, "")} ${f.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  [${f.kind}] ${f.what} → ${f.status}${f.sample ? `  ${String(f.sample).replace(/\s+/g, " ").slice(0, 160)}` : ""}`);
  }
  if (unavailable.size) {
    console.log(`  deliberate 503 "not set up" replies (not findings):`);
    for (const u of new Set([...unavailable].map((x) => x.replace(/ → 503.*/, "")))) console.log(`    ${u}`);
  }
  if (cookie) {
    const me = await fetch(`${BASE}/api/session`, { headers: { cookie } }).then((r) => r.json()).catch(() => ({}));
    console.log(`  fuzz session still valid at the end: ${me?.user ? "yes" : "no"}`);
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base: BASE, sent, findings }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

main();
