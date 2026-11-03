# Android build and shared API

The checked-in project was generated with official `@capacitor/android` 8.6.0.
Application ID: `com.elibraryai.app`. Name: **E-Library AI**. Version: `0.1.0`.
`webDir` is `dist`; there is no remotely hosted `server.url`. Gradle packages React
assets copied into `android/app/src/main/assets/public` during synchronization.
Build outputs and copied assets remain ignored; fresh clones must run sync first.

## Toolchain

The project requires **JDK 21**, Gradle 8.14.3, Android Gradle Plugin 8.13.0, and
Android SDK Platform 36. Its minimum SDK is 24; compile and target SDK are 36.
Use the checked-in Gradle wrapper; no global Gradle or Capacitor installation is needed.

### Apple Silicon setup

Check existing installations before running these commands. This workspace uses
one SDK at `/opt/homebrew/share/android-commandlinetools`, shared by the CLI and
Android Studio:

```bash
brew install --cask android-studio android-commandlinetools
brew install openjdk@21
```

Add the following block once to `~/.zshrc`, then run `source ~/.zshrc`:

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/opt/homebrew/bin:$PATH"
```

Install SDK packages and review/accept Google's licenses interactively:

```bash
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" --install \
  "platforms;android-36" "build-tools;36.0.0" "platform-tools"

# Optional: ARM64 emulator packages for this Apple Silicon Mac.
sdkmanager --sdk_root="$ANDROID_HOME" --install \
  "emulator" "system-images;android-36;google_apis;arm64-v8a"
```

The Homebrew command-line tools cask supplies `sdkmanager` and `avdmanager`.
Google now marks `sdkmanager` deprecated in favor of its Android CLI, but the
installed command-line tools still provide the verified commands above.
See [Google's SDK package and license instructions](https://developer.android.com/tools/sdkmanager)
and [Homebrew's SDK directory documentation](https://formulae.brew.sh/cask/android-commandlinetools).

Verify the active environment from the repository root:

```bash
java -version
adb version
sdkmanager --sdk_root="$ANDROID_HOME" --list_installed
cd apps/web/android
./gradlew --version
```

Android Studio's first-run wizard is optional for CLI builds. If using the IDE,
set its SDK location to the same `ANDROID_HOME` directory and its Gradle JDK to
the JDK 21 directory above. The installed Android Studio bundles Java 25; this
project's explicit JDK 21 setting avoids using that bundled runtime for Gradle.
The workspace's `android/local.properties` also points to the shared SDK and
remains ignored by Git. Do not create a duplicate SDK through the setup wizard.
See [official Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

### Verified environment on November 3, 2026

| Component | Verified installation |
| --- | --- |
| Android Studio | 2026.2.2.8, Apple Silicon |
| Homebrew OpenJDK 21 | 21.0.13.0.3; active Java 21 |
| SDK Platform 36 | Revision 2 |
| Build-Tools | 36.0.0 |
| Platform-Tools | 37.0.1; ADB works |
| Command-line Tools | 22.0 |
| Android Emulator | 37.2.13 |
| Emulator image | API 36 Google APIs, ARM64-v8a, revision 7 |

The API 36 ARM64 emulator booted with hardware acceleration. APK build and native
application test results remain separate from toolchain installation evidence.

## Verified debug APK — November 3, 2026

The existing `npm run android:apk` command completed successfully with Gradle 8.14.3
and JDK 21: 153 tasks executed. Gradle also installed Build-Tools 35.0.0 as required
by the existing Android Gradle Plugin; Build-Tools 36.0.0 remains installed.

- Output: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`.
- Size: **4,305,221 bytes** (approximately 4.11 MiB).
- SHA-256: `aaf91eb09762048fc171e74981c6e7efa4c3e582f5641ad321dc8eaf82a518e8`.
- Package: `com.elibraryai.app`; version `0.1.0`; minimum API 24; target API 36.
- `apksigner verify` passed; ADB installation on `emulator-5554` returned `Success`.
- APK inspection confirmed bundled `assets/public/index.html`, no remote `server.url`,
  cleartext disabled, and API URL `https://backend-shiodr.wasmer.app/api/v1`.

The first Gradle download was slow. The remaining official archive was fetched in
HTTP ranges, combined with its downloaded prefix, and checked against Gradle's
published SHA-256 before being placed in the existing wrapper cache. The wrapper
version and distribution URL stayed unchanged. No global Gradle was installed.
Only normal debug signing was used; no release signing configuration or key was added
to the repository. APKs, local SDK settings, and signing stores remain ignored.

Functional emulator results are recorded separately in [testing](testing.md).

Fifteen checks passed in the installed APK: registration, valid/invalid login,
the website-created account's matching user ID, guest access, eight-book catalog,
preview/Back navigation, loading/error/retry, logout revocation, HTTPS requests,
website re-login, and Back-to-exit. Android keyboard visibility and empty-form
layout were also observed. Clean screenshots showed readable system bars and
navigation above the gesture bar. Physical-phone testing remains separate.

To open the existing test emulator visibly on this Mac:

```bash
source ~/.zshrc
emulator -avd elibrary-phase1-api36 -memory 1536 -cores 2 -gpu software
```

Run the emulator in one terminal and ADB install/launch commands in another:

```bash
adb devices
adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.elibraryai.app/.MainActivity
```

The test emulator is specific to this workspace. For a new machine, create it once
after installing the optional ARM64 image:

```bash
avdmanager create avd --name elibrary-phase1-api36 \
  --package "system-images;android-36;google_apis;arm64-v8a" --device pixel_7
```

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
keystores must remain outside Git. The recorded native test used an installed APK
in an Android emulator; physical-phone validation remains unexecuted.
