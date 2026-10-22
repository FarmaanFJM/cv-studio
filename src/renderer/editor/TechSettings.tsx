import React from 'react';
import { CV, Section, TechColorMode } from '../../shared/model';
import { SummaFieldset, SummaSegmented } from '../ui';

export const TECH_COLOR_OPTIONS: { value: TechColorMode; label: string; title: string }[] = [
  { value: 'auto', label: 'Automatisch', title: 'Originele kleuren in de hoofdinhoud, monochroom in aanvullende inhoud en op donkere vlakken' },
  { value: 'brand', label: 'Merkkleuren', title: 'Herkenbare merkkleuren waar ze goed leesbaar zijn' },
  { value: 'mono', label: 'Monochroom', title: 'Eén voorgrondkleur' }
];
type TechSection = Extract<Section, { techOverride: boolean }>;
type IconMode = 'default' | TechColorMode | 'off';

/**
 * Iconen van één onderdeel in één keuze: Standaard (volgt Stijl), een kleurmodus, of Uit.
 * Het opslagmodel is ongewijzigd: Standaard = geen eigen instelling (techOverride uit; eigen waarden blijven bewaard),
 * Uit = eigen instelling met iconen uit, kleurmodus = eigen instelling met iconen aan. Staan iconen globaal uit (Stijl),
 * dan is de keuze uitgeschakeld, want globaal uit gaat altijd voor.
 */
export function TechSettingsPanel({ cv, s, edit }: { cv: CV; s: TechSection; edit: <S extends Section>(fn: (s: S) => void) => void }) {
  const globalOff = !cv.style.techIcons;
  const mode: IconMode = !s.techOverride ? 'default' : !s.techShow ? 'off' : s.techColor;
  const set = (m: IconMode) => edit<TechSection>((x) => {
    if (m === 'default') x.techOverride = false;
    else if (m === 'off') { x.techOverride = true; x.techShow = false; }
    else { x.techOverride = true; x.techShow = true; x.techColor = m; }
  });
  return (
    <div title={globalOff ? 'Iconen staan uit bij Stijl' : undefined}>
      <SummaFieldset label="Iconen">
        <SummaSegmented<IconMode> name="tech-mode" label="Iconen" value={mode} disabled={globalOff} onChange={set} options={[
          { value: 'default', label: 'Standaard', title: 'Volgt de instelling bij Stijl' },
          { value: 'auto', label: 'Automatisch', title: TECH_COLOR_OPTIONS[0].title },
          { value: 'brand', label: 'Merkkleuren', title: TECH_COLOR_OPTIONS[1].title },
          { value: 'mono', label: 'Monochroom', title: TECH_COLOR_OPTIONS[2].title },
          { value: 'off', label: 'Uit', title: 'Geen iconen in dit onderdeel' }
        ]} />
      </SummaFieldset>
    </div>
  );
}
