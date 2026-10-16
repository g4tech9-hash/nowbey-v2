# Rules
- Never run eas commands (build, update, submit) unless I say "deploy to Expo".
- No Google Maps or API-key map services. Maps use OpenStreetMap (the OSMMap component).
- Add dependencies with `npx expo install <package>`, then `npm install`. Keep package.json and package-lock.json in sync and never edit the lock by hand. Peer dependencies (reanimated, gesture-handler, worklets, @react-native/* tooling) must be explicit dependencies at Expo-compatible versions.
- A Stop hook runs quick checks after changes. Fix any failure it reports and never disable it.
- Before saying the app is ready for an EAS build, run /preflight.
- Token thrift: be concise and don't narrate. Never read node_modules or lock files, and read logs only by their last 30 lines. Never re-read files you just wrote, never paste long command output, and keep summaries to 8 lines or fewer.
