# CV Studio

A free, offline CV builder for Windows. Fill in your details, pick a template and export a clean one-page PDF.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/FarmaanFJM/cv-studio?include_prereleases&label=release)](https://github.com/FarmaanFJM/cv-studio/releases)
![Platform: Windows](https://img.shields.io/badge/platform-Windows-0078D4)

![CV Studio showing the editor on the left and a live A4 preview of an example CV on the right](docs/images/app-editor.png)

- **One page, always.** The preview is a true A4 page. CV Studio tells you which section is too long, and the exported PDF is checked to be exactly one page.
- **See every change instantly.** Edit on the left, watch the CV update on the right.
- **Your data stays on your computer.** No account, no cloud, no tracking. It works without an internet connection.
- **Simple by default.** One clean editor, sections you drag where you want them, and skills you pick from a built-in list instead of typing everything.

## Download

1. Open the [releases page](https://github.com/FarmaanFJM/cv-studio/releases) and download `CV-Studio-Setup-<version>.exe` from the newest version. Releases may still be marked as pre-releases. Compare the SHA-256 with `SHA256SUMS.txt` on the same page if you like.
2. Run the installer.
3. Start CV Studio and create your CV.

> [!NOTE]
> The installer is not code-signed yet, so Windows SmartScreen may show a warning. Choose **More info**, then **Run anyway**.
>
> Release builds are created with automated tests, on Linux with Wine or on a Windows runner. They have not all been verified end to end on a native Windows machine, so please [report any problem](https://github.com/FarmaanFJM/cv-studio/issues/new/choose) you run into.
>
> **Updating:** versions before 3.1.0 cannot update themselves, so install 3.1.0 manually. CV Studio can tell you when a newer version exists and link you to the release page, but it does not install updates by itself yet, because the installers are not code-signed. Details: [docs/UPDATES.md](docs/UPDATES.md).

The application interface is currently in Dutch. Section titles on your CV can be renamed freely.

## Features

**Layout and templates**
- Live A4 preview with zoom
- Three templates: Sidebar, Header and Minimal
- Hoofdinhoud (primary), Aanvullende inhoud (supplementary) and Verborgen (hidden) areas. Drag a section to another area or between two sections, or use the section menu (**Verplaatsen naar**) with the keyboard. Each template decides where the areas appear.
- A branded title bar with the normal Windows window buttons, so dragging, snapping and maximizing work as usual
- Adjustable margins, spacing, sidebar width and date positions

**Content**
- Personal details, a short *Over mij* introduction, work experience, education and projects
- Skills as a list, in groups or by level, shown as text or as chips with technology icons. Type a skill and pick a suggestion with Tab or Enter, or open the catalog with the chevron. Built-in category presets cover IT (Programmeertalen, Frameworks & Libraries, Databases, DevOps, Cloud, Testing and more) and general skills (Communicatie, Organisatie, Klantenservice, Microsoft Office and more). Presets only create the group; you choose the skills. Your own names and categories always work.
- Languages with levels or dots, plus custom sections for anything else
- Profile photo with crop, zoom, round or square shape

**Design**
- 15 bundled fonts with search
- Color picker with hex input, saved colors and contrast checks
- Technology icons with original brand colors or a single color, set globally or per section
- Contact icons for email, phone, location, LinkedIn, GitHub and website

**Files**
- Several CV versions, for example one per application
- Automatic local saving
- JSON import and export for backups
- PDF export with selectable text

## Templates

<p align="center">
  <a href="docs/images/template-sidebar.png"><img src="docs/images/template-sidebar.png" alt="Sidebar template: colored side area with photo, contact details and skills, main content on the right" width="32%"></a>
  <a href="docs/images/template-header.png"><img src="docs/images/template-header.png" alt="Header template: wide colored header with photo, name and contact details, content below" width="32%"></a>
  <a href="docs/images/template-minimal.png"><img src="docs/images/template-minimal.png" alt="Minimal template: single column with thin dividers" width="32%"></a>
</p>

- **Sidebar**: a strong colored side area for photo, contact details and skills. Good for a visual, modern CV.
- **Header**: a wide header with your photo and name. Good when you want a clear first impression.
- **Minimal**: one clean column without decoration. Good when the CV may be read by applicant tracking software.

All three show the same fictional example CV.

## How to use

1. **Content**: enter your personal details, then add education, experience, skills and projects. Drag sections between the areas, or hide the ones you do not need. For skills, add a group (type a name or pick a preset), then add skills one by one.
2. **Layout**: choose a template and adjust margins, spacing and photo size.
3. **Style**: pick colors, a font and how technology icons look.
4. Check the page indicator above the preview. If a section is too long, it is highlighted and **Exporteer PDF** stays disabled until the CV fits on one page.
5. Click **Exporteer PDF**.

<p align="center">
  <img src="docs/images/app-style.png" alt="The Style tab with color, typography and technology icon settings next to the live preview" width="90%">
</p>

## Privacy and offline use

CV Studio has no account system and no analytics. Fonts, icons and the skill catalog are bundled with the app, so nothing is loaded while you work.

The only network request the installed app makes is the update check: it asks GitHub (the releases of this repository) whether a newer version exists. It sends no CV content and no identifiers, it runs at most once per day, and you can switch it off or run it by hand under the info button in the title bar (*Over CV Studio*). Development and test runs make no such request.

Your CVs are saved as a plain JSON file on your computer:

```
%APPDATA%\cv-studio\data\cvs.json
```

The file is not encrypted, so anyone with access to your Windows account can read it. Use **export JSON** (the download icon at the top of the editor) to make a backup and **import JSON** to restore it. Profile photos are stored inside this file.

## Development

CV Studio is built with Electron, React and TypeScript. Vite bundles the interface, electron-builder creates the Windows installer, and the tests use Vitest and Playwright.

You need Node.js 22 or newer.

```bash
npm install          # install dependencies
npm run dev          # start the app with hot reload
npm run typecheck    # TypeScript check
npm test             # unit tests (Vitest)
npm run build        # build the renderer and the Electron main process
npm run test:e2e     # end-to-end tests against the real Electron app (Playwright)
npm run dist         # build the Windows installer and update metadata into ./release
npm run verify:exe   # check icon, version information and latest.yml of ./release
```

Notes:

- On Linux, run the end-to-end tests with `npm run test:e2e:linux`, which uses `xvfb-run`. The pixel checks of exported PDFs also need `pdftoppm` (Poppler).
- `npm run dist` runs best on Windows. On Linux it needs Wine (`wine64` and `wine32`), and the result has only been smoke tested there, not on native Windows. The icon and version information are embedded by `scripts/after-pack.cjs`, which needs no Wine.
- `npm run gen:icons` regenerates the multicolor logos, `npm run gen:logo` regenerates the app icons from `assets/brand` (needs Python with Pillow and numpy), `npm run licenses` refreshes `licenses/`, and `xvfb-run -a node scripts/docs-assets.mjs` regenerates the images in `docs/images`. `xvfb-run -a node scripts/ui-shots.mjs` takes screenshots of the running app.
- Some end-to-end scenarios (window dragging, maximizing, double-click) need a window manager. They run when `Xvfb`, `openbox` and `xdotool` are installed and are skipped otherwise. `E2E_ONLY='^(36|37)'` runs only matching scenarios.

The repository also contains a [Windows build workflow](.github/workflows/windows-build.yml) that builds, verifies and prepares a draft release (see [docs/RELEASING.md](docs/RELEASING.md)). Hosted Windows runners need available GitHub Actions minutes, and the workflow has not run successfully yet.

### Project structure

| Path | Purpose |
| --- | --- |
| `electron/` | Main process: window and title bar, local storage, PDF export, JSON import and export, update service |
| `src/renderer/` | The React app: editor, preview and the CV templates |
| `src/renderer/ui/` | Reusable `Summa*` interface components (buttons, toggles, sliders, color picker and more) |
| `src/renderer/editor/` | Editor panels for content, layout and style, section list with drag and drop, skill and category inputs |
| `src/renderer/shell/` | Title bar, About dialog and update notification |
| `src/renderer/templates/` | CV rendering and template styles |
| `src/shared/` | Data model, migrations, skill catalog, update rules, color helpers and technology icon rules, shared by the app and the tests |
| `tests/` | Unit tests |
| `e2e/` | End-to-end tests |
| `scripts/` | Build, icon, license and documentation image scripts |
| `licenses/` | License texts of bundled fonts, icons and libraries |
| `assets/brand/` | Logo source and generated brand images (see its README) |
| `build/` | Windows icons used by the installer build |
| `docs/` | Images used in this README, `UPDATES.md` and `RELEASING.md` |
| `.github/` | Issue templates, pull request template and the Windows build workflow |

## Contributing

Bug reports, feature ideas, documentation fixes and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. When you report a bug, steps to reproduce make it much easier to fix, and please do not share real personal CV data.

## License and acknowledgements

CV Studio is released under the [MIT License](LICENSE).

Bundled third-party material keeps its own license, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md):

- Fonts from [Fontsource](https://fontsource.org) (SIL Open Font License 1.1)
- Multicolor technology logos from [devicon](https://github.com/devicons/devicon) (MIT)
- Single-color logos from [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0)
- Some interface icons from [Feather](https://github.com/feathericons/feather) (MIT)
- [electron-updater](https://github.com/electron-userland/electron-builder) and its dependencies (MIT and other permissive licenses) for the update check

CV Studio is not affiliated with the owners of the technology brands whose logos can appear in a CV. Logos and names are trademarks of their respective owners.
