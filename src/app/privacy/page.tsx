import { PageHead } from "@/components/app-shell";
import { LegalSections, p, rows, ul, type LegalSection } from "@/components/legal-document";
import { LEGAL_EMAIL, LEGAL_UPDATED, REGISTERED_ADDRESS, REGISTERED_COMPANY_NAME } from "@/lib/legal";

export const metadata = { title: "Privacy policy" };

// Drafted for a Bahamian company and a Bahamian audience. Before it ships: fill in
// REGISTERED_COMPANY_NAME and REGISTERED_ADDRESS (see .env.example), confirm the retention
// periods below against the hosting and database settings, and have a Bahamian lawyer check the
// rights list against the Data Protection (Privacy of Personal Information) Act.
const SECTIONS: LegalSection[] = [
  {
    h: "Who we are",
    blocks: [
      p(`NowBey is run by ${REGISTERED_COMPANY_NAME}, a company registered in The Bahamas.`),
      p(
        "We are the data controller for the personal information described in this policy. That means we decide why your information is collected, how it is used, and how it is looked after. We handle it in line with the Data Protection (Privacy of Personal Information) Act of The Bahamas, and we are supervised by the Office of the Data Protection Commissioner of The Bahamas. Where new data protection law comes into force in The Bahamas, we will update this policy to match it.",
      ),
      p(
        "This policy explains what we collect, why we collect it, who sees it, how long we keep it, and what you can ask us to do about it.",
      ),
      rows(
        { k: "Registered company name", v: REGISTERED_COMPANY_NAME },
        { k: "Physical address", v: REGISTERED_ADDRESS },
        { k: "Contact email", v: LEGAL_EMAIL },
        { k: "Data controller", v: REGISTERED_COMPANY_NAME },
        { k: "Supervised by", v: "Office of the Data Protection Commissioner of The Bahamas" },
      ),
    ],
  },
  {
    h: "What we collect",
    blocks: [
      p("Account: your handle, display name, email address, home island and a scrambled (hashed) password."),
      p(
        "Content you post: reports with the exact location you choose, comments, Island Life posts and photos, and your email-alert settings.",
      ),
      p(
        "Location: the app asks for your phone's location only when you tap Use my location while reporting, to place the pin. We do not track you in the background.",
      ),
      p(
        "Technical: your IP address is used to limit abuse and to keep the service safe. For visitors without an account it is stored only as a one-way hash, so one person cannot vote twice. Our web host also keeps ordinary server logs, which record the page you loaded and the IP address the request came from.",
      ),
      p(
        "Payments: Card payments on the website are handled by Stripe. We do not see or store your card number. Purchases through the App Store or Google Play are handled by Apple or Google.",
      ),
    ],
  },
  {
    h: "How we use it",
    blocks: [
      p(
        "To run the map and news wire, show your reports (with your handle unless you post anonymously), send the alert emails you ask for, keep the service safe, and manage paid plans.",
      ),
      p(
        "We do not sell your personal information and we do not use it for advertising by other companies. Ads shown are our own house ads.",
      ),
    ],
  },
  {
    h: "Who sees it",
    blocks: [
      p("Reports, comments and posts are public. Anyone can see them and the location you pinned."),
      p(
        "Service providers who help us run NowBey: our hosting and database provider, Google (sign in, maps and push notifications), Apple (App Store purchases), Resend (email) and Stripe (payments). They may only use your data to provide those services, and they are bound by contract to keep it safe.",
      ),
      p("We may share information when the law requires it, or to protect people from harm."),
    ],
  },
  {
    h: "Information that leaves The Bahamas",
    blocks: [
      p(
        "Some of the services we rely on run outside The Bahamas, so some of your information is processed in other countries. That includes Stripe (payments), Google (sign in, maps and push notifications), Apple (App Store purchases) and Resend (the emails we send you). Their servers sit in the United States and other countries, and their own privacy policies apply to them.",
      ),
      p(
        "Before your information leaves The Bahamas we put a contract in place with each provider. That contract gives your information the same protection it has here, which is what the Act requires before personal data is sent out of the country.",
      ),
      p(
        "By making an account and using NowBey, you consent to your information being processed outside The Bahamas, including in the United States. If you would rather we did not do that, you can ask us for a copy of your information or close your account — see Your rights below.",
      ),
    ],
  },
  {
    h: "How long we keep it",
    blocks: [
      p(
        "Account details: your handle, email address, home island and hashed password are kept for as long as your account is open. When you delete your account they go straight away, along with your comments, Island Life posts, photos and alert settings. Your reports stay on the map for the neighbours who confirmed them, with your name removed.",
      ),
      p(
        "IP addresses: we do not keep your raw IP address in our database. For visitors without an account we keep a one-way hash (SHA-256) of the address, mixed with a secret key held on our server. A hash cannot be turned back into an IP address. It is used to limit abuse and to make sure one person cannot vote twice. The rate-limit records that hold these hashes expire on their own, usually within a few hours, and are then deleted; any that somehow stay are wiped within 30 days.",
      ),
      p(
        "Server logs: our web host keeps access logs that include your IP address and the pages you loaded. We keep those logs for 30 days, after which our host deletes them. We do not use them for marketing.",
      ),
      p(
        "Reports, comments and posts: kept while they are live. Once a report is closed it is removed or anonymised within 12 months, unless we need to keep it longer to protect the service.",
      ),
      p(
        "Payment records: receipts and invoices are kept for 7 years, because tax law requires it. We never see or store your card number — Stripe keeps that under its own rules.",
      ),
      p("Backups: deleted information stays in our encrypted backups for up to 90 days, and then it is gone for good."),
    ],
  },
  {
    h: "Your rights",
    blocks: [
      p(
        "The Data Protection (Privacy of Personal Information) Act of The Bahamas gives you rights over your personal information. You have the right to:",
      ),
      ul(
        "ask us whether we hold information about you, and get a copy of it;",
        "ask us to correct anything that is wrong or out of date;",
        "ask us to erase your information, where the Act allows it;",
        "ask us to stop using your information, or to limit how we use it, where the Act allows it;",
        "change your mind and withdraw your consent, where we rely on consent;",
        "ask us to take you off any direct marketing list;",
        "complain to the Office of the Data Protection Commissioner of The Bahamas if you think we have mishandled your information.",
      ),
      p(
        `Send us a request at ${LEGAL_EMAIL}. We answer within 40 days, and free of charge. We will always try to fix the problem ourselves first, so please give us a chance.`,
      ),
      p(
        "If you are not happy with our answer, you can complain to the Office of the Data Protection Commissioner of The Bahamas (dataprotection.gov.bs).",
      ),
    ],
  },
  {
    h: "Your choices",
    blocks: [
      p(
        "You can delete your account in the app (You tab, Delete my account) or on the website (Account settings). Your reports stay for the neighbours who confirmed them, with your name removed. Your comments, Island Life posts, photos and alert settings are deleted.",
      ),
      p(
        "You can change your name, email and home island in Account settings, switch off location permission in your phone settings at any time, and ask us for a copy of your data, for us to correct it, or for us to stop using it.",
      ),
    ],
  },
  {
    h: "Keeping it safe, and children",
    blocks: [
      p("Passwords are hashed and traffic uses HTTPS. No system is perfectly secure."),
      p(
        "NowBey is not for children under 13 and we do not knowingly collect their information. A child aged 13 to 17 needs a parent or legal guardian to agree to our Terms of Use on their behalf before they can use NowBey.",
      ),
    ],
  },
  {
    h: "Contact",
    blocks: [
      p(`For privacy questions, access requests or complaints: ${LEGAL_EMAIL}.`),
      p(`You can also write to us at ${REGISTERED_COMPANY_NAME}, ${REGISTERED_ADDRESS}.`),
      p("We may update this policy and will change the date above when we do."),
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHead eyebrow="Legal" title="Privacy policy" blurb={`Last updated ${LEGAL_UPDATED}.`} />
      <LegalSections sections={SECTIONS} />
    </div>
  );
}
