import { headers } from "next/headers";
import { PageHead } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get the mobile app" };

const STEPS = [
  ["Get the project", "The Expo project lives in this repository at V2_UI_Backup/expo — copy that folder to your computer. It is kept as part of the design rollback point and talks to this site's API. You need Node.js 20 or newer."],
  ["Install", "Open a terminal in the unzipped folder and run npm install."],
  ["Point it at this site", "The app reads its data from this website, so you do not run a second server."],
  ["Start it", "Run the command below, then scan the QR code with the free Expo Go app on your phone."],
];

export default async function MobilePage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const site = `${proto}://${host}`;

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <PageHead
        eyebrow="Mobile app"
        title="NowBey on your phone"
        blurb="The same feed, map, reports and news wire, built with Expo for iPhone and Android. It signs in with your NowBey account and shows your plan."
      />

      <section aria-labelledby="install" className="glass space-y-3 rounded-2xl p-4">
        <div>
          <h2 id="install" className="display text-[16px] font-extrabold text-sand-100">
            Add NowBey to your home screen
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-300">
            No app store and no download. It opens full screen like an app, and it keeps the last saved feed for when the signal drops.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border hairline p-3">
            <p className="text-[13px] font-bold text-sand-100">Android (Chrome)</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12.5px] text-ink-300">
              <li>Open this site in Chrome.</li>
              <li>Tap the menu (⋮) and choose “Install app” or “Add to Home screen”.</li>
            </ol>
          </div>
          <div className="rounded-xl border hairline p-3">
            <p className="text-[13px] font-bold text-sand-100">iPhone (Safari)</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12.5px] text-ink-300">
              <li>Open this site in Safari.</li>
              <li>Tap Share, then “Add to Home Screen”.</li>
            </ol>
          </div>
        </div>
        <p className="text-[11.5px] text-ink-400">Push alerts on the phone are switched on from the Alerts page when the site has them enabled.</p>
      </section>

      <div className="pt-2">
        <h2 className="display text-[16px] font-extrabold text-sand-100">For developers: the Expo app</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-300">
          An Expo project you can run today and publish to the app stores later. It is not on the app stores yet, and no download is published.
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="glass flex gap-3 rounded-2xl p-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tide-500/20 text-[12px] font-extrabold text-tide-300">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-sand-100">{title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-300">{text}</p>
              {i === 2 || i === 3 ? (
                <pre className="nb-scroll mt-2 overflow-x-auto rounded-lg bg-abyss-950/80 p-2.5 text-[12px] text-tide-300">
                  {i === 2 ? `EXPO_PUBLIC_API_BASE=${site}` : `EXPO_PUBLIC_API_BASE=${site} npx expo start`}
                </pre>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border hairline p-4 text-[12.5px] leading-relaxed text-ink-300">
        <p className="font-bold text-sand-100">Good to know</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>The interactive map runs on iPhone and Android. In a desktop browser the app shows the pin list instead.</li>
          <li>Plans are bought on the website, not inside the app. Your plan shows up in the app after you sign in.</li>
          <li>A phone on mobile data cannot reach a site running only on your computer. Use the live address above, not localhost.</li>
        </ul>
      </div>
    </div>
  );
}
