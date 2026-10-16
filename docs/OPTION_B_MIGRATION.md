# Option B — migration note

A visual + UX overhaul only. No routes, API contracts, DB schema, `src/lib` data shapes or
state machines changed. Every colour and font now resolves through the Tailwind v4 `@theme`
block in `src/index.css`, and every icon is a typed glyph from `src/components/Icon.tsx`.

## The system (new files)

### `src/index.css` — the design system
The single source of truth. `@theme` defines the Option B palette, then a block of **legacy
aliases** re-points every 2026 token *name* (`tide-*`, `sun-*`, `conch-*`, `abyss-*`, `sand-*`,
`ink-*`, `ok/warn/danger/info`, `sev-1..5`) at an Option B *value*. That is why the whole app
repainted without touching 70 files' utility names: `bg-tide-500` is now brand blue, `text-sun-600`
is amber, `bg-abyss-950` is the page colour.

- Surfaces: page `#00040f`, panels `#021550` / `#061a3d` / `#0a2350`, cards `#11141a`.
- Brand `#0072ff` with light `#5bb4ff`, dark `#0059c7`, deep `#003d8a`; cyan `#22c9ff`.
- Signals: alert `#ed2323`, safe `#72ff80`, amber `#ffb020`.
- Text: ink `#f0f4f7`, ink-dim `#8d9299`, ink-200 `#c7d0d8`, ink-400 `#646b73`.
- Hairline `rgba(91,180,255,.14)`, a stronger tier, Space Grotesk / Inter / Space Mono.
- Fluid `--text-*` scale, radii (`--radius-xl2` = 24px is the card radius), `--shadow-l1..l4`
  plus `glow-brand / glow-alert / glow-safe / glow-cyan`, easings, `--animate-*`.
- Category fills (`cat-*`, `cat-*-t`) and the severity ramp are **data semantics and were left
  alone** — they carry meaning, not styling.
- `@layer components` holds the materials: `.glass` / `.glass-strong` (chrome and overlays only),
  `.nb-surface` / `.nb-surface-panel` (solid data surfaces), `.hairline`, `.nb-veil` (grid veil),
  `.nb-glow*`, `.nb-live-dot`, `.nb-sev`, `.nb-chip`, `.nb-meta`, `.nb-focus`, `.nb-marquee-track`.
- `@layer base`, the Option B keyframes (`nb-marquee`, `nb-ping`, `nb-float`, `nb-rise`,
  `nb-pulse`, `nb-pulse-ring`, `nb-aurora`, `nb-sheen`) and a global
  `prefers-reduced-motion` kill-switch that stops marquee, ping, float, rise, pulse and aurora.

### `src/components/Icon.tsx` — typed icon set
~50 glyphs on one 24px grid, `currentColor`, round caps, so an icon always inherits text colour
and scales with the type scale. `name` is a union type: a typo is a compile error, not a blank box
at runtime. `size`, `strokeWidth`, `className`, and an optional `title` for a labelled icon
(without it the icon is `aria-hidden`).

### `src/components/engage/reaction-icons.tsx`
Maps each reaction kind to its glyph, reading `REACTIONS[kind].icon` from the data layer.

## Chrome & shell

| File | What changed visually |
| --- | --- |
| `src/app/layout.tsx` | Space Grotesk (display), Inter (body) and Space Mono (labels/timestamps) replace Sora/Manrope; all three variables sit on `<html>`; body is `bg-page text-ink`; `theme-color` is the Option B light/dark pair. |
| `src/app/globals.css` | Restructured: `@import "tailwindcss"` + `@import "../index.css"`, then app-specific layers only. The duplicated 2026 `@theme`, the Tideglass `.glass` rules, the TIDEGLASS MATERIALS block and the duplicate trailing keyframes are gone. Leaflet skinned to Option B (navy map, translucent panel controls, cyan hover), pins and clusters re-tinted cyan, `.nb-pin-live` now animates `nb-ping`, `.hairline`/`.marquee-track` read tokens, grain tinted `rgba(91,180,255,.5)`, ISLAND LOOK re-pointed at the cyan variant, backdrop/pagescene/splash re-tinted (splash accent cyan, tag amber-soft), and a full Option B **light tier** under `html[data-mode="light"]`. |
| `src/components/app-shell.tsx` | Header/nav/footer/mobile bars now glass panels with hairline rules; primary CTAs are `nb-glow` brand buttons; the old teal shadow values became the `nb-glow` token. |
| `src/components/nav-links.tsx` | Nav pills, the mobile tab bar and the active state re-tinted to brand/cyan with hairline borders and mono labels. |
| `src/components/live-ticker.tsx` | Rewritten as the Option B in-flow ticker: mono uppercase chip, amber live dot, hairline rule, `marquee-track` (reduced-motion safe). Dead fetch/state removed. |
| `src/components/splash-screen.tsx` | Waves and the brand mark now use `var(--color-cyan)` / `var(--color-amber)` / `var(--color-panel)` instead of hardcoded rgba. |
| `src/components/mode-toggle.tsx` | Toggle re-tinted to brand/cyan with a visible focus ring. |
| `src/app/global-error.tsx` | Full-screen error state restyled: panel surface, hairline, alert icon, mono metadata. |

## Forms & controls

| File | What changed visually |
| --- | --- |
| `src/app/login/login-form.tsx` | The three `→` bullets became cyan check icons; the handle-availability line now shows a typed check glyph; inputs/buttons on the Option B surface. |
| `src/components/account-forms.tsx` | Inputs, toggles, selects and the save/danger buttons restyled; focus rings are `nb-focus`. |
| `src/components/appearance-form.tsx` | Theme preview cards use `color-mix()` over brand/alert tokens instead of hardcoded teal rgba. |
| `src/components/accessibility-controls.tsx` | Toggle chips use typed check/info icons and brand/cyan tokens. |
| `src/components/wire-forms.tsx` | Wire submit form restyled to the Option B form language. |
| `src/components/enterprise-form.tsx` | The success tick is now a typed check in a glowing brand circle. |

## Data displays & lists

| File | What changed visually |
| --- | --- |
| `src/components/ad-slot.tsx` | House/promoted ads: glass panel, hairline, left rule in the slot's own tone, mono "Promoted" label. |
| `src/components/admin-ui.tsx` | `Pill` tones re-pointed at brand/amber/alert/ink; `StatCard` is a solid `nb-surface` with a mono label; `MiniBars` bars are solid brand; filter chips are brand pills; the pager's `← / →` are typed chevrons; `SearchBox` input/button restyled. |
| `src/components/admin-logs.tsx` | Severity chips map to alert/amber/cyan/ink; the `Approve → create GitHub issue` arrow is a typed icon; evidence sections use mono labels; the GitHub link carries an external-link icon. |
| `src/components/digest-admin.tsx` | The banner, parish/category pickers, draft list and preview are on Option B surfaces; the `→ {partner.email}` arrow is typed; the send button is amber with a send icon. |
| `src/components/plan-grid.tsx` | Perk checks are typed icons; plan cards are solid surfaces with token radii; the billing toggle and CTAs are `nb-glow` brand; the current-plan chip is `bg-brand/18` + cyan. |
| `src/components/read-aloud.tsx` | Speaker button is an `nb-surface` chip with a typed volume icon in cyan. |
| `src/components/emergency-notice.tsx` | The 🚨 emoji is a typed alert icon; the border and text use the alert token; radius is the card radius. |
| `src/components/report-assist.tsx` | ✨/✓ are typed sparkle/check-circle icons; the AI panel is an `nb-surface`; the action button is a glowing brand pill. |
| `src/components/life/stars.tsx` | ★ characters are typed star icons in amber. |
| `src/components/life/post-form.tsx` | Rating stars are typed icons; the `×` photo-remove is a typed close; price and submit buttons are brand/glow; the add-photo tile is a dashed cyan tile with a plus icon. |
| `src/components/engage/reaction-bar.tsx` | Reactions render as typed icons (thumb-up, heart, pray, wow, sad) instead of 👍❤️🙏😮😢; selected state is a glowing brand pill. |
| `src/components/engage/summary.tsx` | The read-only reaction line renders typed icons instead of emoji. |
| `src/components/map/NowBeyMap.tsx` | Search icon, the fallback-note `✕`, the pegman and the zoom readout are all typed/token-based; the pick deck and step buttons are Option B surfaces; the selected-pin outline uses `var(--color-cyan)`. |
| `src/components/map/map-panel.tsx` | Map panel chrome re-tinted to the Option B navy map and panel controls. |

## Pages

| File | What changed visually |
| --- | --- |
| `src/app/page.tsx` | Feed hero CTA is a `nb-glow` brand button (the old teal shadow is gone). |
| `src/app/map/page.tsx` | The `✓` confirmations, `Next: add details →` and `← Fix the pin` are typed icons; map chrome, step buttons and the category legend re-tinted. |
| `src/app/report/page.tsx` | Step arrows and the success tick are typed; primary buttons are `nb-glow` brand. |
| `src/app/incident/[id]/page.tsx` | `← Back` is a typed arrow; the detail layout and sidebar are Option B surfaces. |
| `src/app/wire/page.tsx` | The `↗` source link is a typed arrow-up-right; cards restyled. |
| `src/app/wire/[id]/page.tsx` | `← News wire` and the `↗` read-story button are typed; the CTA is a glowing brand pill. |
| `src/app/life/[id]/page.tsx` | `← Island Life` is a typed arrow. |
| `src/app/life/places/page.tsx` | 🕒 📞 🌐 are typed clock/phone/globe icons in a mono metadata row. |
| `src/app/open-now/page.tsx` | The `✓ checked by NowBey` line is a typed check-circle; the source link is typed. |
| `src/app/support/page.tsx` | `Back to the feed →` is a typed arrow; plan tiers read their accent from tokens. |
| `src/app/you/page.tsx` | `✓` confirmations, `Set up alerts →` and the admin-area link are typed; the admin link is a brand surface with cyan text. |
| `src/app/admin/**` (13 pages) | Every page repainted onto Option B surfaces: `glass` chrome became `nb-surface` panels, all hardcoded Tideglass hex became tokens, the `✓`/`!` checklist and log states are typed check/alert icons, `← All members` and `→` links are typed arrows, tables and stat blocks use mono labels and hairline rules. |

## Data-layer notes (contracts preserved)

- `src/lib/engage-kinds.ts` — `REACTIONS` gained an `icon` field. `emoji`, `label` and every
  export are unchanged; the emoji simply is not rendered any more.
- `src/lib/tiers.ts` — `tone` values now point at Option B CSS variables. The shape
  (`tone: string`), prices, perks and every export are unchanged.
- `src/lib/geo.ts`, `src/lib/error-core.ts` — untouched. Category colours stay as data semantics,
  and the severity emoji live only inside the GitHub issue markdown the server writes.
- `src/lib/auth.ts` and three route handlers — unused imports/variables removed so the project
  typechecks clean under `strict` + `noUnusedLocals`. No behaviour change.

## Verification

- `tsc --noEmit --noUnusedLocals` → clean.
- `eslint src --ext .ts,.tsx` → clean.
- `npm test` → 48/48 pass.
- Tailwind pipeline (`@tailwindcss/postcss`) compiles `globals.css` to ~130 KB with zero
  warnings; every Option B token, material and keyframe is present in the output, and no
  Tideglass token value survives.
- Zero emoji and zero hardcoded hex remain in `src/app` and `src/components`.
- Live preview on `:4173` serves the Option B tokens; `/map`, `/support`, `/terms`, `/credits`,
  `/privacy`, `/mobile`, `/open-now`, `/report`, `/login` all render 200.
