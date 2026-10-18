import { PageHead } from "@/components/app-shell";
import { LEGAL_LINKS, LEGAL_UPDATED, SUPPORT_EMAIL, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Privacy policy" };

/**
 * Written from the code, not from a template.
 *
 * The previous version was accurate about the obvious things and silent about the three that matter most to
 * someone reading it: the crash reporter, the funnel counter, and who can read a report's location. It also
 * carried a placeholder comment, promised "Resend" as the only mail provider, and left out that the app
 * runs on US infrastructure. Each section below names a real table or route in this repository.
 *
 * If you add a tracker, a processor or a new field that identifies a person, add it here in the same commit.
 * `TERMS_VERSION` on the account record is what makes "you agreed to this version" true.
 */

type Row = { what: string; why: string; where: string };

const COLLECTED: Row[] = [
  {
    what: "Handle, display name, email address, home island, a salted hash of your password (never the password itself).",
    why: "To open and secure your account, and to put a name on what you post — or keep it off, if you post anonymously.",
    where: "users table",
  },
  {
    what: "The exact spot you drop a pin on, the street name and the island.",
    why: "To show the hazard to neighbours. The published pin is offset by 30–60 metres by design, and the house number is removed from the street address.",
    where: "incidents table (public), no location history",
  },
  {
    what: "Your reports, comments, reactions, Island Life posts, photos and alert settings.",
    why: "To run the map, the news wire and the alerts you asked for.",
    where: "incidents, incident_updates, posts, comments, alert_subscriptions",
  },
  {
    what: "Your IP address, turned into a one-way hash, plus a counter of recent requests.",
    why: "To stop one person flooding the map, and to stop a stranger guessing your password. The hash cannot be turned back into the address.",
    where: "rate_limits (deleted hourly), funnel_daily (counts only)",
  },
  {
    what: "A random session id in a cookie, and a random device key for rate limits.",
    why: "To keep you signed in, and to honour a block you set on a device before signing in.",
    where: "nowbey_session cookie, localStorage (nb_device_id)",
  },
  {
    what: "Crash reports: the error message, the page you were on, your device and app version, whether you are signed in (your handle if so), and the short trail of labels you tapped before the error.",
    why: "To find and fix breakage. A report about a failed tap is useless without knowing which tap.",
    where: "client_errors table",
  },
  {
    what: "Counters for five anonymous steps (a report started, a report published, and so on).",
    why: "To know whether the report flow is working, without profiling anybody. No identifier is stored with a count.",
    where: "funnel_daily table",
  },
  {
    what: "Card details, if you pay on the website.",
    why: "Handled entirely by Stripe. We receive a customer id and a subscription id, never a card number.",
    where: "Stripe; users.stripe_customer_id",
  },
];

const PROCESSORS = [
  ["Hosting and edge network", "Vercel Inc. (United States)", "Serves the site and runs the API."],
  ["Database", "Neon Inc. / PostgreSQL (United States)", "Stores accounts, reports and posts."],
  ["Email delivery", "Resend, or your own SMTP host", "Sends verification, reset and alert emails."],
  ["Payments", "Stripe, Inc. (United States)", "Website subscriptions and invoices."],
  ["App distribution", "Apple, Google", "Delivers the apps and handles in-app purchases."],
  ["Crash diagnosis (optional)", "Google Gemini API", "Reads crash reports already stored in our database to suggest a cause. Turned off unless GEMINI_API_KEY is set."],
] as const;

export default function PrivacyPage() {
  const contact = SUPPORT_EMAIL
    ? `Email ${SUPPORT_EMAIL}.`
    : "Use the contact details on our app store listing; the address is printed in the app's Support screen.";

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHead
        eyebrow="Legal"
        title="Privacy policy"
        blurb={`Last updated ${LEGAL_UPDATED}. This version is ${TERMS_VERSION}. It describes what the code in this product actually does.`}
      />

      <div className="glass space-y-6 rounded-2xl p-5">
        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">The short version</h2>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-300">
            <li>• We do not sell your data, and we do not run advertising networks. The only ads are our own.</li>
            <li>• Your reports are public. Your email address is not, and is never shown to another member.</li>
            <li>• The pin you see on the map is deliberately offset by 30–60 m, and the house number is dropped.</li>
            <li>• You can delete your account from the app or the website, and you can ask us for a copy of your data.</li>
            <li>• We collect crash reports and five anonymous counters. You can read exactly what is in them below.</li>
          </ul>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">What we collect, why, and where it lives</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12px] leading-relaxed sm:text-[12.5px]">
              <thead>
                <tr className="text-ink-200">
                  <th scope="col" className="border-b hairline py-1.5 pr-3 font-bold">What</th>
                  <th scope="col" className="border-b hairline py-1.5 pr-3 font-bold">Why</th>
                  <th scope="col" className="border-b hairline py-1.5 font-bold">Where</th>
                </tr>
              </thead>
              <tbody>
                {COLLECTED.map((r) => (
                  <tr key={r.where} className="align-top">
                    <td className="border-b hairline py-2 pr-2 text-ink-300 break-words sm:pr-3">{r.what}</td>
                    <td className="border-b hairline py-2 pr-2 text-ink-300 break-words sm:pr-3">{r.why}</td>
                    <td className="border-b hairline py-2 font-mono text-[11px] text-ink-400 break-all">{r.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
            We do not collect your contacts, your photo library, your advertising id, or your location in the background. The
            app asks for location only while you are dropping a pin.
          </p>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Cookies and storage on your device</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
            NowBey sets no advertising or analytics cookies and no third-party tracking pixels. What it stores is small, and
            each item has a job:
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-300">
            <li>
              <strong className="text-sand-100">nowbey_session</strong> — a signed, HTTP-only cookie that keeps you signed in.
              Removed when you sign out or delete your account.
            </li>
            <li>
              <strong className="text-sand-100">nb_mode, nb_simple, nb_text</strong> — your display choices (light or dark,
              simple view, text size). Kept on your device only.
            </li>
            <li>
              <strong className="text-sand-100">nb_report_draft_v1</strong> — a half-written report, so a refresh does not
              lose it. Deleted when you publish, and ignored after 24 hours. It stays on your device.
            </li>
            <li>
              <strong className="text-sand-100">nb_device_id</strong> — a random key so a block you set applies before you
              sign in. Not linked to your identity, and not sent to anyone else.
            </li>
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
            Because none of these track you across other sites, they do not require a consent banner. The{" "}
            <a className="font-bold text-tide-300 underline" href={LEGAL_LINKS.storage}>
              storage page
            </a>{" "}
            lists them with their lifetimes, and a button clears everything that is not your sign-in.
          </p>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Who processes it for us</h2>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-300">
            {PROCESSORS.map(([role, who, what]) => (
              <li key={role}>
                <strong className="text-sand-100">{role}:</strong> {who}. {what}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
            Our servers and database are in the United States. If you are in The Bahamas, your data is transferred there to
            run the service. Each processor is bound by contract to use it only for that purpose. We do not share your
            information with anyone else except where the law requires it, or to prevent serious harm.
          </p>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">How long we keep it</h2>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-300">
            <li>Account details: while the account exists, then deleted within 30 days of a deletion request.</li>
            <li>Reports: kept after you delete your account, with your handle replaced by “former member”, because other people confirmed them and a vanished pin makes the map lie.</li>
            <li>Comments, reactions, Island Life posts and photos: deleted with the account.</li>
            <li>Crash reports: 90 days, then deleted automatically.</li>
            <li>Rate-limit counters: minutes to an hour. The funnel counts are totals by day and never identify anyone.</li>
            <li>Email log (address, subject, delivery status): 30 days, so support can prove an email was sent.</li>
          </ul>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Your rights</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
            Under The Bahamas Data Protection Act 2003, and the data-protection rules that apply wherever you live, you can ask
            to see the information we hold about you, have it corrected, have it deleted, or object to a particular use. You
            do not need a reason, and it costs nothing.
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-300">
            <li>
              <strong className="text-sand-100">Deletion</strong> is self-service: Account settings → Delete my account. If you
              opened the account with Google, the page emails you a one-time confirmation link instead of asking for a
              password you never had.
            </li>
            <li>
              <strong className="text-sand-100">Access or correction:</strong> {contact} We answer within 30 days.
            </li>
            <li>
              <strong className="text-sand-100">Complaints:</strong> tell us first — most things are fixable in a day. You can
              also complain to the Office of the Data Protection Commissioner for The Bahamas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Children</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
            NowBey is not for children under 13, and we do not knowingly collect their information. If you believe a child
            has created an account, tell us and we will remove it.
          </p>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Security, and the limits of it</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
            Passwords are hashed with a slow, salted algorithm; traffic uses HTTPS; the session cookie cannot be read by
            JavaScript. No system is perfectly secure. If a breach affects your information, we will tell you what was
            involved and what to do.
          </p>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Changes</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
            When this policy changes we update the date and version at the top. If the change is significant — a new
            category of data, or a new processor — we ask you to agree again the next time you sign in, and the account
            record shows which version you agreed to and when.
          </p>
        </section>

        <section>
          <h2 className="display text-[16px] font-extrabold text-sand-100">Contact</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
            NowBey, Nassau, The Bahamas. {contact} For content you want removed, use the Report button on the item itself —
            that reaches a moderator faster than email.
          </p>
        </section>
      </div>
    </div>
  );
}
