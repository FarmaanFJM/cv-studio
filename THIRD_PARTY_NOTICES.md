# Third-party notices

CV Studio's own source code is released under the [MIT License](LICENSE). That license does **not** replace or change the licenses of the third-party material listed here. Each item remains under its own license.

Full license texts are in the [`licenses/`](licenses) folder and are also copied into the Windows installer (next to the application files, in `resources/licenses`, `resources/LICENSE` and `resources/THIRD_PARTY_NOTICES.md`) from the first release built after this file was added. Installers published before that point (v1.0.0 to v3.0.0) do not contain these files; the same information is available in this repository.

Electron and Chromium ship their own license files (`LICENSE.electron.txt` and `LICENSES.chromium.html`) inside the installed application folder.

## Fonts

| Font | Package | License |
| --- | --- | --- |
| DM Sans, IBM Plex Sans, Inter, Lato, Lora, Merriweather, Montserrat, Nunito Sans, Open Sans, Playfair Display, Poppins, PT Serif, Roboto, Source Sans 3, Work Sans | [`@fontsource/*`](https://fontsource.org) 5.x | SIL Open Font License 1.1 |

The font files are bundled unmodified in WOFF and WOFF2 format (Latin subsets). The copyright line of each font is at the top of its license text in [`licenses/fonts-OFL-1.1.txt`](licenses/fonts-OFL-1.1.txt). Under the OFL the fonts may be bundled and redistributed with software, but they may not be sold on their own, and the license text must stay with them. The license field in each Fontsource package says OFL-1.1; the upstream font projects are credited in that file.

## Technology logos and icons

| Material | Source | License | Use in CV Studio |
| --- | --- | --- | --- |
| Multicolor technology logos | [devicon](https://github.com/devicons/devicon) 2.17.0 | MIT | Original-color logos, copied into `src/renderer/brandIcons.generated.ts` by `scripts/gen-brand-icons.mjs` (the `*-original.svg` variants) |
| Single-color logo paths and brand colors | [simple-icons](https://github.com/simple-icons/simple-icons) 16.35.0 | CC0-1.0 | Monochrome and single-color logos in `src/renderer/techIcons.tsx` |
| Java and Azure monochrome paths | simple-icons 5.0.0 (`icons/java.svg`, `icons/microsoftazure.svg`) | CC0-1.0 | Copied verbatim because current simple-icons releases no longer include these two logos |
| GitHub and LinkedIn contact icons | simple-icons (identical paths in 5.0.0 to 9.0.0) | CC0-1.0 | Contact details in the CV |
| General line icons (mail, phone, map pin, globe, copy, download and others) | [Feather](https://github.com/feathericons/feather) 4.29 | MIT, Copyright (c) 2013-2023 Cole Bemis | Some paths are used unchanged; the rest of the line icons were drawn in the same style |

Brand names and logos are trademarks of their respective owners. They are used only to identify the named technologies. The MIT, CC0 and similar licenses of the icon projects cover the project files, not the trademarks. CV Studio is not affiliated with, endorsed by or sponsored by any of these companies or projects. Logos are drawn in their original colors only where an established multicolor asset or a published brand color exists; no colors are invented.

If you are a trademark owner and want a logo removed or changed, please open an issue.

## Libraries bundled into the application

React, React DOM, Scheduler, pdf-lib and its dependencies (`@pdf-lib/standard-fonts`, `@pdf-lib/upng`, `pako`, `tslib`) are bundled into the application. So is `electron-updater` 6.x (MIT) with its runtime dependencies (`builder-util-runtime`, `debug`, `fs-extra`, `graceful-fs`, `js-yaml`, `argparse`, `jsonfile`, `lazy-val`, `lodash.escaperegexp`, `lodash.isequal`, `ms`, `sax`, `semver`, `tiny-typed-emitter`, `universalify`). See [`licenses/npm-bundled.txt`](licenses/npm-bundled.txt); some of these packages ship no license file, in which case the file records the license declared in their `package.json`.

Development tools (Vite, TypeScript, Vitest, Playwright, axe-core, electron-builder and others) are used to build and test CV Studio and are not part of the installed application. Their licenses are listed in `package-lock.json` and in each package.

## CV Studio name and logo

The CV Studio logo (`assets/brand/`, `build/icon.*`, the data URL in `src/renderer/brand.generated.ts`) was supplied by the project owner. It is included so the application and installer carry the project's branding. The source code is MIT licensed, but that license does not give anyone permission to present a modified or unofficial build as the official CV Studio using its name or logo. No registered trademark is claimed.

## Build tooling note

`resedit` (MIT) is used only while building, to embed the icon and version information in the Windows executable. It is not part of the installed application.

## Example content

The example CV used in the README screenshots (`docs/`) and in the tests is fictional. No real person, employer or contact detail is used.
