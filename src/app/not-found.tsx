import Link from "next/link";
import { NowBeyMark } from "@/components/app-shell";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[520px] py-14 text-center">
      <NowBeyMark size={44} />
      <h1 className="display mt-3 text-[28px] font-extrabold text-sand-100">No pin at those coordinates</h1>
      <p className="mx-auto mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-300">
        That page is not on the NowBey map. It may have been cleared up and archived, or the link lost its way over the water.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href="/map" className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950">
          Open the map
        </Link>
        <Link href="/" className="rounded-full border hairline px-4 py-2 text-[13px] font-bold hover:bg-white/5">
          Back to the feed
        </Link>
        <Link href="/report" className="rounded-full border hairline px-4 py-2 text-[13px] font-bold hover:bg-white/5">
          Report a spot
        </Link>
      </div>
    </div>
  );
}
