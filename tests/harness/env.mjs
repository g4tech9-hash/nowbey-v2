/**
 * Shared helpers for the local test suites (tests/*.test.mjs).
 *
 * These suites run against a real NowBey server: real Next.js routes, a real Postgres and a real
 * SMTP conversation (tests/harness/smtp-capture.py, wired up by tests/run-local.sh). Nothing here
 * touches production, and no credential is ever printed.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";

export const BASE = (process.env.TEST_BASE ?? "http://localhost:3000").replace(/\/+$/, "");
export const MAIL_DIR = process.env.TEST_MAIL_DIR ?? "/tmp/nowbey-mail";
export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/nowbey";

/** A cookie jar good enough for one account per test file. */
export function jar() {
  const cookies = new Map();
  return {
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    absorb(res) {
      const set = res.headers.getSetCookie?.() ?? [];
      for (const line of set) {
        const [pair] = line.split(";");
        const idx = pair.indexOf("=");
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (value === "" || /expires=Thu, 01 Jan 1970/i.test(line)) cookies.delete(name);
        else cookies.set(name, value);
      }
      return res;
    },
  };
}

/**
 * Client addresses for the limiter. The app reads X-Forwarded-For, which a proxy sets in
 * production, so each test can claim its own address and never trip another test's counter.
 * A random base per process keeps repeated runs of the same suite apart too.
 */
const base24 = `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250) + 1}`;
let ipCounter = 0;
export function uniqueIp() {
  ipCounter += 1;
  return `${base24}.${ipCounter % 250}`;
}
export const DEFAULT_IP = uniqueIp();

/** fetch with the jar, JSON in/out, and no redirect following (so a 307 is visible). */
export async function api(path, { method = "GET", body, cookie, headers = {}, origin = BASE, ip = DEFAULT_IP } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      origin,
      "x-forwarded-for": ip,
      ...(cookie ? { cookie: cookie.header() } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (cookie) cookie.absorb(res);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html, or empty */
  }
  return { status: res.status, json, text, headers: res.headers };
}

let pool = null;
export async function db() {
  if (!pool) pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  return pool;
}

export async function query(sql, params = []) {
  const p = await db();
  const { rows } = await p.query(sql, params);
  return rows;
}

export async function endDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Every message the local SMTP catcher has seen so far. Retried once: the catcher swaps the file in. */
export async function mailbox() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const raw = await readFile(`${MAIL_DIR}/messages.json`, "utf8");
      if (raw.trim()) return JSON.parse(raw);
    } catch {
      /* not there yet, or mid-swap */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return [];
}

/** Waits for a message matching a matcher, because mail is sent after the HTTP reply (after()). */
export async function waitForMail(match, { timeoutMs = 8000, since = 0 } = {}) {
  const started = Date.now();
  for (;;) {
    const all = await mailbox();
    const hit = all.slice(since).find((m) => match(m));
    if (hit) return hit;
    if (Date.now() - started > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 200));
  }
}

export const unique = () => Math.random().toString(36).slice(2, 8);
export const strongPassword = () => `Rum-Cake_${unique()}-Conch42`;

/** A second, strong password that differs from the first. */
export const otherPassword = () => `Tide-Pool_${unique()}-Sapodilla7`;
