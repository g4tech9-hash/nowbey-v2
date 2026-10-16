# Profile photos and badges

## Existing badge controls

Admin → Members → open the member → scroll to **Verified badge**. Enter a reason (at least four characters), choose the expiry and press **Grant**. Revocation is available on the same page. The reason should not contain private identity documents or sensitive verification details.

- Verified reporter: manually granted, never purchased; does not guarantee every report is true.
- NowBey desk: derived from staff roles, not a paid verification badge.
- Broadcaster: a separate grant on the member page that permits livestreaming. Grant sparingly; this is a permission, not just decoration.

Proposed badges, not implemented: Community helper (reviewed helpful contributions), Island contributor (consistent useful local reports), Founding neighbour (early participation), Community partner (reviewed organization). Decorative badges should not confer moderation or broadcast permissions. Avoid emergency-service titles without organizational verification.

## Profile photo release step

Run `src/db/add-profile-photos.sql` in the correct Neon production database before using uploads. It creates one optional photo row per user and does not alter accounts, passwords or roles. No new provider keys or storage service are required. Photos are stored in Postgres; monitor database storage as adoption grows.

Then deploy the branch. Members visit `/you/profile` to upload or remove a photo and edit their existing bio/privacy settings. Their public profile `/u/<handle>` has an avatar, decorative banner, name, handle, island, join date, bio, badges, contribution counts and report feed. This does not add followers, DMs or new public contact fields.

Uploads: JPEG/PNG/WebP only; actual request bytes limited to 3 MB, decoded pixels bounded by the existing photo processor, orientation applied, metadata stripped, re-encoded to a 320×320 JPEG. Owner authentication, origin checking and rate limiting protect changes. Private profile photos require owner/admin access, suspended accounts have no served photo, and responses use private/no-store caching. Missing migration reads fall back to initials; writes report the migration requirement.

## Manual acceptance after deployment

- Upload JPEG, PNG and WebP; verify square crop and immediate preview refresh.
- Remove photo; verify initials return. Refresh public profile to confirm persistence.
- Reject oversized images and non-image bytes disguised as JPEG.
- Sign out and view an open profile and its photo.
- Make profile private: anonymous and other ordinary members must not see the photo, including a direct `/api/avatars/<handle>` request. Owner/admin can see it.
- Verify existing profile privacy, bio editing and report hiding still work.
- Check phone widths and keyboard operation of the file chooser and remove button.

Unit/source regression tests, type-checking and lint are automated. Real database upload round trips and browser checks require the deployed migration and remain manual acceptance steps.
