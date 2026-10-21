# CV Studio

Lokale Windows-desktopapp (Electron + React + TypeScript) waarmee je in een paar minuten een professioneel cv van **precies één A4-pagina** maakt. Alles blijft op je eigen computer: geen account, server, cloud of internetverbinding nodig.

## Installeren (Windows)

Draai `npm run dist` (zie hieronder) en start `release/CV-Studio-Setup-1.0.0.exe`, of laat GitHub Actions (`.github/workflows/windows-build.yml`) de installer bouwen en download die als artifact. Zonder installeren kan ook: `release/win-unpacked/CV Studio.exe`.

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

## Gebruik

1. **Onderdelen** (tabblad links): klik een onderdeel open om het te bewerken — of klik het direct in de preview. Verberg/toon met de knop *Zichtbaar/Verborgen*, wijzig de volgorde met ⠿ (slepen) of de pijlen, voeg eigen onderdelen toe onderaan.
2. **Foto**: onder *Persoonlijke gegevens*. Sleep een JPG/PNG/WebP naar het vak of kies een bestand; sleep in het vak om te positioneren, gebruik de zoomschuif, kies rond of vierkant.
3. **Opmaak**: sjabloon (*Zijbalk* of *Minimaal*, ATS-vriendelijk), accentkleur, lettertype, lettergrootte (min. 8 pt) en witruimte. Wisselen van sjabloon verliest geen gegevens.
4. **Versies**: bovenaan kies je een cv; *Dupliceren* maakt een kopie (bijv. "ING") zonder het origineel te wijzigen. *Exporteer/Importeer JSON* voor back-ups of delen.
5. **Exporteer PDF**: kies naam en map. De knop is uitgeschakeld zolang de inhoud niet op één pagina past; een rode melding noemt welke onderdelen over de rand gaan (de ruimte per onderdeel staat in mm bij elk onderdeel). Na het genereren controleert de app dat de PDF precies één A4-pagina is; anders wordt er niets opgeslagen.

Tip: begin regels in beschrijvingen met `-` voor opsommingstekens.

Gegevens staan in `%APPDATA%\CV Studio\data\cvs.json` (wordt automatisch en atomisch opgeslagen; een corrupt bestand wordt als `cvs.corrupt-<tijd>.json` bewaard).

## Opzet

- `electron/` — hoofdproces (venster, opslag, PDF-export via `printToPDF`, JSON import/export) en de beperkte preload-API. Veilig: `contextIsolation`, geen Node in de renderer, sandbox, CSP, geblokkeerde navigatie.
- `src/shared/model.ts` — datamodel en validatie van alle ingelezen data.
- `src/renderer/` — React-UI, editor en de twee templates. Preview en PDF gebruiken **dezelfde** component en mm/pt-maten, dus ze komen overeen. Lettertypen (Inter, Source Sans 3, Lato, Merriweather) zijn meegeleverd, dus offline.
- PDF-export rendert het cv in een verborgen venster, controleert daar opnieuw de paginalimiet, print met `printBackground` en zonder marges/headers, en inspecteert het resultaat met `pdf-lib`. De tekst in de PDF is echte, selecteerbare tekst.

## Uitgevoerde tests

Unit (`npm test`, vitest, 14 tests): opslag bewaren/herstellen (incl. foto, volgorde, opmaak), atomisch schrijven, herstel van corrupt bestand, sanitizing van vreemde/kwaadaardige invoer, dupliceren zonder het origineel te raken, standaardvolgorde stagecv, PDF-controle (1 pagina OK; 2 pagina's of niet-A4 wordt afgekeurd).

End-to-end (`npm run test:e2e`, Playwright tegen de echte Electron-app, 15 scenario's, allemaal geslaagd op Linux/xvfb): nieuw cv invullen → app sluiten → heropenen; foto uploaden/zoomen/positioneren/vierkant en na herstart behouden; project toevoegen/verwijderen; secties verbergen/tonen; volgorde wijzigen; wisselen tussen templates zonder gegevensverlies; dupliceren en apart bewerken; PDF-export (precies één pagina, A4-formaat, selecteerbare tekst gecontroleerd met pdf.js) voor beide templates; te veel tekst → melding, onderdeel gemarkeerd, export geblokkeerd (ook in het hoofdproces), geen inhoud verborgen; JSON export/import incl. kapotte en vreemde bestanden; corrupt opslagbestand; geen enkel netwerkverzoek en geen Node-toegang in de renderer.

## Beperkingen

- **Windows-build**: de installer (`CV-Studio-Setup-1.0.0.exe`) en `win-unpacked` zijn gebouwd vanuit Linux met Wine. Dat het `.exe` start (hoofd-, renderer- en GPU-proces blijven draaien) is gezien onder Wine, maar de UI en het volledige scenario zijn **niet op echte Windows** doorlopen. De workflow `windows-build.yml` draait dezelfde e2e-scenario's tegen de gebouwde `.exe` op `windows-latest`; draai die (of `CV_STUDIO_EXE="…\CV Studio.exe" node e2e/run.mjs`) om dat te bevestigen.
- `reference-cv.pdf` is **niet** in de projectmap aangetroffen. Template A (*Zijbalk*) is daarom gebaseerd op de beschreven opzet (gekleurde zijbalk met foto, contact, vaardigheden; hoofdkolom met profiel, projecten, opleiding, werkervaring), niet op de echte PDF, en er zijn geen voorbeeldgegevens meegeleverd — een nieuw cv is leeg. Leg het bestand in de projectmap om de template te laten afstemmen en voorbeeldgegevens te laten extraheren.
- Geen eigen app-icoon (standaard Electron-icoon) en geen code signing.
- Datums zijn vrije tekst; lettertypen bevatten alleen Latijnse tekens.
- Drag-and-drop van onderdelen is niet in de e2e-tests gedekt (de pijlknoppen wel); het slepen gebruikt de native HTML5-drag-and-drop.
