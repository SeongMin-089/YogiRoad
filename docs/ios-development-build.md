# iOS Development Build and Google Login

YogiRoad uses Expo SDK 57, `expo-dev-client`, Firebase JS Auth, and
`@react-native-google-signin/google-signin`. Google login must be tested in the
YogiRoad development build, not Expo Go.

## Identifiers

- iOS bundle identifier: `com.yogiroad.app`
- Android package: `com.yogiroad.app`
- App URL scheme: `yogiroad`

The Firebase iOS app and Google iOS OAuth client must use the exact iOS bundle
identifier above. If an existing Firebase app uses another identifier, update
the Expo config and both consoles together before building.

## Firebase and Google configuration

1. Enable Google under Firebase Authentication > Sign-in method.
2. Register an iOS app with bundle ID `com.yogiroad.app`.
3. Download `GoogleService-Info.plist` and keep it outside Git.
4. Create or identify these OAuth clients:
   - Web OAuth client ID -> `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - iOS OAuth client ID -> `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
5. Copy `.env.example` to `.env` and fill all Firebase client values.
6. Set `GOOGLE_SERVICE_INFO_PLIST=./GoogleService-Info.plist` locally.

`webClientId` must be the Web OAuth client ID. It is used to obtain the Google
ID token that Firebase exchanges for a Firebase credential. The iOS value must
be the iOS OAuth client ID for `com.yogiroad.app`.

## EAS setup

The repository contains a `development` profile in `eas.json`. Before the first
build, link or create the EAS project interactively:

```powershell
npx eas-cli login
npx eas-cli init
```

In the EAS project dashboard, create the following variables in the
`development` environment:

- All `EXPO_PUBLIC_*` values listed in `.env.example`
- `GOOGLE_SERVICE_INFO_PLIST` as a file variable containing
  `GoogleService-Info.plist`
- `GOOGLE_SERVICES_JSON` only when an Android Firebase native configuration is
  also used

`EXPO_PUBLIC_*` values are embedded in the client and are not secrets. The
plist is Firebase client configuration rather than an Admin credential, but it
is supplied as an EAS file variable here to keep environment-specific files out
of the repository.

## Build and install on an iPhone from Windows

An EAS internal-distribution iOS build requires Apple signing. Register the
iPhone before building when EAS requests an ad hoc provisioning profile:

```powershell
npx eas-cli device:create
npx eas-cli build --profile development --platform ios
```

Install the completed build from the EAS install link or QR code. Then start
Metro and open the installed YogiRoad development app:

```powershell
npm run start:dev
```

The iPhone and PC should be on the same network. If LAN discovery is blocked,
use `npx expo start --dev-client --tunnel`.

EAS cloud signing for a physical iPhone generally requires a paid Apple
Developer Program membership. Without one, the alternative is a local Xcode
build on a Mac with `npx expo run:ios --device`; Windows cannot perform that
local iOS build.

## Backend

The Admin SDK must use a service account from the same Firebase project as the
frontend config:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\firebase-service-account.json"
cd backend
.\gradlew.bat bootRun
```

Never commit the service account JSON. For a real iPhone, `EXPO_PUBLIC_API_BASE_URL`
must point to an address the phone can reach, not `localhost` on the PC.

## Troubleshooting

- Expo Go native-module error: install and open the YogiRoad development build.
- `idToken` is null: verify that `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is a Web
  OAuth client ID and rebuild after changing EAS variables.
- `invalid_client`: verify the iOS OAuth client ID and bundle identifier.
- URL scheme error: verify the plist belongs to the registered iOS app and was
  available to the build through `GOOGLE_SERVICE_INFO_PLIST`.
- Android `DEVELOPER_ERROR` or error 10: verify package name and SHA-1 values in
  Firebase/Google Cloud.
- Backend 401 after successful login: verify frontend `projectId` and backend
  service-account project are identical, then confirm the Authorization header
  contains the Firebase ID token.
- Metro does not connect: use the same network, allow the firewall prompt, or
  start with `--tunnel`.
- EAS values are missing: add them to the `development` environment and rebuild
  the native app.
