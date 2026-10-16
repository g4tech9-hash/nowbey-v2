import { headers } from "next/headers";
import { PageHead } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get the mobile app" };

const STEPS = [
  ["Download and unzip", "Save the zip below and unzip it. You need Node.js 20 or newer on your computer."],
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

      <div className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <div className="min-w-[200px] flex-1">
          <p className="display text-[15px] font-bold text-sand-100">NowBey mobile source code</p>
          <p className="mt-0.5 text-[12.5px] text-[#a9cdc9]">An Expo project you can run today and publish to the app stores later.</p>
        </div>
        <a
          href="/downloads/nowbey-expo.zip"
          download
          className="rounded-full bg-tide-500 px-4 py-2.5 text-[13px] font-extrabold text-abyss-950 hover:bg-tide-400"
        >
          Download the zip
        </a>
      </div>

      <ol className="space-y-3">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="glass flex gap-3 rounded-2xl p-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tide-500/20 text-[12px] font-extrabold text-tide-300">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-sand-100">{title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#a9cdc9]">{text}</p>
              {i === 2 || i === 3 ? (
                <pre className="nb-scroll mt-2 overflow-x-auto rounded-lg bg-abyss-950/80 p-2.5 text-[12px] text-tide-300">
                  {i === 2 ? `EXPO_PUBLIC_API_BASE=${site}` : `EXPO_PUBLIC_API_BASE=${site} npx expo start`}
                </pre>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border hairline p-4 text-[12.5px] leading-relaxed text-[#a9cdc9]">
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
