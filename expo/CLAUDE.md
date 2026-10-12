
## After every change
- A Stop hook (.claude/hooks/preflight.js) runs `npm ci --dry-run`, `npx tsc --noEmit` and, when package.json, app.json, eas.json or the babel/metro config changed, `npx expo-doctor`. If it reports a failure, fix it before finishing. Never bypass or disable the hook.
- When adding or changing a dependency, use `npx expo install <package>`, then `npm install`, then confirm `npm ci --dry-run` passes. Never edit package-lock.json by hand.
- Peer dependencies (reanimated, gesture-handler, worklets and the @react-native/* tooling packages) must be explicit dependencies at Expo-compatible versions.
- Maps use OpenStreetMap through the OSMMap component. Never add Google Maps or any API-key-based map service.
- Before telling me the app is ready for an EAS build, run the /preflight command.
- Never run eas commands.
