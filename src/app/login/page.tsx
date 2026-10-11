"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PARISHES } from "@/lib/geo";
import { checkPassword } from "@/lib/password";
import { INPUT, LABEL, PasswordField } from "@/components/password-field";

export const dynamic = "force-dynamic";

type HandleState = { kind: "idle" } | { kind: "checking" } | { kind: "ok" } | { kind: "bad"; reason: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  // The address can ask for the sign-in tab (and carry a message from an email link), so read it up front.
  const [mode, setMode] = useState<"signin" | "signup">(() => (params.get("mode") === "signin" || params.get("reset") === "1" || params.get("verified") ? "signin" : "signup"));
  const resetFlag = params.get("reset");
  const verifiedFlag = params.get("verified");
  const banner: { ok: boolean; text: string } | null =
    resetFlag === "1"
      ? { ok: true, text: "Your password was changed. Sign in with the new one." }
      : verifiedFlag === "1"
        ? { ok: true, text: "Email confirmed. Sign in to continue." }
        : verifiedFlag === "0"
          ? { ok: false, text: "That confirmation link has expired or was already used. Sign in and ask for a new one in your account settings." }
          : null;
  const [ident, setIdent] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [parish, setParish] = useState<string>("New Providence");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleResult, setHandleResult] = useState<{ handle: string; state: HandleState } | null>(null);

  // Tell people a handle is taken while they are still typing. The answer is kept together with the handle it belongs
  // to, so a stale answer is never shown for a newer handle.
  const checkable = mode === "signup" && handle.length >= 3;
  const handleState: HandleState = !checkable ? { kind: "idle" } : handleResult?.handle === handle ? handleResult.state : { kind: "checking" };

  useEffect(() => {
    if (!checkable) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/account/handle?h=${encodeURIComponent(handle)}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setHandleResult({ handle, state: data.available ? { kind: "ok" } : { kind: "bad", reason: data.reason ?? "That handle cannot be used." } });
      } catch {
        if (alive) setHandleResult({ handle, state: { kind: "idle" } });
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [handle, checkable]);

  function destination(created: boolean): string {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) return next;
    return created ? "/you?welcome=1" : "/you";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (handleState.kind === "bad") return setError(handleState.reason);
      if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address. It is how we help you if you forget your password.");
      const problem = checkPassword(password, { handle, email });
      if (problem) return setError(problem);
      if (password !== confirm) return setError("The two passwords do not match.");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { intent: "signup", handle, email: email.trim(), displayName, parish, password }
            : { intent: "signin", handle: ident, password },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh();
      router.push(destination(Boolean(data.created)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[900px] gap-5 py-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tide-400">Your account</p>
        <h1 className="display mt-1.5 text-[clamp(1.7rem,4.4vw,2.4rem)] font-extrabold leading-[1.05] text-sand-100">
          {mode === "signup" ? "Join your neighbours on NowBey" : "Welcome back"}
        </h1>
        <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-[#a9cdc9]">
          You can read the map, confirm reports and file a pin without an account. An account puts your handle on the reports
          you file, keeps your alert settings, and brings your plan with you to any device.
        </p>
        <ul className="mt-3 space-y-1.5 text-[12.5px] text-[#8fb9b6]">
          <li className="flex gap-2">
            <span className="text-tide-400">→</span> Your email is only used for account help and the alerts you ask for.
          </li>
          <li className="flex gap-2">
            <span className="text-tide-400">→</span> Forget your password? We email you a link to choose a new one.
          </li>
          <li className="flex gap-2">
            <span className="text-tide-400">→</span> Delete your account any time. Your reports stay up, without your name.
          </li>
        </ul>
      </div>

      <form onSubmit={submit} className="glass h-fit rounded-2xl p-4" noValidate>
        <div className="mb-3 flex gap-1.5" role="tablist">
          {(["signup", "signin"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={mode === v}
              onClick={() => {
                setMode(v);
                setError(null);
              }}
              className={`flex-1 rounded-lg py-1.5 text-[12.5px] font-extrabold ${mode === v ? "bg-sand-100 text-abyss-950" : "bg-white/6 text-[#a9cdc9]"}`}
            >
              {v === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        {banner ? (
          <p className={`mb-3 rounded-lg px-2.5 py-2 text-[12px] ${banner.ok ? "bg-tide-500/12 text-tide-300" : "bg-conch-500/15 text-conch-400"}`}>{banner.text}</p>
        ) : null}

        {mode === "signin" ? (
          <>
            <label className="block">
              <span className={LABEL}>Handle or email</span>
              <input
                value={ident}
                onChange={(e) => setIdent(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                placeholder="your_handle or you@example.com"
                className={`${INPUT} mt-1`}
              />
            </label>
            <div className="mt-2.5">
              <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>
            <p className="mt-2 text-right text-[12px]">
              <Link href="/forgot-password" className="font-bold text-tide-300 hover:underline">
                Forgot your password?
              </Link>
            </p>
          </>
        ) : (
          <>
            <label className="block">
              <span className={LABEL}>Handle</span>
              <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 focus-within:border-tide-400">
                <span className="text-[13px] text-[#6e97a0]">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  autoComplete="username"
                  maxLength={18}
                  placeholder="village_road_jenny"
                  className="w-full bg-transparent px-1.5 py-2.5 text-[14px] outline-none"
                />
              </div>
              <p
                className={`mt-1 min-h-[16px] text-[11.5px] ${
                  handleState.kind === "ok" ? "text-tide-300" : handleState.kind === "bad" ? "text-conch-400" : "text-[#8fb9b6]"
                }`}
                aria-live="polite"
              >
                {handleState.kind === "ok"
                  ? "✓ Available"
                  : handleState.kind === "bad"
                    ? handleState.reason
                    : handleState.kind === "checking"
                      ? "Checking…"
                      : "3 to 18 letters, numbers or underscores. This is shown on your reports and cannot be changed later."}
              </p>
            </label>

            <label className="mt-2 block">
              <span className={LABEL}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`${INPUT} mt-1`}
              />
            </label>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className={LABEL}>Name (optional)</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" placeholder="Jenny S." className={`${INPUT} mt-1`} />
              </label>
              <label className="block">
                <span className={LABEL}>Home island</span>
                <select value={parish} onChange={(e) => setParish(e.target.value)} className={`${INPUT} mt-1`}>
                  {PARISHES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-2.5">
              <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" meter ctx={{ handle, email }} hint="At least 8 characters." />
            </div>
            <div className="mt-2.5">
              <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              {confirm && password !== confirm ? <p className="mt-1 text-[11.5px] text-conch-400">These do not match yet.</p> : null}
            </div>
          </>
        )}

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-conch-500/15 px-2.5 py-2 text-[12.5px] text-conch-400">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="mt-3 w-full rounded-xl bg-tide-500 py-2.5 text-[13.5px] font-extrabold text-abyss-950 disabled:opacity-50">
          {busy ? "Working…" : mode === "signup" ? "Create my account" : "Sign in"}
        </button>
        <p className="mt-2 text-[11px] text-[#6e97a0]">
          Just looking?{" "}
          <Link href="/map" className="font-bold text-tide-300 hover:underline">
            Open the map
          </Link>{" "}
          or{" "}
          <Link href="/report" className="font-bold text-tide-300 hover:underline">
            file a pin anonymously
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
