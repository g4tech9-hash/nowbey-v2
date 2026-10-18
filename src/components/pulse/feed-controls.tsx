"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";
import { buildQuery, replaceUrl } from "@/lib/pulse/motion";
import { CommandPaletteTrigger, FilterPillRow, LiveModeToggle, Segmented, pulseCategoryMeta, type PillOption } from "@/ui/pulse";

/**
 * The filter island.
 *
 * Every control here is a *query param*, not component state:
 * `/feed?category=power&island=Grand%20Bahama&sort=trust` is a shareable,
 * reloadable, deep-linkable view of the island, and it is the exact string the
 * server parses on `/api/incidents` — one vocabulary for filtering, everywhere.
 *
 * Filter changes go in with `replaceState`, so the back button walks you out of
 * the feed instead of through fourteen refinements you made on the way. The view
 * switch is a real `pushState`, because changing how you look is a different
 * task. Search is the exception: it debounces 280ms and rewrites the address bar
 * directly, because a router round-trip per keystroke would spam history and
 * re-run three queries for a word that is still being typed.
 */

const STATUS: PillOption[] = [
  { value: "active", label: "Open now" },
  { value: "all", label: "Everything" },
  { value: "resolved", label: "Cleared" },
];

const SORTS: { value: string; label: string; title: string }[] = [
  { value: "recent", label: "Newest", title: "Most recently filed first" },
  { value: "confirmed", label: "Confirmed", title: "Most neighbour-confirmed first" },
  { value: "trust", label: "Most trusted", title: "Highest trust score first — confirmations, source and age" },
  { value: "severe", label: "Most severe", title: "Highest severity first" },
];

export function FeedControls({
  counts,
  total,
  view,
  withMap = true,
}: {
  counts: Record<string, number>;
  total: number;
  view: "list" | "map";
  withMap?: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const boxRef = useRef<HTMLInputElement | null>(null);
  const status = sp.get("status") ?? "active";
  const category = sp.get("category") ?? "";
  const island = sp.get("island") ?? sp.get("parish") ?? "";
  const sort = sp.get("sort") ?? "recent";

  const patch = useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [key, value] of Object.entries(next)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      // A filter change closes whatever drawer was open: the URL is the source of
      // truth for both, and a stale ?open= would re-open it on reload.
      params.delete("open");
      router.replace(`/feed?${params.toString()}`, { scroll: false });
    },
    [router, sp],
  );

  const categoryOptions: PillOption[] = useMemo(
    () => [
      { value: "", label: "All signals", count: counts.__all ?? total },
      ...(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => ({
        value: key as string,
        label: CATEGORIES[key].label,
        // The hue comes from the Pulse category map, not from CATEGORIES[key].color:
        // the legacy hex is tuned for a dark night sky, the token is re-derived per theme.
        hue: pulseCategoryMeta(key).token,
        count: counts[key] ?? 0,
        title: `${CATEGORIES[key].label} — ${counts[key] ?? 0} open report${counts[key] === 1 ? "" : "s"}`,
      })),
    ],
    [counts, total],
  );

  const commitSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      params.delete("open");
      router.replace(`/feed?${params.toString()}`, { scroll: false });
    },
    [router, sp],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim() !== (sp.get("q") ?? "")) commitSearch(q);
    }, 280);
    return () => clearTimeout(t);
  }, [q, commitSearch, sp]);

  // `/` focuses search. The one shortcut that has to be discoverable, so the
  // field advertises it with a key hint sitting inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const typing = active?.closest("input,textarea,select,[contenteditable='true']");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        boxRef.current?.focus();
      } else if (e.key === "Escape" && active === boxRef.current) {
        boxRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dirty = !!(q || category || island || status !== "active" || sort !== "recent");

  return (
    <div className="pulse-island">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="pulse-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            commitSearch(q);
          }}
        >
          <Search size={15} strokeWidth={2.4} aria-hidden />
          <input
            ref={boxRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a street, a parish, “no water”…"
            aria-label="Search reports"
            enterKeyHint="search"
          />
          {q ? (
            <button type="button" className="pulse-search-clear" aria-label="Clear search" onClick={() => setQ("")}>
              <X size={13} strokeWidth={2.6} aria-hidden />
            </button>
          ) : (
            <kbd className="pulse-kbd" aria-hidden>
              /
            </kbd>
          )}
        </form>

        {dirty ? (
          <button
            type="button"
            className="nb-btn nb-btn-ghost nb-btn-sm"
            onClick={() => {
              setQ("");
              const params = new URLSearchParams({ status: "active" });
              router.replace(`/feed?${params.toString()}`, { scroll: false });
              replaceUrl("/feed", params);
            }}
          >
            Clear filters
          </button>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <LiveModeToggle />
          <CommandPaletteTrigger />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <FilterPillRow
          options={STATUS.map((o) => ({ ...o, count: o.value === "active" ? counts.__active : undefined }))}
          value={status}
          ariaLabel="Report status"
          size="sm"
          onSelect={(next) => patch({ status: next === "active" ? "" : next })}
        />

        <FilterPillRow
          options={categoryOptions}
          value={category}
          ariaLabel="Category"
          size="sm"
          onSelect={(next) => patch({ category: next })}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="pulse-select-label">
            <span className="pulse-sr-only">Island</span>
            <select className="nb-select" value={island} onChange={(e) => patch({ island: e.target.value, parish: "" })}>
              <option value="">All islands</option>
              {PARISHES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <Segmented
            label="Sort reports"
            size="sm"
            value={sort}
            options={SORTS.map((o) => ({ value: o.value, label: o.label, title: o.title }))}
            onChange={(next) => patch({ sort: next === "recent" ? "" : next })}
          />

          {withMap ? (
            <Segmented
              label="View"
              size="sm"
              value={view}
              options={[
                { value: "list" as const, label: "List", title: "Scroll the stream" },
                { value: "map" as const, label: "Map", title: "The same filter, as pins" },
              ]}
              onChange={(next) => router.push(`/feed${buildQuery(sp, { view: next === "list" ? "" : next })}`)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
