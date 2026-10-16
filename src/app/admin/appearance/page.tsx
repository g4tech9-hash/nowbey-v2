import Link from "next/link";
import { notFound } from "next/navigation";
import { AppearanceForm } from "@/components/appearance-form";
import { BRAND } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const s = await getSiteSettings();

  return (
    <div className="max-w-[820px] space-y-5">
      <section className="glass rounded-2xl p-4 sm:p-5">
        <p className="display text-[16px] font-extrabold text-sand-100">Look and feel</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-ink-200)]">
          Switch between the new Island look and the original Classic design at any time. It takes effect for everyone straight away, and nothing is lost either way.
        </p>
        <div className="mt-4">
          <AppearanceForm theme={s.theme} mode={s.mode} splashPref={s.splashPref} themeLocked={s.themeLocked} modeLocked={s.modeLocked} splashLocked={s.splashLocked} />
        </div>
      </section>

      <section className="glass rounded-2xl p-4 text-[12.5px] leading-relaxed text-[var(--color-ink-200)]">
        <p className="display text-[14.5px] font-bold text-sand-100">Good to know</p>
        <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
          <li>
            <strong className="text-sand-100">Emergency way back:</strong> put <code className="rounded bg-white/10 px-1">NOWBEY_THEME=classic</code> in the server settings (<code className="rounded bg-white/10 px-1">.env</code>) and restart. It overrides this page, so you can always get the original look back even if you cannot sign in.
          </li>
          <li>
            <strong className="text-sand-100">Your own photos:</strong> replace any file in <code className="rounded bg-white/10 px-1">public/scenes</code> (nassau, aerial, sunset, shore, lagoon .jpg) with a landscape JPEG about 2000 pixels wide and under 500 KB. No code changes needed.
          </li>
          <li>
            <strong className="text-sand-100">The tagline</strong> (&ldquo;{BRAND.tagline}&rdquo;) and the splash line live in <code className="rounded bg-white/10 px-1">src/lib/brand.ts</code>.
          </li>
          <li>
            The mobile app has its own switch: <code className="rounded bg-white/10 px-1">EXPO_PUBLIC_NOWBEY_THEME=classic</code> when you start it.
          </li>
          <li>
            Photo credits are listed on the{" "}
            <Link href="/credits" className="font-bold text-tide-300 underline">
              credits page
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}
