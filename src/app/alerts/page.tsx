import Link from "next/link";
import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { alertSubscriptions } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { EmergencyNotice } from "@/components/emergency-notice";
import { AlertForm, StopAlertButton } from "@/components/wire-forms";
import { PushToggle } from "@/components/push-toggle";
import { CATEGORIES, timeAgo } from "@/lib/geo";
import { pushConfigured, pushPublicConfig } from "@/lib/push";
import { getViewer } from "@/lib/viewer";
import { text } from "@/lib/validate";
import { Dot, NumBadge } from "@/ui/kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alerts" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/* =====================================================================
   Alerts — rebuilt 2026-10-17 against reference 1002177500.
   New DOM: one content column of layered cards (settings card with
   toggle rows + gold “Storm warnings” card + push card), matching the
   Email alerts mockup. All queries and contract copy preserved.
   ===================================================================== */

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
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      <PageHead
        eyebrow="Alerts"
        title="Only the ones that affect your shore"
        blurb="Nassau first: alerts cover New Providence at launch, and when a neighbour files a matching report we email you a link straight to it. Two fields decide everything — your email address and the kinds of report you care about."
      />

      <EmergencyNotice />

      {confirmed === "1" ? (
        <p className="nb-card nb-card-tight" style={{ color: "var(--nb-mint)", fontSize: 15 }}>
          You are confirmed. We will email you when a matching report is filed.
        </p>
      ) : null}
      {confirmed === "0" ? (
        <p className="nb-card nb-card-tight" style={{ color: "#ff7a6b", fontSize: 15 }}>
          That confirmation link is not valid any more. Fill in the form below and we will send a fresh one.
        </p>
      ) : null}

      {stop ? (
        <div className="nb-card">
          {stopRow ? (
            <>
              <p className="display text-[17px] font-bold">Stop alerts to {mask(stopRow.target)}?</p>
              <p className="mt-1.5 text-[14px]" style={{ color: "var(--nb-muted)" }}>
                This profile covers {stopRow.parishes.split(",").join(", ")}. You can set up a new one at any time.
              </p>
              <div className="mt-4">
                <StopAlertButton token={stop} label="Yes, stop these alerts" />
              </div>
            </>
          ) : (
            <p style={{ color: "var(--nb-text)" }}>That alert profile has already been stopped.</p>
          )}
        </div>
      ) : null}

      {/* ---- the settings card (reference: “Email alerts” screen) ---- */}
      <section className="nb-card">
        <p className="display text-[22px] font-extrabold leading-tight">Email alerts</p>
        <p className="mt-1.5 text-[14.5px]" style={{ color: "var(--nb-muted)" }}>
          Choose your island and the updates you want.
        </p>
        <div className="mt-5">
          <AlertForm plan={viewer.tier} defaultEmail={viewer.email ?? ""} />
        </div>
      </section>

      {/* ---- gold always-on card (reference: “Storm warnings”) ---- */}
      <section className="nb-card-gold">
        <span
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            border: "1px solid #6d6a45",
            background: "#2e3122",
            color: "var(--nb-gold)",
            flex: "none",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
          </svg>
        </span>
        <div>
          <p className="text-[16px] font-bold" style={{ color: "var(--nb-gold-ink)" }}>
            Storm warnings
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: "#a9a68c" }}>
            Storm reports for your islands always reach you, even if you did not tick the Storm category. That is the same for everyone,
            Free plan included — a warning a household needs is never something we charge for.
          </p>
        </div>
      </section>

      {/* ---- push card ---- */}
      {push ? (
        <PushToggle config={push.config} vapidKey={push.vapidKey} parishes={["New Providence"]} />
      ) : (
        <section className="nb-card">
          <p className="display text-[17px] font-bold">Push alerts on this device</p>
          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
            Not switched on for this site yet. Email is the channel that works today; the Android app has a push switch of its own once it is
            installed.
          </p>
        </section>
      )}

      {/* ---- profiles ---- */}
      {viewer.signedIn ? (
        <section>
          <p className="display text-[17px] font-extrabold">Your alert profiles</p>
          {mine.length ? (
            <ul className="mt-3 flex flex-col gap-2.5">
              {mine.map((s) => (
                <li key={s.id} className="nb-card nb-card-tight" style={{ padding: "16px 18px" }}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
                    <span
                      className="nb-pill nb-pill-mint"
                      style={s.verified ? undefined : { borderColor: "rgba(246,199,93,.38)", background: "rgba(246,199,93,.08)", color: "var(--nb-gold)" }}
                    >
                      {s.verified ? (
                        <>
                          <Dot color="var(--nb-mint)" glow /> On
                        </>
                      ) : (
                        "Waiting for your confirmation email"
                      )}
                    </span>
                    <span className="num font-mono text-[12px]" style={{ color: "var(--nb-text)" }}>
                      {s.target}
                    </span>
                    <span style={{ color: "var(--nb-muted)" }}>{s.parishes.split(",").join(" · ")}</span>
                    <span className="num" style={{ color: "var(--nb-faint)", fontSize: 12 }}>
                      {typeof s.lat === "number" && typeof s.lng === "number" ? `within ${s.radiusKm ?? 12} km of you` : "whole island"}
                    </span>
                    <span className="num" style={{ color: "var(--nb-faint)", fontSize: 12 }}>
                      {s.categories
                        ? s.categories
                            .split(",")
                            .filter(Boolean)
                            .map((c) => CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? c)
                            .join(", ")
                        : "every category"}
                    </span>
                    <span className="num text-[12px]" style={{ color: "var(--nb-faint)" }}>
                      {timeAgo(s.createdAt)}
                    </span>
                    <span className="ml-auto">
                      <StopAlertButton id={s.id} label="Remove" />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[14px]" style={{ color: "var(--nb-faint)" }}>
              You have no alert profiles yet.
            </p>
          )}
        </section>
      ) : (
        <p className="text-[13.5px]" style={{ color: "var(--nb-faint)" }}>
          <Link href="/login?mode=signin&next=%2Falerts" className="font-bold underline" style={{ color: "var(--nb-mint)" }}>
            Sign in
          </Link>{" "}
          to see and remove your alert profiles here. Every alert email also has a “Stop these alerts” link.
        </p>
      )}

      {/* ---- how it works ---- */}
      <section className="nb-card">
        <p className="display text-[17px] font-bold">How a report reaches you</p>
        <div className="mt-4 flex flex-col gap-3.5">
          <Step n={1} title="Filed">
            A neighbour or the news wire puts a pin on the map with a category.
          </Step>
          <Step n={2} title="Matched">
            We check it against the island and categories you picked — and, if you switched on “only near me”, the kilometres you chose.
          </Step>
          <Step n={3} title="Sent">
            An email arrives with the street, how serious it is, and a link to the live report. You get at most one every three minutes.
          </Step>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <p className="nb-check-row" style={{ alignItems: "flex-start" }}>
      <NumBadge n={n} />
      <span>
        <span className="font-bold" style={{ color: "var(--nb-cream)" }}>
          {title}.{" "}
        </span>
        <span style={{ color: "var(--nb-muted)" }}>{children}</span>
      </span>
    </p>
  );
}

function mask(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
}
