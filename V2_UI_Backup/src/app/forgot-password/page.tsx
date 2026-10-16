"use client";

import { useState } from "react";
import Link from "next/link";
import { INPUT, LABEL } from "@/components/password-field";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[460px] py-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tide-400">Account help</p>
      <h1 className="display mt-1.5 text-[clamp(1.6rem,4vw,2.1rem)] font-extrabold leading-tight text-sand-100">Forgot your password?</h1>

      {sent ? (
        <div className="glass mt-4 rounded-2xl p-4">
          <p className="display text-[15px] font-bold text-sand-100">Check your email</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#a9cdc9]">
            If an account uses <strong className="text-sand-100">{email}</strong>, we have sent a link to choose a new password. It works for one hour.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#8fb9b6]">
            Nothing after a few minutes? Check your spam folder. If you never added an email to your account, ask a NowBey admin to help you back in.
          </p>
          <Link href="/login?mode=signin" className="mt-3 inline-block text-[12.5px] font-bold text-tide-300 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="glass mt-4 rounded-2xl p-4" noValidate>
          <p className="text-[13px] leading-relaxed text-[#a9cdc9]">Enter the email you signed up with and we will send you a link to choose a new password.</p>
          <label className="mt-3 block">
            <span className={LABEL}>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" className={`${INPUT} mt-1`} />
          </label>
          {error ? (
            <p role="alert" className="mt-3 rounded-lg bg-conch-500/15 px-2.5 py-2 text-[12.5px] text-conch-400">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || !email.trim()} className="mt-3 w-full rounded-xl bg-tide-500 py-2.5 text-[13.5px] font-extrabold text-abyss-950 disabled:opacity-50">
            {busy ? "Sending…" : "Send me a reset link"}
          </button>
          <p className="mt-3 text-center text-[12px]">
            <Link href="/login?mode=signin" className="font-bold text-tide-300 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
