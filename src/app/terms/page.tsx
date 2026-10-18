import { PageHead } from "@/components/app-shell";
import { LegalSections, p, rows, ul, type LegalSection } from "@/components/legal-document";
import { LEGAL_EMAIL, LEGAL_UPDATED, REGISTERED_ADDRESS, REGISTERED_COMPANY_NAME } from "@/lib/legal";
import { EmergencyNotice } from "@/components/emergency-notice";

export const metadata = { title: "Terms of use" };

// Drafted for a Bahamian company and a Bahamian audience. Two things still need a Bahamian
// lawyer's eye before the app ships: fill in REGISTERED_COMPANY_NAME and REGISTERED_ADDRESS
// (see .env.example), and confirm the indemnity and jurisdiction clauses against the company's
// own registration and insurance.
const SECTIONS: LegalSection[] = [
  {
    h: "1. What NowBey is",
    blocks: [
      p(
        "NowBey is a community map and news wire for The Bahamas. Residents report hazards such as flooding, road blocks and outages, and neighbours confirm or clear them.",
      ),
      p(
        "NowBey is not an emergency service. In an emergency call 919 or 911. Reports come from the public, may be late, wrong or incomplete, and must not be relied on for safety decisions.",
      ),
    ],
  },
  {
    h: "2. Your account",
    blocks: [
      p(
        "You must be 13 or older to use NowBey. If you are under 18, a parent or legal guardian has to agree to these terms on your behalf before you use NowBey. By giving that agreement they are bound by these terms for you, and they are responsible for making sure you follow them. We may ask you for proof of that agreement before we let you continue.",
      ),
      p("Keep your password private. You are responsible for what is posted from your account."),
      p(
        "You can delete your account at any time from the You tab in the app, or from Account settings on the website.",
      ),
    ],
  },
  {
    h: "3. What you may post",
    blocks: [
      p("You may post accurate reports, comments and Island Life posts that you have the right to share."),
      p(
        "You may not post anything that is hateful, harassing, threatening, sexually explicit, violent, defamatory or illegal; anything that identifies or exposes a private person's home or whereabouts; spam or adverts; deliberately false or misleading reports; or other people's photos or writing without permission.",
      ),
      p(
        "There is no tolerance for objectionable content or abusive users. We may hide content and suspend or remove accounts without notice when these rules are broken.",
      ),
    ],
  },
  {
    h: "4. Reporting and blocking",
    blocks: [
      p(
        "Every report, comment and post has a Report option. Staff review reports and act on them, normally within 24 hours.",
      ),
      p("You can block a user from the app to stop seeing their content."),
    ],
  },
  {
    h: "5. Paid plans",
    blocks: [
      p(
        "Paid plans remove ads and add features. Prices are shown in US dollars before you buy. Plans renew until cancelled and can be cancelled at any time; a cancelled plan runs to the end of the period you paid for. Note: Payment features are currently in a limited beta and may not be available in all regions.",
      ),
      p(
        "Plans bought through the Apple App Store or Google Play are billed, managed and refunded by that store under its own terms.",
      ),
    ],
  },
  {
    h: "6. Our rights and your content",
    blocks: [
      p(
        "You keep ownership of what you post. You give NowBey a free licence to display it in the service, including on the map, in alerts and in the news wire, for as long as it is posted.",
      ),
      p(
        "The service is provided as is. To the fullest extent the law allows, NowBey is not liable for losses arising from reports or from the service being unavailable.",
      ),
    ],
  },
  {
    h: "7. Who runs NowBey",
    blocks: [
      p(`NowBey is operated by ${REGISTERED_COMPANY_NAME}, a company registered in The Bahamas.`),
      p(
        "We are the data controller for your personal information. That means we decide why NowBey collects your information, how it is used, and how it is looked after. Our Privacy Notice explains what that means day to day, and lists the rights you have over your information under the Data Protection (Privacy of Personal Information) Act of The Bahamas.",
      ),
      rows(
        { k: "Registered company name", v: REGISTERED_COMPANY_NAME },
        { k: "Physical address", v: REGISTERED_ADDRESS },
        { k: "Contact email", v: LEGAL_EMAIL },
        { k: "Data controller", v: REGISTERED_COMPANY_NAME },
      ),
    ],
  },
  {
    h: "8. Indemnity",
    blocks: [
      p(
        "You agree to defend, indemnify and hold harmless NowBey, our operators (including " +
          `${REGISTERED_COMPANY_NAME}), and our officers, employees, volunteers and agents from and against ` +
          "any claim, demand, loss, damage, cost or expense, including reasonable legal fees and court costs, that arises out of or is connected with:",
      ),
      ul(
        "anything you post, upload or send through NowBey, including reports, comments, photos and Island Life posts;",
        "any report, flag or complaint you submit, and anything we do in good faith in response to it;",
        "your breach of these terms, or your breaking of the law;",
        "your interfering with someone else's privacy, copyright or other rights;",
        "your account being used by someone else, where you have not taken reasonable steps to keep it safe.",
      ),
      p(
        "This does not apply to the extent a claim or loss is caused by our own fraud, wilful misconduct or gross negligence, or by our own failure to police content on the service. Nothing here takes away any right you have to complain to the Office of the Data Protection Commissioner of The Bahamas, or to report a crime.",
      ),
    ],
  },
  {
    h: "9. Governing law and jurisdiction",
    blocks: [
      p(
        "These terms are governed by the laws of the Commonwealth of The Bahamas. You and NowBey agree that the courts of The Bahamas have exclusive jurisdiction over any dispute that comes out of these terms or out of your use of NowBey.",
      ),
      p(
        "If you live outside The Bahamas, this clause still applies, except for any protection the law of where you live gives you that cannot be taken away by agreement.",
      ),
      p(
        "Please talk to us before you go to court. Most problems are sorted out faster by an email, and we would rather fix a problem than argue about it.",
      ),
    ],
  },
  {
    h: "10. Changes and contact",
    blocks: [
      p(
        "We may update these terms. Continuing to use NowBey after a change means you accept it. We will put the new date at the top of this page when we do.",
      ),
      p(`Questions, complaints, legal notices, or content you want removed: ${LEGAL_EMAIL}.`),
      p(`You can also write to us at ${REGISTERED_COMPANY_NAME}, ${REGISTERED_ADDRESS}.`),
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead eyebrow="Legal" title="Terms of use" blurb={`Last updated ${LEGAL_UPDATED}.`} />
      <div className="mb-4">
        <EmergencyNotice />
      </div>
      <LegalSections sections={SECTIONS} />
    </div>
  );
}
