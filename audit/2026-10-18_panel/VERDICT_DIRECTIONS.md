# Verdict — four art directions

**Decided:** the *Verdict* skeleton. A map carries the place; one serif sentence states the situation; a short
list holds the rest.

What is still open is **where the sentence lives**, and that single question produces four completely different
products. All four are in `preview/`:

| | File | The idea in one line |
| --- | --- | --- |
| **Atlas** | `verdict-atlas.png` | Type set directly on the map, only where the map is empty |
| **Split** | `verdict-split.png` | A hard horizon: map above, paper below, the claim straddling the seam |
| **Lens** | `verdict-lens.png` | Everything dark except one pool of light |
| **Contour** | `verdict-contour.png` | No street map at all: a nautical depth chart |

---

## 1 · Atlas — typographic cartography

The corridor is traced in warm ivory. Street labels are drawn. The claim is set in the empty water at the
bottom left, with no card, no capsule, no blur.

**Why it is beautiful:** it treats the map as *paper* rather than as a background image. Nothing is floating;
nothing is boxed. It is the most confident of the four, because it removes the thing every competitor adds.

**Where it is weak:** the empty area is doing all the work. Over dense Nassau streets — which is exactly where
hazards are — there is no empty area, and the type lands on top of lines. The render cheats by putting the
sentence over the sea. Real fix: the map scrims itself under the type block with a soft vertical gradient, which
is one CSS layer, but it means the composition is *engineered* rather than found.

**Cost:** lowest of the four. It is the current map, with the capsule deleted and the type promoted.

---

## 2 · Split — the horizon

The top half is map; the bottom half is paper cream; the seam is a single straight line; the serif sentence sits
across it, dark ink on cream, half of it over the map.

**Why it is beautiful:** it is the only one that creates a *duotone identity* — deep sea and warm paper in the
same frame — and the only one that looks like nothing else in the category. It also solves a real problem the
audit found: the app's light theme is half-finished. Split makes light and dark the *same brand* instead of two
themes, so light mode stops being an afterthought and becomes half the design.

**Where it is weak:** the map is cropped to a letterbox, so it loses street context; and the split can read as
decorative rather than functional. It also demands a strict type discipline — the sentence must never wrap to
four lines or it eats the map.

**Cost:** low. CSS only, no new map behaviour. The strongest brand payoff per unit of engineering in this list.

**Colour, concretely:** paper `#f2ebdf`, ink `#10222b` (≈13:1), sea `#0a1b26`, ivory `#f6ead8`.
**One trap:** the glowing teal `#43e0cc` measures about 1.7:1 on paper — it is a *fill*, never text. Accent text
on paper drops to `#07564f` (≈6:1). Amber `#f5c75d` stays a dot only.

---

## 3 · Lens — one pool of light

The map is almost black. A soft circle of light reveals the road, the pins and the sentence. Everything outside
it is swallowed.

**Why it is beautiful:** it is the most cinematic thing in this document. It has a mood — night, rain, a phone
held up in a doorway — that no map app in the region has.

**Where it is weak, and this is why I would not ship it as the home screen:** it hides the map. A person
standing on Shirley Street needs to see *their* road, and Lens makes seeing it an act of exploration. It also
leans on blur and glow — expensive on the low-end Android that a large part of the Nassau market actually
carries.

**Where it belongs:** as a *moment*, not a screen. First run. An empty state. The "one urgent thing" takeover
during a storm. Used once, it is unforgettable; used daily, it is exhausting.

---

## 4 · Contour — the sea chart

No streets, no pins. Nautical bathymetry: contour lines following the coastline, depth numerals, the claim set
in calm water above.

**Why it is beautiful:** it is the only direction that is *of this place*. Depth charts are how Bahamians have
always read water, and nobody is using that visual language in software. It is also the cheapest screen in the
entire programme: pure SVG and CSS, no tiles, no licensing, no network — which means it renders instantly and
works offline by construction.

**Where it is weak:** it does not show roads or reports. As a *main* screen it withholds the thing the product
is for; the claim would sit on decoration that carries no spatial meaning.

**Where it belongs:** the **rest state**. When there is nothing to show, "nothing is happening" deserves a
beautiful, honest screen — and this is it. A contour chart with a calm sentence is a far better answer to a
quiet Tuesday than an empty map.

---

## What I actually recommend

Not one of them. **Three of them, each given a job** — because they answer different states of the same product,
which is exactly the logic you already picked in B.

> **Contour at rest → Atlas when something is happening → Lens for the one urgent thing.**
> **Split as the framing system around all three.**

- **Rest (most days):** Contour. No tiles, instant, calm, and unmistakably Bahamian.
- **Something happening:** Atlas. The real map, the corridor traced, the sentence on the map itself.
- **Something dangerous:** Lens. The map goes dark, the light falls on the one place that matters.
- **All the time:** Split's duotone — sea and paper — is the identity those three states live inside, and it
  gives you a light theme that is a design decision rather than an unfinished one.

That is one product with three registers, not three designs. It also maps cleanly onto Calm/Storm: Contour is
calm, Atlas is engaged, Lens is the storm.

If you want a single direction and no system, take **Split**. It is the most striking, the cheapest of the bold
options, and the only one that fixes the light theme while it works.
