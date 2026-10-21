#!/usr/bin/env python3
"""Genereert alle merkbestanden van CV Studio uit assets/brand/cv-studio-logo-source.png.

De aangeleverde afbeelding is ondoorzichtig (neon-groen CV-symbool op een bijna zwarte achtergrond). Het symbool wordt
daarom niet "zwart-naar-transparant" gemaakt (dat zou de donkergroene plooien doorzichtig maken), maar als vorm
uitgesneden:
  1. masker op basis van groenverzadiging, gaten gevuld via een flood-fill vanaf de rand;
  2. in de randband wordt de voorgrondkleur geschat uit de dichtstbijzijnde binnenste pixels, waarna de alfa per pixel
     uit het mengsel met de achtergrond volgt (antialiasing en schaduw blijven behouden);
  3. kleuren in de randband worden "un-premultiplied", zodat er geen donkere franje ontstaat op lichte achtergronden.

Uitvoer (assets/brand en build/):
  cv-studio-logo-transparent.png   hoge resolutie, transparant, strak bijgesneden met ruimte
  cv-studio-mark-{16..256}.png     transparante varianten voor de titelbalk e.d.
  build/icon.ico                   Windows-pictogram (16,24,32,48,64,128,256) op een antraciet tegeltje (leesbaar op lichte en donkere taakbalk)
  build/icon-transparent.ico       hetzelfde, maar zonder tegel
  build/icon.png (512)             voor Electron-vensters op Linux en als bron voor het installatiepictogram
  src/renderer/brand.generated.ts  kleine titelbalk-icoon (data-URL), zodat de app offline en zonder losse bestanden werkt

Gebruik:  python3 scripts/gen-logo-assets.py   (vereist Pillow en numpy; alleen nodig om de bestanden opnieuw te genereren)
"""
import base64
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/brand/cv-studio-logo-source.png'
BRAND = ROOT / 'assets/brand'
BUILD = ROOT / 'build'
TILE = (20, 22, 24)  # #141618, Summa 'surface'

src = Image.open(SRC).convert('RGB')
rgb = np.asarray(src).astype(np.float32)
H, W, _ = rgb.shape
bg = np.median(rgb[:40, :40].reshape(-1, 3), axis=0)  # ~ (12,12,12)

# 1. masker
sat = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
core = sat > 6
mask_img = Image.fromarray((core * 255).astype(np.uint8))
# gaten vullen: alles wat niet bereikbaar is vanaf de rand is binnenkant
inv = Image.fromarray(((~core) * 255).astype(np.uint8))
pad = Image.new('L', (W + 2, H + 2), 255)
pad.paste(inv, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128)
outside = np.asarray(pad)[1:-1, 1:-1] == 128
mask = ~outside


def shift(a, dy, dx):
    return np.roll(np.roll(a, dy, 0), dx, 1)


def erode(m, n):
    out = m.copy()
    for _ in range(n):
        out = out & shift(out, 1, 0) & shift(out, -1, 0) & shift(out, 0, 1) & shift(out, 0, -1)
    return out


def dilate(m, n):
    out = m.copy()
    for _ in range(n):
        out = out | shift(out, 1, 0) | shift(out, -1, 0) | shift(out, 0, 1) | shift(out, 0, -1)
    return out


# kleine ruis (webp-artefacten) weghalen: alleen aaneengesloten vormen groter dan een paar pixels tellen
mask = dilate(erode(mask, 1), 1) | erode(mask, 3)
# de donkere plooien lopen in de bron geleidelijk uit naar zwart; sluiten voorkomt een rafelige rand daar
mask = erode(dilate(mask, 5), 5)

# 2. voorgrondkleur in de randband schatten
interior = erode(mask, 4)
band = dilate(mask, 3) & ~interior
F = np.zeros_like(rgb)
F[interior] = rgb[interior]
known = interior.copy()
for _ in range(10):
    cnt = np.zeros((H, W), np.float32)
    acc = np.zeros_like(rgb)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        k = shift(known, dy, dx)
        cnt += k
        acc += shift(F, dy, dx) * k[..., None]
    todo = band & ~known & (cnt > 0)
    if not todo.any():
        break
    F[todo] = acc[todo] / cnt[todo][..., None]
    known |= todo

delta = F - bg
den = np.maximum((delta ** 2).sum(-1), 1.0)
alpha = np.clip(((rgb - bg) * delta).sum(-1) / den, 0, 1)
# waar voorgrond en achtergrond bijna dezelfde kleur hebben (donkere plooi) is de alfa uit de kleur onbetrouwbaar:
# daar geldt het masker, met een lichte verzachting van één pixel zodat de rand niet hard gekarteld is
low = den < 2500
soft = mask.astype(np.float32)
for _ in range(2):
    soft = (soft + shift(soft, 1, 0) + shift(soft, -1, 0) + shift(soft, 0, 1) + shift(soft, 0, -1)) / 5
alpha[low & band] = soft[low & band]
alpha[interior] = 1.0
alpha[~dilate(mask, 3)] = 0.0
alpha[alpha < 0.02] = 0.0

# 3. un-premultiply in de band
color = rgb.copy()
safe = np.maximum(alpha, 1e-3)[..., None]
un = np.clip(bg + (rgb - bg) / safe, 0, 255)
use = band & (alpha > 0)
color[use] = np.where(alpha[use][..., None] > 0.05, un[use], F[use])
color[alpha == 0] = 0

full = np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8)
logo = Image.fromarray(full, 'RGBA')

# bijsnijden op het symbool
ys, xs = np.where(alpha > 0.02)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
mark = logo.crop(box)
print('symbool', mark.size, 'bbox', box)


def on_square(img, size, margin):
    """Symbool gecentreerd op een vierkant transparant canvas met relatieve marge."""
    inner = int(size * (1 - 2 * margin))
    w, h = img.size
    s = inner / max(w, h)
    r = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(r, ((size - r.width) // 2, (size - r.height) // 2))
    return canvas


def tile(size, margin, radius=0.22, transparent_mark=None):
    """Antraciet afgerond tegeltje met het symbool erop (4x supersampling voor gladde hoeken)."""
    S = size * 4
    t = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * radius), fill=TILE + (255,))
    t.alpha_composite(on_square(mark, S, margin))
    return t.resize((size, size), Image.LANCZOS)


BRAND.mkdir(exist_ok=True)
BUILD.mkdir(exist_ok=True)
on_square(mark, 1024, 0.06).save(BRAND / 'cv-studio-logo-transparent.png', optimize=True)
for n in (16, 24, 32, 48, 64, 128, 256):
    on_square(mark, n, 0.04).save(BRAND / f'cv-studio-mark-{n}.png', optimize=True)

SIZES = [16, 24, 32, 48, 64, 128, 256]


def save_ico(path, maker):
    imgs = [maker(n) for n in SIZES]
    imgs[-1].save(path, format='ICO', sizes=[(n, n) for n in SIZES], append_images=imgs[:-1])


# kleine formaten krijgen een iets grotere vulling van het symbool zodat het herkenbaar blijft
save_ico(BUILD / 'icon.ico', lambda n: tile(n, 0.14 if n >= 48 else 0.08))
save_ico(BUILD / 'icon-transparent.ico', lambda n: on_square(mark, n, 0.05))
tile(512, 0.14).save(BUILD / 'icon.png', optimize=True)
tile(1024, 0.14).save(BRAND / 'cv-studio-app-icon-1024.png', optimize=True)

# preview-vergelijking: donkere en lichte taakbalk, alle gevraagde formaten
sheet = Image.new('RGBA', (7 * 300, 2 * 300), (0, 0, 0, 255))
for row, bgc in enumerate(((32, 32, 32), (243, 243, 243))):
    ImageDraw.Draw(sheet).rectangle((0, row * 300, sheet.width, row * 300 + 300), fill=bgc + (255,))
    for i, n in enumerate((16, 24, 32, 48, 128, 256)):
        for j, im in enumerate((tile(n, 0.14 if n >= 48 else 0.08), on_square(mark, n, 0.05))):
            sheet.alpha_composite(im, (i * 300 + 20 + j * 0, row * 300 + 20 + j * 140 if n <= 128 else row * 300 + 20))
if len(sys.argv) > 1:  # optioneel: opslaan van een controleblad (donker/licht, alle formaten)
    sheet.convert('RGB').save(sys.argv[1])

# titelbalk-icoon als data-URL (transparant, 64px; wordt in de titelbalk op 20px getoond)
buf = io.BytesIO()
on_square(mark, 64, 0.02).save(buf, format='PNG', optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
(ROOT / 'src/renderer/brand.generated.ts').write_text(
    "// GEGENEREERD door scripts/gen-logo-assets.py uit assets/brand/cv-studio-logo-source.png. Niet met de hand bewerken.\n"
    f"export const LOGO_MARK_PNG = 'data:image/png;base64,{b64}';\n"
)
print('klaar')
