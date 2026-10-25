# NowBey — Google Play store listing (ready to paste)

Limits checked: app name ≤ 30 chars, short description ≤ 80, full description ≤ 4000.
Re-verify after any edit with the counting snippet at the bottom of this file.

## App name (30 max)

```text
NowBey — Bahamas Safety Map
```

## Short description (80 max)

```text
Bahamas flooding, road, power & water reports from neighbours, live on one map
```

## Full description (4000 max)

```text
Know before you go.

NowBey is a community safety map for The Bahamas. Neighbours report flooding, road hazards, power cuts and water problems on one live map — and other neighbours confirm them, so you can see what is happening, where, and how recently somebody checked.

FREE TO LOOK
Open the map and see current reports around New Providence. No account needed just to look.

REPORT IN ABOUT 20 SECONDS
Drop a pin for flooding, a road hazard, a power cut or a water problem. Use your location with one tap, or place the pin yourself.

CONFIRMED BY NEIGHBOURS
Every report shows who confirmed it and when. Say "still there", "getting worse", "saw it too", or mark it clear, so nobody has to guess from an old post in a group chat.

ALERTS FOR YOUR ISLAND
Choose email or push alerts for new reports on your island, in the categories you care about.

THE WIRE
Local updates and community notices in one feed, next to the map.

Live for New Providence today, growing island by island as communities join.

Please note: NowBey shows community reports, which can be incomplete or wrong. It is not an emergency service and is not affiliated with the Government of The Bahamas, NEMA, the police or any utility. In an emergency call 919 or 911. For official information, check official sources.

NowBey is operated by Oasis Technology. Questions or corrections: oasistechnology242@gmail.com
NowBey™ is a trademark of Oasis Technology.
```

> **Before pasting:** replace the email above if you chose a different single support address in Phase 0 of the main guide. The same address must appear in the privacy policy and the listing contact field.

## Release notes — v1.3.0 (first Play release)

```text
First Google Play release. Live community map for New Providence: flooding, road, power and water reports with neighbour confirmations, island alerts, and the local wire. Free to look — no account needed.
```

## Categorisation & contact fields

| Play field | Enter |
|---|---|
| App category | **Maps & Navigation** (do not pick News & Magazines — see the News declaration note in the main guide) |
| Tags | Pick the closest Play offers (e.g. Maps, Travel/local); skip anything that implies an official service |
| Contact email | The one monitored support address (Phase 0 decision) |
| Website | `https://nowbey-v2.vercel.app` today; change to `https://nowbey.com` only when that domain publicly loads |
| Privacy policy | `https://nowbey-v2.vercel.app/privacy` (same domain rule) |
| Pricing | Free |

## Graphics

| Asset | File | Status |
|---|---|---|
| App icon 512×512 | `play-store/assets/icon-512.png` | ✅ generated from your real adaptive icon on `#03121b` — upload as-is |
| Feature graphic 1024×500 | `play-store/assets/feature-graphic-1024x500.png` | ✅ generated from the launch-kit cover — upload as-is. One caveat: its baked-in subtitle says “…and local news”. If you answer **No** on the News-app declaration (as this pack assumes), regenerate the kit cover with that phrase changed to “community updates” and rebuild this graphic from it, so image and declaration tell one story |
| Phone screenshots (2–8; use 6) | — | 📸 capture from the internal build, shot list below |
| 7″/10″ tablet screenshots | — | Optional at launch; skip unless Play prompts for your app type |
| Preview video | — | Skip for v1. The kit reels are marketing edits; a Play video should show the real app |

### Screenshot shot list (portrait, 1080×1920 recommended)

Capture on a physical Android phone running the **Internal-testing build installed from Play**, signed in as your own tester account. Use genuine New Providence content, no other people's emails/handles in frame, battery/clock as-is is fine. Captions are Play-side text suggestions only — if you later add caption frames, the underlying screenshot must stay a real screen.

1. **Map with live pins** — New Providence visible, a few pins. *Caption: “See hazards near you, live”*
2. **Incident detail with confirmations** — show confirmation count/recency. *Caption: “Confirmed by neighbours”*
3. **Report flow** — pin placement/category step. *Caption: “Report in about 20 seconds”*
4. **Feed/list of reports** — newest first. *Caption: “Every report, newest first”*
5. **The Wire** — community updates feed. *Caption: “Local updates on the wire”*
6. **Alert settings (You tab)** — island/category pickers, **with the email field empty or scrolled out of frame**. *Caption: “Alerts for your island”*

Do not upload the kit's 1080×1080 social posts as screenshots: they are designed graphics with sample UI, and Play expects evidence of the actual app.

## Copy rules (why the text above reads the way it does)

- No “official”, no government/utility names as endorsement, no emergency-service language — plus an explicit 919/911 disclaimer.
- No safety promises (“stay safe”, “keep your family safe”), no “#1 / best / first”, no keyword lists, no price/plan mentions.
- “Community wire”, not “news” — consistent with answering **No** on the News-app declaration. If you ever market the Wire as a news product, change the declaration first, then the copy.
- Trademark is **™**, never ® (marks are claimed by use, not registered — same as your legal pages).

## Re-check character counts after edits

```powershell
python -c "import re; blocks=re.findall(r'```text\n(.*?)```', open('play-store/store-listing.md',encoding='utf-8').read(), re.S); names=['title(<=30)','short(<=80)','full(<=4000)','release notes']; [print(n, len(b.strip())) for n,b in zip(names,blocks)]"
```
