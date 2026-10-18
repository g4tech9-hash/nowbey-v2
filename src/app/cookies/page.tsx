import { PageHead } from "@/components/app-shell";
import { StoragePanel } from "@/components/storage-panel";
import { LEGAL_LINKS } from "@/lib/legal";

export const metadata = { title: "Cookies and storage" };

/**
 * The honest version of a cookie banner.
 *
 * A consent banner is required when storage is used for tracking across sites. NowBey has none of that: one
 * session cookie and four preferences, all first-party, all with a clear job. So this page lists them
 * (name, purpose, lifetime) and offers a button that clears everything except the sign-in — the actual right
 * people want from a banner, without the dark pattern of a pre-ticked box or a grey "reject" link.
 */
export default function StoragePage() {
  return (
    <div className="mx-auto max-w-[760px]">
      <PageHead
        eyebrow="Legal"
        title="Cookies and storage"
        blurb="Everything NowBey stores on your device, what it is for, and how to clear it. No advertising cookies, no tracking pixels."
      />

      <div className="glass space-y-5 rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px] leading-relaxed sm:text-[12.5px]">
            <caption className="sr-only">Storage used by NowBey</caption>
            <thead>
              <tr className="text-ink-200">
                <th scope="col" className="border-b hairline py-1.5 pr-3 font-bold">Name</th>
                <th scope="col" className="border-b hairline py-1.5 pr-3 font-bold">Kind</th>
                <th scope="col" className="border-b hairline py-1.5 pr-3 font-bold">Purpose</th>
                <th scope="col" className="border-b hairline py-1.5 font-bold">Lifetime</th>
              </tr>
            </thead>
            <tbody className="text-ink-300">
              {[
                ["nowbey_session", "Cookie (HTTP-only, SameSite=Lax)", "Keeps you signed in. Cannot be read by scripts on the page.", "30 days, or until you sign out"],
                ["nb_mode", "localStorage", "Light or dark appearance.", "Until you change it"],
                ["nb_simple", "localStorage", "Simple view: larger text, fewer effects.", "Until you change it"],
                ["nb_text", "localStorage", "Your chosen text size.", "Until you change it"],
                ["nb_report_draft_v1", "localStorage", "A half-written report, so a refresh does not lose it.", "24 hours from the last edit"],
                ["nb_device_id", "localStorage", "A random key so a block you set applies before you sign in.", "Until you clear it"],
                ["__Host-… / nb_csrf", "Cookie", "Stops another site posting as you. Set only where a form needs it.", "Session"],
              ].map(([name, kind, purpose, life]) => (
                <tr key={name} className="align-top">
                  <td className="border-b hairline py-2 pr-2 font-mono text-[11px] text-ink-200 break-all">{name}</td>
                  <td className="border-b hairline py-2 pr-2 break-words">{kind}</td>
                  <td className="border-b hairline py-2 pr-2 break-words">{purpose}</td>
                  <td className="border-b hairline py-2">{life}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <StoragePanel />

        <p className="text-[12px] leading-relaxed text-ink-400">
          What we collect on the server, and why, is on the{" "}
          <a href={LEGAL_LINKS.privacy} className="font-bold text-tide-300 underline">
            privacy policy
          </a>
          . The rules for posting are in the{" "}
          <a href={LEGAL_LINKS.terms} className="font-bold text-tide-300 underline">
            terms of use
          </a>
          .
        </p>
      </div>
    </div>
  );
}
