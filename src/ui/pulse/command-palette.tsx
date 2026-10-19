"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, MapPin, Plus, Search, Settings, Shield, Wifi, X } from "lucide-react";
import { applyTheme, readTheme, type PulseTheme } from "@/lib/pulse/prefs";
import { useFocusTrap } from "@/lib/pulse/motion";
import { CatBadge } from "./badge";

/**
 * CommandPalette — ⌘K over the whole product.
 *
 * Two kinds of entry: a destination (Go to the map) and a *live* result (an
 * open report matching what you typed). Live results come from the same
 * `/api/incidents` endpoint the map and the ticker already use, with the same
 * `q` parameter — no new endpoint, no new shape, and the palette is therefore
 * never stale relative to the feed.
 *
 * Keyboard contract: ⌘K/Ctrl-K toggles, `/` opens in search mode, ↑↓ walk,
 * Enter runs, Esc closes and returns focus to whatever opened it (focus trap +
 * restore live in useFocusTrap). The list is a real listbox, so VoiceOver
 * announces "3 of 12" as you move.
 */
type Entry =
  | { kind: "action"; id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void }
  | { kind: "incident"; id: string; label: string; hint?: string; category: string; run: () => void };

type IncidentHit = { id: string; title: string; category: string; street?: string | null; parish?: string | null; status?: string };

const NAVIGATION: { id: string; label: string; href: string; icon: React.ReactNode; keywords?: string }[] = [
  { id: "feed", label: "Community feed", href: "/feed", icon: <Search size={15} aria-hidden />, keywords: "stream reports home" },
  { id: "map", label: "Map", href: "/map", icon: <MapPin size={15} aria-hidden />, keywords: "pins spatial island" },
  { id: "wire", label: "News wire", href: "/wire", icon: <Shield size={15} aria-hidden />, keywords: "official notices news" },
  { id: "report", label: "Report a hazard", href: "/report", icon: <Plus size={15} aria-hidden />, keywords: "new pin file submit" },
  { id: "saved", label: "Watch list", href: "/saved", icon: <Wifi size={15} aria-hidden />, keywords: "saved bookmarks watch" },
  { id: "settings", label: "Settings", href: "/you/settings", icon: <Settings size={15} aria-hidden />, keywords: "theme accessibility alerts" },
];

export function CommandPalette({ open: controlledOpen, onOpenChange }: { open?: boolean; onOpenChange?: (next: boolean) => void } = {}) {
  const router = useRouter();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<IncidentHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const trapRef = useFocusTrap(open, () => setOpen(false));

  /* ------------------------------------------------------- global hotkeys */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.matches("input,textarea,select,[contenteditable='true']");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    // The header's Search button asks for the palette this way, so the trigger
    // never has to reach into the shell's state.
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("nb:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nb:palette", onOpen);
    };
  }, [open, setOpen]);

  /* --------------------------------------------------------- live search */
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- The cancel branch: an emptied query has to drop the previous results in the same frame the user deletes
    the second character, or a stale list sits under a blank field. */
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        // Exactly the query the map issues. status=all so a cleared report is findable too.
        const res = await fetch(`/api/incidents?limit=6&status=all&q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("offline");
        const data = (await res.json()) as { incidents?: IncidentHit[] };
        if (alive) setHits(data.incidents ?? []);
      } catch {
        if (alive) setHits([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 180);
    return () => {
      alive = false;
      clearTimeout(id);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [query, open]);

  useEffect(() => {
    if (open) {
    /* eslint-disable react-hooks/set-state-in-effect -- Each open is a fresh session with the palette — query, hits and cursor reset together, keyed on `open`.
    Lifting that text into the parent would make it own characters the parent never saw. */
      setQuery("");
      setHits([]);
      setCursor(0);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const nav: Entry[] = NAVIGATION.filter((n) => {
      if (!query.trim()) return true;
      const hay = `${n.label} ${n.keywords ?? ""}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    }).map((n) => ({
      kind: "action" as const,
      id: `nav-${n.id}`,
      label: n.label,
      hint: n.href,
      icon: n.icon,
      run: () => router.push(n.href),
    }));

    const theme = readTheme();
    const extras: Entry[] = [
      {
        kind: "action",
        id: "theme",
        label: `Switch to ${theme === "light" ? "dark" : "light"} theme`,
        hint: "Persistence: this device",
        icon: <Search size={15} aria-hidden />,
        run: () => applyTheme((theme === "light" ? "dark" : "light") as PulseTheme),
      },
    ];

    const found: Entry[] = hits.map((h) => ({
      kind: "incident",
      id: `inc-${h.id}`,
      label: h.title,
      hint: [h.street, h.parish].filter(Boolean).join(" · ") || undefined,
      category: h.category,
      run: () => router.push(`/incident/${h.id}`),
    }));

    return [...found, ...nav, ...extras.filter((e) => !query.trim() || e.label.toLowerCase().includes(query.trim().toLowerCase()))];
  }, [hits, query, router]);

  const move = useCallback(
    (delta: number) => {
      setCursor((c) => {
        if (entries.length === 0) return 0;
        const next = (c + delta + entries.length) % entries.length;
        listRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']")[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    },
    [entries.length],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <button type="button" aria-label="Close command menu" className="pulse-sheet-scrim" onClick={() => setOpen(false)} />
      <div
        ref={trapRef}
        className="pulse-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search NowBey reports and run commands"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            entries[cursor]?.run();
            setOpen(false);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <input
            data-autofocus
            className="pulse-palette-input"
            placeholder="Search reports, islands, or type a command…"
            aria-label="Search reports and commands"
            aria-controls="pulse-palette-list"
            aria-activedescendant={entries[cursor] ? `pulse-cmd-${entries[cursor].id}` : undefined}
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
          />
          {loading ? <Loader2 size={15} className="mr-3 animate-spin text-tertiary" aria-hidden /> : null}
          <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm mr-2 pulse-tight" aria-label="Close command menu" onClick={() => setOpen(false)}>
            <X size={14} aria-hidden />
          </button>
        </div>

        <ul id="pulse-palette-list" ref={listRef} role="listbox" aria-label="Results" className="max-h-[54vh] overflow-y-auto p-2 pulse-scroll">
          {entries.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-tertiary">
              Nothing matches “{query}”. Try a street, an island, or a category like “flood”.
            </li>
          ) : null}
          {entries.map((entry, i) => (
            <li key={entry.id} role="option" id={`pulse-cmd-${entry.id}`} aria-selected={i === cursor}>
              <button type="button" className="pulse-palette-item" data-selected={i === cursor ? "true" : undefined} onClick={() => { entry.run(); setOpen(false); }} onMouseEnter={() => setCursor(i)}>
                {entry.kind === "incident" ? <CatBadge category={entry.category} size="sm" label="Report a hazard" /> : entry.icon}
                <span className="min-w-0 flex-1 truncate text-start">{entry.label}</span>
                {entry.hint ? <span className="font-mono text-[11.5px] text-tertiary">{entry.hint}</span> : null}
                {i === cursor ? <CornerDownLeft size={13} aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-default px-4 py-2 text-[11.5px] text-tertiary">
          <span className="flex items-center gap-1.5">
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>↵</kbd> open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>esc</kbd> close
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <kbd>⌘</kbd>
            <kbd>K</kbd> anywhere
          </span>
        </div>
      </div>
    </div>
  );
}

/** The visible affordance that opens the palette, for headers and the rail. */
export function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  const [, setTick] = useState(0);
  const open = () => window.dispatchEvent(new CustomEvent("nb:palette"));
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("nb:palette", on);
    return () => window.removeEventListener("nb:palette", on);
  }, []);
  return (
    <button type="button" onClick={open} className={`nb-btn nb-btn-ghost nb-btn-sm ${className}`.trim()} aria-label="Open the command menu">
      <Search size={14} aria-hidden />
      <span className="hidden lg:inline">Search</span>
      <kbd aria-hidden>⌘</kbd>
      <kbd aria-hidden>K</kbd>
    </button>
  );
}
