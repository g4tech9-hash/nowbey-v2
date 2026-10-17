import type { NextConfig } from "next";

// Sent with every page and API response.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
  // One year. No includeSubDomains: that would also pin every subdomain, which this repo cannot vouch for.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

// Production builds also refuse to be framed (clickjacking on /login, /you/settings and /admin) and lock
// down the policy directives that cannot break a page: no plugins, no <base> hijack, forms post only here.
// Development is left frameable on purpose, because preview and editor tools show the dev server in a frame.
// Scripts and styles are not restricted here: Next.js inlines its bootstrap, and a script policy needs
// nonces wired through the app before it can be switched on without blanking pages.
const productionOnlyHeaders =
  process.env.NODE_ENV === "production"
    ? [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      ]
    : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Arena's live preview is served from a per-session subdomain of e2b.app.
  allowedDevOrigins: ["*.e2b.app"],
  // The embedded dev Postgres (src/db/dev.ts) ships a WASM build of PostgreSQL. Bundling it
  // would copy the .wasm away from the path the package looks for it at; as an external
  // package it is required straight from node_modules at runtime, and only ever in development.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Type errors fail the build on purpose: `npm run typecheck` is clean,
  // so a red Vercel build means a real regression, not background noise.
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders, ...productionOnlyHeaders] },
      // CORS for /api is decided per request in src/proxy.ts (allowlist, never "*", never credentials).
    ];
  },
};

export default nextConfig;
