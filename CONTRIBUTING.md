# Contributing to CV Studio

Thanks for your interest in CV Studio. Small fixes and big ideas are both welcome. This page explains how to help without a complicated process.

## Report a bug

Open a [bug report](https://github.com/FarmaanFJM/cv-studio/issues/new?template=bug_report.yml) and include:

- What you did, step by step, and what you expected to happen
- What happened instead
- The CV Studio version (shown next to the name at the top of the editor) and your Windows version
- A screenshot if it helps

Please do not attach real CVs, photos or contact details. Use made-up data, or blur personal information in screenshots.

## Suggest a feature

Open a [feature request](https://github.com/FarmaanFJM/cv-studio/issues/new?template=feature_request.yml) and describe the problem you want to solve before the solution. Examples and screenshots from other tools help. CV Studio aims to stay simple and offline, so features that need accounts, cloud services or tracking will not be accepted.

## Set up the project

You need Node.js 22 or newer.

```bash
git clone https://github.com/FarmaanFJM/cv-studio.git
cd cv-studio
npm install
npm run dev
```

## Run the checks

```bash
npm run typecheck   # TypeScript
npm test            # unit tests
npm run test:e2e    # end-to-end tests (on Linux: npm run test:e2e:linux)
```

Please run at least the type check and the unit tests before you open a pull request. Run the end-to-end tests when you change the editor, the templates or PDF export. If you cannot run them, say so in the pull request.

## Guidelines

- **Keep changes focused.** One fix or feature per pull request is easier to review.
- **Follow the existing style.** Match the naming, structure and comment density of the code around your change. TypeScript is strict.
- **CV rendering.** The CV must stay exactly one A4 page (210 by 297 mm), and the preview and the exported PDF must look the same. The PDF text must remain selectable. Add or update a test when you change rendering.
- **Updates and releases.** Do not weaken update verification to make something install. Automatic installation stays off until installers are code-signed (see `docs/UPDATES.md`). Releases are drafts created by the workflow and published by hand (`docs/RELEASING.md`).
- **Saved data.** If you change the data model, keep old saved files working. Add a migration in `src/shared/model.ts` and a unit test with an older data format.
- **Interface components.** Components in `src/renderer/ui/` must stay usable with the keyboard: visible focus, correct roles and labels, and tooltips for icon-only buttons. The end-to-end tests include an accessibility scan (axe-core).
- **Fictional data only.** Screenshots, test data and examples must not contain real personal information.
- **Third-party assets.** If you add a font, icon or library, check that its license allows redistribution and update `THIRD_PARTY_NOTICES.md` and `licenses/` (`npm run licenses`).

## Open a pull request

1. Fork the repository and create a branch from `main`.
2. Make your change and run the checks above.
3. Open a pull request and explain what changed and why. Add a screenshot for visible changes.

The maintainer reviews pull requests when time allows. Feedback is meant to improve the change, not to discourage you.

By contributing you agree that your contribution is released under the [MIT License](LICENSE).
