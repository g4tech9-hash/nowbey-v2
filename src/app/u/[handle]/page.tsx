import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { BadgeMark } from "@/components/verified-badge";
import { badgesFor } from "@/lib/badges";
import { normalizeHandle } from "@/lib/handles";
import { alertIslandCount, liveBadges, profileSettings, reportRecord, reportsFor } from "@/lib/profile";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member profile" };

const joined = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/**
 * What another member sees at /u/<handle>.
 *
 * Three rules from the schema are enforced here rather than in the query, so they are easy to check:
 * a missing settings row means "open"; a private profile shows nothing but the fact that it is private;
 * and an anonymous report is never listed by name — for its own author either. Attendance of hidden
 * reports is the fourth: they are left out of the list, while the record below still counts them, exactly
 * as the migration's header promises.
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [member] = await db.select().from(users).where(eq(users.handle, normalizeHandle(handle))).limit(1);
  if (!member || member.status === "suspended") notFound();

  const viewer = await getViewer();
  const isSelf = viewer.userId === member.id;
  const canLook = viewer.isAdmin || isSelf;
  const settings = await profileSettings(member.id);
  const isPrivate = settings.visibility === "private";

  if (isPrivate && !canLook) {
    return (
      <div className="mx-auto max-w-[680px] space-y-4">
        <PageHead eyebrow="Profile" title={`@${member.handle}`} />
        <section className="glass rounded-2xl p-4">
          <p className="text-[13px] text-[#cfeee9]">
            @{member.handle} keeps their profile private, so there is nothing to show here. Their reports are unaffected — anything they file still appears on
            the{" "}
            <Link href="/map" className="font-bold text-tide-300 underline">
              map
            </Link>{" "}
            and in the{" "}
            <Link href="/wire" className="font-bold text-tide-300 underline">
              wire
            </Link>
            .
          </p>
        </section>
      </div>
    );
  }

  const [record, grants, islands, reports, earned] = await Promise.all([
    reportRecord(member.id, member.handle),
    liveBadges(member.id),
    settings.showAlertSummary ? alertIslandCount(member.id) : Promise.resolve(0),
    reportsFor(member.id, member.handle, { includeAnonymous: false, includeHidden: !canLook, limit: 20 }),
    // The desk badge comes from the account's role, the verified badge from live grants — both have to
    // be asked for, or a staff profile renders without the mark everybody else sees beside their handle.
    badgesFor([member.handle]),
  ]);
  const onDesk = earned.get(member.handle) === "desk";

  const listed = canLook ? reports : reports.filter((r) => !r.hidden);

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <PageHead
        eyebrow={isPrivate ? "Private profile" : "Profile"}
        title={member.displayName || `@${member.handle}`}
        blurb={`@${member.handle}${member.parish ? ` · ${member.parish}` : ""} · on NowBey since ${joined(member.createdAt)}`}
        actions={
          isSelf ? (
            <Link href="/you/profile" className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8">
              Edit your profile
            </Link>
          ) : null
        }
      />

      {isPrivate ? (
        <p className="rounded-xl bg-sun-500/12 px-3.5 py-2.5 text-[12.5px] text-sun-400">
          This profile is private. You are seeing it because you are {isSelf ? "its owner" : "staff"}.
        </p>
      ) : null}

      {onDesk || grants.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {onDesk ? <BadgeMark kind="desk" /> : null}
          {grants.map((g, i) => (
            <BadgeMark key={`${g.badge}-${i}`} kind={g.badge === "desk" ? "desk" : "verified"} />
          ))}
        </div>
      ) : null}

      {settings.bio ? <p className="text-[13.5px] leading-relaxed text-[#cfeee9]">{settings.bio}</p> : null}

      <dl className="grid grid-cols-3 gap-3 rounded-2xl border hairline p-3.5 text-[13px]">
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Reports</dt>
          <dd className="mt-0.5 font-bold text-sand-100">{record.reports}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Confirmations</dt>
          <dd className="mt-0.5 font-bold text-sand-100">{record.confirmations}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Alert islands</dt>
          <dd className="mt-0.5 font-bold text-sand-100">{settings.showAlertSummary && islands ? islands : "—"}</dd>
        </div>
      </dl>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-extrabold text-sand-100">Reports</p>
        <p className="mt-0.5 text-[12.5px] text-[#8fb9b6]">The reports this member filed under their own name.</p>
        {listed.length ? (
          <ul className="mt-3 space-y-2">
            {listed.map((r) => {
              const meta = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
              return (
                <li key={r.id}>
                  <Link href={`/incident/${r.id}`} className="block rounded-xl border hairline p-3 hover:bg-white/5">
                    <p className="text-[13px] font-bold text-sand-100">{r.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#8fb9b6]">
                      {meta.label}
                      {r.parish ? ` · ${r.parish}` : ""} · {timeAgo(r.createdAt)} · {r.confirmations} confirmation{r.confirmations === 1 ? "" : "s"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[#8fb9b6]">Nothing listed yet.</p>
        )}
      </section>

      <p className="text-[11.5px] leading-relaxed text-[#6e97a0]">
        Badges are granted by a person at NowBey after a member’s reports have held up. They cannot be bought, and a report stays usable whether or not its
        author has one.
      </p>
    </div>
  );
}
