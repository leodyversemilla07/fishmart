# FishMart Deployment Guide

This guide covers how to build and deploy the FishMart application for Android and how to deploy the Convex backend.

## Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (LTS)
- [JDK 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) (Required for Android builds)
- [Android Studio](https://developer.android.com/studio) (with Android SDK and Command Import Tools)
- [EAS CLI](https://expo.dev/eas): `npm install -g eas-cli`

## Environment Setup

1. **Environment Variables**: Ensure your `.env` (or `.env.local` for dev) file is populated.
   ```env
   CONVEX_DEPLOYMENT=...
   NEXT_PUBLIC_CONVEX_URL=...
   EXPO_PUBLIC_CONVEX_URL=...
   PAYMONGO_SECRET_KEY=...
   PAYMONGO_WEBHOOK_SECRET=...
   RESEND_API_KEY=...
   RESEND_FROM_EMAIL="Fishmart <no-reply@your-domain.com>"
   PASSWORD_RESET_URL_BASE=fishmart://forgot-password
   ```

   `RESEND_FROM_EMAIL` must be a verified sender/domain in Resend for production password-reset email delivery.

2. **EAS Login**:
   ```bash
   eas login
   ```

---

## 1. Backend Deployment (Convex)

To deploy the backend functions and schema to your production Convex project:

```bash
npx convex deploy
```

For development:
```bash
npx convex dev
```

---

## 2. Android Deployment

### Option A: EAS Build (Cloud - Recommended)
This runs the build on Expo's servers, which is easiest as it handles the environment and signing for you.

**Development Build (for testing)**:
```bash
eas build --profile development --platform android
```

**Production Build (for Play Store)**:
```bash
eas build --profile production --platform android
```

### Option B: Local Android Build (Windows)
*Note: `eas build --local` for Android is not supported natively on Windows (requires WSL). Use Gradle directly.*

#### 1. Prebuild
Generate the native Android directories (`/android`):
```bash
npx expo prebuild
```

#### 2. Build Debug APK
This works for local testing on a device/emulator.

```bash
cd android
./gradlew.bat assembleDebug
```
**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 3. Build Release Bundle (AAB)
For the Google Play Store.

*Note: You must configure Keystores for signing. Using EAS Cloud build is much easier as it manages keys for you. If building locally, you must manually generate a keystore and configure `android/app/build.gradle` signing configs.*

```bash
cd android
./gradlew.bat bundleRelease
```
**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 3. iOS Deployment

*Note: Building for iOS requires a macOS machine.*

### EAS Cloud Build
```bash
eas build --profile production --platform ios
```

### Local Build (macOS only)
```bash
npx expo run:ios --configuration Release
```

---

## Troubleshooting

### "Unsupported platform, macOS or Linux is required"
If running `eas build --local --platform android` on Windows, you will see this error. Use **Option B (Gradle)** above instead.

### Type Errors during Build
Run `npx tsc --noEmit` before building to catch TypeScript errors that might fail the build process.

### Gradle Issues
If the build is stuck or fails with weird errors:
1. Clean the build:
   ```bash
   cd android
   ./gradlew.bat clean
   ```
2. Re-run the build command.
