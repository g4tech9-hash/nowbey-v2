// Adds store-build settings that come from the environment, on top of app.json.
// GOOGLE_MAPS_ANDROID_KEY: a Google Maps SDK for Android key. Without it the map is blank in a Play Store build
// (Expo Go has its own, so development is unaffected).
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_KEY;
  return {
    ...config,
    android: {
      ...config.android,
      ...(key ? { config: { googleMaps: { apiKey: key } } } : {}),
    },
  };
};
