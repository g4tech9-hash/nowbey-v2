"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARISHES } from "@/lib/geo";
import { checkPassword } from "@/lib/password";
import { INPUT, LABEL, PasswordField } from "@/components/password-field";
import { Modal } from "@/components/ui";

type Msg = { ok: boolean; text: string } | null;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`mt-2.5 rounded-lg px-2.5 py-2 text-[12.5px] ${msg.ok ? "bg-tide-500/12 text-tide-300" : "bg-danger-500/15 text-danger-500"}`}>
      {msg.text}
    </p>
  );
}

const SAVE = "rounded-xl bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950 disabled:opacity-50";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function ProfileForm({ displayName, parish }: { displayName: string; parish: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [island, setIsland] = useState(parish ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await send("/api/account", "PATCH", { displayName: name, parish: island });
          setMsg({ ok: true, text: "Saved." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={`${INPUT} mt-1`} />
        </label>
        <label className="block">
          <span className={LABEL}>Home island</span>
          <select value={island} onChange={(e) => setIsland(e.target.value)} className={`${INPUT} mt-1`}>
            <option value="">Not set</option>
            {PARISHES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" disabled={busy || name.trim().length < 2} className={`${SAVE} mt-3`}>
        {busy ? "Saving…" : "Save"}
      </button>
      <Note msg={msg} />
    </form>
  );
}

export function ResendVerification() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const data = await send("/api/account/verify", "POST");
            if (data.already) setMsg({ ok: true, text: "Your email is already confirmed." });
            else if (data.mail === "sent") setMsg({ ok: true, text: "Sent. Check your inbox, and your spam folder." });
            else setMsg({ ok: false, text: "We could not send email from this server just now. Try again later, or ask a NowBey admin to confirm it." });
          } catch (err) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not send it." });
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full bg-sand-100 px-3.5 py-1.5 text-[12px] font-extrabold text-abyss-950 hover:bg-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send the confirmation email again"}
      </button>
      <Note msg={msg} />
    </div>
  );
}

export function EmailForm({ current, handle }: { current: string | null; handle: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const data = await send("/api/account/email", "POST", { email, password });
          setMsg({
            ok: true,
            text: data.mail === "sent" ? `Saved. We sent a confirmation link to ${email.trim().toLowerCase()}.` : "Saved. We could not send the confirmation email just now, so you can resend it above.",
          });
          setEmail("");
          setPassword("");
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change it." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className={LABEL}>{current ? "New email address" : "Email address"}</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" className={`${INPUT} mt-1`} />
      </label>
      <div className="mt-2.5">
        <PasswordField label={`Your password (to confirm it is you, @${handle})`} value={password} onChange={setPassword} autoComplete="current-password" />
      </div>
      <button type="submit" disabled={busy || !email.trim() || !password} className={`${SAVE} mt-3`}>
        {busy ? "Saving…" : current ? "Change email" : "Add email"}
      </button>
      <Note msg={msg} />
    </form>
  );
}

export function PasswordForm({ handle, email }: { handle: string; email: string | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        const problem = checkPassword(next, { handle, email: email ?? undefined });
        if (problem) return setMsg({ ok: false, text: problem });
        if (next !== confirm) return setMsg({ ok: false, text: "The two new passwords do not match." });
        setBusy(true);
        try {
          await send("/api/account/password", "POST", { current, next });
          setMsg({ ok: true, text: "Password changed. Your other devices have been signed out." });
          setCurrent("");
          setNext("");
          setConfirm("");
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change it." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <div className="mt-2.5">
        <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" meter ctx={{ handle, email: email ?? undefined }} hint="At least 8 characters." />
      </div>
      <div className="mt-2.5">
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </div>
      <button type="submit" disabled={busy || !current || !next} className={`${SAVE} mt-3`}>
        {busy ? "Saving…" : "Change password"}
      </button>
      <Note msg={msg} />
    </form>
  );
}

export function SignOutOthers() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            await send("/api/account/sessions", "DELETE");
            setMsg({ ok: true, text: "Done. Every other phone and browser has been signed out." });
          } catch (err) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not do that." });
          } finally {
            setBusy(false);
          }
        }}
        className="nb-btn nb-btn-secondary"
      >
        {busy ? "Signing out…" : "Sign out my other devices"}
      </button>
      <Note msg={msg} />
    </div>
  );
}

export function DeleteAccount({ hasPaidPlan }: { hasPaidPlan: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="nb-btn nb-btn-danger">
        Delete my account…
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="nb-btn nb-btn-secondary">
              Keep it
            </button>
            <button
              type="submit"
              form="nb-delete-account-form"
              disabled={busy || !password}
              className="nb-btn nb-btn-danger"
            >
              {busy ? "Deleting…" : "Yes, delete my account"}
            </button>
          </>
        }
      >
        <form
          id="nb-delete-account-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(null);
            try {
              await send("/api/account", "DELETE", { password });
              window.location.assign(new URL("/", window.location.origin).href);
            } catch (err) {
              setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not delete it." });
              setBusy(false);
            }
          }}
        >
          <p className="text-[13px] font-bold text-danger-500">This cannot be undone.</p>
          <p className="mt-2 text-[12.5px] leading-[1.75] text-ink-300">
            Your account, alert settings and sign-in are removed. Reports you filed stay on the map so neighbours who
            confirmed them are not left confused, but your name comes off them. Your Island Life posts and photos, and every
            comment and reaction you have left, are deleted.
            {hasPaidPlan ? " Cancel your paid plan from Manage billing first." : ""}
          </p>
          <div className="mt-3.5">
            <PasswordField label="Type your password to confirm" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          <Note msg={msg} />
        </form>
      </Modal>
    </>
  );
}
