# Updates in CV Studio

This page says exactly what the update system does in 3.1.0, how it was investigated, and what is still blocked.

## Status in one table

| Capability | Status in 3.1.0 |
| --- | --- |
| Check GitHub Releases for a newer **stable** version | Implemented and tested (real `electron-updater` against a controlled local feed) |
| Notification with version, release notes ("Wat is er nieuw?"), "Later" | Implemented |
| Link to the official release page | Implemented |
| Settings: current version, check now, automatic check on or off, last result | Implemented (About dialog, the info button in the title bar) |
| Offline, missing release and rate limit handling | Implemented and tested |
| Never downgrade, ignore pre-releases | Implemented and tested |
| **Download inside the app and install after restart** | Implemented in code and tested up to the point of starting the installer, but **disabled in release builds** (see below) |
| Verified replacement of an installed version by a newer installer | **Not verified on native Windows. Not enabled.** |

Notification only is **not** described as automatic installation: in 3.1.0 a new version is announced and the user is sent to the release page to download it manually.

## Why automatic installation is off

I read the code of the exact installed versions (`electron-updater` 6.8.9, `electron-builder` 26.15.3, `builder-util-runtime` 9.7.0):

- `latest.yml` carries the SHA-512 of the installer. `electron-updater` checks the downloaded file against it. This detects a damaged or mismatching download.
- `latest.yml` itself is **not signed**. It is downloaded from the same GitHub release as the installer. Anyone who can write to a release (a compromised maintainer account or token, for example) can replace both files consistently, and the check still passes.
- `electron-updater` verifies **who published** the installer only when `publisherName` is set in the build configuration. It then asks Windows for the Authenticode signature (`Get-AuthenticodeSignature`) of the downloaded installer and compares the certificate name. Without `publisherName`, `NsisUpdater.verifySignature` returns early and nothing is verified (`node_modules/electron-updater/out/NsisUpdater.js`).
- The CV Studio installers are **not Authenticode-signed**, so there is no publisher to verify.

Installing a downloaded executable and running it on the user's computer on the strength of an unsigned manifest would not be a safe update system, so the update verification was **not** weakened to make unsigned updates install. Instead, the build only enables installation when it is configured to verify the publisher:

- `build.win.publisherName` in `package.json` is empty, so `scripts/build-electron.mjs` bakes an empty publisher into the app and `electron/main.ts` sets `canInstall = false`.
- With `canInstall = false` the service never downloads and never installs; it only announces the version and links to the release (`electron/updateService.ts`, tested in `tests/update.test.ts`).
- The same `publisherName` entry makes `electron-builder` write it into `app-update.yml`, which makes `electron-updater` verify the Authenticode signature. Setting it flips both switches at once, so the app cannot install updates without also verifying them.

## What is needed to turn it on

One of these has to exist first:

1. **An Authenticode code-signing certificate** (OV, EV or a managed service such as Azure Trusted Signing). Then configure signing in `electron-builder` (`win.signtoolOptions` or the Azure signing options), set `win.publisherName` to the certificate's common name, keep the certificate or its credentials in GitHub secrets (never in the repository or the app), and sign in CI.
2. **Or a signed manifest with a pinned key:** sign `latest.yml` (or the installer hash) with an Ed25519 key kept offline or in a GitHub secret, embed only the public key in the app, and verify through `NsisUpdater.verifyUpdateCodeSignature` before installing. This requires the maintainer to create and safeguard the private key. It was not built, because no key exists and generating one for the maintainer here would put the secret in the wrong place.

After that, qualify the pipeline (below) and only then ship a build with `publisherName` set.

## Qualification checklist (must be done on native Windows)

Run this with two controlled packaged versions (for example 3.1.0 and 3.1.1) from a test feed or a private staging release, never from the production release channel:

1. Install the older version. Create a CV with a photo, several versions and custom skills.
2. Point the app at the feed (`CV_STUDIO_TEST=1`, `CV_STUDIO_UPDATE_FEED=<url>`, `CV_STUDIO_UPDATE_TRUST=1`; these variables only work in test mode and are ignored in a normal start).
3. Check: the newer version is detected, no update appears for the same version, a pre-release is ignored, release notes show, download progress is shown, interrupted download can be retried, a corrupted or unsigned download is rejected, restart happens only after the user chooses it and after the CV was saved, the new version starts, the CV data is unchanged, and `%APPDATA%\cv-studio\data\cvs.json` is the same file.
4. Record the results in the pull request or release notes.

## What was tested in 3.1.0

- Unit tests (`tests/update.test.ts`): version comparison, stable-only rule, no downgrade, pre-release exclusion, release-note sanitizing, Dutch error messages, settings persistence, the install gate (never downloads or installs without trust), blocked restart during an export, retry after a failed download, rejected download is never reported as ready, failed installation, daily limit of automatic checks.
- End-to-end tests (`e2e/run.mjs`, scenarios 41 to 45): the real `electron-updater` code in the real Electron app against a local HTTP feed: equal, older, pre-release and newer versions, notification and release notes, automatic check and the saved preference, download with progress, SHA-512 rejection of a damaged installer, interrupted download and retry, offline, 404 (no release) and 403 (rate limit), and an accessibility scan of the notification and the About dialog.
- Installer upgrade path under Wine (Linux, not native Windows): the real `CV-Studio-Setup-3.1.0.exe` was installed silently, fictional user data was placed in `%APPDATA%\cv-studio\data\cvs.json`, and then a separately built `CV-Studio-Setup-3.1.1.exe` was run over it with `--updated`, the argument `electron-updater` passes. Result: same install folder, `DisplayVersion` 3.1.0 to 3.1.1, `app.asar` replaced (3.1.0 to 3.1.1), Start menu and desktop shortcuts kept, and `cvs.json` byte-identical. Wine needed a stand-in for PowerShell (its own is a stub that wrongly reports "app is running"), so this shows the installer replaces the old version and leaves the data alone. It does not show the app downloading, quitting and starting the installer itself.
- **Not tested:** the full cycle on native Windows: the app downloading the installer, quitting, the installer replacing the version, and the new version starting on its own.
- A mock server is not evidence that the whole cycle works, and this document does not claim it. The native Windows steps are part of the checklist above.

## Existing installations

Versions 3.0.1 and earlier have no updater. People using them install the first update-enabled version (3.1.0) manually. From then on they get update notifications. In-app installation follows once the signing requirements above are met.

## Privacy

A check sends a request to GitHub (`github.com/FarmaanFJM/cv-studio` releases) and nothing else: no CV content, no identifiers, no telemetry, and no token or secret in the app. The check runs at most once per day, a few seconds after start, and can be switched off in the About dialog. Without internet the app works as before. No requests are made in development or test mode unless a test feed is configured through environment variables.

## Files

| File | Purpose |
| --- | --- |
| `src/shared/update.ts` | Types, version rules, release-note and error text (pure, unit tested) |
| `electron/updateService.ts` | State machine and rules (no Electron dependency, unit tested) |
| `electron/updaterBackend.ts` | `electron-updater` with the GitHub provider; downloads and installs only when asked |
| `electron/settings.ts` | `settings.json` with the automatic-check preference and the last result |
| `src/renderer/shell/UpdateUi.tsx` | Notification and About dialog |
