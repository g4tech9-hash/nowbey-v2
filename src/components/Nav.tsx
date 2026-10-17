"use client";

import { useReducer } from "react";
import { Icon } from "./Icon";
import { SITE } from "../content/site";
import { initialLandingState, landingReducer } from "../lib/landing-state";

/**
 * The top navigation.
 *
 * Sticky, glassy and short. On a phone it collapses to the mark, one action and a menu
 * button; from `md` up the links sit inline. The menu state lives in the shared landing
 * reducer, so opening the drawer and opening a FAQ answer can never disagree.
 */
export function Nav() {
  const [state, dispatch] = useReducer(landingReducer, initialLandingState);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="shell pt-3">
        <div className="glass flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
          <a href="#top" className="focus-ring flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/30">
              <Icon name="map-pin" className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[0.95rem] text-mist-50">{SITE.brand.name}</span>
              <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                {SITE.brand.tagline}
              </span>
            </span>
          </a>

          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {SITE.nav.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="focus-ring rounded-lg px-3 py-2 text-sm text-mist-300 transition-colors hover:bg-mist-800/60 hover:text-mist-50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={SITE.nav.action.href}
              className="focus-ring hidden items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-brand-400 sm:inline-flex"
            >
              {SITE.nav.action.label}
              <Icon name="arrow-up-right" className="h-4 w-4" strokeWidth={2} />
            </a>
            <button
              type="button"
              onClick={() => dispatch({ type: "set-menu", open: !state.menuOpen })}
              aria-expanded={state.menuOpen}
              aria-controls="landing-menu"
              aria-label={state.menuOpen ? "Close the menu" : "Open the menu"}
              className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-mist-800 bg-mist-900/60 text-mist-200 md:hidden"
            >
              <Icon name={state.menuOpen ? "x" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {state.menuOpen ? (
          <div id="landing-menu" className="glass mt-2 rounded-2xl p-3 md:hidden">
            <nav aria-label="Sections" className="grid gap-1">
              {SITE.nav.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => dispatch({ type: "set-menu", open: false })}
                  className="focus-ring rounded-lg px-3 py-2.5 text-sm text-mist-200 hover:bg-mist-800/60 hover:text-mist-50"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={SITE.nav.action.href}
                onClick={() => dispatch({ type: "set-menu", open: false })}
                className="focus-ring mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-ink-950"
              >
                {SITE.nav.action.label}
                <Icon name="arrow-up-right" className="h-4 w-4" strokeWidth={2} />
              </a>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default Nav;
