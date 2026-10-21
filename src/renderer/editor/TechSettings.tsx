import React from 'react';
import { CV, Section, TechColorMode } from '../../shared/model';
import { effectiveTech } from '../../shared/tech';
import { SummaAccordion, SummaSegmented, SummaToggle } from '../ui';

export const TECH_COLOR_OPTIONS: { value: TechColorMode; label: string; title: string }[] = [
  { value: 'auto', label: 'Automatisch', title: 'Originele kleuren in de hoofdinhoud, monochroom in aanvullende inhoud en op donkere vlakken' },
  { value: 'brand', label: 'Merkkleuren', title: 'Herkenbare merkkleuren waar ze goed leesbaar zijn' },
  { value: 'mono', label: 'Monochroom', title: 'Eén voorgrondkleur' }
];
export const colorLabel = (m: TechColorMode) => TECH_COLOR_OPTIONS.find((o) => o.value === m)!.label;

type TechSection = Extract<Section, { techOverride: boolean }>;

/**
 * Iconen-instellingen van één onderdeel: standaard volgt het de globale stijl (Stijl -> Technologie-iconen);
 * met "Eigen instellingen" heeft het een eigen zichtbaarheid en kleurmodus. Globaal uit gaat altijd voor.
 */
export function TechSettingsPanel({ cv, s, edit }: { cv: CV; s: TechSection; edit: <S extends Section>(fn: (s: S) => void) => void }) {
  const g = cv.style;
  const eff = effectiveTech(g, s);
  const globalOff = !g.techIcons;
  return (
    <SummaAccordion title="Technologie-iconen" name="sec-tech-accordion" defaultOpen={s.techOverride} accent={s.techOverride}
      badge={<span className={`badge ${s.techOverride ? 'own' : 'inherit'}`} data-testid="tech-badge">{s.techOverride ? 'Eigen' : 'Volgt stijl'}</span>}>
      <div className="stack tight">
        <SummaSegmented name="tech-source" label="Bron van de icooninstellingen" value={s.techOverride ? 'custom' : 'default'}
          onChange={(v) => edit<TechSection>((x) => { x.techOverride = v === 'custom'; if (v === 'custom') { x.techShow = true; x.techColor = g.techColorMode; } })}
          options={[{ value: 'default', label: 'Standaardinstelling gebruiken' }, { value: 'custom', label: 'Eigen instellingen' }]} />
        {!s.techOverride ? (
          <p className="inherit-note" data-testid="tech-inherit-note">
            Volgt <b>Stijl</b>: {g.techIcons ? <>iconen aan · {colorLabel(g.techColorMode)}</> : 'iconen uit'}
          </p>
        ) : (
          <div className="override-box">
            <SummaToggle name="tech-show" label="Toon iconen" checked={s.techShow} disabled={globalOff}
              hint={globalOff ? 'Staat globaal uit (Stijl → Technologie-iconen)' : undefined}
              onChange={(v) => edit<TechSection>((x) => { x.techShow = v; })} />
            <SummaSegmented name="tech-color" label="Kleur van de iconen" value={s.techColor} disabled={globalOff || !s.techShow}
              onChange={(v) => edit<TechSection>((x) => { x.techColor = v; })} options={TECH_COLOR_OPTIONS} />
            {!globalOff && !eff.show && <p className="field-hint">Iconen zijn voor dit onderdeel uitgezet.</p>}
          </div>
        )}
      </div>
    </SummaAccordion>
  );
}
