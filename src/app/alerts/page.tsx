import Link from "next/link";
import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { AlertForm, StopAlertButton } from "@/components/wire-forms";
import { CATEGORIES, timeAgo } from "@/lib/geo";
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
          blurb="Pick your islands and the kinds of report you care about. When a neighbour files a matching report, we email you a link straight to it. A flooded road in Freeport will not wake someone in Nassau."
        />

        {confirmed === "1" ? (
          <p className="rounded-xl border border-tide-400/40 bg-tide-500/10 px-4 py-3 text-[13px] text-tide-300">
            You are confirmed. We will email you when a matching report is filed.
          </p>
        ) : null}
        {confirmed === "0" ? (
          <p className="rounded-xl bg-conch-500/15 px-4 py-3 text-[13px] text-conch-400">
            That confirmation link is not valid any more. Fill in the form below and we will send a fresh one.
          </p>
        ) : null}

        {stop ? (
          <div className="glass rounded-2xl p-4">
            {stopRow ? (
              <>
                <p className="display text-[15px] font-bold text-sand-100">Stop alerts to {mask(stopRow.target)}?</p>
                <p className="mt-1 text-[12.5px] text-[#a9cdc9]">
                  This profile covers {stopRow.parishes.split(",").join(", ")}. You can set up a new one at any time.
                </p>
                <div className="mt-3">
                  <StopAlertButton token={stop} label="Yes, stop these alerts" />
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[#cfeee9]">That alert profile has already been stopped.</p>
            )}
          </div>
        ) : null}

        <div className="glass rounded-2xl p-4">
          <AlertForm plan={viewer.tier} defaultEmail={viewer.email ?? ""} />
        </div>

        {viewer.signedIn ? (
          <section>
            <p className="display text-[15px] font-extrabold text-sand-100">Your alert profiles</p>
            {mine.length ? (
              <ul className="mt-2 space-y-2">
                {mine.map((s) => (
                  <li key={s.id} className="glass flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2.5 text-[12px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${s.verified ? "bg-tide-500/18 text-tide-300" : "bg-sun-500/15 text-sun-400"}`}
                    >
                      {s.verified ? "On" : "Waiting for your confirmation email"}
                    </span>
                    <span className="font-mono text-[11.5px] text-[#cfeee9]">{s.target}</span>
                    <span className="text-[#8fb9b6]">{s.parishes.split(",").join(" · ")}</span>
                    <span className="text-[#6e97a0]">
                      {typeof s.lat === "number" && typeof s.lng === "number"
                        ? `within ${s.radiusKm ?? 12} km of you`
                        : "whole island"}
                    </span>
                    <span className="text-[#6e97a0]">
                      {s.categories
                        ? s.categories
                            .split(",")
                            .filter(Boolean)
                            .map((c) => CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? c)
                            .join(", ")
                        : "every category"}
                    </span>
                    <span className="text-[11px] text-[#4f7a83]">{timeAgo(s.createdAt)}</span>
                    <span className="ml-auto">
                      <StopAlertButton id={s.id} label="Remove" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12.5px] text-[#6e97a0]">You have no alert profiles yet.</p>
            )}
          </section>
        ) : (
          <p className="text-[12.5px] text-[#8fb9b6]">
            <Link href="/login?next=/alerts" className="font-bold text-tide-300 underline">
              Sign in
            </Link>{" "}
            to see and remove your alert profiles here. Every alert email also has a “Stop these alerts” link.
          </p>
        )}
      </div>

      <aside className="space-y-4">
        <div className="glass rounded-2xl p-3.5 text-[12.5px] leading-relaxed text-[#a9cdc9]">
          <p className="display text-[14.5px] font-bold text-sand-100">How a report reaches you</p>
          <Step n="1" title="Filed">A neighbour or the news wire puts a pin on the map with a category.</Step>
          <Step n="2" title="Matched">We check it against the islands and categories you picked — and, when you shared a location, only reports inside the kilometres you chose.</Step>
          <Step n="3" title="Sent">An email arrives with the street, how serious it is, and a link to the live report. You get at most one every three minutes.</Step>
        </div>

        <div className="rounded-2xl border border-sun-500/35 bg-sun-500/10 p-3.5">
          <p className="display text-[14.5px] font-bold text-sand-100">Storm warnings</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#e6dcc0]">
            On Rock Sound and Admiral, storm reports for your islands always reach you, even if you did not tick the Storm
            category.
          </p>
          {viewer.tier === "rock" || viewer.tier === "admiral" ? (
            <p className="mt-2 text-[11.5px] font-bold text-sun-400">This is switched on for your plan.</p>
          ) : (
            <Link href="/support" className="mt-2 inline-block text-[11.5px] font-bold text-sun-400 underline">
              See plans
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <p className="mt-2 flex gap-2">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-tide-500/20 text-[11px] font-extrabold text-tide-300">
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
