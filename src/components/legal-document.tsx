/**
 * The Terms of Use and the Privacy Notice are the same kind of page: a stack of
 * plain-English sections under a heading. Both documents are written in the same
 * voice, so they share one renderer and one set of styles.
 *
 * A section is a heading followed by blocks. Blocks are kept in an explicit order
 * because a legal paragraph often sits above a list and another one below it.
 * `rows` is for the data controller block: the company name, the address and the
 * email, shown as a small table of facts.
 */
export type LegalRow = { k: string; v: string };

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "rows"; rows: LegalRow[] };

export type LegalSection = { h: string; blocks: LegalBlock[] };

/** A paragraph. */
export const p = (text: string): LegalBlock => ({ kind: "p", text });
/** A bulleted list. */
export const ul = (...items: string[]): LegalBlock => ({ kind: "ul", items });
/** A small table of facts. */
export const rows = (...list: LegalRow[]): LegalBlock => ({ kind: "rows", rows: list });

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="glass space-y-5 rounded-2xl p-5">
      {sections.map((s) => (
        <section key={s.h}>
          <h2 className="display text-[15px] font-extrabold text-sand-100">{s.h}</h2>

          {s.blocks.map((b, i) => {
            if (b.kind === "p") {
              return (
                <p key={i} className="mt-1.5 break-words text-[13px] leading-relaxed text-ink-300">
                  {b.text}
                </p>
              );
            }
            if (b.kind === "ul") {
              return (
                <ul key={i} className="mt-1.5 list-disc space-y-1.5 break-words pl-4 text-[13px] leading-relaxed text-ink-300">
                  {b.items.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>
              );
            }
            return (
              <dl key={i} className="mt-2 space-y-1.5 rounded-xl border hairline bg-white/5 px-3.5 py-3 text-[13px]">
                {b.rows.map((r) => (
                  <div key={r.k} className="flex flex-wrap gap-x-2">
                    <dt className="font-bold text-sand-100">{r.k}</dt>
                    <dd className="break-words text-ink-300">{r.v}</dd>
                  </div>
                ))}
              </dl>
            );
          })}
        </section>
      ))}
    </div>
  );
}
