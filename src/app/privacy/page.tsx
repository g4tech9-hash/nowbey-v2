import { PageHead } from "@/components/app-shell";
import { LEGAL_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Privacy policy" };

// TEMPLATE: written to match how NowBey works today. Have a Bahamian lawyer review it before you publish the apps.
const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "What we collect",
    p: [
      "Account: your handle, display name, email address, home island and a scrambled (hashed) password.",
      "Content you post: reports with the exact location you choose, comments, Island Life posts and photos, and your email-alert settings.",
      "Location: the app asks for your phone's location only when you tap Use my location while reporting, to place the pin. We do not track you in the background.",
      "Technical: your IP address is used to limit abuse. For visitors without an account it is stored only as a one-way hash so one person cannot vote twice.",
      "Payments: Card payments on the website are handled by Stripe. We do not see or store your card number. Purchases through the App Store or Google Play are handled by Apple or Google.",
    ],
  },
  {
    h: "How we use it",
    p: [
      "To run the map and news wire, show your reports (with your handle unless you post anonymously), send the alert emails you ask for, keep the service safe, and manage paid plans.",
      "We do not sell your personal information and we do not use it for advertising by other companies. Ads shown are our own house ads.",
    ],
  },
  {
    h: "Who sees it",
    p: [
      "Reports, comments and posts are public. Anyone can see them and the location you pinned.",
      "Service providers who help us run NowBey: our hosting and database provider, Resend (email) and Stripe (payments). They may only use your data to provide those services.",
      "We may share information when the law requires it, or to protect people from harm.",
    ],
  },
  {
    h: "Your choices",
    p: [
      "You can delete your account in the app (You tab, Delete my account) or on the website (Account settings). Your reports stay for the neighbours who confirmed them, with your name removed. Your comments, Island Life posts, photos and alert settings are deleted.",
      "You can change your name, email and home island in Account settings, switch off location permission in your phone settings at any time, and ask us for a copy of your data.",
    ],
  },
  {
    h: "Keeping it safe, and children",
    p: [
      "Passwords are hashed and traffic uses HTTPS. No system is perfectly secure.",
      "NowBey is not for children under 13 and we do not knowingly collect their information.",
    ],
  },
  {
    h: "Contact",
    p: [
      SUPPORT_EMAIL ? `For privacy questions or requests: ${SUPPORT_EMAIL}.` : "For privacy questions or requests, use the contact details on our app store listing.",
      "We may update this policy and will change the date above when we do.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead eyebrow="Legal" title="Privacy policy" blurb={`Last updated ${LEGAL_UPDATED}.`} />
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
      </div>
    </div>
  );
}
