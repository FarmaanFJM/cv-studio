# CV Studio

Lokale Windows-desktopapp (Electron + React + TypeScript) waarmee je in een paar minuten een professioneel cv van **precies één A4-pagina** maakt. Alles blijft op je eigen computer: geen account, server, cloud of internetverbinding nodig.

## Installeren (Windows)

Draai `npm run dist` (zie hieronder) en start `release/CV-Studio-Setup-3.0.0.exe`, of laat GitHub Actions (`.github/workflows/windows-build.yml`) de installer bouwen en download die als artifact. Zonder installeren kan ook: `release/win-unpacked/CV Studio.exe`.

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

## Gebruik (v3)

Links de editor (breedte instelbaar via de scheidingslijn), rechts de live A4-preview (zoom met −/+ of Ctrl+scrollwiel; *Passend* herstelt). Drie tabs met een vaste taakverdeling:

- **Inhoud** — wat er op het cv staat. Onderdelen staan gegroepeerd per rol: **Hoofdinhoud**, **Aanvullende inhoud** en **Verborgen** (positie-onafhankelijk: het sjabloon bepaalt waar aanvullende inhoud komt). Elke kaart heeft dezelfde acties: uitklappen, *Hoofd/Aanvullend*, zichtbaar-schakelaar, een sleepgreep (ook met pijltjestoetsen) en een ⋯-menu (omhoog, omlaag, verwijderen). Bij verplaatsen of selecteren licht het onderdeel kort op in de preview. Onderdeelspecifieke opties (vaardigheden-indeling, tech stack, iconen) staan in het onderdeel zelf.
- **Layout** — structuur: sjabloon (Zijbalk, Kopbalk, Minimaal), marge en ruimte (voorinstellingen + schuif/getal), breedte aanvullend, foto (tonen, vorm, grootte), datums links/rechts, naam bij foto, en een overzicht van de plaatsing.
- **Stijl** — uiterlijk: kleurthema's en kleuren (accent, vlak, koppen, tekst; lijnen onder *Meer kleuren*), typografie (doorzoekbaar lettertype, lettergrootte, kopstijl; regelafstand onder *Meer typografie*), **Technologie-iconen** en **Contacticonen**.

### Technologie-iconen: globaal en per onderdeel
- **Globaal (Stijl → Technologie-iconen):** schakelaar *Toon iconen* en kleurmodus *Automatisch* (originele kleuren in hoofdinhoud, monochroom in aanvullende inhoud en op donkere vlakken), *Merkkleuren* of *Monochroom*. Staat de schakelaar uit, dan is de kleurkeuze uitgeschakeld maar blijft bewaard.
- **Per onderdeel (vaardigheden, projecten, link-/lijstsecties):** *Standaardinstelling gebruiken* (volgt Stijl; de kaart toont "Volgt stijl") of *Eigen instellingen* (eigen *Toon iconen* en kleur; badge "Eigen").
- **Voorrang:** 1) globaal *Toon iconen* uit → nergens iconen; 2) eigen instelling van het onderdeel; 3) keuze per technologie (eigen icoon of *Geen icoon*) — zet iconen nooit terug aan; 4) kleurmodus (onderdeel, anders globaal); 5) automatische contrastterugval naar monochroom.
- **Weergave** is een aparte keuze: *Tekst* (nooit iconen), *Icoon + label*, *Lijst*, *Chips*. Contacticonen (e-mail, telefoon, GitHub, LinkedIn …) staan los van technologie-iconen.

Bovenaan: versies (nieuw, dupliceren, hernoemen, verwijderen) en JSON export/import (back-up/herstel). **Exporteer PDF** is uitgeschakeld zolang de inhoud niet op één A4-pagina past; de melding noemt de onderdelen die over de rand gaan.

Gegevens staan in `%APPDATA%\CV Studio\data\cvs.json` en blijven bij een upgrade bewaard. Opslag van v1 en v2 wordt automatisch gemigreerd.

### Lokale UI-componenten
`src/renderer/ui/` bevat de herbruikbare Summa-componenten: `SummaButton`, `SummaTooltip`, `SummaToggle`, `SummaSegmented`, `SummaSelect`, `SummaNumberInput` (+ `SummaSlider`), `SummaColorPicker`, `SummaFontPicker`, `SummaField`/`SummaFieldset`, `SummaAccordion`, `SummaSectionCard`/`SummaItemCard`, `SummaMenu`. Tokens: `#0C0D0E` `#141618` `#202326` `#2B2E31` `#ECEEEF` `#8D9298` `#B7F736` (alleen voor de editor, niet voor het cv).

## Opzet

- `electron/` — hoofdproces (venster, opslag, PDF-export via `printToPDF`, JSON import/export) en de beperkte preload-API. Veilig: `contextIsolation`, geen Node in de renderer, sandbox, CSP, geblokkeerde navigatie.
- `src/shared/model.ts` — datamodel en validatie van alle ingelezen data.
- `src/renderer/` — React-UI, editor en de twee templates. Preview en PDF gebruiken **dezelfde** component en mm/pt-maten, dus ze komen overeen. Lettertypen (Inter, Source Sans 3, Lato, Merriweather) zijn meegeleverd, dus offline.
- PDF-export rendert het cv in een verborgen venster, controleert daar opnieuw de paginalimiet, print met `printBackground` en zonder marges/headers, en inspecteert het resultaat met `pdf-lib`. De tekst in de PDF is echte, selecteerbare tekst.

## Uitgevoerde tests

Unit (`npm test`, vitest): opslag, sanitizing, migraties (v1, v2 en de oude tech-instellingen), zone-logica, kleur/contrast, voorrangsregels van tech-iconen, kleurbeleid van iconen, PDF-controle.

End-to-end (`npm run test:e2e`, Playwright tegen de echte Electron-app, 37 scenario's, geslaagd op Linux/xvfb): alle eerdere scenario's plus globale/sectie-instellingen van tech-iconen (inclusief voorrang, bewaren na heropenen en wisselen van template), toetsenbordbediening met zichtbare focus (tabs, segmented, getal, slider, accordion, menu, tooltip, verplaatsen), slider slepen en typen zonder terugspringen, kleurkiezer met foutfeedback en opgeslagen kleuren, zoomen zonder vervorming, smalle en brede editor zonder horizontale overloop, een axe-core-scan (WCAG 2.2 AA) op alle tabs, versieweergave, v2-migratie en pixelcontrole van gerenderde PDF's voor alle templates.

## Beperkingen

- **Windows-build**: de installer (`CV-Studio-Setup-3.0.0.exe`) en `win-unpacked` zijn gebouwd vanuit Linux met Wine. Dat het `.exe` start (hoofd-, renderer- en GPU-proces blijven draaien) is gezien onder Wine, maar de UI en het volledige scenario zijn **niet op echte Windows** doorlopen. De workflow `windows-build.yml` draait dezelfde e2e-scenario's tegen de gebouwde `.exe` op `windows-latest`; draai die (of `CV_STUDIO_EXE="…\CV Studio.exe" node e2e/run.mjs`) om dat te bevestigen.
- De sjablonen zijn geïnspireerd op de meegestuurde voorbeeldafbeeldingen (zijbalk, kopbalk, minimaal), niet gekopieerd; `reference-cv.pdf` is nooit in de projectmap aangetroffen. Een nieuw cv is leeg; er zijn geen voorbeeldgegevens meegeleverd.
- Lettertypen bevatten alleen Latijnse tekens; kleurwaarden zijn hex (geen CMYK). De PDF gebruikt dezelfde kleuren als het scherm.
- Meerkleurige logo's komen uit `devicon` (MIT) en enkelkleurige uit `simple-icons` (CC0), zie `THIRD_PARTY_NOTICES.md` (logo's blijven handelsmerken van de eigenaren; `npm run gen:icons` vernieuwt de meerkleurige set). Voor Go, Linux, Django, Rails, GraphQL en Jest is er geen (klein genoeg) kleurenlogo gebundeld: die tonen de merkkleur als effen logo of monochroom. Voor merken zonder icoon (bijv. AWS, SQL Server) wordt een algemeen icoon of alleen tekst gebruikt. Iconen per technologie voor projecten staan op automatisch (geen handmatige override zoals bij vaardigheden).
- Geen eigen app-icoon (standaard Electron-icoon) en geen code signing.
- Datums zijn vrije tekst; lettertypen bevatten alleen Latijnse tekens.
- Drag-and-drop van onderdelen is niet in de e2e-tests gedekt (de pijlknoppen wel); het slepen gebruikt de native HTML5-drag-and-drop.
