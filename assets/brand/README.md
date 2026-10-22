# CV Studio brand assets

| File | Purpose |
| --- | --- |
| `cv-studio-logo-source.png` | The supplied logo, unchanged in content (1254 by 1254, opaque: emerald green CV symbol on a near-black background). This is the only source. |
| `cv-studio-logo-transparent.png` | High-resolution (1024 px) transparent version of the symbol, cropped to the symbol with a small margin. |
| `cv-studio-mark-{16,24,32,48,64,128,256}.png` | The transparent symbol at fixed sizes (dark user interface, title bar). |
| `cv-studio-app-icon-1024.png` | The symbol on a charcoal rounded tile (`#151919`, the Summa surface color), the application icon. |
| `../../build/icon.ico` | Windows icon with 16, 24, 32, 48, 64, 128 and 256 px images (PNG-compressed), used for the executable, the installer, the uninstaller and the shortcuts. |
| `../../build/icon-transparent.ico` | The same sizes without a tile. Not used by the build; kept for dark-only surfaces. |
| `../../build/icon.png` | 512 px tile icon for the window icon on non-Windows development builds. |
| `../../src/renderer/brand.generated.ts` | The 64 px transparent mark as a data URL for the title bar and the About dialog (works offline, no extra file). |

Regenerate everything from the source image with `npm run gen:logo` (needs Python 3 with Pillow and numpy).

## How the transparent version is made

The supplied image has no alpha channel, so the symbol is cut out as a shape instead of turning "dark" into "transparent". Turning black into transparency would also make the dark green fold shading of the symbol see-through.

1. A mask is built from green saturation, holes are filled by a flood fill from the image border, and the mask is closed so the soft fold shadows that fade into the background are included.
2. In a thin edge band the foreground color is estimated from the nearest interior pixels and the alpha follows from the mix with the background color. This keeps the antialiasing of the curves.
3. Colors in the band are un-premultiplied, so there is no dark fringe on light backgrounds.

Checked visually on white, gray and dark backgrounds, and at 16, 24, 32, 48, 128 and 256 px on dark and light taskbar colors.

## Decisions and limitations

- **The Windows icon uses a charcoal tile.** The emerald (about `#0BAE7E`) on a white or light-gray taskbar has low contrast (about 2.9:1 on white), so the symbol alone would be hard to see in Windows' light mode. The tile matches the original artwork, which is also green on charcoal. The transparent symbol is used wherever the background is dark (title bar, About dialog).
- The dark fold shadows of the symbol fade into the near-black background in the source. On the tile that is invisible, as in the original. On a transparent background the fold keeps a solid dark green with a straight edge, because there is no source information about its true outline. A vector master would remove this limitation; none was supplied.
- The source image is a lossy WebP converted to PNG. It was not upscaled; the 1024 px files are the symbol resampled from the 944 by 555 px area it occupies.
- Logo use: the logo was supplied by the project owner. The source code is MIT licensed, but that license does not give anyone permission to present an unofficial or modified build as the official CV Studio using its name or logo. No registered trademark is claimed.

## History

The first 3.1.0 build used a lime green logo. It was replaced by the emerald logo in the visual redesign; the extraction method and the files are the same, only the source image and the tile color changed.
