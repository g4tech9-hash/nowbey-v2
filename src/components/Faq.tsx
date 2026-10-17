"use client";

import { useReducer } from "react";
import { Icon } from "./Icon";
import { SITE } from "../content/site";
import { initialLandingState, landingReducer } from "../lib/landing-state";

/**
 * The questions people actually ask, in the order they ask them.
 *
 * One answer is open at a time, and the state lives in the shared landing reducer, so the
 * accordion behaves the same on a phone as it does on a desktop.
 */
export function Faq() {
  const [state, dispatch] = useReducer(landingReducer, initialLandingState);

  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
      <div className="shell max-w-3xl">
        <div className="text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">Questions</p>
          <h2 className="mt-3 font-display text-3xl text-mist-50 sm:text-4xl">The things worth asking first</h2>
          <p className="mt-4 text-base leading-relaxed text-mist-300">
            If the answer is not here, the support page is one click away and a human reads it.
          </p>
        </div>

        <div className="mt-10 grid gap-3">
          {SITE.faqs.map((faq) => {
            const open = state.openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-mist-800 bg-mist-900/40"
              >
                <button
                  type="button"
                  onClick={() => dispatch({ type: "toggle-faq", id: faq.id })}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${faq.id}`}
                  className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-display text-base text-mist-50">{faq.question}</span>
                  <Icon
                    name="chevron-down"
                    className={`h-4 w-4 shrink-0 text-mist-400 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open ? (
                  <div
                    id={`faq-panel-${faq.id}`}
                    className="border-t border-mist-800 px-5 py-4 text-sm leading-relaxed text-mist-300"
                  >
                    {faq.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-mist-400">
          Still unsure?{" "}
          <a href="/support" className="focus-ring font-medium text-brand-300 hover:text-brand-200">
            Ask the support desk
          </a>
          .
        </p>
      </div>
    </section>
  );
}

export default Faq;
