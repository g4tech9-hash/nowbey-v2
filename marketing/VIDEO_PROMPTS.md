# NowBey — video generation prompts (Hook → Action → CTA)

Three concepts, matched to the three reels already rendered in `out/video/`. Use these with Runway
Gen-3/Gen-4, Luma Ray, Sora, Kling or Veo. Each is written as three timed beats in the format the
brief asked for, plus a **Style block** to paste once at the top and **Negative block** to paste at
the end.

Two ways to use them:

- **Full generation** — paste Style + the three beats + Negative. Expect to reroll the UI beat: text
  inside a generated frame is rarely legible. Use a generated *hook* and *CTA* shot, then cut to the
  real rendered reel (`out/video/*.mp4`) for the action beat. That hybrid is what actually ships.
- **Hybrid (recommended)** — generate beat 1 and beat 3, use `out/video/01-map-countdown.mp4` etc.
  for beat 2. The interface stays pixel-correct and the surrounding shots can be photoreal.

---

## Style block — paste once, at the top of every prompt

> Shot on 35mm, f/2, natural Caribbean light, Nassau, The Bahamas. Deep teal-and-cream colour grade
> with warm skin tones and a single electric teal accent (#3fd6c0). Shallow depth of field, subtle
> film grain, no camera shake. Real Bahamian settings: pastel clapboard houses, palms, wet asphalt,
> dusk streetlights. Vertical 9:16. Text overlays are set in a heavy condensed grotesque, cream (#f3f1ea)
> with one teal emphasised phrase, positioned in the upper third with generous margin.

## Negative block — paste at the end

> No on-screen text rendered by the model (overlays are added in post), no gibberish lettering, no
> logos or brand marks, no watermark, no extra fingers, no warped phone screens, no distorted faces,
> no cartoon or illustration, no lens flare, no fast whip pans, no stock-photo smiles, no skyscrapers
> or non-Caribbean streets.

---

## Video 1 — "See it before you drive" (the map)

**The Hook (0–2s):**
Low-angle shot at dusk on a wet Nassau residential street, pastel pink and turquoise houses, one
streetlight flaring in the puddle. A woman in a mustard shirt walks toward the camera, then stops,
frowning at her phone.
`[Text overlay] "You're already halfway there."`

**The App Action (2–6s):**
Camera pushes in over her shoulder to the phone: the NowBey map, dark teal aerial of New Providence,
five coloured hazard pins spring onto the map one after another, each with a soft scale-up and a
one-pixel glow. A cream-on-dark card slides up from the bottom edge: "A neighbour confirmed · Bay
Street flooding · just now".
`[Text overlay] "Know what's happening, before you drive."`

**The CTA (6–8s):**
The map blurs into bokeh as the camera pulls back; the phone tilts down. Teal CTA pill appears at
frame-centre: "Open the map". The NowBey pin-and-wave mark resolves beside the wordmark; URL under it.
`[Text overlay] "nowbey.com"`

**Motion/technical:** slow push-in (about 4% scale), spring easing on the pins, no cuts inside the
action beat, 30fps, 9:16, 8 seconds.

---

## Video 2 — "Twenty seconds" (the report flow)

**The Hook (0–2s):**
Handheld close-up at ground level: brown floodwater lapping over a curb at the corner of a Nassau
street, a car tyre half-submerged, reflections wobbling. A hand enters frame holding a phone, screen
angled away, thumb already moving.
`[Text overlay] "Don't just post it in the group."`

**The App Action (2–6s):**
Cut to the phone screen filling the frame: the four-step report flow. A thumb taps "Flooding", the pin
drops onto the map with a soft ring pulse, and text types into the field character by character —
"Water across the lane". The progress stepper advances from 2 to 3. On the sixth second the send
button is pressed and a teal tick springs in.
`[Text overlay] "Four steps. Twenty seconds."`

**The CTA (6–8s):**
Back to the street: the same frame as the hook, now with the water's surface calm for a beat. Teal
pill: "Report a hazard". Mark + wordmark lockup, URL beneath.
`[Text overlay] "nowbey.com/report"`

**Motion/technical:** locked-off screen shot for the action beat (no camera move — the UI moves, not
the frame), 120ms tap feedback, spring ease on the tick, 9:16, 8 seconds.

---

## Video 3 — "Storm warnings are free" (the alerts)

**The Hook (0–2s):**
Interior, night, a Nassau living room lit only by a phone and one warm lamp. Rain streaking a window,
palm shadows moving on the wall. A man on the sofa turns his phone toward a woman beside him; both
look up at the same moment.
`[Text overlay] "The one alert that should be free."`

**The App Action (2–6s):**
Screen fills the frame: the email-alerts screen. Three toggles flip on in sequence — Flooding, Road
hazards, Power outages — each snapping with a small scale bounce. The amber "Storm warnings · always
sent · free for everyone" card lifts with a warm glow that spills past the phone's edges onto the room.
`[Text overlay] "Your island. Your alerts. No noise."`

**The CTA (6–8s):**
Room goes soft-focus; the phone screen's teal light is the brightest thing in frame. Teal pill:
"Set up alerts". Mark + wordmark, URL beneath.
`[Text overlay] "nowbey.com/alerts"`

**Motion/technical:** slow lateral drift (about 2% travel) over the interior beat, hard light from the
phone as the only fill, warm amber accent on the storm card, 9:16, 8 seconds.

---

## Extra: a 6-second bumper for paid social

> **Hook (0–1.5s):** Top-down on wet asphalt, a hazard pin graphic drops into frame and sticks, ripples
> from the impact. `[Text] "Bay Street. Right now."`
> **Action (1.5–4s):** The pin multiplies into five across a dark teal map of New Providence; a cream
> confirmation chip lands on the newest one. `[Text] "Neighbours confirm it."`
> **CTA (4–6s):** Everything fades except the teal CTA pill. `[Text] "nowbey.com"`

---

## Prompt hygiene, learned the hard way

- **Never ask a video model to render a UI with readable text.** It will invent lettering. Render the
  UI yourself (that is what `out/video/*.mp4` is for) and let the model handle the world.
- **Name the light, not the mood.** "Dusk, one streetlight, wet asphalt reflections" gets Nassau;
  "beautiful cinematic lighting" gets California.
- **State the camera move once.** Two moves in one 8-second prompt usually becomes a morph artefact.
- **Keep people's hands still** in the hook frame if you plan to composite a phone into the shot later.
- **Ask for 9:16 and 8 seconds explicitly** — most models default to 16:9 / 4–5s and get cropped or
  looped badly.
