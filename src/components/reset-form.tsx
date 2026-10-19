"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkPassword } from "@/lib/password";
import { PasswordField } from "@/components/password-field";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="glass mt-4 rounded-2xl p-4">
        <p className="text-[13px] text-secondary">This page needs the link from your email.</p>
        <Link href="/forgot-password" className="mt-2 inline-block text-[12.5px] font-bold text-text-accent hover:underline">
          Ask for a new link
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = checkPassword(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const res = await fetch("/api/account/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reset your password.");
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass mt-4 rounded-2xl p-4" noValidate>
      <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" meter hint="At least 8 characters." />
      <div className="mt-2.5">
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </div>
      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-danger-500/15 px-2.5 py-2 text-[12.5px] text-danger-500">
          {error}{" "}
          {/not valid/i.test(error) ? (
            <Link href="/forgot-password" className="font-bold underline">
              Ask for a new link
            </Link>
          ) : null}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="mt-3 w-full rounded-xl bg-accent py-2.5 text-[13.5px] font-extrabold text-on-accent disabled:opacity-50">
        {busy ? "Saving…" : "Save new password"}
      </button>
      <p className="mt-2 text-[11.5px] text-tertiary">Saving signs you out on every device, so you can sign in fresh.</p>
    </form>
  );
}
