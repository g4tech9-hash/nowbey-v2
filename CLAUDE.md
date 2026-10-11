# Build rules

- NEVER run `eas build`, `eas update`, `eas submit`, or `npx eas ...` unless I
  explicitly say "deploy to Expo". These use my limited free build slots.
- To check that the app works, use only local commands:
  - `npx tsc --noEmit` (type errors)
  - `npx expo-doctor` (config and dependency problems)
  - `npx expo export --platform android` (confirms the JS bundle compiles, no upload)
  - `npx expo start` (dev server; I test on my phone with Expo Go)
- Fix all errors from these checks before telling me something is ready.
- When you think the app is ready, stop and tell me. I'll decide when to build on Expo.
