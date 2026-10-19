import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DeleteAccount, EmailForm, PasswordForm, ProfileForm, ResendVerification, SignOutOthers } from "@/components/account-forms";
import { getViewer } from "@/lib/viewer";
import { AccessibilityControls } from "@/components/accessibility-controls";
import { ButtonLink, Eyebrow, Panel, PanelHead, TextLink } from "@/components/ui";
import { AccessibilityPicker, LiveModeToggle, ThemePicker } from "@/ui/pulse/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account settings" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SECTIONS = [
  { id: "appearance", label: "Theme & motion" },
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
        <h1 className="pulse-intro-heading mt-2.5">Account settings</h1>
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
        <p className="pulse-callout mb-4" data-tone="success">
          Email confirmed. Thank you.
        </p>
      ) : null}
      {verified === "0" ? (
        <p className="pulse-callout mb-4" data-tone="warning">
          That confirmation link has expired or was already used. Send a new one below.
        </p>
      ) : null}

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
                  aria-label={`Jump to ${s.label}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <Section
            id="appearance"
            title="Theme, motion and live updates"
            blurb="Brightness is not a colour flip: the dark theme is true black with glowing teal and coral, the light theme is warm sand with its own per-category hues. Both are authored for contrast, and both are the same app."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <ThemePicker />
              </div>
              <div>
                <AccessibilityPicker />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-default bg-hover px-3.5 py-3">
              <div>
                <p className="text-[13px] font-bold text-primary">Live mode</p>
                <p className="nb-hint">
                  When the feed moves by itself. Off means you refresh when you want to.
                </p>
              </div>
              <LiveModeToggle />
            </div>
            <p className="nb-hint mt-3">
              Nothing here is uploaded. The choices are written to this browser, they are read again before the page paints
              (so there is no flash of the wrong theme), and they survive signing in and out. Press{" "}
              <kbd className="pulse-kbd">⌘</kbd> <kbd className="pulse-kbd">K</kbd> anywhere to jump between islands,
              categories and these settings.
            </p>
          </Section>

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
                  <span className="num rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[12px] font-semibold text-primary">
                    {viewer.email}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.08em] ${
                      viewer.emailVerified ? "border border-accent/35 bg-accent/12 text-text-accent" : "border border-warn-500/35 bg-warn-500/12 text-warn-600"
                    }`}
                  >
                    {viewer.emailVerified ? "Confirmed" : "Not confirmed yet"}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-warn-600">
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
            <p className="text-[12.5px] leading-[1.75] text-tertiary">
              Plans and billing live on your{" "}
              <TextLink href="/you">account page</TextLink>.
            </p>
          </Section>

          <Section id="delete" title="Delete account">
            <DeleteAccount hasPaidPlan={viewer.hasSubscription} />
          </Section>
        </div>
      </div>
    </div>
  );
}
