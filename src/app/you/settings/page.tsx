import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DeleteAccount, EmailForm, PasswordForm, ProfileForm, ResendVerification, SignOutOthers } from "@/components/account-forms";
import { getViewer } from "@/lib/viewer";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { ButtonLink, Eyebrow, Panel, PanelHead, TextLink } from "@/components/ui";
import { ConsentCard } from "@/components/consent-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account settings" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SECTIONS = [
  { id: "easier", label: "Make NowBey easier to use" },
  { id: "profile", label: "Profile" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "devices", label: "Devices" },
  { id: "plan", label: "Your plan" },
  { id: "delete", label: "Delete account" },
] as const;

function Section({ id, title, blurb, children }: { id: string; title: string; blurb?: string; children: ReactNode }) {
  return (
    <Panel id={id} className="scroll-mt-28 rounded-[20px] p-4 sm:p-5">
      <PanelHead title={title} blurb={blurb} />
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.handle) redirect("/login?mode=signin&next=/you/settings");
  const sp = await searchParams;
  const verified = first(sp.verified);

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-7">
        <Eyebrow>@{viewer.handle}</Eyebrow>
        <h1 className="display mt-2.5 text-[clamp(1.75rem,4.6vw,2.55rem)] font-extrabold leading-[1.04] tracking-[-0.055em] text-sand-100">
          Account settings
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/you" variant="ghost" size="sm">
            ← Back to your account
          </ButtonLink>
          <ButtonLink href="/you/profile" variant="ghost" size="sm">
            Public profile
          </ButtonLink>
        </div>
      </div>

      {verified === "1" ? (
        <p className="mb-4 rounded-[14px] border border-ok-500/40 bg-ok-500/10 px-4 py-3 text-[12.5px] text-ok-600">
          Email confirmed. Thank you.
        </p>
      ) : null}
      {verified === "0" ? (
        <p className="mb-4 rounded-[14px] border border-conch-500/40 bg-conch-500/10 px-4 py-3 text-[12.5px] text-conch-500">
          That confirmation link has expired or was already used. Send a new one below.
        </p>
      ) : null}

      {/* Accounts made before consent was recorded, or before the wording changed, get asked once — on this
          page, where the rest of their account lives, rather than in a blocking modal they would dismiss. */}
      <ConsentCard acceptedVersion={viewer.termsVersion} />

      {/* Settings workspace: a sticky index on desktop, stacked panels below. */}
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-[100px] lg:self-start">
          <p className="nb-eyebrow mb-3">On this page</p>
          <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="nb-chip whitespace-nowrap lg:w-full lg:justify-start lg:rounded-[12px]"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <Section
            id="easier"
            title="Make NowBey easier to use"
            blurb="These choices stay on this device and take effect immediately. Simple view is designed for larger text and clearer controls."
          >
            <AccessibilityControls />
          </Section>

          <Section
            id="profile"
            title="Profile"
            blurb="Your handle is shown on your reports and cannot be changed, so nobody can pass themselves off as you."
          >
            <ProfileForm displayName={viewer.displayName ?? viewer.handle} parish={viewer.parish} />
          </Section>

          <Section
            id="email"
            title="Email"
            blurb="We use it to help you back in if you forget your password, and to confirm things like alert sign-ups."
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {viewer.email ? (
                <>
                  <span className="num rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[12px] font-semibold text-sand-100">
                    {viewer.email}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.08em] ${
                      viewer.emailVerified ? "border border-tide-500/35 bg-tide-500/12 text-tide-300" : "border border-sun-500/35 bg-sun-500/12 text-sun-600"
                    }`}
                  >
                    {viewer.emailVerified ? "Confirmed" : "Not confirmed yet"}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-sun-600">
                  No email on this account, so a forgotten password could not be reset by email.
                </span>
              )}
            </div>
            {viewer.email && !viewer.emailVerified ? (
              <div className="mb-4">
                <ResendVerification />
              </div>
            ) : null}
            <EmailForm current={viewer.email} handle={viewer.handle} />
          </Section>

          <Section id="password" title="Password" blurb="Changing it signs out your other devices. You stay signed in here.">
            <PasswordForm handle={viewer.handle} email={viewer.email} />
          </Section>

          <Section id="devices" title="Devices" blurb="Lost a phone, or used a shared computer? Sign out everywhere else with one tap.">
            <SignOutOthers />
          </Section>

          <Section id="plan" title="Your plan">
            <p className="text-[12.5px] leading-[1.75] text-ink-300">
              Plans and billing live on your{" "}
              <TextLink href="/you">account page</TextLink>.
            </p>
          </Section>

          <Section id="delete" title="Delete account">
            <DeleteAccount hasPaidPlan={viewer.hasSubscription} hasPassword={viewer.hasPassword} />
          </Section>
        </div>
      </div>
    </div>
  );
}
