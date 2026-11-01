# Android build and shared API

The checked-in project was generated with official `@capacitor/android` 8.6.0.
Application ID: `com.elibraryai.app`. Name: **E-Library AI**. Version: `0.1.0`.
`webDir` is `dist`; there is no remotely hosted `server.url`. Gradle packages React
assets copied into `android/app/src/main/assets/public` during synchronization.
Build outputs and copied assets remain ignored; fresh clones must run sync first.

## Toolchain

Install Android Studio 2025.2.1 or later and its JDK 21. In SDK Manager install
Android SDK Platform 36, build tools, platform tools, and command-line tools.
Select JDK 21 as the Gradle JDK and configure `ANDROID_HOME`/SDK location for CLI
builds. The project specifies Gradle 8.14.3, Android Gradle Plugin 8.13.0, minimum
SDK 24, compile/target SDK 36. The wrapper is included; standalone Gradle is unnecessary.
See [official Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

This machine has no Java runtime, Android SDK, Android Studio, ADB, or connected device.
Executing `./gradlew assembleDebug` failed with “Unable to locate a Java Runtime.”
No APK or physical-device success is claimed.

## Point both clients at one backend

1. Run the backend on a reachable HTTPS host with the migrated PostgreSQL database.
2. Set `VITE_API_BASE_URL=https://YOUR_API_HOST/api/v1` in `apps/web/.env.production`.
3. Set backend `CORS_ORIGINS` to the exact website origin plus `https://localhost`
   and `capacitor://localhost`; do not use `*`.
4. Set production secure cookies for the website; Android uses bearer sessions.
5. Run from the repository root:

```bash
npm run android:sync
npm run android:open
npm run android:apk
```

The scripts validate the native API address, build React, synchronize Capacitor,
and run `assembleDebug`. On Windows the script uses `gradlew.bat`. Direct commands
are `cd apps/web/android && ./gradlew assembleDebug` on macOS/Linux and
`cd apps/web/android; .\gradlew.bat assembleDebug` in PowerShell, after sync.

Output relative to root: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`.

For local backend development, use a reachable HTTPS development tunnel or a trusted
HTTPS LAN endpoint and update the environment before rebuilding. Emulator
`10.0.2.2` maps to the host, but this project deliberately does not enable plain HTTP.
Device `localhost` points to the phone, not the development computer. No cleartext
release exception or trust-all certificate handler is installed.

## Install and verify physically

Enable Developer options and USB debugging on an Android device. Connect and approve
the debugging prompt, then run:

```bash
adb devices
adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
```

Launch E-Library AI. Register on the website and log in on Android with the same
credentials. Verify the same `/auth/me` user ID, browse the eight database books,
create a guest session, and verify sign-out invalidates that session. Test offline
errors, system dark mode, keyboard/forms, status-bar contrast, safe-area insets,
and hardware Back. Back traverses app routes and exits from the welcome/dashboard root.

Native sessions live in memory; restarting the process requires another login.
The default generated launcher PNGs and splash images are explicit placeholders.
Replace them with production artwork before distribution; `public/icon.svg` provides
the project's original book-mark design. Debug signing is for testing only; release
keystores must remain outside Git. Physical validation is a remaining prerequisite,
not a result of browser mobile emulation.
