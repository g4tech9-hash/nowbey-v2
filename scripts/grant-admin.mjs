#!/usr/bin/env node
/**
 * Grant admin to existing accounts from the command line — the same promotion as
 * `src/db/setup_admins.sql`, without needing the Neon SQL editor. It changes ONLY the role and
 * suspension columns: never passwords, email addresses, sessions, or plans.
 *
 *   npm run admin:grant -- mario242                # one handle
 *   npm run admin:grant -- mario242 eastsiderick   # several handles
 *   npm run admin:grant                            # defaults to the handles in setup_admins.sql
 *   DATABASE_URL=postgres://… npm run admin:grant -- mario242
 *
 * DATABASE_URL is read from the environment or from a local .env file (via dotenv). With no
 * arguments, the default handle list is parsed out of `src/db/setup_admins.sql`, so the SQL file
 * stays the single source of truth for who the owners are. Safe to run twice: handles that do not
 * exist are reported and skipped, existing rows are promoted again without harm.
 *
 * A database admin (role='admin') works immediately, with or without a confirmed email. The other
 * way — the handle being listed in ADMIN_HANDLES — starts working only once the account's email is
 * confirmed (see `envAdminActive` in src/lib/handles.ts).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const HANDLE_RE = /^[a-z0-9_]{3,18}$/;

function defaultHandles() {
  const sql = readFileSync(new URL("../src/db/setup_admins.sql", import.meta.url), "utf8");
  const inClause = sql.match(/WHERE handle IN \(([^)]*)\)/i);
  if (!inClause) throw new Error("Could not find the handle list in src/db/setup_admins.sql — pass handles explicitly.");
  return inClause[1]
    .split(",")
    .map((s) => s.trim().replace(/^'(.*)'$/, "$1").toLowerCase())
    .filter(Boolean);
}

function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set — pass it in the environment or put it in a local .env file.");
    process.exit(1);
  }
  return url;
}

const requested = process.argv.slice(2).map((s) => s.trim().toLowerCase().replace(/^@/, ""));
const bad = requested.filter((h) => !HANDLE_RE.test(h));
if (bad.length) {
  console.error(`Not valid handles (3-18 characters: letters, numbers, underscore): ${bad.join(", ")}`);
  process.exit(1);
}
const handles = [...new Set(requested.length ? requested : defaultHandles())];

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

try {
  const before = await client.query(
    `SELECT handle, role, status, email_verified_at FROM users WHERE handle = ANY($1::text[])`,
    [handles],
  );
  const known = new Map(before.rows.map((r) => [r.handle, r]));
  const missing = handles.filter((h) => !known.has(h));
  if (missing.length) {
    console.log(`No account with the handle ${missing.map((h) => "@" + h).join(", ")} — create it through normal sign-up first (see TODO_HUMAN.md §0b).`);
  }
  const toPromote = handles.filter((h) => known.has(h));
  if (!toPromote.length) {
    console.log("Nothing to promote.");
    process.exit(1);
  }

  const updated = await client.query(
    `UPDATE users
     SET role = 'admin', status = 'active', suspended_reason = NULL, suspended_at = NULL
     WHERE handle = ANY($1::text[])
     RETURNING handle, role, status, email_verified_at`,
    [toPromote],
  );

  console.log("Admin accounts now:");
  for (const r of updated.rows) {
    const confirmed = r.email_verified_at ? "email confirmed" : "EMAIL NOT CONFIRMED (ADMIN_HANDLES rights wait for confirmation; role='admin' works regardless)";
    console.log(`  @${r.handle}  role=${r.role}  status=${r.status}  ${confirmed}`);
  }
  console.log("Done. Passwords, emails and sessions were not touched. Revoke with: update users set role='resident' where handle='…';");
} finally {
  await client.end();
}
