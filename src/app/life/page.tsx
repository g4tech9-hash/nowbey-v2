import Link from "next/link";
import { hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { PageScene } from "@/components/page-scene";
import { AdSlot } from "@/components/ad-slot";
import { FilterChips, Pager } from "@/components/admin-ui";
import { PostCard } from "@/components/life/post-card";
import { Stars } from "@/components/life/stars";
import { badgesFor } from "@/lib/badges";
import { PARISHES } from "@/lib/geo";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { KINDS, KIND_KEYS, isKind, listPosts, topPlaces } from "@/lib/life";
import { clampInt } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Island Life" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(params: Record<string, string | undefined>, over: Record<string, string | undefined> = {}) {
  const merged = { ...params, ...over };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/life?${s}` : "/life";
}

export default async function LifePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const kindIn = first(sp.kind);
  const kind = isKind(kindIn) ? kindIn : null;
  const parishIn = first(sp.parish);
  const parish = parishIn && (PARISHES as readonly string[]).includes(parishIn) ? parishIn : null;
  const sort = first(sp.sort) === "loved" ? "loved" : "new";
  const page = clampInt(first(sp.page), 1, 1, 10000);

  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="Island Life"
        title="Island Life opens once the database is connected"
        blurb="Tips, reviews and favourite spots are stored in the database, so this deployment needs its DATABASE_URL first."
      />
    );
  }

  const viewer = await getViewer();
  const [list, top] = await Promise.all([listPosts({ kind, parish, sort, page, perPage: 12 }), topPlaces({ kind, parish, limit: 5 })]);
  const [engMap, badges] = await Promise.all([engagementFor("post", list.rows.map((r) => r.id), viewer.userId), badgesFor(list.rows.map((r) => r.authorHandle))]);
  const params = { kind: kind ?? undefined, parish: parish ?? undefined, sort: sort === "new" ? undefined : sort };

  return (
    <div>
      <section className="glass relative isolate mb-7 overflow-hidden rounded-[24px] p-5 sm:p-7">
        <PageScene name="lagoon" />
        <p className="nb-eyebrow" style={{ color: "var(--color-sun-500)" }}>
          <span className="nb-eyebrow-dot" style={{ background: "var(--color-sun-500)", boxShadow: "0 0 0 4px rgba(245,199,93,0.1)" }} aria-hidden />
          Island Life
        </p>
        <h1 className="display mt-3 max-w-[22ch] text-[clamp(1.85rem,5vw,2.85rem)] font-extrabold leading-[1.03] tracking-[-0.06em] text-sand-100">
          Where the islands eat, celebrate and <em className="text-tide-500 not-italic">unwind</em>
        </h1>
        <p className="mt-3 max-w-[56ch] text-[13.5px] leading-[1.75] text-ink-200">
          Real tips from people who live here. Share where you ate, how the festival went, which beach was perfect on Sunday, or the thing you wish a visitor knew.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/life/new" className="nb-btn nb-btn-primary">
            Share an experience
          </Link>
          <Link href="/life/places" className="nb-btn nb-btn-secondary">
            Browse places
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <FilterChips
            label="Show"
            name="kind"
            value={kind ?? ""}
            path="/life"
            params={params}
            options={[{ value: "", label: "Everything" }, ...KIND_KEYS.map((k) => ({ value: k, label: KINDS[k].label }))]}
          />
          <FilterChips
            label="Sort"
            name="sort"
            value={sort === "new" ? "" : sort}
            path="/life"
            params={params}
            options={[
              { value: "", label: "Newest" },
              { value: "loved", label: "Most loved" },
            ]}
          />
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
            <span className="shrink-0 text-[11.5px] font-bold uppercase tracking-wide text-ink-400">Island</span>
            <Link
              href={href(params, { parish: undefined, page: undefined })}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${!parish ? "bg-tide-500 text-on-accent" : "bg-white/6 text-ink-300 hover:bg-white/12"}`}
            >
              All
            </Link>
            {PARISHES.slice(0, 12).map((p) => (
              <Link
                key={p}
                href={href(params, { parish: p, page: undefined })}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${parish === p ? "bg-tide-500 text-on-accent" : "bg-white/6 text-ink-300 hover:bg-white/12"}`}
              >
                {p}
              </Link>
            ))}
          </div>

          <p className="text-[12px] text-ink-400">
            {list.total} {list.total === 1 ? "post" : "posts"}
            {kind ? ` in ${KINDS[kind].label}` : ""}
            {parish ? ` on ${parish}` : ""}.
          </p>

          {list.rows.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {list.rows.map((p) => (
                <PostCard key={p.id} post={p} eng={engMap.get(p.id) ?? NO_ENGAGEMENT} signedIn={viewer.signedIn} badge={badges.get(p.authorHandle) ?? null} />
              ))}
            </div>
          ) : (
            <div className="nb-surface rounded-xl2 p-7 text-center">
              <p className="display text-[17px] font-bold text-sand-100">Nothing here yet</p>
              <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-ink-300">
                {kind || parish ? "Try a different filter, or be the first to share something here." : "Be the first to share a favourite spot, a great meal or how an event went."}
              </p>
              <Link href="/life/new" className="mt-3 inline-block rounded-full bg-sun-500 px-4 py-2 text-[13px] font-extrabold text-on-accent">
                Share an experience
              </Link>
            </div>
          )}
          <Pager page={list.page} pages={list.pages} path="/life" params={params} />
        </div>

        <aside className="space-y-4">
          <div className="nb-surface rounded-xl2 p-3.5">
            <p className="display text-[14.5px] font-bold text-sand-100">Most loved places</p>
            <p className="mt-0.5 text-[11.5px] text-ink-400">Best rated by neighbours in the last year{parish ? `, on ${parish}` : ""}.</p>
            {top.length ? (
              <ol className="mt-2.5 space-y-2.5">
                {top.map((t, i) => {
                  const k = KINDS[t.kind] ?? KINDS.tip;
                  return (
                    <li key={`${t.name}-${t.parish}-${t.kind}`} className="flex gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/8 text-[11.5px] font-extrabold text-sand-100">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-sand-100">{t.name}</span>
                        <span className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-ink-400">
                          <Stars value={Math.round(t.avg)} size={11} />
                          {t.avg.toFixed(1)} · {t.n} {t.n === 1 ? "review" : "reviews"}
                        </span>
                        <span className="block text-[11.5px]" style={{ color: k.color }}>
                          {k.label}
                          {t.parish ? ` · ${t.parish}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-400">No rated places yet. Review one and start the list.</p>
            )}
          </div>

          <div className="nb-surface rounded-xl2 p-3.5 text-[12.5px] leading-relaxed text-ink-300">
            <p className="display text-[14.5px] font-bold text-sand-100">House rules</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Share what you actually did and saw.</li>
              <li>Be kind. No insults, no spam, no adverts.</li>
              <li>Keep other people&apos;s private details out of it.</li>
              <li>Spot something wrong? Use Report on the post.</li>
            </ul>
          </div>

          <AdSlot index={2} adFree={viewer.adFree} variant="rail" />
        </aside>
      </div>
    </div>
  );
}
