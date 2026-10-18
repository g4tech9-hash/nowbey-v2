import { PageHead } from "@/components/app-shell";
import { LEGAL_LINKS, LEGAL_UPDATED, SUPPORT_EMAIL, TERMS_VERSION } from "@/lib/legal";
import { EmergencyNotice } from "@/components/emergency-notice";

export const metadata = { title: "Terms of use" };

/*
 * Written to match how NowBey works today. A Bahamian lawyer should still read it before the app stores go
 * live: this is the document the App Store guideline 1.2 (user-generated content) and the consumer-protection
 * rules rest on. The placeholder marker was removed on purpose — a live site should not tell a reader the
 * contract they are agreeing to is a placeholder.
 */
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
      "We may update these terms. When we do, the version at the top changes and we ask signed-in members to agree again the next time they sign in — we do not treat silence as consent.",
      SUPPORT_EMAIL ? `Questions, complaints or content you want removed: ${SUPPORT_EMAIL}.` : "Questions, complaints or content you want removed: use the contact details on our app store listing.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead eyebrow="Legal" title="Terms of use" blurb={`Last updated ${LEGAL_UPDATED}. This version is ${TERMS_VERSION}.`} />
      <div className="mb-4"><EmergencyNotice /></div>
      <div className="glass space-y-5 rounded-2xl p-5">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="display text-[15px] font-extrabold text-sand-100">{s.h}</h2>
            {s.p.map((t, i) => (
              <p key={i} className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
                {t}
              </p>
            ))}
          </section>
        ))}
        <p className="text-[12px] leading-relaxed text-ink-400">
          By creating an account you agree to this page and to the{" "}
          <a href={LEGAL_LINKS.privacy} className="font-bold text-tide-300 underline">
            privacy policy
          </a>
          . The account record stores which version you agreed to and when.
        </p>
      </div>
    </div>
  );
}
