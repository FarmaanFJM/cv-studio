# CV Studio

Lokale Windows-desktopapp (Electron + React + TypeScript) waarmee je in een paar minuten een professioneel cv van **precies één A4-pagina** maakt. Alles blijft op je eigen computer: geen account, server, cloud of internetverbinding nodig.

## Installeren (Windows)

Draai `npm run dist` (zie hieronder) en start `release/CV-Studio-Setup-2.0.0.exe`, of laat GitHub Actions (`.github/workflows/windows-build.yml`) de installer bouwen en download die als artifact. Zonder installeren kan ook: `release/win-unpacked/CV Studio.exe`.

> De installer is niet digitaal ondertekend; Windows SmartScreen kan daarom een waarschuwing tonen ("Meer info → Toch uitvoeren").

## Ontwikkelen

Vereist Node.js 22+.

```bash
npm install
npm run dev          # start de app met hot reload
npm start            # bouwen en starten zoals in productie
npm run dist         # Windows-installer in ./release (op Linux/macOS is Wine nodig)
npm test             # unit tests (opslag, sanitizing, PDF-/paginacontrole)
npm run test:e2e     # end-to-end tests met de echte Electron-app (Linux: npm run test:e2e:linux, gebruikt xvfb)
```

## Gebruik (v2)

Het donkere editorpaneel (links, breedte instelbaar via de scheidingslijn) heeft drie tabs:

- **Inhoud** — onderdelen staan gegroepeerd in **Zijbalk**, **Hoofdgedeelte** en **Verborgen**. Per onderdeel kies je *Links* / *Hoofd* of verberg je het; slepen tussen groepen of de pijlen wijzigt de volgorde. Klikken op een onderdeel (ook in de preview) opent het. *+ Onderdeel* voegt voorbeelden toe (Interesses, Certificaten, Links, Over mij, Extra informatie, Gegevens/maten) of een eigen onderdeel. Vaardigheden: *Lijst*, *Groepen* of *Niveaus* (Beste/Goed/Bekend met/Interesse in, optioneel met stippen) en weergave *Tekst/Lijst/Chips*. Talen: niveau als tekst of stippen. Foto: slepen, zoomen, positioneren, rond of vierkant.
- **Layout** — sjabloon (**Zijbalk**, **Kopbalk**, **Minimaal**), marge en ruimte (met presets), zijbalkbreedte, fotogrootte, datums rechts of links van items, contacticonen aan/uit, naam in zijbalk.
- **Stijl** — kleurthema's; accent-, zijbalk/kop-, kop-, tekst- en lijnkleur met kleurkiezer, hex-invoer en eigen opgeslagen kleuren (tekstkleur wordt geweigerd bij te laag contrast); 15 meegeleverde lettertypen met zoekveld; lettergrootte (min. 8 pt) en regelafstand met −/+, invoer of schuif; kopstijl.

Bovenaan: versies (nieuw, dupliceren, hernoemen, verwijderen) en JSON export/import. **Exporteer PDF** is uitgeschakeld zolang de inhoud niet op één A4-pagina past; de melding noemt de onderdelen die over de rand gaan.

Gegevens staan in `%APPDATA%\CV Studio\data\cvs.json`. Opslag van v1 wordt automatisch gemigreerd.

## Opzet

- `electron/` — hoofdproces (venster, opslag, PDF-export via `printToPDF`, JSON import/export) en de beperkte preload-API. Veilig: `contextIsolation`, geen Node in de renderer, sandbox, CSP, geblokkeerde navigatie.
- `src/shared/model.ts` — datamodel en validatie van alle ingelezen data.
- `src/renderer/` — React-UI, editor en de twee templates. Preview en PDF gebruiken **dezelfde** component en mm/pt-maten, dus ze komen overeen. Lettertypen (Inter, Source Sans 3, Lato, Merriweather) zijn meegeleverd, dus offline.
- PDF-export rendert het cv in een verborgen venster, controleert daar opnieuw de paginalimiet, print met `printBackground` en zonder marges/headers, en inspecteert het resultaat met `pdf-lib`. De tekst in de PDF is echte, selecteerbare tekst.

## Uitgevoerde tests

Unit (`npm test`, vitest, 24 tests): opslag, sanitizing, v1→v2-migratie, zone-logica (verplaatsen/verbergen/volgorde), kleurhulpen en contrast, dupliceren, PDF-/paginacontrole.

End-to-end (`npm run test:e2e`, Playwright tegen de echte Electron-app, 24 scenario's, geslaagd op Linux/xvfb): alle v1-scenario's (invullen en heropenen, foto, projecten, verbergen/tonen, volgorde, templates, dupliceren, PDF van precies één A4-pagina met selecteerbare tekst voor alle drie de templates, overflow-melding en geblokkeerde export, JSON import/export en kapotte bestanden, corrupt opslagbestand, offline) plus: zones verplaatsen (knoppen en slepen), vaardigheden in drie modi met chips/stippen, extra zijbalk-onderdelen, lettertype zoeken, numerieke invoer met −/+ en 8 pt-minimum, kleur via hex/opslaan en contrastweigering, kopbalk met iconen (o.a. LinkedIn/GitHub-logo), splitter, en migratie van een v1-opslagbestand.

## Beperkingen

- **Windows-build**: de installer (`CV-Studio-Setup-2.0.0.exe`) en `win-unpacked` zijn gebouwd vanuit Linux met Wine. Dat het `.exe` start (hoofd-, renderer- en GPU-proces blijven draaien) is gezien onder Wine, maar de UI en het volledige scenario zijn **niet op echte Windows** doorlopen. De workflow `windows-build.yml` draait dezelfde e2e-scenario's tegen de gebouwde `.exe` op `windows-latest`; draai die (of `CV_STUDIO_EXE="…\CV Studio.exe" node e2e/run.mjs`) om dat te bevestigen.
- De sjablonen zijn geïnspireerd op de meegestuurde voorbeeldafbeeldingen (zijbalk, kopbalk, minimaal), niet gekopieerd; `reference-cv.pdf` is nooit in de projectmap aangetroffen. Een nieuw cv is leeg; er zijn geen voorbeeldgegevens meegeleverd.
- Lettertypen bevatten alleen Latijnse tekens; kleurwaarden zijn hex (geen CMYK). De PDF gebruikt dezelfde kleuren als het scherm.
- Geen eigen app-icoon (standaard Electron-icoon) en geen code signing.
- Datums zijn vrije tekst; lettertypen bevatten alleen Latijnse tekens.
- Drag-and-drop van onderdelen is niet in de e2e-tests gedekt (de pijlknoppen wel); het slepen gebruikt de native HTML5-drag-and-drop.
