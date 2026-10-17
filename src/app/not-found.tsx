import Link from "next/link";
import { NowBeyMark } from "@/components/app-shell";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[520px] py-14 text-center">
      <NowBeyMark size={44} />
      <h1 className="display mt-4 text-[28px] font-extrabold">No pin at those coordinates</h1>
      <p className="mx-auto mt-2.5 max-w-[44ch] text-[13.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
        That page is not on the NowBey map. It may have been cleared up and archived, or the link lost its way over the water.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Link href="/map" className="nb-btn nb-btn-primary nb-btn-sm">
          Open the map
        </Link>
        <Link href="/" className="nb-btn nb-btn-outline nb-btn-sm">
          Back to the feed
        </Link>
        <Link href="/report" className="nb-btn nb-btn-outline nb-btn-sm">
          Report a spot
        </Link>
      </div>
    </div>
  );
}
