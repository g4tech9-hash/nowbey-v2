import Link from "next/link";
import { PageHead } from "@/components/app-shell";
import { EmergencyStrip } from "@/components/emergency-notice";
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
    <div className="mx-auto max-w-[72ch]">
      <PageHead eyebrow="Legal" title="Privacy policy" blurb={`Last updated ${LEGAL_UPDATED}.`} />
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
        Questions about this policy? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-secondary underline">{SUPPORT_EMAIL}</a> or read the <Link href="/terms" className="font-bold text-secondary underline">terms of use</Link>.
      </p>
    </div>
  );
}
