import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/app-shell";
import { DeleteAccount, EmailForm, PasswordForm, ProfileForm, ResendVerification, SignOutOthers } from "@/components/account-forms";
import { getViewer } from "@/lib/viewer";
import { AccessibilityControls } from "@/components/accessibility-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account settings" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function Section({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section className="nb-surface rounded-xl2 p-4">
      <p className="display text-[15px] font-extrabold text-sand-100">{title}</p>
      {blurb ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">{blurb}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.handle) redirect("/login?mode=signin&next=/you/settings");
  const sp = await searchParams;
  const verified = first(sp.verified);

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <PageHead eyebrow={`@${viewer.handle}`} title="Account settings" />

      {verified === "1" ? <p className="rounded-xl border border-tide-400/40 bg-tide-500/10 px-4 py-3 text-[13px] text-tide-300">Email confirmed. Thank you.</p> : null}
      {verified === "0" ? (
        <p className="rounded-xl bg-danger-500/15 px-4 py-3 text-[13px] text-danger-500">That confirmation link has expired or was already used. Send a new one below.</p>
      ) : null}

      <Section title="Make NowBey easier to use" blurb="These choices stay on this device and take effect immediately. Simple view is designed for larger text and clearer controls.">
        <AccessibilityControls />
      </Section>

      <Section title="Profile" blurb="Your handle is shown on your reports and cannot be changed, so nobody can pass themselves off as you.">
        <ProfileForm displayName={viewer.displayName ?? viewer.handle} parish={viewer.parish} />
      </Section>

      <Section title="Email" blurb="We use it to help you back in if you forget your password, and to confirm things like alert sign-ups.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {viewer.email ? (
            <>
              <span className="font-mono text-[12.5px] text-sand-100">{viewer.email}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${
                  viewer.emailVerified ? "bg-tide-500/18 text-tide-300" : "bg-sun-500/15 text-sun-600"
                }`}
              >
                {viewer.emailVerified ? "Confirmed" : "Not confirmed yet"}
              </span>
            </>
          ) : (
            <span className="text-[12.5px] text-sun-600">No email on this account, so a forgotten password could not be reset by email.</span>
          )}
        </div>
        {viewer.email && !viewer.emailVerified ? (
          <div className="mb-4">
            <ResendVerification />
          </div>
        ) : null}
        <EmailForm current={viewer.email} handle={viewer.handle} />
      </Section>

      <Section title="Password" blurb="Changing it signs out your other devices. You stay signed in here.">
        <PasswordForm handle={viewer.handle} email={viewer.email} />
      </Section>

      <Section title="Devices" blurb="Lost a phone, or used a shared computer? Sign out everywhere else with one tap.">
        <SignOutOthers />
      </Section>

      <Section title="Your plan">
        <p className="text-[12.5px] text-ink-300">
          Plans and billing live on your{" "}
          <Link href="/you" className="font-bold text-tide-300 underline">
            account page
          </Link>
          .
        </p>
      </Section>

      <Section title="Delete account">
        <DeleteAccount hasPaidPlan={viewer.hasSubscription} />
      </Section>
    </div>
  );
}
