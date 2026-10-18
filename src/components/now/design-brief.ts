/**
 * The portable NowBey design brief — generated once here, offered as
 * copy/download on /prompt (Master Build Screen 6).
 */
export const DESIGN_BRIEF = `# NowBey — Design System Brief (Master Build)

Reference product: NowBey — Community Safety for The Bahamas.
Standard: restrained, trustworthy in an emergency, deliberately Bahamian.

## Colour tokens (exact)

BRAND
- Aquamarine Sea (primary)   #00A3AD   buttons, links, active states
- Aquamarine Bright          #00D2D3   highlights, radar glow (sparingly)
- Deep Ocean Trench          #002B49   headings, hero base, brand mark
- Deep Trench Darker         #001E36   hero gradient end
- Sunburst Bahamas Gold      #FFC72C   ONE accent per view
- Gold Pressed               #E6B325   gold hover/active

SEMANTIC HAZARDS (colour always pairs with icon + label)
- Flooding & Surge           #3B82F6   Waves
- Power Outage / BPL         #F59E0B   Zap
- Road Hazard / Blockage     #F43F5E   AlertTriangle
- Storm & Marine Gale        #14B8A6   Wind
- Brush Fire & Smoke         #F97316   Flame
- Community Advisory         #6366F1   ShieldAlert
- Success / Verified         #10B981   CheckCircle2
- Critical severity          #EF4444   reserved — alarm fatigue is real

NEUTRALS
- Dark canvas  #040810 / #050B14   Dark surface  #0B1220
- Light canvas #F8FAFC             Light surface #FFFFFF
- Dark borders: white at 8–12% opacity. Light borders: slate-200.

GRADIENTS (only these three)
- Hero:    #002B49 -> #091E2F -> #001322 (135deg)
- Primary: #00A3AD -> #00818B (buttons)
- Flag ribbon (6px): #00A3AD -> #FFC72C -> #002B49

## Typography
- Inter or system sans. Never decorative fonts for safety data.
- Display 40–60px / 900 / -0.02em / lh 1.05 · H2 24–30px / 800 · H3 18px / 700
- Body 14–16px / 400–500 / lh 1.6 · Labels 11–12px uppercase / 0.08em / 700
- Numbers (counts, coords): tabular numerals.
- Gradient text ONLY on the wordmark and the H1 highlight line.

## Spacing, radius, elevation
- 4pt spacing: 4, 8, 12, 16, 24, 32, 48.
- Radius: chips 999px · buttons/inputs 12–16px · cards 24px · hero/modals 24–32px.
- Shadows: soft and low; cyan-tinted hover (5–10%); gold CTA amber glow 20%.
- Content max-width 1280px; page padding 16 / 24 / 32px.

## Modes
- Dark (default "night watch") + light ("daylight on the dock").
- Toggle persists (localStorage), respects prefers-color-scheme on first visit.
- Hazard semantic colours stay identical in both modes.

## Motion
- 200–300ms ease-out. Hover lift 1.02–1.05 max. Active press scale .95–.98.
- Radar ping 2s ease-out. Confetti ONLY on report submit, alert activation,
  hazard confirmation. Respect prefers-reduced-motion.

## Iconography (Lucide only)
Waves=flooding · Zap=power · AlertTriangle=road · Wind=storm · Flame=fire ·
ShieldAlert=advisory/brand · Compass=radar · Radio=wire · BellRing=alerts ·
MapPin=place · ThumbsUp=confirm · CheckCircle2=verified · Send=submit.

## Content bank
Islands: New Providence (NP), Grand Bahama (GB), Eleuthera (EL), Abaco (AB),
Exuma (EX), Andros (AN). Real settlements, streets and outlets only
(The Tribune 242, Nassau Guardian, Bahamas Press, ZNS Network,
Bahamas Met Department, BPL, Royal Bahamas Police Force, Ministry of Works).
Voice: plain, neighbourly, Bahamian spelling ("neighbour").

## QA checklist (release gate)
[ ] Flag ribbon + sticky header + all nav items work, both modes
[ ] Dark AND light checked on every screen; toggle persists
[ ] Hero stats show LIVE report count, not a hard-coded number
[ ] Island cards filter the radar correctly
[ ] Radar: island + category + search filters combine; counts match
[ ] Pin click <-> inspector sync; Confirm increments once, then locks
[ ] Report: all 3 steps, back/forward keeps data, headline required,
    anonymous hides name field + stores null, success -> lands on radar
[ ] Wire: real outlet names, external links open safely
[ ] Alerts: invalid email rejected inline; success names the island
[ ] Loading, empty, error states exist and look designed
[ ] 360px: no horizontal scroll, tap targets >= 44px, dock/nav usable
[ ] Keyboard-only pass: visible focus everywhere, logical order
[ ] No console errors; no dead buttons; no lorem anywhere
[ ] Typecheck + production build pass
`;
