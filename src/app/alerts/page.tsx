import Link from "next/link";
import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { AlertForm, StopAlertButton } from "@/components/wire-forms";
import { PushToggle } from "@/components/push-toggle";
import { CATEGORIES, timeAgo } from "@/lib/geo";
import { pushConfigured, pushPublicConfig } from "@/lib/push";
import { getViewer } from "@/lib/viewer";
import { text } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alerts" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const confirmed = first(sp.confirmed);
  const stop = text(first(sp.stop), 100) || undefined;
  const push = pushConfigured() ? pushPublicConfig() : null;

  const mine = viewer.userId
    ? await db.select().from(alertSubscriptions).where(eq(alertSubscriptions.userId, viewer.userId)).orderBy(desc(alertSubscriptions.createdAt))
    : [];
  const [stopRow] = stop
    ? await db
        .select({ target: alertSubscriptions.target, parishes: alertSubscriptions.parishes })
        .from(alertSubscriptions)
        .where(eq(alertSubscriptions.token, stop))
        .limit(1)
    : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <PageHead
          eyebrow="Alerts"
          title="Only the ones that affect your shore"
          blurb="Nassau first: alerts cover New Providence at launch, and when a neighbour files a matching report we email you a link straight to it. Two fields decide everything — your email address and the kinds of report you care about."
        />

        {confirmed === "1" ? (
          <p className="nb-surface rounded-xl border-ok-500/40 bg-ok-500/10 px-4 py-3 text-base text-ok-600">
            You are confirmed. We will email you when a matching report is filed.
          </p>
        ) : null}
        {confirmed === "0" ? (
          <p className="nb-surface rounded-xl bg-danger-500/12 px-4 py-3 text-base text-danger-500">
            That confirmation link is not valid any more. Fill in the form below and we will send a fresh one.
          </p>
        ) : null}

        {stop ? (
          <div className="nb-surface rounded-xl2 p-4">
            {stopRow ? (
              <>
                <p className="display text-base font-bold tracking-tight text-sand-100">Stop alerts to {mask(stopRow.target)}?</p>
                <p className="mt-1 text-sm text-ink-300">
                  This profile covers {stopRow.parishes.split(",").join(", ")}. You can set up a new one at any time.
                </p>
                <div className="mt-3">
                  <StopAlertButton token={stop} label="Yes, stop these alerts" />
                </div>
              </>
            ) : (
              <p className="text-base text-ink-200">That alert profile has already been stopped.</p>
            )}
          </div>
        ) : null}

        <div className="nb-surface rounded-xl2 p-4">
          <AlertForm plan={viewer.tier} defaultEmail={viewer.email ?? ""} />
        </div>

        {push ? <PushToggle config={push.config} vapidKey={push.vapidKey} parishes={["New Providence"]} /> : (
          <div className="nb-surface rounded-xl2 p-4">
            <p className="display text-base font-bold tracking-tight text-sand-100">Push alerts on this device</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-300">
              Not switched on for this site yet. Email is the channel that works today; the Android app has a push switch of its own once it is
              installed.
            </p>
          </div>
        )}

        {viewer.signedIn ? (
          <section>
            <p className="display text-base font-extrabold tracking-tight text-sand-100">Your alert profiles</p>
            {mine.length ? (
              <ul className="mt-2 space-y-2">
                {mine.map((s) => (
                  <li key={s.id} className="nb-surface flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2.5 text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold ${s.verified ? "bg-ok-500/15 text-ok-600" : "bg-sun-500/15 text-sun-600"}`}
                    >
                      {s.verified ? <><span className="nb-live-dot" aria-hidden />On</> : "Waiting for your confirmation email"}
                    </span>
                    <span className="num font-mono text-xs text-ink-200">{s.target}</span>
                    <span className="text-ink-300">{s.parishes.split(",").join(" · ")}</span>
                    <span className="num text-ink-400">
                      {typeof s.lat === "number" && typeof s.lng === "number"
                        ? `within ${s.radiusKm ?? 12} km of you`
                        : "whole island"}
                    </span>
                    <span className="num text-ink-400">
                      {s.categories
                        ? s.categories
                            .split(",")
                            .filter(Boolean)
                            .map((c) => CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? c)
                            .join(", ")
                        : "every category"}
                    </span>
                    <span className="num text-xs text-ink-400">{timeAgo(s.createdAt)}</span>
                    <span className="ml-auto">
                      <StopAlertButton id={s.id} label="Remove" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-400">You have no alert profiles yet.</p>
            )}
          </section>
        ) : (
          <p className="text-sm text-ink-400">
            <Link href="/login?next=/alerts" className="font-bold text-tide-300 underline">
              Sign in
            </Link>{" "}
            to see and remove your alert profiles here. Every alert email also has a “Stop these alerts” link.
          </p>
        )}
      </div>

      <aside className="space-y-4">
        <div className="nb-surface rounded-xl2 p-3.5 text-sm leading-relaxed text-ink-300">
          <p className="display text-base font-bold tracking-tight text-sand-100">How a report reaches you</p>
          <Step n="1" title="Filed">A neighbour or the news wire puts a pin on the map with a category.</Step>
          <Step n="2" title="Matched">We check it against the island and categories you picked — and, if you switched on “only near me”, the kilometres you chose.</Step>
          <Step n="3" title="Sent">An email arrives with the street, how serious it is, and a link to the live report. You get at most one every three minutes.</Step>
        </div>

        <div className="nb-surface rounded-xl2 border-sun-500/35 bg-sun-500/10 p-3.5">
          <p className="display text-base font-bold tracking-tight text-sand-100">Storm warnings</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">
            Storm reports for your islands always reach you, even if you did not tick the Storm category. That is the same for everyone,
            Free plan included — a warning a household needs is never something we charge for.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <p className="mt-2 flex gap-2">
      <span className="num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tide-500/20 text-[11px] font-extrabold text-tide-300">
        {n}
      </span>
      <span>
        <span className="font-bold text-sand-100">{title}. </span>
        {children}
      </span>
    </p>
  );
}

function mask(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
}
