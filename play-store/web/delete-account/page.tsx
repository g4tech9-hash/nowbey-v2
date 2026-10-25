/**
 * INSTALL: copy this file to  src/app/delete-account/page.tsx  in the website source, then deploy.
 * The public URL becomes https://nowbey-v2.vercel.app/delete-account  (later: nowbey.com/delete-account).
 * Paste that URL into Google Play Console -> App content -> Data safety -> "Delete account URL",
 * and keep the wording below in agreement with /privacy (what is deleted vs. anonymised-and-kept).
 * Written to compile standalone: it only uses next/link and the existing @/lib/legal constants.
 */
import Link from "next/link";
import { COPYRIGHT_NOTICE, LEGAL_ENTITY, SUPPORT_EMAIL, TRADEMARK_NOTICE } from "@/lib/legal";

export const metadata = { title: "Delete your account · NowBey" };

export default function DeleteAccountPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px", lineHeight: 1.6 }}>
      <h1>Delete your NowBey account</h1>
      <p>
        NowBey is operated by {LEGAL_ENTITY}. You can delete your account at any time — you do not need to
        give a reason, and you do not need the app installed to ask.
      </p>

      <h2>Fastest: inside the app</h2>
      <ol>
        <li>Open NowBey and go to the <strong>You</strong> tab.</li>
        <li>Choose <strong>Delete my account</strong>.</li>
        <li>Enter your password to confirm. The deletion takes effect immediately and cannot be undone.</li>
      </ol>

      <h2>On the website</h2>
      <p>
        Sign in and open <Link href="/you/settings">Account settings</Link>, then choose the delete option
        there.
      </p>

      <h2>By email (no app needed)</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
        <strong>from the email address on your account</strong>, with the subject “Delete my account” and
        your handle in the message. Sending it from the account email is how we know the request is really
        yours. We complete email requests within 30 days and confirm by reply.
      </p>

      <h2>What is deleted, and what stays</h2>
      <ul>
        <li>
          <strong>Deleted:</strong> your account and password, handle, display name, email address, home
          island, comments, Island Life posts and photos, email-alert settings and push tokens.
        </li>
        <li>
          <strong>Kept, with your name removed:</strong> hazard reports you filed stay on the map for the
          neighbours who confirmed and rely on them, shown without your name or handle. Aggregated,
          anonymous statistics may also be retained.
        </li>
        <li>
          <strong>Paid plans:</strong> deleting your account does not cancel a paid plan by itself. Cancel
          it first wherever you bought it (for example, on this website or in Google Play / the App Store).
        </li>
      </ul>

      <h2>Just want your data, or a break?</h2>
      <p>
        Email {SUPPORT_EMAIL} to ask for a copy of your data, or simply switch alerts off in Account
        settings. Our <Link href="/privacy">privacy policy</Link> explains what we hold and why.
      </p>

      <p style={{ marginTop: 48, fontSize: 14, opacity: 0.75 }}>
        {TRADEMARK_NOTICE} {COPYRIGHT_NOTICE}
      </p>
    </main>
  );
}
