# Changelog

## 3.0.1 - Open source packaging
- The Windows installer now includes `LICENSE`, `THIRD_PARTY_NOTICES.md` and the `licenses/` folder (installed in `resources/`).
- Added the MIT license, an English README, `CONTRIBUTING.md` and issue and pull request templates to the repository.
- Rewrote `THIRD_PARTY_NOTICES.md` and added full license texts of the bundled fonts, icons and libraries.
- Replaced the monochrome Java and Azure logo paths with the exact paths from Simple Icons v5.0.0 (CC0). The earlier paths were reproduced by hand and did not match their source.
- Version information updated to 3.0.1. README download links point to the releases page.
- The Windows build workflow runs on version tags or manually and only prepares a draft pre-release.
- No changes to the data format or the storage location.

## 3.0.0 - UX redesign
- Reusable `Summa*` interface components with the Summa design tokens.
- Clear split between **Content** (what is on the CV), **Layout** (structure) and **Style** (appearance), with progressive disclosure.
- Technology icons: visibility and color are separate settings. Global *Toon iconen* plus color mode (Automatisch, Merkkleuren, Monochroom), and per section either the default or its own settings. Explicit precedence: global, section, per technology, color mode, contrast fallback. The *Tekst* presentation never shows icons. Contact icons are independent.
- Consistent section cards (expand, placement, visibility, drag handle with keyboard support, overflow menu) and a highlight in the preview when selecting or moving a section.
- Preview zoom (buttons, Ctrl+wheel, fit), a compact header, and an editor that works from narrow to wide.
- Accessibility: visible focus, roles and names for all controls, keyboard operation, tooltips for icon-only buttons, local validation messages, reduced-motion support, axe-core checks in the tests.
- Number fields accept typing, arrow keys and +/- without jumping back; sliders show their range.
- Version shown in the editor. Storage format v4 with automatic migration from v1 to v3.

## 2.0.0
Templates (Sidebar, Header, Minimal), position-independent content areas, technology icons with brand colors, extended style and color settings.

## 1.0.0
First version: editor, A4 preview, PDF export, local storage and CV versions.
