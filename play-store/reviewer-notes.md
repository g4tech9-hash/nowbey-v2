# NowBey — reviewer notes pack (App Access + policy replies)

## 1) Create the reviewer account first (5 minutes, before any submission)

1. In the live app/website, register an **ordinary** account (not staff/admin). Suggested handle: `playreview`.
2. Use an email inbox you control, **confirm the email**, and set a strong password stored in your password manager.
3. Sign in once on a phone and make sure posting, confirming and alerts all work.
4. Never delete this account and never rotate its password without updating Play Console the same day. Reviewers return weeks later on appeals and spot-checks.
5. Check the map's **default view while signed out with location denied**: it must open on New Providence content so a reviewer outside The Bahamas sees a working product, not an empty ocean at their own GPS position.

## 2) App Access form — paste this

Select **“Some functionality in my app is restricted”** and use (fill the two brackets):

> Most of NowBey needs no account: open the app to browse the live community map, the report feed and the Wire. Creating an account is optional and is only needed to post under your own handle and use alert subscriptions.
>
> Review account (You tab → Sign in):
> Handle/email: [REVIEW HANDLE OR EMAIL]
> Password: [REVIEW PASSWORD]
>
> Suggested checks: (1) Map tab — community reports for New Providence, Bahamas; tap any pin to see neighbour confirmations. (2) Report tab — location is requested only if you tap "Use my location"; denying it still lets you browse and place a pin manually. Hazard reports can also be sent without an account. (3) On any report, post or comment, the flag/report option lets users report objectionable content by reason, and authors can be blocked. (4) You tab → Delete my account permanently deletes the signed-in account.
>
> Google sign-in is offered through the system browser as an alternative; it is not required — please use the handle/password account above. NowBey is a community information app, not an emergency service.

Keep the character count in view if Play truncates; credentials and the sign-in path go **first** if you must trim.

## 3) UGC / objectionable-content reply — paste & adapt

> NowBey is a user-generated-content app (community hazard reports, comments and posts). Controls in the released build: (1) users must accept our Terms — which prohibit abusive/objectionable content — before creating an account; (2) every report, post and comment carries a flag action with specific reasons (including spam, abuse and false information) that routes to our admin moderation queue; (3) any author can be blocked, which hides all of their content for that user immediately; (4) anonymous participation is rate-limited (IP processed as a one-way hash) to prevent repeat abuse, and abusive devices/accounts can be banned server-side; (5) the moderation queue is reviewed within 24 hours and violating content/authors are removed. Contact: [SUPPORT EMAIL]. [If replying about a specific item: The content referenced in your notice (ID …) has been removed on (date/time); the author's account has been (warned/suspended).]

## 4) Location reply — if asked

> The app requests foreground ("while in use") location only, and only at the moment the user taps "Use my location" on the Report screen, to pre-place a hazard pin. There is no background location, tracking or geofencing in this build, and the `ACCESS_BACKGROUND_LOCATION` permission is not in the binary. All features remain usable if the permission is denied. This matches the in-app permission purpose string and our privacy policy.

## 5) Payments reply — if asked

> The Android app sells nothing and contains no prices, purchase buttons or links to purchase digital content. NowBey accounts are free; optional plans are a website matter and are not offered or linked for purchase inside the app.

Only send §5 if it is still true of the build you submitted (see the link audit in main-guide Phase 5.3).

## 6) Before every submission, re-run this 90-second drill (signed out, fresh install)

- [ ] App opens on real New Providence content with location **denied**
- [ ] Reviewer account signs in (type the password by hand once — no autofill illusions)
- [ ] Flag + block reachable within two taps from any content
- [ ] You → Delete my account present for the signed-in account
- [ ] Backend up, map tiles loading, no maintenance/deploy window during the next 72 hours
