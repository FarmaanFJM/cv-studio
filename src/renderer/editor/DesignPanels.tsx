import React from 'react';
import { CV, MAX_FONT_PT, MIN_FONT_PT, SPACING_PRESETS, THEMES, TemplateId, zoneOf } from '../../shared/model';
import {
  SummaAccordion, SummaButton, SummaColorPicker, SummaFieldset, SummaFontPicker, SummaNumberInput, SummaSegmented, SummaToggle
} from '../ui';
import { TECH_COLOR_OPTIONS } from './TechSettings';

type Upd = (fn: (cv: CV) => void) => void;

const TEMPLATES: { id: TemplateId; name: string }[] = [
  { id: 'sidebar', name: 'Zijbalk' },
  { id: 'header', name: 'Kopbalk' },
  { id: 'minimal', name: 'Minimaal' }
];

const Group = ({ title, children, name }: { title: string; children: React.ReactNode; name?: string }) => (
  <section className="panel-group" aria-label={title} data-testid={name}>
    <h3 className="group-title">{title}</h3>
    {children}
  </section>
);

/** Layout: alles wat de structuur van de pagina bepaalt. */
export function LayoutPanel({ cv, update, onOpenContent }: { cv: CV; update: Upd; onOpenContent: () => void }) {
  const st = cv.style;
  const set = <K extends keyof CV['style']>(k: K) => (v: CV['style'][K]) => update((c) => { c.style[k] = v; });
  const preset = (Object.keys(SPACING_PRESETS) as (keyof typeof SPACING_PRESETS)[]).find((k) =>
    SPACING_PRESETS[k].sectionGap === st.sectionGap && SPACING_PRESETS[k].itemGap === st.itemGap && SPACING_PRESETS[k].margin === st.margin) ?? '';
  const names = (z: 'primary' | 'supplementary' | 'hidden') => cv.sections.filter((s) => zoneOf(cv, s) === z).map((s) => (s.type === 'personal' ? 'Persoonlijke gegevens' : s.title));
  return (
    <div className="stack" data-testid="layout-panel">
      <div className="template-pick" role="radiogroup" aria-label="Sjabloon">
        {TEMPLATES.map((t) => (
          <button type="button" key={t.id} role="radio" aria-checked={cv.template === t.id} data-testid={`tpl-${t.id}`} className={`tpl ${cv.template === t.id ? 'on' : ''}`}
            onClick={() => update((c) => { c.template = t.id; })}>
            <span className={`tpl-thumb ${t.id}`} style={{ '--a': st.sidebarBg } as React.CSSProperties} aria-hidden="true"><i /><u /><b /><b /><b /></span>
            <strong>{t.name}</strong>
          </button>
        ))}
      </div>

      <Group title="Ruimte">
        <SummaFieldset label="Voorinstelling">
          <SummaSegmented name="spacing-preset" label="Voorinstelling ruimte" value={preset as 'compact'} onChange={(k) => update((c) => Object.assign(c.style, SPACING_PRESETS[k]))}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normaal' }, { value: 'ruim', label: 'Ruim' }]} />
        </SummaFieldset>
        <div className="grid2">
          <SummaNumberInput label="Marge" unit="mm" min={6} max={22} step={0.5} value={st.margin} name="margin" onChange={set('margin')} slider />
          <SummaNumberInput label="Tussen onderdelen" unit="mm" min={2} max={14} step={0.5} value={st.sectionGap} name="sectionGap" onChange={set('sectionGap')} slider />
          <SummaNumberInput label="Tussen items" unit="mm" min={0.5} max={8} step={0.5} value={st.itemGap} name="itemGap" onChange={set('itemGap')} slider />
          {cv.template !== 'minimal' && (
            <SummaNumberInput label="Breedte aanvullend" unit="mm" min={50} max={100} step={1} value={st.sidebarWidth} name="sidebarWidth" onChange={set('sidebarWidth')} slider />
          )}
        </div>
      </Group>

      <Group title="Foto">
        {!cv.photo && <p className="field-hint">Voeg een foto toe onder Inhoud → Persoonlijke gegevens.</p>}
        <SummaToggle name="toggle-photo" label="Toon foto" checked={!!cv.photo?.visible} disabled={!cv.photo} onChange={(v) => update((c) => { if (c.photo) c.photo.visible = v; })} />
        <div className="grid2">
          <SummaFieldset label="Vorm">
            <SummaSegmented name="photo-shape" label="Vorm van de foto" disabled={!cv.photo} value={cv.photo?.shape ?? 'round'} onChange={(v) => update((c) => { if (c.photo) c.photo.shape = v; })}
              options={[{ value: 'round', label: 'Rond' }, { value: 'square', label: 'Vierkant' }]} />
          </SummaFieldset>
          <SummaNumberInput label="Grootte" unit="mm" min={24} max={60} step={1} value={st.photoSize} name="photoSize" onChange={set('photoSize')} slider />
        </div>
      </Group>

      <Group title="Opbouw">
        <SummaFieldset label="Datums bij items">
          <SummaSegmented name="item-layout" label="Positie van datums" value={st.itemLayout} onChange={set('itemLayout')}
            options={[{ value: 'inline', label: 'Rechts' }, { value: 'dates-left', label: 'Links' }]} />
        </SummaFieldset>
        {cv.template === 'sidebar' && <SummaToggle name="toggle-name-side" label="Naam bij foto" checked={st.nameInSidebar} onChange={set('nameInSidebar')} />}
      </Group>

      <SummaAccordion title="Plaatsing van onderdelen" name="layout-placement">
        <div className="placement-overview" data-testid="placement-overview">
          {cv.template === 'minimal' ? (
            <p className="field-hint">Het sjabloon Minimaal gebruikt één kolom; de volgorde stel je in bij Inhoud.</p>
          ) : (
            (['primary', 'supplementary', 'hidden'] as const).map((z) => (
              <div key={z} className="po-row">
                <span className="po-label">{z === 'primary' ? 'Hoofdinhoud' : z === 'supplementary' ? 'Aanvullende inhoud' : 'Verborgen'}</span>
                <span className="po-items">{names(z).join(' · ') || '—'}</span>
              </div>
            ))
          )}
          <SummaButton small onClick={onOpenContent}>Wijzigen bij Inhoud</SummaButton>
        </div>
      </SummaAccordion>
    </div>
  );
}

/** Stijl: alles wat het uiterlijk bepaalt. */
export function StylePanel({ cv, update, swatches, onSaveSwatch }: {
  cv: CV; update: Upd; swatches: string[]; onSaveSwatch: (hex: string) => void;
}) {
  const st = cv.style;
  const set = <K extends keyof CV['style']>(k: K) => (v: CV['style'][K]) => update((c) => { c.style[k] = v; });
  const common = { swatches, onSaveSwatch };
  return (
    <div className="stack" data-testid="style-panel">
      <Group title="Kleuren">
        <div className="theme-row" role="group" aria-label="Kleurthema's">
          {THEMES.map((t) => (
            <button type="button" key={t.name} className="theme" title={t.name} aria-label={`Thema ${t.name}`} data-testid={`theme-${t.name.toLowerCase()}`}
              style={{ background: `linear-gradient(135deg, ${t.sidebarBg} 55%, ${t.accent} 55%)` }}
              onClick={() => update((c) => { c.style.accent = t.accent; c.style.sidebarBg = t.sidebarBg; })} />
          ))}
        </div>
        <div className="grid2">
          <SummaColorPicker label="Accent" name="color-accent" value={st.accent} onChange={set('accent')} {...common} />
          <SummaColorPicker label="Vlak" name="color-sidebar" value={st.sidebarBg} onChange={set('sidebarBg')} {...common} />
          <SummaColorPicker label="Koppen" name="color-heading" value={st.headingColor} optional minContrast={3} onChange={set('headingColor')} {...common} />
          <SummaColorPicker label="Tekst" name="color-text" value={st.textColor} optional minContrast={4.5} onChange={set('textColor')} {...common} />
        </div>
        <SummaAccordion title="Meer kleuren" name="more-colors">
          <div className="grid2"><SummaColorPicker label="Lijnen" name="color-divider" value={st.dividerColor} optional onChange={set('dividerColor')} {...common} /></div>
        </SummaAccordion>
      </Group>

      <Group title="Typografie">
        <SummaFontPicker value={st.font} onChange={set('font')} />
        <SummaNumberInput label="Lettergrootte" unit="pt" min={MIN_FONT_PT} max={MAX_FONT_PT} step={0.5} value={st.fontSize} name="fontsize" onChange={set('fontSize')} slider />
        <SummaFieldset label="Koppen">
          <SummaSegmented name="heading-style" label="Stijl van koppen" value={st.headingStyle} onChange={set('headingStyle')}
            options={[{ value: 'caps', label: 'KAPITALEN' }, { value: 'title', label: 'Titel + lijn' }, { value: 'plain', label: 'Gewoon' }]} />
        </SummaFieldset>
        <SummaAccordion title="Meer typografie" name="more-type">
          <div className="grid2"><SummaNumberInput label="Regelafstand" min={1.2} max={1.8} step={0.05} value={st.lineHeight} name="lineHeight" onChange={set('lineHeight')} slider /></div>
        </SummaAccordion>
      </Group>

      <Group title="Technologie-iconen" name="tech-global">
        <SummaToggle name="toggle-tech-icons" label="Toon iconen" checked={st.techIcons} onChange={set('techIcons')}
          hint="Voor vaardigheden, projecten en links. Onderdelen kunnen dit zelf overschrijven." />
        <SummaFieldset label="Kleur">
          <SummaSegmented name="tech-global-color" label="Kleur van technologie-iconen" value={st.techColorMode} disabled={!st.techIcons} onChange={set('techColorMode')} options={TECH_COLOR_OPTIONS} />
          {!st.techIcons && <span className="field-hint">Zet “Toon iconen” aan om de kleur te kiezen; je keuze blijft bewaard.</span>}
        </SummaFieldset>
      </Group>

      <Group title="Contacticonen" name="contact-icons">
        <SummaToggle name="toggle-icons" label="Toon contacticonen" checked={st.icons} onChange={set('icons')} hint="E-mail, telefoon, locatie, LinkedIn, GitHub en website" />
      </Group>
    </div>
  );
}
