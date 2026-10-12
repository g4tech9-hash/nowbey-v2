import Link from "next/link";
import { PageHead } from "@/components/app-shell";
import { Stars } from "@/components/life/stars";
import { FilterChips, Pager } from "@/components/admin-ui";
import { PARISHES } from "@/lib/geo";
import { KINDS, KIND_KEYS, isKind, listPlaces } from "@/lib/life";
import { clampInt } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Places · Island Life" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const dollars = (p: number | null) => (p ? "$".repeat(Math.min(4, Math.max(1, Math.round(p)))) : "Price not given");

export default async function PlacesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const kindIn = first(sp.kind);
  const kind = isKind(kindIn) ? kindIn : null;
  const parishIn = first(sp.parish);
  const parish = parishIn && (PARISHES as readonly string[]).includes(parishIn) ? parishIn : null;
  const page = clampInt(first(sp.page), 1, 1, 10000);
  const [result, viewer] = await Promise.all([listPlaces({ kind, parish, page, perPage: 24 }), getViewer()]);
  const { rows: places, total, page: currentPage, pages } = result;
  const params = { kind: kind ?? undefined, parish: parish ?? undefined };

  return (
    <div>
      <PageHead
        eyebrow="Island Life"
        title="Places"
        blurb="Restaurants, bars, beaches, events and things to do, listed by the members who have been there. Ratings and prices come only from NowBey members."
        actions={
          <Link href="/life/new" className="rounded-full bg-sun-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950">
            Review a place
          </Link>
        }
      />
      <div className="space-y-4">
        <FilterChips
          label="Type"
          name="kind"
          value={kind ?? ""}
          path="/life/places"
          params={params}
          options={[{ value: "", label: "All" }, ...KIND_KEYS.map((k) => ({ value: k, label: KINDS[k].label }))]}
        />
        <FilterChips
          label="Island"
          name="parish"
          value={parish ?? ""}
          path="/life/places"
          params={{ kind: kind ?? undefined }}
          options={[{ value: "", label: "All" }, ...PARISHES.map((p) => ({ value: p, label: p }))]}
          scroll
        />

        <p className="text-[12px] text-[#8fb9b6]">
          {total} {total === 1 ? "place" : "places"}
          {kind ? ` in ${KINDS[kind].label}` : ""}
          {parish ? ` on ${parish}` : ""}, best rated first.
        </p>

        {places.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {places.map((p) => {
              const k = KINDS[p.kind] ?? KINDS.tip;
              return (
                <article key={p.id} className="glass min-w-0 rounded-2xl p-4 transition hover:bg-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: k.color }}>
                    {k.label}
                    {p.parish ? ` · ${p.parish}` : ""}
                  </p>
                  <h2 className="display mt-1 break-words text-[17px] font-extrabold text-sand-100">
                    <Link href={`/life/place/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </h2>
                  {p.address ? <p className="mt-0.5 break-words text-[12px] text-[#8fb9b6]">{p.address}</p> : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#cfeee9]">
                    {p.avg ? (
                      <>
                        <Stars value={Math.round(p.avg)} size={13} />
                        <span>
                          {p.avg.toFixed(1)} from {p.ratings} {p.ratings === 1 ? "rating" : "ratings"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#8fb9b6]">Not rated yet</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{dollars(p.price)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {p.people} {p.people === 1 ? "member has" : "members have"} been
                    </span>
                    {p.photoCount ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{p.photoCount} {p.photoCount === 1 ? "photo" : "photos"}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-[#8fb9b6]">
                    {p.hours ? (
                      <span className="flex items-center gap-1">
                        <span className="opacity-50">🕒</span> {p.hours}
                      </span>
                    ) : null}
                    {p.phone ? (
                      <span className="flex items-center gap-1">
                        <span className="opacity-50">📞</span> {p.phone}
                      </span>
                    ) : null}
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-tide-300 hover:underline">
                        <span className="opacity-50">🌐</span> Website
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl p-7 text-center">
            <p className="display text-[17px] font-bold text-sand-100">No places here yet</p>
            <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-[#a9cdc9]">
              {viewer.signedIn ? "Try another filter. Places appear once an admin imports them, or a member reviews one." : "Sign in and review a place to start the list."}
            </p>
          </div>
        )}
        <Pager page={currentPage} pages={pages} path="/life/places" params={params} />
        <p className="text-center text-[11px] text-[#7fa6a2]">Place names and locations: {"© OpenStreetMap contributors"}. Ratings, menus and photos come from NowBey members.</p>
      </div>
    </div>
  );
}
