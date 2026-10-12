# NowBey mobile

The NowBey community safety map and news wire for The Bahamas, as an Expo app for
iPhone and Android. It has the same feed, map, reports and wire as the website and signs
in with the same accounts.

**There is no second server.** The app talks to the NowBey website's own API, so run (or
deploy) the website first and point the app at it.

## Run it

You need Node.js 20 or newer and the free **Expo Go** app on your phone (phone and computer on the same Wi-Fi).

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iPhone).

### Telling the app where the website is

The app needs the NowBey website running somewhere it can reach. Easiest: open the **You** tab,
type the website address under **Server address** and tap **Save and test**. It is remembered.

- **Your deployed site** (for example `https://your-site.example`) works everywhere, including mobile data.
- **The site on your computer**: the app tries your computer's address on port 3000 by itself. If that
  fails, type `http://<your-computer-ip>:3000`. `localhost` never works on a phone.
- Or set it before starting: `EXPO_PUBLIC_API_BASE=https://... npx expo start`.

## What is in it

| Tab | What it does |
| --- | --- |
| Feed | Open reports, filter by island and category, pull to refresh. |
| Map | Hybrid aerial map with street names, a pin for every report and a list underneath. |
| Report | Three steps: what, where (tap the map, drag the pin, or use your location), details. |
| Life | Island Life: restaurant tips, event experiences and local advice, with photos. Tap a post to react and comment right in the app. To write a post or add photos, the app opens the website. |
| Wire | News from Bahamian outlets placed on the map, and a form to send a story link. |
| You | Sign in or create an account, see your plan, set up email alerts. |

Tapping a report opens its page with the pin, confirmations and a timeline, and below it a place to **react** (👍 ❤️ 🙏 😮 😢) and **comment**. Comments can be replied to, reported, and deleted if they are yours. News stories open their discussion on the website.

## Accounts

- **Creating an account needs an email address** and a password of at least 8 characters. The email is how a forgotten
  password is reset, and we send a link to confirm it.
- **Signing in** works with your handle or your email.
- **Forgot your password?** The button opens the website's reset page. Resetting there signs you out on every device,
  including this one, so sign in again afterwards.
- **Changing your password, email or name, and deleting your account,** are on the website under *Account settings*. The
  app links straight to it from the **You** tab.
- **Suspended accounts** are signed out at once and cannot sign in.

## Look and feel

The app opens with a splash screen (a Nassau twilight photo, the pin, the tagline "Stay Safe, Bahamas") and the Feed header sits on a photo.
That is the **Island** look. To go back to the plain original:

```bash
EXPO_PUBLIC_NOWBEY_THEME=classic npx expo start
```

Classic has no photos and no splash. To keep the photos but skip only the splash, use `EXPO_PUBLIC_NOWBEY_SPLASH=off`. The wording lives in `src/brand.ts`,
and the photo is `assets/splash-scene.jpg` (replace it with any portrait JPEG to use your own).

## Good to know

- **Plans are bought on the website.** The app shows your plan after you sign in and links to
  the website to change it. Apple and Google require their own in-app purchase system for
  subscriptions sold inside an app, so adding purchases to the app is a separate piece of work.
- **The map needs iPhone or Android.** In a desktop browser (`npm run web`) the app shows a pin
  list instead of the map.
- **Sign-in** uses a token kept in the phone's secure storage, not a cookie.
- **Maps in a store build:** Expo Go includes maps. A standalone Android build needs a Google
  Maps API key in `app.json` under `expo.android.config.googleMaps.apiKey`.

## Publish to the stores

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all
```

Set `expo.extra.apiBase` in `app.json` to your live https address first, because store builds
only allow secure connections.

## Check your changes

```bash
npm run typecheck
```
