# mobile

React Native 0.74. Two app flavors (driver / customer) in one codebase, toggled by
a feature flag at startup. iOS + Android.

See ADR 0002 for the why (we used to ship two native apps; pivoted in 2023).

## Run locally

```sh
yarn install
yarn ios      # or
yarn android
```

You will need Xcode 15+ for iOS and Android Studio with API 34+ for Android.

## Layout

```
App.tsx                  — entrypoint, reads APP_FLAVOR
src/
  screens/
    HomeScreen.tsx       — launch screen for the customer flavor
    TrackingScreen.tsx   — AWB lookup
  services/
    api.ts               — thin client over the modern backend
```

## Native modules

Three native modules we depend on:

- `react-native-camera` for barcode scanning (driver flavor only).
- `@react-native-community/geolocation` + a custom native module for background
  location (driver flavor only).
- `@react-native-firebase/messaging` for push.

The barcode scanner package was last updated in 2024 (the maintainer announced a hiatus).
We're pinned. There's a community fork; we have not switched yet.

## Known issues

- Push delivery on certain Xiaomi devices is unreliable due to OS battery saver. Workaround
  is documented in Confluence (search "MIUI push").
- Driver app perf on cheap Android phones (~$120) is "okay" not "great". Active project
  NUS-3402.

## Releases

We deploy mobile from a CI runner with the Apple/Google credentials. **Always TestFlight +
Play internal first**, even for hotfixes. We lost a week in 2023 shipping a broken APK direct
to prod — not doing that again.
