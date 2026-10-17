import { PageHead } from "@/components/app-shell";
import { GasForm } from "@/components/gas-form";
import { timeAgo } from "@/lib/geo";
import { gasBoard } from "@/lib/gas";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gas prices" };

const money = (c: number) => `B$${(c / 100).toFixed(2)}`;

export default async function GasPage() {
  const [board, viewer] = await Promise.all([gasBoard(), getViewer()]);
  return (
    <div>
      <PageHead eyebrow="Gas tracker" title="Gas prices" blurb="Pump prices reported by NowBey members in the last two weeks, in B$ per gallon. Prices change, so check the time on each report." />
      <div className="grid gap-4 md:grid-cols-3">
        {board.stats.map((s) => (
          <div key={s.fuel} className="rounded-2xl border border-white/10 bg-abyss-900/60 p-4">
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-tide-400">{s.fuel}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.averageCents ? money(s.averageCents) : "No reports yet"}</p>
            <p className="text-[12px] text-sand-200">
              {s.cheapest ? `Cheapest: ${money(s.cheapest.priceCents)} at ${s.cheapest.station}, ${s.cheapest.parish}` : "Be the first to report one."}
            </p>
            {board.official?.[s.fuel] ? <p className="mt-1 text-[11.5px] text-sand-300">Government price: {money(board.official[s.fuel]!)}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {board.stations.length === 0 ? <p className="text-[13px] text-sand-200">No prices yet. Report the first one.</p> : null}
          {board.stations.map((s) => (
            <div key={`${s.station}${s.parish}${s.fuel}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-abyss-900/50 px-3 py-2.5">
              <div>
                <p className="text-[14px] font-bold">{s.station}</p>
                <p className="text-[11.5px] text-sand-300">{s.parish} · {s.fuel} · {timeAgo(new Date(s.reportedAt))}</p>
              </div>
              <p className="text-lg font-extrabold text-tide-300">{money(s.priceCents)}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-abyss-900/60 p-4">
          <h2 className="mb-2 text-[15px] font-extrabold">Report a price</h2>
          <GasForm signedIn={viewer.signedIn} />
        </div>
      </div>
    </div>
  );
}
