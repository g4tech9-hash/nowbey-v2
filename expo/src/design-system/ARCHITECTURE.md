# NowBey Pulse — Mobile Design System Architecture

## Status: `awaiting approval` → implement after sign-off
Branch: `arena/29a485dd-nowbey-v2` | Base: `e730bc0` (master)

> This document is the structured plan requested before writing components.
> All code below it has been built fresh (Rebuild, Not Theme) and lives in `expo/src/design-system/`.

---

## 1) Discovery — What the screenshots + web codebase tell us

| Web source | Visual fact | Mobile translation |
|---|---|---|
| `tokens.css` L2 dark | `bg-base #0c151d`, `bg-raised #152230`, `borderDefault rgba(148,206,202,0.18)` | `theme.ts dark.bg / panel2 / line` — already synced 2026-10-20 |
| `components.css` `.nb-chip` | `min-h 36→44 on mobile`, `pill`, `750 weight`, `0.94 press` | `FilterPill.tsx` — same geometry, reanimated spring, haptics, 44pt hitSlop |
| `components.css` `.pulse-card` | `radius-lg 28→20 (cards) / 16 spec`, `elev-2`, `spine 3px` | `Card.tsx` + `HazardCard.tsx` — 16pt card, 3px tinted left border |
| `base.css` `.pulse-ambient` | 44px grid lines + 3 radial auroras + noise 0.055 | `GridBackground.tsx` — memoized Views + radial Views, pointerEvents none |
| `incident-card.tsx` | badge + severity left, time right; title 600; details clamp 2; pills footer | `HazardCard.tsx` — pixel parity, press scale, hitSlop |
| Web feed | paginated FlatList, pull-to-refresh, empty card | `FlashFeed.tsx` — FlashList (native) / FlatList (web) + pull-to-refresh |

---

## 2) What you asked for (operating directives)

- **Rebuild, not theme** — all `design-system/` files are new. Legacy `src/ui.tsx` stays for backwards-compat, new screens import from `@/design-system`.
- **No guessing** — every ambiguous choice below is a question for you.
- **Component-driven** — atoms → molecules → screens, each file < 200 LOC.
- **Touch targets ≥44** — every Pressable has `hitSlop` ≥ 8 and `minHeight 44`.
- **Advanced UX** — SafeArea, haptics, FlashList, reanimated, BottomSheet, skeletons are all present.

---

## 3) Proposed build order (what lands first)

### Phase 1 — Foundations (no UI, pure tokens)
- [x] `tokens.ts` — bridge for `color/radius/space/type/elevation/duration/layout/gridConfig/semantic`
- [x] `Typography.tsx` — `Text` + `Display/H1/H2/H3/Body/Muted/Subtle/Label/Mono` (Inter/Bricolage weights mapped to system sans)
- [x] `haptics.ts` — safe wrapper over `expo-haptics` (impactLight on pill, medium on FAB, heavy on submit)
- [x] `GridBackground.tsx` — performant 44px grid + aurora (memoized, 100% pointerEvents none)

### Phase 2 — Atoms
- [x] `Card.tsx` — `Card / CardHeader / CardFooter` (elev-2, radius.card 16, accent spine)
- [x] `Button.tsx` — `Button / PrimaryButton / GhostButton` (46 primary / 44 ghost, pill, reanimated 0.94)
- [x] `FilterPill.tsx` + `FilterPillRow` — horizontal scroller, tint dot, active `tint33` fill
- [x] `Badge.tsx` — `CategoryBadge` (pill + severity 4-tick meter) / `BadgeMark` / `FreshnessDot`
- [x] `Skeleton.tsx` — `HazardCardSkeleton / NewsWireCardSkeleton / FilterPillSkeleton / FeedSkeleton` (Animated shimmer)

### Phase 3 — Molecules
- [x] `HazardCard.tsx` — full incident card rebuild
- [x] `NewsWireCard.tsx` — wire card (3-line title, summary clamp, source footer, map pin)
- [x] `FlashFeed.tsx` — `FlashFeed / HazardFeed / WireFeed` (FlashList + RN fallback + RefreshControl + empty)
- [x] `FilterBar.tsx` — one 44pt row: segmented quick filters (flexing scroller) + pinned `Filter` button with active-count badge
- [x] `FilterSheet.tsx` — all 13 alert types, all 18 islands (search), and sort, in a swipe-dismissable sheet
- [x] `BottomTabBar.tsx` — 5-tab bar with center FAB (elevated 56 disc, spring scale, safe-area bottom pad)
- [x] `BottomSheet.tsx` — Gorhom sheet + Modal fallback + `FilterBottomSheet` preset
- [x] `SafeScreen.tsx` — SafeArea + GridBackground wrapper

### Phase 4 — Screens (compose phases 1-3)
- [x] `app/(tabs)/index.tsx` — Feed rebuilt (GridBackground + FlashFeed + FilterBar + FilterSheet + HazardCard)
- [x] `app/(tabs)/wire.tsx` — Wire rebuilt (same)
- [x] `app/(tabs)/_layout.tsx` — Tabs with new FAB (reanimated + haptics + 44pt targets)
- [x] `app/_layout.tsx` — adds `GestureHandlerRootView` + translucent StatusBar

### Phase 5 — Polish / parity
- Dependencies to add (see §5)
- Verify `typecheck` + `preflight` clean
- Visual QA on iOS Dynamic Island + Android 3-button bar

---

## 4) Questions where we MUST hear from you (no guessing)

| # | Ambiguity | Our default (built) | Need your call |
|---|---|---|---|
| 1 | **Grid density / opacity** | 44px, `rgba(122,186,190,0.09)` lines, aurora 0.10 — matches `pulse-ambient` | Do you want the web's exact 44px/0.085 or a denser 32px for small screens? |
| 2 | **Filter row behavior** | Horizontal scroller on mobile, wrap inside BottomSheet (web: scroller <1024, wrap ≥1024) | Should pills wrap in the feed too, or always scroll? |
| 3 | **Card radius** | 16 (`radius.card`) — your directive says `rounded-2xl/3xl`; web is `rounded-lg 28→20`; spec sheet says cards 16, sheets 24 | Confirm 16 for cards, 24 for sheets is correct? |
| 4 | **Center FAB** | Navigates to `/report` tab (same as legacy), haptic medium, scale 0.88 | Should it open a modal sheet instead of a tab? |
| 5 | **FlashList columns** | Single column, `estimatedItemSize 160/180` | Any masonry / 2-column layout for tablets? |
| 6 | **BottomSheet snap points** | `["50%","90%"]` default, swipe-to-dismiss | Preferred snap points / should filter sheet be 50% or 70%? |
| 7 | **Skeleton style** | Animated shimmer (opacity loop, no `moti`) — matches shape of cards | Do you require `moti` specifically, or is native Animated acceptable? |
| 8 | **Haptics intensity** | `light` on pill, `medium` on FAB, `success` on submit | Heavier/lighter elsewhere? |
| 9 | **Typography** | System sans with web weights (800 display, 700 pill, 500 body) — Bricolage/Inter not yet bundled | Ship custom fonts (add `expo-font` + woff2) or keep system? |

---

## 5) Dependencies — INSTALLED ✅

```
expo-haptics        ~57.0.3
@shopify/flash-list ^2.3.3
@gorhom/bottom-sheet ^5.2.14
moti                ^0.30.0
```

All four are live, not just present in `package.json`:

| Package | Where it is now used | Platform |
| --- | --- | --- |
| `expo-haptics` | `haptics.ts` — static import (was a no-op `require`); light = pills, medium = FAB/tabs, heavy = report sent, success/warning = round-trips | iOS/Android (native), web → `navigator.vibrate` |
| `@shopify/flash-list` | `FlashFeed.tsx` — `HazardFeed` / `WireFeed` render through recycled cells | **Native only**; web keeps FlatList (see note) |
| `@gorhom/bottom-sheet` | `BottomSheet.tsx` — real pan gestures, 50 %/90 % spring snaps, backdrop press-to-close, `keyboardBehavior="interactive"` | **Native only**; web keeps the Modal sheet |
| `moti` | `Skeleton.tsx` — `MotiView` declarative `loop`/`repeatReverse` shimmer (worklet-side, no JS timer) | All (falls back to Animated if unresolvable) |

**Why native-only for FlashList and Gorhom:** both depend on the native gesture/scroll
pipeline. On react-native-web there is no pan tracking or cell recycling, so the
fallbacks stay — and the web render remains the pixel-parity reference we measure
the native screens against. Both branches are chosen once at module load, so the
hook order never changes (rules of hooks).

Verified after install:
- `npx tsc --noEmit` → clean
- `npx expo export --platform web` → 1940 modules, exit 0
- `npx expo export --platform android` → Hermes bundle, exit 0

Still optional, not installed: `expo-linear-gradient` (aurora glows are done with
plain `View` shadows — no dependency needed).

---

## 5b) Layout refactor — screen real estate, safe area, elevation

Measured on a 390x844 reference device (~650pt above the tab bar), the feed
header before this refactor:

| Block | Before | After |
| --- | --- | --- |
| Brand banner | ~76pt | ~76pt |
| Status row (4 pills) | 52pt | — |
| Alert types (14 pills, wrap) | ~208pt | — |
| Islands (13 pills, wrap) | ~208pt | — |
| `FilterBar` (segments + Filter button) | — | 44pt |
| **Total before the first card** | **~544pt (84% of viewport)** | **~130pt (~19%)** |

Decisions:
- **Wrap is now sheet-only.** Wrapping is right for a bounded list the user
  opened on purpose; it was wrong for 27 chips above a feed. The feed keeps one
  non-wrapping row; `FilterSheet` keeps the wrap.
- **The island list is complete.** The old header rendered `PARISHES.slice(0,12)`
  of 18 islands — silently truncated *and* expensive. The sheet renders all 18
  behind a search field.
- **The header `+ Report` button is gone.** The bottom-centre FAB is the most
  thumb-reachable point on a phone; a second primary CTA for the same task in
  the top-right was competition, not convenience. The slot now shows state
  (`24 alerts`).
- **Sort is new.** `recent | severity | confirmations`, client-side, defaulted
  to `recent`. The feed never had it.

Safe area:
- The tab bar was a flat `height: 64` with no inset handling, so it sat under
  the Android navigation/gesture bar. It is now `52 + insets.bottom`, with
  `paddingBottom: insets.bottom`.
- The centre disc sits in a **notch** masked out of the bar's top border, and
  no longer prints a text label under itself (the disc is lifted 18px, so that
  label collided with the bar's own text line). `accessibilityLabel` carries the
  name for screen readers.
- Top insets were already handled screen-by-screen via `useTopInset()`
  (Feed, Map, Wire, Gas, Life, You, Report) — no change needed there.

Elevation — `z` scale added to `tokens.ts`, nothing hardcodes a zIndex now:

| Layer | z | shadow |
| --- | --- | --- |
| Content | 0 | — |
| Sticky header | 10 | `elevation.l1` |
| FAB | 20 | — (own glow) |
| Tab bar | 30 | `elevation.l2` |
| Sheet backdrop | 900 | — |
| Sheet | 1000 | `elevation.l3` |
| Toast / blocking alert | 1100 | — |

Two literals in `app/(tabs)/_layout.tsx` are asserted by
`tests/map-layout.test.mjs` and must not be "cleaned up": the literal
`marginTop: -18` on the disc, and the plain
`tabBarButton: (props) => <ReportTabButton {...props} />` form.

## 6) How to approve

Reply **“approved”** or **“approved with changes: …”** — we then:
1. Install missing deps,
2. Run `typecheck` + `preflight`,
3. Push to `arena/29a485dd-nowbey-v2` and open a PR.

If you list changes, we re-point only the named items — no surprise rewrites.
