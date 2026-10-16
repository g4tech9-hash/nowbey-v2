# NowBey 2026 — Light Mode Remediation + Social Profile Strategy
**v2026.10-b · PREVIEW SPEC — nothing in `src/` or `expo/` modified. Migration waits for your explicit "APPROVED."**

---

## STEP 1 — Light mode: what failed and the rebuild

### What was wrong (audited against WCAG 2.1)

| Old token | Old hex | Contrast on white | Verdict |
|---|---|---|---|
| `ink-300` muted | `#46606C` | 6.7:1 | misses AAA (7:1) |
| `ink-400` subtle | `#647F8A` | 4.3:1 | **misses even AA (4.5:1)** — meta text was unreadable |
| `tide-300` links | `#00756A` | 5.6:1 | misses AAA for normal text |
| `sun-500` / `sev-2` | `#FFC531` | 1.4:1 | invisible as a graphic |
| light shadows | near-black | — | "gray mud" — dirty, heavy, not premium |
| glass on light | white 62–72% | — | layer boundaries imperceptible (fails 1.4.11) |

### The rebuild — "instrument panel on paper"

The techy character survives the move to light by shifting its source: instead of *neon on black*, light
mode earns its precision from **crisp cool off-whites, structural hairlines, tabular numerics, and a deep
teal text tier**. Full token set with per-token contrast math: `Theme_LightMode_Fix.css`.

**Surfaces (cool, never warm):** page `#EDF2F5` → base `#F7FAFB` → card `#FFFFFF` → tile `#FBFDFE` →
raised `#E9F0F3` → popover `#DCE7EC`. The page is deliberately *darker* than cards so white cards lift
with a shadow instead of a border.

**Text — every tier AAA on both white and raised:**
`ink-100 #0A1A24` (16.5:1) · `ink-200 #2A3E45` (11.2:1) · `ink-300 #38505A` (7.5:1) · `ink-400 #3A4E57` (7.6:1).

**Tide split into two tiers** — the core fix for "washed out" links:
- **Text tier** `tide-650 #00635A` — 7.2:1, AAA for links, labels, active nav.
- **Graphic tier** `tide-500 #00897B` — 4.3:1 for fills, dots, meters.
- **Primary button** = `#00635A` fill + white text = 7.2:1 AAA. The neon dark-mode fill is not reused.

**Semantics:** each color ships a graphics tier (≥3:1) and a text tier (AAA): `ok-600 #065C43` (8.0:1),
`warn-600 #6E4E00` (7.6:1), `danger-600 #A10E33` (8.0:1), `info-600 #155E75` (7.3:1).

**Severity ramp (light):** `#0B8A64 → #A87C00 → #C2410C → #D64550 → #A10E33` — all ≥3.8:1 as graphics.
Severity stays triple-encoded (color + glow + meter), so it never depends on hue alone.

**Categories:** fills keep the brand hex (dark glyph text on them = 8:1 AAA); new `cat-*-t` variants
(≥3:1) serve dots and colored text on white.

**Depth:** shadows re-tinted cool (`rgba(16,42,58,…)`), glass gets a perceivable cool border, aurora drops
to a 2–5% wash, and `prefers-reduced-transparency` gets a solid fallback.

---

## STEP 2 — Social profile UX strategy: "Your Island Record"

The profile is **not a generic social network** — no follower counts, no likes. Every social paradigm is
bolted to something NowBey actually does. Popularity metrics are replaced by **contribution metrics**.

### Structural layout (top → bottom)

1. **Identity header** — cool aurora cover, avatar with verified ring, `@handle`, display name, home
   island, member-since, tier chip, bio. Trust, not vanity, is the first thing you read.
2. **Bento impact rail** (4 tiles) — *Reports filed* · *Confirmations received* · *Alert islands covered*
   (from `alertIslandCount`) · *Weeks active*. The bento grid makes contribution scannable in one glance.
3. **Trust panel** — the real badge system surfaced socially: **Verified reporter** (grant reason +
   who granted it, from `badgeGrants`) and **NowBey desk**. Plus a *confirmations-per-report* trust ratio
   — the closest thing to a "score", and it measures accuracy, not popularity.
4. **Coverage fingerprint** — horizontal bars over the 13 real categories showing where this member
   reports. It answers "what is this person's beat?" using data the map already has.
5. **Activity timeline** — a vertical spine of reports and confirmations with status chips
   (open → confirmed → resolved), severity dots, mono time-ago. Anonymous reports are never named
   (the schema's existing promise, preserved).
6. **Achievement shelf** — milestone badges earned from real behavior: *First report*, *10
   confirmations*, *Storm-season watcher*, *Island guardian* (5+ islands on alert), *Verified reporter*.
   Locked ones render as outlines with progress — aspiration without dark patterns.
7. **Neighbour graph** — "confirmed by" avatar row + top confirmers. The connection graph is the
   confirmation network the product runs on, not a friend list.
8. **Tabs (own profile)** — Record · Reports · Alerts · Settings, keeping `/you` and `/u/[handle]` on one
   component with a `self` flag.

### How each paradigm maps to core utility

| Social paradigm | NowBey utility it exposes |
|---|---|
| Impact stats | Reports → the map |
| Confirmations received | Community verification → data quality |
| Trust badges | The existing `badgeGrants` trust system |
| Coverage fingerprint | Category taxonomy from `geo.ts` |
| Activity timeline | Report lifecycle & statuses |
| Achievement shelf | Contribution milestones (no purchases) |
| Neighbour graph | The confirmation network |

---

## STEP 3 — Previews (light mode, both platforms)

- **`Profile_Social_Web_Preview.tsx`** — Next.js + Tailwind 4, forced `data-theme="light"`, the full
  record page: bento impact rail, trust panel, coverage fingerprint, timeline, achievement shelf,
  neighbour graph, tab switching. Mock data; `PROD:` comments mark the `lib/profile.ts` rewiring.
- **`Profile_Social_Mobile_Preview.tsx`** — Expo, token-synced light theme, collapsing header,
  swipeable tabs (Activity / Badges / About) with PanResponder gestures, spring bottom-sheet badge
  details, thumb-zone actions.
- Both consume `Theme_LightMode_Fix.css` tokens (loaded after `nowbey-2026-tokens.css`).

## STEP 4 — Awaiting your review
Standing by for critique. Nothing migrates until you say **"APPROVED."**
