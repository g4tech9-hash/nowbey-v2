import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
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
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="Member profile"
        title="Profiles open once the database is connected"
        blurb="Member profiles live in the database, so this deployment needs its DATABASE_URL before this page can load."
      />
    );
  }
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
        <section className="nb-surface rounded-xl2 p-4">
          <p className="text-base text-secondary">
            @{member.handle} keeps their profile private, so there is nothing to show here. Their reports are unaffected — anything they file still appears on
            the{" "}
            <Link href="/map" className="font-bold text-text-accent underline">
              map
            </Link>{" "}
            and in the{" "}
            <Link href="/wire" className="font-bold text-text-accent underline">
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
      <section className="overflow-hidden rounded-2xl border hairline bg-raised">
        <div className="h-24 bg-gradient-to-r from-accent/30 via-cyan-500/15 to-base" aria-hidden />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <ProfileAvatar handle={member.handle} />
            {isSelf ? <Link href="/you/profile" className="rounded-full border hairline px-4 py-2 text-sm font-bold hover:bg-white/8">Edit profile</Link> : null}
          </div>
          <h1 className="display mt-3 text-2xl font-extrabold text-primary">{member.displayName || member.handle}</h1>
          <p className="text-sm text-text-accent">@{member.handle}</p>
          <p className="mt-2 text-sm text-tertiary">{member.parish ?? "The Bahamas"} · Joined {joined(member.createdAt)}</p>
          {settings.bio ? <p className="mt-3 whitespace-pre-line text-base text-secondary">{settings.bio}</p> : null}
        </div>
      </section>

      {isPrivate ? (
        <p className="nb-surface rounded-xl border-warn-500/30 bg-warn-500/12 px-3.5 py-2.5 text-sm text-warn-600">
          This profile is private. You are seeing it because you are {isSelf ? "its owner" : "staff"}.
        </p>
      ) : null}

      {onDesk || grants.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {onDesk ? <BadgeMark kind="desk" /> : null}
          {grants.map((g, i) => (
            <BadgeMark key={`${g.badge}-${i}`} kind={g.badge === "desk" || g.badge === "verified" || g.badge === "broadcaster" ? g.badge : null} />
          ))}
        </div>
      ) : null}


      <dl className="grid grid-cols-3 gap-2">
        <div className="nb-surface p-3">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">Reports</dt>
          <dd className="num display mt-1 text-2xl font-extrabold text-text-accent">{record.reports}</dd>
        </div>
        <div className="nb-surface p-3">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">Confirmations</dt>
          <dd className="num display mt-1 text-2xl font-extrabold text-success-500">{record.confirmations}</dd>
        </div>
        <div className="nb-surface p-3">
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">Alert islands</dt>
          <dd className="num display mt-1 text-2xl font-extrabold text-primary">{settings.showAlertSummary && islands ? islands : "—"}</dd>
        </div>
      </dl>

      <section className="nb-surface rounded-xl2 p-4">
        <p className="display text-base font-extrabold tracking-tight text-primary">Reports</p>
        <p className="mt-0.5 text-sm text-tertiary">The reports this member filed under their own name.</p>
        {listed.length ? (
          <ul className="mt-3 space-y-2">
            {listed.map((r) => {
              const meta = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
              return (
                <li key={r.id}>
                  <Link href={`/incident/${r.id}`} className="block rounded-xl border border-white/8 p-3 transition duration-200 ease-standard hover:border-accent-hover/30 hover:bg-white/[.04]">
                    <p className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-primary">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}80` }} />
                      {r.title}
                    </p>
                    <p className="num mt-0.5 text-xs text-tertiary">
                      {meta.label}
                      {r.parish ? ` · ${r.parish}` : ""} · {timeAgo(r.createdAt)} · {r.confirmations} confirmation{r.confirmations === 1 ? "" : "s"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-tertiary">Nothing listed yet.</p>
        )}
      </section>

      <p className="text-xs leading-relaxed text-tertiary">
        Badges are granted by a person at NowBey after a member’s reports have held up. They cannot be bought, and a report stays usable whether or not its
        author has one.
      </p>
    </div>
  );
}
