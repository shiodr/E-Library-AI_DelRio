# Android build and shared API

The checked-in project was generated with official `@capacitor/android` 8.6.0.
Application ID: `com.elibraryai.app`. Name: **E-Library AI by shio del rio**. Version: `0.1.0`.
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

## Current verified debug APK — November 5, 2026

The existing `npm run android:apk` command completed successfully with Gradle 8.14.3
and JDK 21: 153 tasks, 27 executed and 126 up to date. The APK was built on November 4
and its installed application was verified on November 5. The initial November 3 build
also installed Build-Tools 35.0.0 as required by the existing Android Gradle Plugin;
Build-Tools 36.0.0 remains installed.

- Output: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`.
- Size: **4,595,620 bytes** (approximately 4.38 MiB).
- SHA-256: `5146b8a6a1dbfa7af29a8400d4a3c267592d0f3c6a0b0cc628df873a597e360f`.
- Package: `com.elibraryai.app`; version `0.1.0`; minimum API 24; target API 36.
- `apksigner verify` passed; the compiled launcher label is `E-Library AI by shio del rio`.
- APK inspection confirmed bundled `assets/public/index.html`, no remote `server.url`,
  cleartext disabled, and API URL `https://backend-shiodr.wasmer.app/api/v1`.

The first Gradle download was slow. The remaining official archive was fetched in
HTTP ranges, combined with its downloaded prefix, and checked against Gradle's
published SHA-256 before being placed in the existing wrapper cache. The wrapper
version and distribution URL stayed unchanged. No global Gradle was installed.
Only normal debug signing was used; no release signing configuration or key was added
to the repository. APKs, local SDK settings, and signing stores remain ignored.

The expanded Phase 1 APK includes the shared catalog assistant, My Library tracking
history, favorites, and explicit tracking-demonstration controls. Six checkpoints passed
in the installed API 36 ARM64 WebView against the production backend: shared website
identity, synchronized history/favorites, administrator catalog changes, assistant retrieval
and retry, original-session restoration after force-stop, and Web Storage/Back behavior.
Keyboard and safe-area screenshots were inspected. OpenAI generation remains blocked by
owner choice; both assistant replies used real catalog retrieval with `catalog_only`.
Twenty-two frontend unit tests and twelve desktop/mobile browser tests also passed.
Detailed evidence and earlier dated results are recorded in [testing](testing.md).

The preceding persistent-login APK passed seven focused native checks, including
full force-stop/relaunch with the same account and original token, offline retry,
logout, external revocation, corrupt storage, and absence of exposed credentials
from the encrypted file, Logcat, and Web Storage. Eighteen frontend unit tests and
six desktop/mobile browser checks also passed. The later branding-only build retained
that implementation and passed all eighteen then-current frontend tests. The expanded
current build retains the creator credit and persistent-login fix. Package ID and signing identity are unchanged,
so install it over the existing app to retain its data and saved session.

This APK retains visible `by shio del rio` branding and encrypted persistent login, and
replaces the earlier debug artifacts at the same output path. The preceding November 4 catalog APK passed fifteen
installed-application checks: registration, valid/invalid login,
the website-created account's matching user ID, guest access, the 200-title catalog
with 60 Rust books, pagination, free/paid source labels, preview/Back navigation,
loading/error/retry, logout revocation, HTTPS requests, website re-login, and
Back-to-exit. Android reported a visible keyboard. Clean catalog screenshots showed
readable system bars, navigation above the gesture bar, and no horizontal overflow.
Physical-phone testing remains separate.

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
credentials. Verify the same `/auth/me` user ID, browse the 200 programming books,
create a guest session, and verify sign-out invalidates that session. Test offline
errors, system dark mode, keyboard/forms, status-bar contrast, safe-area insets,
and hardware Back. Back traverses app routes and exits from the welcome/dashboard root.

Native sessions survive closing, force-stopping, and reopening the app until
server expiry, revocation, or explicit logout. The native plugin stores only an
AES-GCM-encrypted token in the app's backup-excluded directory, with its key in
Android Keystore. Startup validates the restored session with the shared backend.
Offline startup shows a retry state and retains the saved session.

On November 4 the user reported testing the previous APK on a Samsung phone and
losing login after reopening. That build held its token only in memory. Install
this updated APK over the existing installation, sign in once, fully close the
app, and reopen it. It should open the dashboard without requesting credentials.
Then sign out and reopen it to confirm it stays signed out. Clearing app data or
uninstalling removes the saved session. The corrected build still needs confirmation
on that Samsung phone; emulator evidence is recorded separately.

The storage design uses [Android Keystore](https://developer.android.com/privacy-and-security/keystore)
and the app-private [no-backup directory](https://developer.android.com/reference/android/content/Context#getNoBackupFilesDir()).
The default generated launcher PNGs and splash images are explicit placeholders.
Replace them with production artwork before distribution; `public/icon.svg` provides
the project's original book-mark design. Debug signing is for testing only; release
keystores must remain outside Git. Agent-executed native checks use an installed
APK in an Android emulator; the Samsung testing above is user-reported.
