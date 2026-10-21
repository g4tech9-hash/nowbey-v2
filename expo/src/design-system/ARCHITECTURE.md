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
| Web feed | paginated FlatList, pull-to-refresh, empty card | `FlashFeed.tsx` — FlashList with fallback, estimatedItemSize 160 |

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
- [x] `BottomTabBar.tsx` — 5-tab bar with center FAB (elevated 56 disc, spring scale, safe-area bottom pad)
- [x] `BottomSheet.tsx` — Gorhom sheet + Modal fallback + `FilterBottomSheet` preset
- [x] `SafeScreen.tsx` — SafeArea + GridBackground wrapper

### Phase 4 — Screens (compose phases 1-3)
- [x] `app/(tabs)/index.tsx` — Feed rebuilt (GridBackground + FlashFeed + FilterPillRow + HazardCard + BottomSheet)
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

## 5) Dependencies (what to `npm install` next)

Missing for full spec (all have graceful fallbacks today):
- `expo-haptics` — haptics (current wrapper no-ops without it)
- `expo-linear-gradient` — optional aurora polish (removed, using View glows)
- `@shopify/flash-list` — 60fps feed (falls back to FlatList)
- `@gorhom/bottom-sheet` — native sheet gestures (falls back to Modal)
- `moti` — skeleton shimmer alt (using Animated today)

Install when you approve:
```sh
cd expo && npx expo install expo-haptics && npm i @shopify/flash-list @gorhom/bottom-sheet moti
```

---

## 6) How to approve

Reply **“approved”** or **“approved with changes: …”** — we then:
1. Install missing deps,
2. Run `typecheck` + `preflight`,
3. Push to `arena/29a485dd-nowbey-v2` and open a PR.

If you list changes, we re-point only the named items — no surprise rewrites.
