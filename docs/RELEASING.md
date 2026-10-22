# Releasing CV Studio

Releases are prepared by automation and published by a person. Nothing is published because a branch was pushed.

## Rules

- Work happens on a branch and lands through a pull request (the repository ruleset stays in force).
- Tags are created on commits that are already on `main`. Never force-push a tag, never move or delete an existing tag or release.
- The workflow creates a **draft**. A stable release is published manually after reading the verification summary.
- A pre-release or draft is never offered by the in-app update check, which only follows the latest published stable release.

## What the workflow verifies (`.github/workflows/windows-build.yml`)

All of these must refer to the same build, otherwise nothing is created:

| Check | Where |
| --- | --- |
| Tag equals `v` + version in `package.json`; the tagged commit is on `main` | `Source, tag and version` step |
| Source commit recorded in `release-manifest.json` equals the commit that was built | `scripts/verify-release-assets.mjs` |
| Installer name and version, SHA-256 (`SHA256SUMS.txt`), SHA-512 and size in `latest.yml` | `scripts/verify-exe.mjs`, `scripts/verify-release-assets.mjs` |
| Icon (all sizes, byte for byte) and version information of the executable | `scripts/verify-exe.mjs` |
| `LICENSE`, `THIRD_PARTY_NOTICES.md` and `licenses/` inside the package | `Verify license files` step |
| Unit tests, type check, end-to-end scenarios against the packaged app | `npm test`, `node e2e/run.mjs` |
| The files downloaded by the release job are re-verified before the release is created | `draft-release` job |

## Normal flow

1. Merge the pull request into `main`. Check that `package.json` has the new version and `CHANGELOG.md` describes it.
2. Tag the merge commit: `git tag v3.1.0 <commit>` and `git push origin v3.1.0` (once; never repeat it for the same version).
3. The workflow builds, verifies and creates a **draft pre-release** (a release candidate) with `CV-Studio-Setup-<version>.exe`, its `.blockmap`, `latest.yml`, `SHA256SUMS.txt` and `release-manifest.json`.
4. Download the installer on a Windows machine, compare its SHA-256 with `SHA256SUMS.txt`, install it and run through the Windows checks in the pull request.
5. To publish: open the draft on GitHub, untick **pre-release** only if you are satisfied, and click **Publish**. Until then the update check cannot see it.

`workflow_dispatch` with **stable** ticked creates a draft that is not marked as pre-release, but only when the smoke test passed and the version has no pre-release suffix. It is still a draft.

## If the hosted runner cannot start

Earlier runs were blocked before a runner was assigned (Actions minutes or billing). Do not re-run it repeatedly. Prepare the release by hand instead:

```bash
npm ci
npm run typecheck && npm test
npm run dist                       # on Windows; on Linux it needs Wine
node scripts/verify-exe.mjs release
cd release && sha256sum CV-Studio-Setup-<version>.exe > SHA256SUMS.txt && cd ..
```

Then create `release/release-manifest.json` as the workflow does, run `node scripts/verify-release-assets.mjs release --sha <commit> --tag v<version>`, and create the **draft** release in the GitHub web interface with these files: the installer, its `.blockmap`, `latest.yml`, `SHA256SUMS.txt` and `release-manifest.json`. Mark it as pre-release until it has been checked on Windows.

Never upload an installer without the `latest.yml` that `electron-builder` generated for exactly that file, and never edit `latest.yml` by hand.

## Code signing (not yet available)

The installers are not signed, and automatic installation is disabled for that reason. See [UPDATES.md](UPDATES.md) for what is needed. Keep certificates and signing keys out of the repository; use GitHub secrets, and give the workflow only the permissions it needs.
