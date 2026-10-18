# NowBey mobile audit — 320–412px

Run 2026-10-18T17:05:52.862Z against `http://127.0.0.1:3100`.
Pages fetched with a phone User-Agent (Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Mobile Safari/537.36), compiled stylesheet read from each page, DOM parsed with jsdom.

**Widths checked:** 320px, 360px, 390px, 412px
**Findings:** 0 — clean

| status | route | html | css |
| --- | --- | --- | --- |
| 200 | `/map` | 57653 B | 173971 B |
| 200 | `/wire` | 44537 B | 173971 B |
| 200 | `/report` | 46379 B | 173971 B |
| 200 | `/open-now` | 41778 B | 173971 B |
| 200 | `/alerts` | 44160 B | 173971 B |
| 200 | `/you` | 42922 B | 173971 B |
| 200 | `/you/settings` | 42944 B | 173971 B |
| 200 | `/login` | 45007 B | 173971 B |
| 200 | `/forgot-password` | 41144 B | 173971 B |
| 200 | `/reset-password` | 41084 B | 173971 B |
| 200 | `/support` | 62937 B | 173971 B |
| 200 | `/credits` | 46148 B | 173971 B |
| 200 | `/mobile` | 50559 B | 173971 B |
| 200 | `/terms` | 50789 B | 173971 B |
| 200 | `/privacy` | 49075 B | 173971 B |
| 404 | `/missing-page-404` | 41754 B | 173971 B |

## Findings

None.

## Rules applied

| rule | what it catches |
| --- | --- |
| W1 | a hard-coded width wider than the narrowest phone (320px) |
| W2 | a grid or flex track with a fixed px width that cannot shrink |
| W2b | a no-wrap row of fixed-width children that cannot fit 320px |
| W3 | a fixed-height box whose content can overflow it |
| W4 | an interactive control declared under 40px tall |
| W5 | an icon-only control with no accessible name |
| W6 | text declared under 11.5px |
| W7 | a table or `<pre>` that is not inside a scroll container |
| W8 | a long unbreakable string with no wrapping or truncation |
| W9 | a form field under 16px (iOS zooms the page on focus) |
| W10 | something pinned to the viewport bottom that ignores the fixed bottom nav |

## Limits, stated plainly

* There is **no browser** in this environment. This audit reads markup and CSS; it cannot measure a
  real layout, so "fits at 320px" here means "no rule above fires", not "pixels were observed".
* Client-rendered content (the pin list on /map and the Leaflet canvas) is not in the HTML this audit
  sees; it is covered by the source-level checks in `tests/ui.test.mjs`.
* Height maths that depends on the viewport (for example "is the pin list above the fold") is checked
  as a CSS contract (`.nb-map-split` clamp values) plus the DOM order of the map and the list.
* Real-device pass conditions — touch targets under a thumb, iOS Home Screen push, Android APK push —
  stay on the human checklist in `TODO_HUMAN.md`.
