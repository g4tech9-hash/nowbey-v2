import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { alertSubscriptions } from "@/db/schema";
import { EmergencyNotice } from "@/components/emergency-notice";
import { AlertForm, StopAlertButton } from "@/components/wire-forms";
import { PushToggle } from "@/components/push-toggle";
import { CATEGORIES, timeAgo } from "@/lib/geo";
import { pushConfigured, pushPublicConfig } from "@/lib/push";
import { getViewer } from "@/lib/viewer";
import { text } from "@/lib/validate";
import { ButtonLink, Chip, Eyebrow, Panel, PanelHead, SectionTitle, StepRow } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email alerts — island by island" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  // No database configured: the form could never store a subscription (and ?stop links query
  // the database directly), so show the setup notice instead of half-working.
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="Alerts"
        title="Alerts start once the database is connected"
        blurb="Parish and category alerts are stored in the database, so this deployment needs its DATABASE_URL before anyone can subscribe."
      />
    );
  }
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
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <EmergencyNotice />

        <div>
          <Eyebrow>Alerts</Eyebrow>
          <h1 className="display mt-2.5 text-[clamp(1.75rem,4.6vw,2.55rem)] font-extrabold leading-[1.04] tracking-[-0.055em] text-sand-100">
            Only the ones that affect <em className="text-tide-500 not-italic">your shore</em>
          </h1>
          <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-[1.75] text-ink-300">
            Nassau first: alerts cover New Providence at launch, and when a neighbour files a matching report we email you a
            link straight to it. Three things decide it — your email, your island and the report types you care about.
          </p>
        </div>

        {confirmed === "1" ? (
          <p className="rounded-[14px] border border-ok-500/40 bg-ok-500/10 px-4 py-3 text-[12.5px] text-ok-600">
            You are confirmed. We will email you when a matching report is filed.
          </p>
        ) : null}
        {confirmed === "0" ? (
          <p className="rounded-[14px] border border-conch-500/40 bg-conch-500/10 px-4 py-3 text-[12.5px] text-conch-500">
            That confirmation link is not valid any more. Fill in the form below and we will send a fresh one.
          </p>
        ) : null}

        {stop ? (
          <Panel className="rounded-[20px] p-5">
            {stopRow ? (
              <>
                <SectionTitle>Stop alerts to {mask(stopRow.target)}?</SectionTitle>
                <p className="mt-1.5 text-[12.5px] leading-[1.75] text-ink-300">
                  This profile covers {stopRow.parishes.split(",").join(", ")}. You can set up a new one at any time.
                </p>
                <div className="mt-3.5">
                  <StopAlertButton token={stop} label="Yes, stop these alerts" />
                </div>
              </>
            ) : (
              <p className="text-[13px] text-ink-200">That alert profile has already been stopped.</p>
            )}
          </Panel>
        ) : null}

        <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-center text-[12px] font-bold text-accent">Live alerts: New Providence — other islands soon</div>
        <Panel className="rounded-[20px] p-4 sm:p-5">
          <AlertForm plan={viewer.tier} defaultEmail={viewer.email ?? ""} />
          <p className="mt-3 text-[11.5px] text-tertiary">Other islands: <span className="rounded-full border border-default px-2 py-0.5">Tell me when it opens</span> — leave your email, no account needed.</p>
        </Panel>

        {push ? (
          <PushToggle config={push.config} vapidKey={push.vapidKey} parishes={["New Providence"]} />
        ) : (
          <Panel className="rounded-[20px] p-5">
            <PanelHead
              title="Alert channels"
              blurb="Email: On · Phone push: Off — Android app only · Text: Not available"
            />
            <p className="mt-2 text-[12px] text-tertiary">Email alerts work on every device. Push is available in the Android app. Text messages are not available.</p>
          </Panel>
        )}

        {viewer.signedIn ? (
          <section>
            <SectionTitle>Your alert profiles</SectionTitle>
            {mine.length ? (
              <ul className="mt-2.5 space-y-2">
                {mine.map((s) => (
                  <li key={s.id} className="nb-surface flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] px-3.5 py-3">
                    <Chip tone={s.verified ? "ok" : "warn"}>
                      {s.verified ? (
                        <>
                          <span className="nb-live-dot" aria-hidden />
                          On
                        </>
                      ) : (
                        "Waiting for your confirmation email"
                      )}
                    </Chip>
                    <span className="num font-mono text-[11.5px] text-ink-200">{s.target}</span>
                    <span className="text-[12px] text-ink-300">{s.parishes.split(",").join(" · ")}</span>
                    <span className="num text-[11.5px] text-ink-400">
                      {typeof s.lat === "number" && typeof s.lng === "number"
                        ? `within ${s.radiusKm ?? 12} km of you`
                        : "whole island"}
                    </span>
                    <span className="num text-[11.5px] text-ink-400">
                      {s.categories
                        ? s.categories
                            .split(",")
                            .filter(Boolean)
                            .map((c) => CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? c)
                            .join(", ")
                        : "every category"}
                    </span>
                    <span className="num text-[11.5px] text-ink-400">{timeAgo(s.createdAt)}</span>
                    <span className="ml-auto">
                      <StopAlertButton id={s.id} label="Remove" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12.5px] leading-[1.75] text-ink-400">You have no alert profiles yet.</p>
            )}
          </section>
        ) : (
          <p className="text-[12.5px] leading-[1.75] text-ink-400">
            <Link href="/login?mode=signin&next=%2Falerts" className="font-bold text-tide-300 underline">
              Sign in
            </Link>{" "}
            to see and remove your alert profiles here. Every alert email also has a “Stop these alerts” link.
          </p>
        )}
      </div>

      <aside className="min-w-0 space-y-4">
        <Panel className="rounded-[20px] p-4">
          <SectionTitle>How a report reaches you</SectionTitle>
          <div className="text-[12.5px] leading-[1.75] text-ink-300">
            <StepRow n="1" title="Filed">
              A neighbour or the news wire puts a pin on the map with a category.
            </StepRow>
            <StepRow n="2" title="Matched">
              We check it against the island and categories you picked — and, if you switched on “only near me”, the
              kilometres you chose.
            </StepRow>
            <StepRow n="3" title="Sent">
              An email arrives with the street, how serious it is, and a link to the live report. You get at most one every
              three minutes.
            </StepRow>
          </div>
        </Panel>

        <Panel className="rounded-[20px] border-sun-500/35 p-4">
          <SectionTitle>Storm warnings</SectionTitle>
          <p className="mt-1.5 text-[12.5px] leading-[1.75] text-ink-200">
            Storm reports for your islands always reach you, even if you did not tick the Storm category. That is the same for
            everyone, Free plan included — a warning a household needs is never something we charge for.
          </p>
        </Panel>

        <Panel className="rounded-[20px] p-4">
          <SectionTitle>Prefer the map?</SectionTitle>
          <p className="mt-1.5 text-[12.5px] leading-[1.75] text-ink-300">
            Everything alerts would send you is also on the live map, any time you open it.
          </p>
          <ButtonLink href="/map" variant="secondary" size="sm" className="mt-3">
            Open the map
          </ButtonLink>
        </Panel>
      </aside>
    </div>
  );
}

function mask(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
}
