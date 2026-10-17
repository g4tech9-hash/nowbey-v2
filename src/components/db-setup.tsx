import Link from "next/link";

/**
 * Stand-in for a data-backed page when this deployment has no DATABASE_URL.
 *
 * Two audiences, one panel: a passing visitor gets a calm "we are setting up" message
 * (instead of Next's red error boundary), and the operator — most likely the owner
 * refreshing their own fresh deployment — gets the exact three-step fix and the
 * readiness probe that confirms it worked. Nothing here is secret: /api/health
 * already reports the same "database: false" publicly.
 */
export function DatabaseSetup({ eyebrow, title, blurb }: { eyebrow: string; title: string; blurb: string }) {
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="nb-surface rounded-xl2 p-6 sm:p-8">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-tide-400">{eyebrow}</p>
        <h1 className="display mt-1.5 text-[clamp(1.45rem,4.5vw,2.1rem)] font-extrabold leading-tight tracking-tight text-sand-100">
          {title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-300">{blurb}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950 hover:bg-tide-400">
            Back to the homepage
          </Link>
          <Link href="/map" className="rounded-full border hairline px-4 py-2 text-[13px] font-bold text-ink-200 hover:bg-white/5">
            Open the map
          </Link>
        </div>

        <div className="mt-5 rounded-xl border border-sun-500/35 bg-sun-500/10 p-4 text-[13px] leading-relaxed text-ink-200">
          <p className="font-extrabold text-sun-600">Site setup — one step left</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5">
            <li>
              Copy the connection string from your Postgres host (Neon → Project → <span className="font-semibold">Connection string</span>).
            </li>
            <li>
              Add it as <code className="rounded bg-white/10 px-1 py-px text-[12px]">DATABASE_URL</code> on Vercel → Settings →
              Environment Variables, ticked for <span className="font-semibold">every</span> environment you deploy.
            </li>
            <li>
              Redeploy. The <Link href="/api/health" className="font-bold text-tide-300 underline">readiness check</Link> then reports{" "}
              <code className="rounded bg-white/10 px-1 py-px text-[12px]">&quot;database&quot;: true</code> and this page fills in by itself.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
