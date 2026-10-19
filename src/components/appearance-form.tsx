"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODES, MODE_KEYS, SCENE_PHOTOS_PRESENT, THEMES, THEME_KEYS, type ModeKey, type ThemeKey } from "@/lib/themes";

type Props = { theme: ThemeKey; mode: ModeKey; splashPref: boolean; themeLocked: boolean; modeLocked: boolean; splashLocked: boolean };

export function AppearanceForm(props: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeKey>(props.theme);
  const [mode, setMode] = useState<ModeKey>(props.mode);
  const [splash, setSplash] = useState(props.splashPref);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = theme !== props.theme || mode !== props.mode || splash !== props.splashPref;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, mode, splash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that.");
      setMsg({ ok: true, text: `Saved. NowBey now uses the ${THEMES[theme].label} look in ${MODES[mode].label} mode.` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save that." });
    } finally {
      setBusy(false);
    }
  }

  function previewSplash() {
    try {
      sessionStorage.removeItem("nb_splash");
    } catch {
      /* nothing to clear */
    }
    window.location.assign(new URL("/", window.location.origin).href);
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Look</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {THEME_KEYS.map((key) => {
            const on = theme === key;
            return (
              <label
                key={key}
                className={`block cursor-pointer overflow-hidden rounded-2xl border transition ${on ? "border-accent-hover ring-1 ring-accent-hover/60" : "border-white/10 hover:border-white/25"} ${props.themeLocked ? "opacity-70" : ""}`}
              >
                <input type="radio" name="theme" value={key} checked={on} disabled={props.themeLocked} onChange={() => setTheme(key)} className="sr-only" />
                <div
                  className="h-28 w-full"
                  style={
                    key === "island" && SCENE_PHOTOS_PRESENT
                      ? { backgroundImage: "linear-gradient(180deg, rgba(3,18,27,.2), rgba(3,18,27,.75)), url(/scenes/aerial.jpg)", backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: "radial-gradient(500px 200px at 85% -10%, rgba(0,201,183,.25), transparent 60%), radial-gradient(400px 200px at 5% 0%, rgba(255,122,107,.16), transparent 55%), #03121b" }
                  }
                  aria-hidden="true"
                />
                <div className="p-3">
                  <p className="display flex items-center gap-2 text-[15px] font-extrabold text-primary">
                    {THEMES[key].label}
                    {on ? <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide text-text-accent">Selected</span> : null}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-tertiary">{THEMES[key].blurb}</p>
                </div>
              </label>
            );
          })}
        </div>
        {props.themeLocked ? (
          <p className="mt-2 text-[12px] text-warn-600">
            The look is fixed by <code className="rounded bg-white/10 px-1">NOWBEY_THEME</code> in the server settings. Remove that setting to choose it here.
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Brightness (default for new visitors)</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MODE_KEYS.map((key) => {
            const on = mode === key;
            return (
              <label
                key={key}
                className={`block cursor-pointer overflow-hidden rounded-2xl border transition ${on ? "border-accent-hover ring-1 ring-accent-hover/60" : "border-white/10 hover:border-white/25"} ${props.modeLocked ? "opacity-70" : ""}`}
              >
                <input type="radio" name="mode" value={key} checked={on} disabled={props.modeLocked} onChange={() => setMode(key)} className="sr-only" />
                <div
                  className="h-16 w-full"
                  style={key === "light" ? { background: "linear-gradient(180deg, #fdf9f0, #efe6d2)" } : { background: "radial-gradient(500px 200px at 85% -10%, rgba(0,201,183,.25), transparent 60%), #03121b" }}
                  aria-hidden="true"
                />
                <div className="p-3">
                  <p className="display flex items-center gap-2 text-[15px] font-extrabold text-primary">
                    {MODES[key].label}
                    {on ? <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide text-text-accent">Selected</span> : null}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-tertiary">{MODES[key].blurb}</p>
                </div>
              </label>
            );
          })}
        </div>
        {props.modeLocked ? (
          <p className="mt-2 text-[12px] text-warn-600">
            The brightness is fixed by <code className="rounded bg-white/10 px-1">NOWBEY_MODE</code> in the server settings. Remove that setting to choose it here.
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-tertiary">Visitors can still switch anytime with the sun/moon button in the header.</p>
        )}
      </fieldset>

      <div>
        <label className={`flex items-start gap-2.5 text-[13px] text-primary ${theme !== "island" || props.splashLocked ? "opacity-60" : ""}`}>
          <input
            type="checkbox"
            checked={splash}
            disabled={props.splashLocked}
            onChange={(e) => setSplash(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#14d1c0]"
          />
          <span>
            <span className="font-bold">Show the opening splash screen</span>
            <span className="block text-[12px] text-tertiary">
              A short welcome with the NowBey mark and tagline, once per visit. Visitors can tap to skip it.
              {theme !== "island" ? " It only appears in the Island look." : ""}
            </span>
          </span>
        </label>
        {props.splashLocked ? (
          <p className="mt-1.5 text-[12px] text-warn-600">
            The splash is fixed by <code className="rounded bg-white/10 px-1">NOWBEY_SPLASH</code> in the server settings.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={save} disabled={busy || !dirty} className="rounded-xl bg-accent px-5 py-2.5 text-[13.5px] font-extrabold text-on-accent hover:bg-accent-hover disabled:opacity-50">
          {busy ? "Saving…" : "Save appearance"}
        </button>
        <button
          type="button"
          onClick={previewSplash}
          disabled={props.theme !== "island" || !props.splashPref}
          className="rounded-xl border hairline px-4 py-2.5 text-[13px] font-bold text-primary hover:bg-white/8 disabled:opacity-40"
        >
          Preview the splash screen
        </button>
      </div>
      {msg ? (
        <p role="status" className={`rounded-lg px-3 py-2 text-[12.5px] ${msg.ok ? "bg-accent/12 text-text-accent" : "bg-danger-500/15 text-danger-500"}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
