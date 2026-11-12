# LABAS Private — mobile

React Native CLI app (0.84), same approach as Nails Studio. Not Expo.

Today, Progress, and Report. Invitation login, plus a sample journey that needs no Supabase keys.

## Run

Finish the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) first.

```sh
npm start
npm run android
```

iOS, from macOS: `npm run ios` after `pod install` in `ios`.

## Supabase

Copy `.env.example` to `.env`. Rebuild after any change. Metro refresh does not embed new values.

Android reads `.env` through `dotenv.gradle` in `android/app/build.gradle`.

iOS needs the react-native-config build phase once, after the pods are installed. In Xcode, on the LabasPrivate target, add a Run Script phase:

```sh
"${SRCROOT}/../node_modules/react-native-config/ios/ReactNativeConfig/BuildXCConfig.rb" "${SRCROOT}/.." "${SRCROOT}/tmp.xcconfig"
```

The product setup and the order of work are in `../docs/ROADMAP.md`.
