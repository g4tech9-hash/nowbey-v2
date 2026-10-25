# NowBey — closed-test plan (12 testers × 14 days)

Only needed on the **new personal account** route. The rule: at least **12 testers opted in to a closed track continuously for 14 days**, then you *apply* for production access and Google judges engagement, feedback and what you changed. Meeting the headcount unlocks the application — it does not auto-approve it. Recruit **~20** so ordinary drift cannot sink you.

## 1) Track setup (after Internal testing passes — main guide Phase 3)

1. Play Console → **Test and release → Testing → Closed testing** → use the default **Alpha** track → **Create release** from the *same* `.aab` you smoke-tested internally.
2. **Testers tab → Create email list** (e.g. `NowBey Nassau testers`). Add the Google account email each tester uses **in their Play Store app** — that match is what makes the opt-in work. Tell testers you (the developer) can see the email they give you.
3. Set the **feedback email** to your monitored support address.
4. **Countries/regions:** Bahamas + any country a recruited tester is physically in.
5. Submit the closed release for review. Copy the **opt-in URL** once the track is live; that link is the product you are distributing for the next two weeks.

## 2) Who to recruit (real people, in this order)

1. The Facebook/WhatsApp community and HOA groups your launch kit already writes for — they *are* the future user base.
2. Friends/family/coworkers in New Providence with Android phones who will actually open the app.
3. One or two people on older/cheaper Android phones and patchy data — their bug reports are worth five flagship users.

Do not buy tester-farm installs: near-zero engagement is exactly what the production-access review is trained to spot, and fake activity on a public safety map is its own harm.

**Hard rule for everyone, including you: never file a fake hazard.** NowBey's test build talks to the live map. Confirm, clear, comment and react all you like; report only real conditions. Seed test comments/reaction activity on one clearly-real long-running item, and clean up anything experimental through Admin the same day.

## 3) Copy to send (fill the bracket, keep the steps verbatim)

**WhatsApp (short):**

> Nassau, I need 20 Android volunteers 🙏 NowBey (the community flooding/road/power map) can't join the Play Store until 12 testers keep the test version for 14 days — that's Google's rule for new apps. Takes 2 minutes now, then just open it now and then:
> 1) Open this link on your phone and tap **Become a tester**: [OPT-IN LINK]
> 2) Tap the Play Store download link on that same page and install.
> 3) Please keep it installed for 2 weeks and open it when you can. If you switch Play accounts or opt out, your 14 days restart.
> Free, no account needed to look. Bugs or ideas: reply here or [SUPPORT EMAIL]. Bey, thank you. 🗺️

**Facebook group post:**

> **Help put a Bahamas app on the Play Store 🇧🇸**
> NowBey is our community map for flooding, road hazards, power cuts and water problems — neighbours report, neighbours confirm. Google makes new apps prove themselves first: we need at least 12 Android testers to keep the test version installed and opted in for 14 days.
> **To join (2 minutes):** open [OPT-IN LINK] on your Android phone → *Become a tester* → install from the Play Store link on that page. Please use the same Google account as your Play Store app, and keep the app installed for the two weeks.
> No account needed to look at the map. Report only real conditions, please — this is the live map. Feedback: [SUPPORT EMAIL]. New Providence first; other islands, your turn is coming.

**An email to a tester who has gone quiet (day ~6):**

> Quick NowBey test note: you're on day 6 of 14 — thank you. Nothing to buy and nothing to post unless you see a real hazard. Opening the map once today is exactly enough. Anything look broken or confusing? One line back helps more than you know.

## 4) The 14-day calendar

Aim: all 12+ opted in within 48 hours of the track going live, then keep the group gently active. Announce tasks in the same WhatsApp thread.

| Day | Tester ask (one small thing) | Your job |
|---|---|---|
| 1 | Opt in, install **from Play**, open the map | Watch the tester count hit 12+; chase stragglers personally |
| 2 | Confirm (“still there / saw it too”) any real report near you | Check `/api/errors` + Pre-launch report; log every issue |
| 3 | Browse the Wire; react to one post | Fix top papercuts behind the scenes |
| 4 | Set an email alert for your island | Verify alert emails send (Resend) |
| 5 | **Update #1** — install it from Play and say if the thing you flagged is fixed | Ship AAB/OTA update #1 *from feedback*, with tester release notes; announce what changed |
| 6 | Just open the map once | Quiet-day message (§3) to inactive testers |
| 7 | Two-minute feedback form (below) | Publish a “you said / we're doing” summary to the group |
| 8 | Try it on mobile data / weak signal | Note timeouts and tile failures |
| 9 | Deny location permission and place a pin by hand (real item only), or just browse | Prove the no-GPS path reviewers will take |
| 10 | Allow notifications; confirm the test push arrived | Send one announced test push; verify FCM path end to end |
| 11 | **Update #2** — install and retest your report | Ship update #2 from form results; announce changes |
| 12 | (Volunteers) create a throwaway account, then **You → Delete my account** | Confirm deletion works and data is anonymised as the policy says — great production-access evidence |
| 13 | Free use | Draft production-access answers with real numbers |
| 14 | Final 3-question check-out + thank-you | Confirm 12 testers at full 14 continuous days in the Dashboard |
| 15–16 | — | **Apply for production access.** Keep testers in place until Google answers |

**Feedback form (Google Form or email — 5 questions max):**
1. Your phone model + Android version?
2. What did you try to do, and did it work? (one line each: map / report / confirm / alerts)
3. Anything confusing, slow or broken? Where exactly?
4. Would you open this before driving after heavy rain? Why / why not?
5. Anything else bey?

**Tracking sheet columns:** Name · Google email · Phone/Android · Date opted in · Installed ✓ · Day-7 form ✓ · Day-14 still in ✓ · Best feedback quote.

## 5) Production-access application — draft answers (customise with real facts)

> **How testers were recruited:** “NowBey is a community safety map for New Providence, Bahamas. We recruited [20] testers from our existing community — neighbourhood Facebook and WhatsApp groups and homeowners' associations we already post safety updates in — all Android users in the area the app serves.”
>
> **How engaged were they / what did you test:** “Testers received one small task per day for the 14 days: installing from the closed track, confirming real flooding/road reports, setting island alerts, using the app on mobile data, the location-denied path, a push-notification check, and (for volunteers) creating and deleting an account to verify our deletion flow. [N] testers completed the mid-test survey and [N] reported issues directly.”
>
> **Feedback received:** “[Replace with your real top 3–4 themes, e.g. map tiles slow on mobile data; report button wording; alert categories confusing.]”
>
> **Changes made during testing:** “We shipped two updates during the closed test ([version codes/dates]): [change 1], [change 2], [change 3], each traced to tester feedback, and retested the fixes with the testers who reported them.”
>
> **Who is this for / are you ready:** “Adults in The Bahamas checking road, flooding, power and water conditions. Reports are moderated: users accept terms at sign-up, every report/post/comment can be flagged by category, authors can be blocked, and the admin queue is worked within 24 hours. The app is community information, not an emergency service (911/919 disclaimers in-app and on the listing). Crash rates in testing were [x]; we monitor Android Vitals and our server error log after each release.”

Never submit those brackets unfilled, and never claim engagement you cannot show. If refused, Google is asking for *more evidence of real use*: extend the test, improve one real thing, document it, re-apply.

## 6) Traps that reset or waste the clock

- Tester opts out and back in → **their** 14 days restart. Your buffer of 20 absorbs this.
- Tester on the email list but signed into Play with a different Google account → cannot install; fix the email, save, wait for propagation.
- Shipping a brand-new track (Beta alongside Alpha) does not combine clocks. Keep everyone on **one** closed track.
- A new `.aab` mid-test does **not** reset tester opt-in time. Update freely; that is the point.
- Do not pause/remove the closed track while the production-access application is pending.
