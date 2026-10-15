import { db } from "@/db";
import { sql } from "drizzle-orm";
import { mailConfigured } from "@/lib/mail";
import { pushConfigured } from "@/lib/push";
import { aiConfigured } from "@/lib/ai";
import { googleConfigured } from "@/lib/geocode";

export const dynamic = "force-dynamic";

/**
 * Public, secret-free readiness report. Database failure makes the service unhealthy;
 * optional integrations are reported separately so operators can spot degraded features.
 */
export async function GET() {
  let database = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
  } catch {
    // Never disclose connection details publicly.
  }

  const checks = {
    database,
    mail: mailConfigured(),
    push: pushConfigured(),
    ai: aiConfigured(),
    geocoding: googleConfigured(),
    // Email links need a public address. Vercel supplies one for every deployment even when
    // APP_URL was never set, so checking only APP_URL reported "false" on a site whose links work.
    appUrl: Boolean(process.env.APP_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()),
  };

  return Response.json(
    {
      ok: database,
      status: database ? (checks.mail && checks.appUrl ? "ready" : "degraded") : "unavailable",
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.npm_package_version || "development",
      checkedAt: new Date().toISOString(),
    },
    {
      status: database ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
