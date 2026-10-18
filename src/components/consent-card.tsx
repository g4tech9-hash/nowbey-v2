"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LEGAL_LINKS, TERMS_VERSION } from "@/lib/legal";

/**
 * Asks an existing member to confirm the current wording, once.
 *
 * Members who joined before consent was recorded have `terms_version = NULL`; members who joined under an
 * older version have a stale one. Both are shown the same card, and only until they agree — the server writes
 * the version, so the record is never something the browser could have invented.
 */
export function ConsentCard({ acceptedVersion }: { acceptedVersion: string | null }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (acceptedVersion === TERMS_VERSION) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save that. Please try again.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that.");
      setBusy(false);
    }
  }

  return (
    <section className="mb-4 rounded-[18px] border border-sun-500/40 bg-sun-500/[.07] p-4">
      <h2 className="text-[14px] font-extrabold text-sand-100">
        {acceptedVersion ? "The terms have changed" : "Please confirm the terms"}
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">
        {acceptedVersion
          ? `You agreed to the terms as they were on ${acceptedVersion}. The current version is ${TERMS_VERSION}, and it says more about crash reports and who processes your data.`
          : `Your account was made before we started keeping a record of consent. The current version is ${TERMS_VERSION}.`}{" "}
        Nothing about your account changes until you agree.
      </p>
      <div className="mt-3 flex items-start gap-2.5">
        <input id="consent-card-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
        <label htmlFor="consent-card-agree" className="text-[12px] leading-relaxed text-ink-300">
          I agree to the{" "}
          <Link href={LEGAL_LINKS.terms} className="font-bold text-tide-300 underline">
            Terms
          </Link>{" "}
          and the{" "}
          <Link href={LEGAL_LINKS.privacy} className="font-bold text-tide-300 underline">
            Privacy Policy
          </Link>
          .
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!agreed || busy} onClick={() => void save()} className="nb-btn nb-btn-secondary">
          {busy ? "Saving…" : "Agree and save"}
        </button>
        <Link href="/you/settings#delete" className="text-[12px] text-ink-400 underline">
          I would rather delete my account
        </Link>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[12.5px] text-danger-500">
          {error}
        </p>
      ) : null}
    </section>
  );
}
