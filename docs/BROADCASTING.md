# LiveKit broadcasting setup

## What this integration adds

`/broadcast` is a phone-browser camera/microphone studio and public live viewer. Staff and members with an active Broadcaster grant can publish; viewer tokens cannot publish camera, microphone, or data. Camera and microphone permissions are requested only after Go live. Recording/egress is not started by this integration. No native Expo broadcasting SDK is included.

## Provider-side steps (authorized owner required)

1. Create/select a LiveKit Cloud project. Review current pricing, usage and billing limits before enabling real broadcasts. This session does not create an account or authorize spending.
2. Copy its `wss://…` project URL, API key and API secret into Vercel Production as `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Never expose the secret to browser code, chat or Git.
3. Configure a LiveKit webhook to `https://nowbey-v2.vercel.app/api/streams/webhook`, signed with the same API key. Subscribe to `room_finished` and `participant_left`. Signature verification uses the raw body. Publisher departures end the listing and disconnect remaining viewers; there is intentionally no reconnect grace period in this first version.
4. Run the repository's root `add-live-streams.sql` in Neon production (Run, not Explain).
5. Merge/deploy code and environment changes. The existing site header live/cached badge is unrelated.
6. In Admin → Members → member, grant Broadcaster status with a reason; staff can publish without this grant.
7. Open `/broadcast` in HTTPS Chrome/Safari, enter a title and choose Go live. Allow camera and microphone access. On another device open `/broadcast` and select Watch. If autoplay blocks audio, tap Enable audio.
8. Use End broadcast, then verify viewers disconnect and it leaves the live list. Test Admin → Streams → Kill stream with a reason and verify the provider room actually disappears.

## Operational boundaries

- A maximum of 100 participants per room is configured; it is not a spending cap. Set provider-side usage alerts/limits as available.
- Tokens expire after 60 seconds for joining; a connected session may last longer. A token issued just before a staff stop can remain valid until its short expiry. Database/token checks and room deletion deny new normal application joins; this is not a guarantee against a deliberately reused token in that window.
- Listing removal precedes provider disconnect. If disconnect fails, the API reports a 502 and directs staff to the LiveKit dashboard. Staff can retry the kill endpoint for an already stopped listing. Provider dashboard shutdown is the emergency fallback.
- Broadcaster grant revocation blocks future publisher tokens, but does not stop an already connected broadcast: staff must also Kill stream.
- Signed lifecycle webhooks prevent abandoned listings when the publisher exits or a room finishes. Without configured/reachable webhooks, listings can remain stale; no production-ready availability claim is made without testing these events.
- This version lists streams in `/broadcast` and the admin grid. It does not add livestream markers to the geographic map.
- Uploads and recording are separate from broadcasting; no recordings are created by this code. The provider may have its own retention/logging policies.

## Acceptance checklist

Test camera denial and partial microphone permission failures (tracks must stop), owner end, publisher tab close, staff kill, expired/revoked broadcaster grants, anonymous receive-only viewing, private keys absent from browser responses, invalid webhook signature rejection, duplicate start attempts, provider outages and mobile audio playback. These require real LiveKit and Postgres and were not performed in the sandbox.
