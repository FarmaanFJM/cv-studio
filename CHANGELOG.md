# Changelog

## 3.1.0 - Simpler editor, branding, desktop shell and update check
This is a feature and UX release. The data format is unchanged (still v4). Existing CVs open exactly as before, with the changes listed under "Compatibility".

**Simpler editor**
- Sections are quiet rows without outlines. Groups and settings inside a section are separated by whitespace and a thin divider, not by nested cards or colored panels.
- The `Hoofd | Aanvullend` buttons are gone. Move sections between *Hoofdinhoud*, *Aanvullende inhoud* and *Verborgen* by dragging: an insertion line shows where the section lands, the destination category is highlighted, the editor scrolls automatically near its edges, and dropping never expands a section. Empty categories accept drops.
- Keyboard and menu alternative: `... > Verplaatsen naar` (with a check mark on the current place) plus the existing Up/Down menu items and arrow-key reordering on the drag handle. Focus returns to the handle after moving.
- Template rules are respected. In the Header template the contact block has a fixed place and cannot be dragged. In Minimal, reordering keeps every section's stored zone, so switching templates never loses placement.

**Visual redesign (calmer, emerald)**
- New SummaUI tokens: background `#0E1111`, surface `#151919`, elevated `#1B2020`, soft `#202626`, border `#2A3131`, text `#F3F5F4` / `#A7B0AE` / `#8A9391`, accent `#00674F` (hover `#0A7A60`, pressed `#0A5B47`, soft `rgba(0,103,79,0.14)`, ring `rgba(0,103,79,0.35)`). `#00674F` is used for fills with white text (6.5:1). Text, icons, indicators and the keyboard focus ring use a lighter emerald `#3DBE9C` because `#00674F` alone has only about 2.9:1 on the dark surfaces. The lime accent is gone.
- Far fewer borders: rows, panels, segmented controls, accordions and groups have no outline; hierarchy comes from layered surfaces, spacing, type and hairline dividers. Inputs keep one subtle border. In an expanded Skills section the number of outlined panels went from 7 bordered containers (first 3.1.0 build) to 0 outlines and 2 divider lines, and from 11 (3.0.1) to the same.
- One compact toolbar in the title bar: logo, name, version and a custom CV switcher on the left; one primary **Exporteer PDF** action and one `...` menu on the right. The row of eight icon buttons above the tabs is gone. The menu holds Nieuw cv, Dupliceren, Hernoemen, JSON importeren and exporteren, Over CV Studio en updates, and Cv verwijderen. The menu button shows a small dot when an update is available.
- Custom CV switcher (replaces the native dropdown): styled popover with the current CV, a check mark, and *Nieuw cv* as an action at the bottom. Full keyboard support (Enter, Space or arrows to open, arrows, Home, End, type to search, Enter to choose, Escape to close with focus returned).
- Shared components were aligned: one control height (34 px, 28 px small), radii (8 and 12 px), hover and focus behavior, popover elevation, segmented control, switch, tabs, menus and comboboxes. The size badge on a section row only appears on hover, focus or when the section is too long.
- New emerald logo, extracted the same way as before (see `assets/brand/README.md`); icon, installer icon, title bar and About dialog use it.

**Final refinement (surfaces, Skills editor, split input)**
- One surface scale, always dark to light: app `#0E1111`, surface `#151919`, elevated `#1B2020`, soft `#202626`. Controls are always lighter than the surface they sit on (no recessed inputs): inputs, segmented controls, chips, group editors, dropdowns, popovers and menus all follow the same rule, checked by an automated luminance test.
- Borders are the exception: whitespace first, type second, a hairline only where it helps. Nesting inside a Skills category is shown by indentation and horizontal dividers, not by boxes or vertical lines. Inputs keep a subtle boundary.
- Expanded **Vaardigheden** is reorganized: compact section controls (Indeling, Weergave, Iconen) without stretched segments or explanatory subtitles; every category is one rectangular unit (a prominent header row with the move and delete actions on the far right, an indented, smaller skill input and the chips) separated from the next by one horizontal divider; Indeling, Weergave and Iconen are rows with a fixed label column on the left and the controls on the right; the skill dropdown of a group with a known category is already filtered and shows no category strip; empty groups stay compact and editable; adding a group is a small ghost action.
- The skill and category inputs are one **split control**: an editable input and a separate chevron button in one shape with a subtle divider. Clicking the field only edits. Typing shows suggestions. The chevron opens and closes the full list without touching the value. ArrowDown, Enter, Tab and Escape keep working; ArrowDown now also opens the list from an empty focused field.
- Icon settings: the heading is just **Iconen**. A section has one choice (Standaard, Automatisch, Merkkleuren, Monochroom, Uit); the "Eigen" badge, the inheritance note and the accordion are gone. Under Stijl, **Iconen** keeps the global switch and color choice. The stored format is unchanged: existing preferences open exactly as before.
- Less width: compact segmented controls, short numeric and color fields, limited maximum widths inside a section, and no horizontal overflow from 380 px to 900 px editors.
- One spacing and type scale: sentence-case headings with clear levels for section title, group heading, field label, value and secondary text.

**Skills**
- Presentation is now **Tekst | Chips**. Organization stays **Lijst | Groepen | Niveaus**.
- Skills are added like tags: type, pick a suggestion with Tab, Enter or the mouse, the field clears and keeps focus. Arrow keys move through the suggestions, Escape closes the list without touching your text, and without an active suggestion Tab moves on as usual. Custom names always work. Duplicates in a group are ignored regardless of capitalization and spaces, and your own capitalization is kept.
- The chevron opens a searchable catalog with categories and suggestions for the group's category. The catalog and all presets are stored locally (400+ skills).
- Skill group presets: Programmeertalen, Frameworks & Libraries, Tools, DevOps, Databases, Cloud, Testing, Game Development and more, plus general categories such as Communicatie, Samenwerking, Organisatie, Planning, Leiderschap, Klantenservice, Administratie, Design, Microsoft Office, Analyse, Onderzoek, Projectmanagement and Presenteren. Choosing a category only creates the group; it never adds skills. Programmeertalen is separate from the *Talen* section for spoken languages.
- Project tech stacks use the same two presentations and the same input.
- A skill group without skills no longer prints an empty heading in the CV.

**Over mij**
- The profile section is now called *Over mij* for new CVs, with the input label *Korte introductie*. Existing sections keep their title (rename it under *Titel in cv*); the internal type and the text are unchanged.

**Branding and desktop shell**
- CV Studio logo for the window, taskbar, executable, installer, uninstaller, shortcuts and the title bar. Multi-size ICO (16 to 256 px), transparent PNGs and the generation script are in `assets/brand` and `build`. See `assets/brand/README.md` for how the transparent version was made and why the Windows icon sits on a charcoal tile.
- Custom 44 px title bar (logo, name, version, current CV name) with the native window buttons drawn by Electron (`titleBarStyle: 'hidden'` with `titleBarOverlay`). Drag, double-click to maximize, Snap, edge resizing and DPI scaling stay native. No window IPC was added. The hidden PDF window is unchanged, so the app shell never appears in exports.

**Updates**
- *Over CV Studio* (the info button in the title bar) shows the version, a check button, the automatic-check switch, the last result and the available version, and explains that a check contacts GitHub but sends no CV content.
- When a newer stable version exists, a quiet notification offers the release notes ("Wat is er nieuw?") and a link to the release page. Pre-releases, drafts and older versions are ignored. Offline, missing releases and rate limits give clear Dutch messages.
- Automatic **installation is disabled** because the installers are not code-signed; see `docs/UPDATES.md` for the investigation and what is needed. The download, progress, restart-after-save path exists and is tested against a controlled feed, but it is not enabled in release builds and installer replacement has not been verified on native Windows.

**Release pipeline**
- Update metadata (`latest.yml`, `.blockmap`) is generated with an explicit GitHub publish configuration. The workflow verifies tag, version, commit, installer, checksums, update metadata and license files, and only ever creates a draft. See `docs/RELEASING.md`.

**Compatibility and migration** (tested with generated 3.0.0 and 3.0.1 data in `tests/fixtures`)
- Old skill presentations are migrated when a file is read: `inline` (icon + label) and `list` become **Chips** when icons were visible and **Tekst** when they were not. All skills, categories, custom icons and icon settings are kept. Visible changes: a former *Lijst* presentation no longer shows bullets, and a former *Icoon + label* gets the chip outline. The same applies to project tech stacks.
- Moving sections in the Minimal template no longer rewrites their stored zones.

**Under the hood**
- New dependencies: `electron-updater` (bundled, MIT) and `resedit` (build only, MIT) to embed the icon and version information in the executable without Wine. `licenses/` and `THIRD_PARTY_NOTICES.md` cover the new runtime packages.
- The package scripts `dist` and `dist:dir` pass `--publish never`.

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
