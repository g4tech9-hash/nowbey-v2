import { PageHead } from "@/components/app-shell";
import { PHOTO_CREDITS } from "@/lib/themes";

export const metadata = { title: "Photo credits" };

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead
        eyebrow="Credits"
        title="Photo credits"
        blurb="The scenery behind NowBey comes from photographers who share their work for free on Pexels. Thank you."
      />
      <ul className="glass divide-y divide-white/5 rounded-2xl">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.scene} className="px-4 py-3">
            <p className="text-[13.5px] font-bold text-primary">{c.note}</p>
            <p className="text-[12.5px] text-tertiary">
              Photo by {c.creator} on{" "}
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-bold text-text-accent underline">
                Pexels
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] leading-relaxed text-tertiary">
        Only the Nassau picture is labelled as The Bahamas by its photographer. The others are tropical scenery chosen for how they feel, not claims about where they were taken.
        Photos that members share in Island Life belong to the people who took them.
      </p>
    </div>
  );
}
