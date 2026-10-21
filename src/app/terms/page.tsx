import Link from "next/link";
import { PageHead } from "@/components/app-shell";
import { COPYRIGHT_NOTICE, LEGAL_ENTITY, LEGAL_UPDATED, SUPPORT_EMAIL, TRADEMARK_NOTICE } from "@/lib/legal";
import { EmergencyStrip } from "@/components/emergency-notice";

export const metadata = { title: "Terms of use" };

// TEMPLATE: written to match how NowBey works today. Have a Bahamian lawyer review it before you publish the apps.
const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. What NowBey is",
    p: [
      "NowBey is a community map and news wire for The Bahamas. Residents report hazards such as flooding, road blocks and outages, and neighbours confirm or clear them.",
      "NowBey is not an emergency service. In an emergency call 919 or 911. Reports come from the public, may be late, wrong or incomplete, and must not be relied on for safety decisions.",
    ],
  },
  {
    h: "2. Your account",
    p: [
      "You must be 13 or older to use NowBey. Keep your password private. You are responsible for what is posted from your account.",
      "You can delete your account at any time from the You tab in the app, or from Account settings on the website.",
    ],
  },
  {
    h: "3. What you may post",
    p: [
      "You may post accurate reports, comments and Island Life posts that you have the right to share.",
      "You may not post anything that is hateful, harassing, threatening, sexually explicit, violent, defamatory or illegal; anything that identifies or exposes a private person's home or whereabouts; spam or adverts; deliberately false or misleading reports; or other people's photos or writing without permission.",
      "There is no tolerance for objectionable content or abusive users. We may hide content and suspend or remove accounts without notice when these rules are broken.",
    ],
  },
  {
    h: "4. Reporting and blocking",
    p: [
      "Every report, comment and post has a Report option. Staff review reports and act on them, normally within 24 hours.",
      "You can block a user from the app to stop seeing their content.",
    ],
  },
  {
    h: "Who we are",
    p: [
      `NowBey is operated by ${LEGAL_ENTITY}. These terms are an agreement between you and ${LEGAL_ENTITY}.`,
    ],
  },
  {
    h: "5. Paid plans",
    p: [
      "Paid plans remove ads and add features. Prices are shown in US dollars before you buy. Plans renew until cancelled and can be cancelled at any time; a cancelled plan runs to the end of the period you paid for. Note: Payment features are currently in a limited beta and may not be available in all regions.",
      "Plans bought through the Apple App Store or Google Play are billed, managed and refunded by that store under its own terms.",
    ],
  },
  {
    h: "6. Our rights and your content",
    p: [
      "You keep ownership of what you post. You give NowBey a free licence to display it in the service, including on the map, in alerts and in the news wire, for as long as it is posted.",
      "The service is provided as is. To the fullest extent the law allows, NowBey is not liable for losses arising from reports or from the service being unavailable.",
    ],
  },
  {
    h: "7. Changes and contact",
    p: [
      "We may update these terms. Continuing to use NowBey after a change means you accept it.",
      SUPPORT_EMAIL ? `Questions, complaints or content you want removed: ${SUPPORT_EMAIL}.` : "Questions, complaints or content you want removed: use the contact details on our app store listing.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[72ch]">
      <PageHead eyebrow="Legal" title="Terms of use" blurb={`Last updated ${LEGAL_UPDATED}.`} />
      <nav aria-label="On this page" className="glass mb-5 rounded-2xl p-4">
        <p className="nb-label mb-2 text-tertiary">On this page</p>
        <ul className="grid gap-1.5 text-[13px]">
          {SECTIONS.map((s) => (
            <li key={s.h}>
              <a href={`#${s.h.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="font-semibold text-secondary underline-offset-2 hover:text-primary hover:underline">
                {s.h}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="glass space-y-5 rounded-2xl p-5">
        {SECTIONS.map((s) => (
          <section key={s.h} id={s.h.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="scroll-mt-24">
            <h2 className="display text-[15px] font-extrabold text-primary">{s.h}</h2>
            {s.p.map((t, i) => (
              <p key={i} className="mt-1.5 text-[13px] leading-relaxed text-tertiary">
                {t}
              </p>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-5">
        <EmergencyStrip />
      </div>
      <p className="mt-4 text-[12.5px] text-tertiary">
        Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-secondary underline">{SUPPORT_EMAIL}</a> or read the <Link href="/privacy" className="font-bold text-secondary underline">privacy policy</Link>.
      </p>
      <p className="mt-2 text-[12px] text-tertiary">
        {TRADEMARK_NOTICE} {COPYRIGHT_NOTICE} The NowBey name, logo and the tagline &ldquo;Stay Safe, Bahamas&rdquo; may not be used to name, package or market another product or service.
      </p>
    </div>
  );
}
