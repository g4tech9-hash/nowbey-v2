import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/app-shell";
import { HideReportButton, ProfileForm } from "@/components/profile-forms";
import { BadgeMark } from "@/components/verified-badge";
import { alertIslandCount, liveBadges, profileSettings, reportRecord, reportsFor } from "@/lib/profile";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your profile" };

const when = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

function Section({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <p className="display text-[15px] font-extrabold text-sand-100">{title}</p>
      {blurb ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#8fb9b6]">{blurb}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * The member's own view of their profile: what other people see, the three settings that shape it, and the
 * one control that changes a listing — hiding a report. Nothing here can take a report off the map.
 */
export default async function MyProfilePage() {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) redirect("/login?mode=signin&next=/you/profile");

  const [settings, reports, badges, islands, record] = await Promise.all([
    profileSettings(viewer.userId),
    reportsFor(viewer.userId, viewer.handle, { includeAnonymous: true, includeHidden: true, limit: 20 }),
    liveBadges(viewer.userId),
    alertIslandCount(viewer.userId),
    reportRecord(viewer.userId, viewer.handle),
  ]);

  const hiddenCount = reports.filter((r) => r.hidden).length;
  const verifiedByPerson = badges.some((b) => b.badge === "verified");

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <PageHead
        eyebrow={`@${viewer.handle}`}
        title="Your profile"
        blurb={`${record.reports} report${record.reports === 1 ? "" : "s"} filed · ${record.confirmations} confirmation${record.confirmations === 1 ? "" : "s"} gathered`}
        actions={
          <Link href={`/u/${viewer.handle}`} className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8">
            See it as others do
          </Link>
        }
      />

      {badges.length ? (
        <p className="-mt-1 flex flex-wrap items-center gap-2">
          {badges.map((b, i) => (
            <BadgeMark key={`${b.badge}-${i}`} kind={b.badge === "desk" ? "desk" : "verified"} />
          ))}
          {viewer.isEditor && !badges.some((b) => b.badge === "desk") ? <BadgeMark kind="desk" /> : null}
        </p>
      ) : viewer.isEditor ? (
        <p className="-mt-1">
          <BadgeMark kind="desk" />
        </p>
      ) : null}

      <Section
        title="Profile"
        blurb="Two decisions: whether your profile is open or private, and whether to show the number of islands your alerts cover. Both are yours to change at any time."
      >
        <ProfileForm settings={settings} />
      </Section>

      <Section title="What your profile says today" blurb="A quick read of the same facts the profile page uses.">
        <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Visibility</dt>
            <dd className="mt-0.5 font-bold text-sand-100">{settings.visibility === "private" ? "Private" : "Open"}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Bio</dt>
            <dd className="mt-0.5 text-sand-100">{settings.bio ? `${settings.bio.length} characters` : "Not set"}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Alert islands</dt>
            <dd className="mt-0.5 text-sand-100">{islands ? (settings.showAlertSummary ? `${islands} shown` : `${islands} kept private`) : "None set up"}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Verified</dt>
            <dd className="mt-0.5 text-sand-100">{verifiedByPerson ? "Yes, by a person" : "Not yet"}</dd>
          </div>
        </dl>
      </Section>

      <Section
        title="Your badges"
        blurb="A badge is granted by a person at NowBey, never bought and never tied to a plan. “Verified reporter” means someone checked the account."
      >
        {badges.length ? (
          <ul className="space-y-2.5">
            {badges.map((b, i) => (
              <li key={`${b.badge}-${i}`} className="rounded-xl border hairline p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeMark kind={b.badge === "desk" ? "desk" : "verified"} />
                  <span className="text-[12.5px] text-[#8fb9b6]">granted {when(b.grantedAt)} by @{b.grantedBy}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-[#cfeee9]">{b.reason}</p>
                {b.expiresAt ? <p className="mt-1 text-[11.5px] text-sun-400">Runs until {when(b.expiresAt)}.</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-[#8fb9b6]">
            No badges yet. They are given out by hand — usually after a member has filed several reports that held up.
          </p>
        )}
      </Section>

      <Section
        title="Your reports"
        blurb={
          hiddenCount
            ? `${hiddenCount} report${hiddenCount === 1 ? " is" : "s are"} hidden from your profile. Hiding never removes a report from the map, from its confirmations or from your record — it only stops the listing by your name.`
            : "Hiding a report takes it off your profile and nothing else: it stays on the map, keeps its confirmations and still counts in your record."
        }
      >
        {reports.length ? (
          <ul className="space-y-2.5">
            {reports.map((r) => {
              const meta = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
              return (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border hairline p-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-sand-100">
                      <span className="truncate">{r.title}</span>
                      {r.anonymous ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#a9cdc9]">anonymous</span>
                      ) : null}
                      {r.hidden ? (
                        <span className="rounded-full bg-sun-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sun-400">hidden</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[#8fb9b6]">
                      {meta.label}
                      {r.parish ? ` · ${r.parish}` : ""} · {timeAgo(r.createdAt)} · {r.confirmations} confirmation{r.confirmations === 1 ? "" : "s"}
                    </p>
                    {r.anonymous ? (
                      <p className="mt-1 text-[11.5px] text-[#6e97a0]">Anonymous reports are never listed on a profile, so there is nothing to hide.</p>
                    ) : null}
                  </div>
                  {r.anonymous ? null : <HideReportButton incidentId={r.id} hidden={r.hidden} title={r.title} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12.5px] text-[#8fb9b6]">
            Nothing yet.{" "}
            <Link href="/report" className="font-bold text-tide-300 underline">
              File a report
            </Link>{" "}
            and it will show up here.
          </p>
        )}
      </Section>
    </div>
  );
}
