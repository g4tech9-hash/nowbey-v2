# The three-register system — preview spec

Four previews, one system. Each register is a *state of the product*, not a theme: the same route, the same
data, rendered at a different level of alarm. The trigger is content, never a setting.

| Register | When | Art | Preview |
| --- | --- | --- | --- |
| **1 · Rest** | nothing active in the reader's parish | Contour | `preview/register1-contour-rest.png` |
| **2 · Engaged** | one or more active reports | Atlas | `preview/register2-atlas-desktop.png` |
| **3 · Storm** | severe / clustered / broadcast | Lens | `preview/register3-lens-storm.png` |
| **— Frame** | all states, light and dark | Split duotone | `preview/register4-split-light.png` |

---

## The trigger rules (this is what makes it a system)

Register is computed on the server, in one function, from the same feed the page already loads. No client
guesswork, no user toggle, no A/B.

```
rest    = no active reports in the reader's parish within 24h
engaged = ≥1 active report in the parish
storm   = any of:
            · an active broadcast with severity "emergency"
            · ≥3 reports of the same category within 1km in 30 minutes
            · any report flagged severity 4 (Dangerous) still active within 5km
            · tide/severe-weather notice in effect (staff-set, /admin/statuses)
```

**Hysteresis:** storm drops back to engaged only 30 minutes after its last trigger clears. A register that
flickers is worse than one that stays slightly too high — every flip reorients the reader's eye and costs a
re-render.

**One escape hatch, not a control:** a person can pin "keep it calm" for the session. That is an accessibility
affordance for people who find the storm register overwhelming, not a preference that can hide a danger they
need — the amber hairline stays even when the takeover is dismissed.

---

## Palette, measured (AA/AAA against their own backgrounds)

### Register 1 — Contour (rest)
| Token | Hex | On | Ratio |
| --- | --- | --- | --- |
| Deep water | `#062028` | — | — |
| Contour line | `#7fc4bd` at 55% | deep | ~4.6:1 as a hairline (decorative, not text) |
| Ivory claim | `#f6ead8` | deep | **14.2:1** |
| Locator / meta | `#9fd8d2` | deep | **10.6:1** |
| Paper | `#f2ebdf` | — | — |
| Paper ink | `#10222b` | paper | **13.8:1** |

Depth numerals in the render are **decorative**. They must not appear as real soundings unless the numbers are
true — same rule as everything else in this product.

### Register 2 — Atlas (engaged)
| Token | Hex | On | Ratio |
| --- | --- | --- | --- |
| Sea | `#0a1b26` | — | — |
| Ivory claim | `#f6ead8` | sea | **14.8:1** |
| Muted row text | `#a9c3c4` | sea | **9.4:1** |
| Locator | `#43e0cc` | sea | **10.7:1** |
| Traced corridor | `#f6ead8` at 90% | sea | decorative stroke, 2px |

### Register 3 — Lens (storm)
| Token | Hex | On | Ratio |
| --- | --- | --- | --- |
| Night | `#050f16` | — | — |
| Ivory claim | `#f6ead8` | night | **16.3:1** |
| Amber signal | `#f5c75d` | night | **12.2:1** |
| Danger ring | `#ff8f7a` | night | **8.7:1** |
| Muted | `#9cb5b8` | night | **8.9:1** |

Amber is the only accent in this register, and it is used for exactly three things: the hairline, the label, the
primary action. The red ring is a *report* colour, never a text colour.

### Frame — Split (all states, light mode)
| Token | Hex | On | Ratio |
| --- | --- | --- | --- |
| Paper | `#f2ebdf` | — | — |
| Ink claim | `#10222b` | paper | **13.8:1** |
| Body | `#1b303a` | paper | **11.6:1** |
| **Muted** | `#3f545c` | paper | **6.7:1** |
| Accent text | `#07564f` | paper | **7.2:1** |
| Amber text | `#8f3b12` | paper | **6.3:1** |
| True teal `#43e0cc` | — | paper | **1.7:1 — fill only, never text** |

> **Correction from the render:** the light preview's muted grey reads around `#5b6f75`, which measures
> **4.46:1** on paper — it fails AAA and is borderline for AA small text. The system value is `#3f545c`.
> This is exactly the kind of drift the token layer exists to prevent.

---

## Type roles (one family per job)

| Role | Face | Weight | Size (phone → desktop) | Who uses it |
| --- | --- | --- | --- | --- |
| **The claim** | serif display | 400–500 | 34 → 56px | One sentence per screen. Never body copy. |
| **Data & labels** | Sora | 600–800 | 11 → 13px, tracked caps | Locators, counts, timestamps, buttons |
| **Body** | Manrope | 400–600 | 15 → 16px | Rows, descriptions, legal |

The serif is doing brand work, so it gets **one line role and nothing else**. A second serif weight, or a serif
in a row, turns an identity into a gimmick.

---

## Motion, per register

| | Rest | Engaged | Storm |
| --- | --- | --- | --- |
| Entry | contour lines draw 1.2s `ease-out`, once | corridor traces 0.9s | light pool opens from 0.6→1 in 320ms |
| Live change | none — a rest screen does not tick | pin appears with 1.06 scale spring, 240ms | ring pulses 1.8s, stops after 4 cycles |
| Respects `prefers-reduced-motion` | draw becomes fade | trace becomes opacity | pulse becomes a static ring |

Nothing loops forever except the storm ring, and that stops after four cycles so it does not become the
wallpaper the audit warned about.

---

## Honesty rules — non-negotiable, per register

This is the part that keeps the design from lying.

1. **Rest never over-claims.** "Nothing to report" is a fact about reports, not about the island. It always
   carries the age and the number of people watching.
2. **Atlas states observations, not verdicts.** "Water at the dip · 12 neighbours confirmed" — never
   "Impassable" unless a human moderator said so.
3. **Lens may raise alarm, never issue instructions.** The render says *"Do not drive Bay Street."* NowBey
   cannot close a road and is not an authority; a legal read of that sentence is liability. Ship:
   **"Neighbours say Bay Street is impassable."** Same urgency, no false authority. If a staff member has
   verified it, the register may escalate to "Confirmed by NowBey staff".
4. **Every screen carries its age.** A timestamp is part of the claim, not a footnote.
5. **Never fabricate a tile.** No "POWER: ON" without a feed or an explicit human source and age.

---

## What the four previews exposed (worth fixing before build)

- **Contour:** the art needs to be generated from a deterministic SVG, not drawn by hand, and must scale to any
  island. Nassau's coastline is not Abaco's.
- **Atlas:** the composition depends on water being beside the road — true for Bay Street, false inland. Needs a
  scrim fallback so the sentence can sit anywhere without floating on lines.
- **Lens:** the light pool must not cover the reader's own position marker. First build should clamp the pool to
  the reported cluster, not the centre of the screen.
- **Split:** the seam must fall *between* the two lines, never through one. Cutting a sentence in half is the
  one thing this layout cannot do, and the render does exactly that.
