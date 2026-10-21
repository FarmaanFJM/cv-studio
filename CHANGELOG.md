# Changelog

## 3.0.0 — UX-herontwerp
- Lokale, herbruikbare `Summa*`-componenten (knop, tooltip, schakelaar, segmented, select, getalveld + slider, kleurkiezer, lettertypekiezer, veld, accordion, sectiekaart, menu) met Summa-ontwerptokens.
- Duidelijke taakverdeling: **Inhoud** (wat), **Layout** (structuur), **Stijl** (uiterlijk); onderdeelspecifieke opties blijven in het onderdeel. Progressive disclosure via accordions.
- Technologie-iconen: zichtbaarheid en kleur zijn nu aparte instellingen. Globaal *Toon iconen* + kleurmodus (Automatisch / Merkkleuren / Monochroom) in Stijl; per onderdeel *Standaardinstelling gebruiken* of *Eigen instellingen*. Expliciete voorrang: globaal → onderdeel → per technologie → kleurmodus → contrastterugval. Weergave (*Tekst*, *Icoon + label*, *Lijst*, *Chips*) is los van de zichtbaarheid; *Tekst* toont nooit iconen. Contacticonen staan los van technologie-iconen.
- Sectiekaarten met consistente acties (uitklappen, plaatsing, zichtbaarheid, sleepgreep met toetsenbordbediening, ⋯-menu); highlight in de preview bij selecteren en verplaatsen.
- Preview met zoom (−/+, Ctrl+scrollwiel, passend); compactere kop; editor werkt van smal tot breed zonder overloop.
- Toegankelijkheid: zichtbare focus, rol/naam voor alle controls, toetsenbordbediening, tooltips voor icoonknoppen, lokale validatiemeldingen, `prefers-reduced-motion`, axe-core-controle in de tests.
- Getalvelden: typen, pijltjestoetsen en −/+ zonder terugspringen; sliders met zichtbaar bereik.
- Versie 3.0.0 zichtbaar in de editor; opslagformaat v4 met automatische migratie van v1–v3 (oude tech-instellingen behouden hun uiterlijk).

## 2.0.0
Sjablonen (Zijbalk, Kopbalk, Minimaal), positie-onafhankelijke zones, technologie-iconen met merkkleuren, uitgebreide stijl- en kleurinstellingen.

## 1.0.0
Eerste versie: editor, A4-preview, PDF-export, lokale opslag, versies.
