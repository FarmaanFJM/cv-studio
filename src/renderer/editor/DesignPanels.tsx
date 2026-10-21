import React from 'react';
import { CV, MAX_FONT_PT, MIN_FONT_PT, SPACING_PRESETS, THEMES, TemplateId } from '../../shared/model';
import { ColorField, FontPicker, NumberField, Segmented, Toggle } from './fields';

type Upd = (fn: (cv: CV) => void) => void;

const TEMPLATES: { id: TemplateId; name: string }[] = [
  { id: 'sidebar', name: 'Zijbalk' },
  { id: 'header', name: 'Kopbalk' },
  { id: 'minimal', name: 'Minimaal' }
];

export function LayoutPanel({ cv, update }: { cv: CV; update: Upd }) {
  const st = cv.style;
  const set = <K extends keyof CV['style']>(k: K) => (v: CV['style'][K]) => update((c) => { c.style[k] = v; });
  return (
    <div className="stack" data-testid="layout-panel">
      <div className="template-pick">
        {TEMPLATES.map((t) => (
          <button type="button" key={t.id} data-testid={`tpl-${t.id}`} className={`tpl ${cv.template === t.id ? 'on' : ''}`}
            onClick={() => update((c) => { c.template = t.id; })}>
            <span className={`tpl-thumb ${t.id}`} style={{ '--a': st.sidebarBg } as React.CSSProperties}><i /><u /><b /><b /><b /></span>
            <strong>{t.name}</strong>
          </button>
        ))}
      </div>

      <div className="panel-group">
        <div className="group-title">Ruimte</div>
        <Segmented value={'' as never} name="spacing-preset" onChange={(k) => update((c) => Object.assign(c.style, SPACING_PRESETS[k as keyof typeof SPACING_PRESETS]))}
          options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normaal' }, { value: 'ruim', label: 'Ruim' }] as never} />
        <div className="grid2">
          <NumberField label="Marge" unit="mm" min={6} max={22} step={0.5} value={st.margin} name="margin" onChange={set('margin')} slider />
          <NumberField label="Tussen onderdelen" unit="mm" min={2} max={14} step={0.5} value={st.sectionGap} name="sectionGap" onChange={set('sectionGap')} slider />
          <NumberField label="Tussen items" unit="mm" min={0.5} max={8} step={0.5} value={st.itemGap} name="itemGap" onChange={set('itemGap')} slider />
          {cv.template !== 'minimal' && (
            <NumberField label="Breedte aanvullend" unit="mm" min={50} max={100} step={1} value={st.sidebarWidth} name="sidebarWidth" onChange={set('sidebarWidth')} slider />
          )}
        </div>
      </div>

      <div className="panel-group">
        <div className="group-title">Foto</div>
        <div className="grid2">
          <NumberField label="Grootte" unit="mm" min={24} max={60} step={1} value={st.photoSize} name="photoSize" onChange={set('photoSize')} slider />
          <div className="field">
            <span className="field-label">Vorm</span>
            <Segmented name="photo-shape" value={cv.photo?.shape ?? 'round'} onChange={(v) => update((c) => { if (c.photo) c.photo.shape = v; })}
              options={[{ value: 'round', label: 'Rond' }, { value: 'square', label: 'Vierkant' }]} />
          </div>
        </div>
      </div>

      <div className="panel-group">
        <div className="group-title">Opbouw</div>
        <div className="field">
          <span className="field-label">Datums bij items</span>
          <Segmented name="item-layout" value={st.itemLayout} onChange={set('itemLayout')}
            options={[{ value: 'inline', label: 'Rechts' }, { value: 'dates-left', label: 'Links' }]} />
        </div>
        <Toggle name="toggle-icons" label="Contacticonen" value={st.icons} onChange={set('icons')} />
        {cv.template === 'sidebar' && <Toggle name="toggle-name-side" label="Naam bij foto" value={st.nameInSidebar} onChange={set('nameInSidebar')} />}
      </div>
    </div>
  );
}

export function StylePanel({ cv, update, swatches, onSaveSwatch }: {
  cv: CV; update: Upd; swatches: string[]; onSaveSwatch: (hex: string) => void;
}) {
  const st = cv.style;
  const set = <K extends keyof CV['style']>(k: K) => (v: CV['style'][K]) => update((c) => { c.style[k] = v; });
  const common = { swatches, onSaveSwatch };
  return (
    <div className="stack" data-testid="style-panel">
      <div className="panel-group">
        <div className="group-title">Kleuren</div>
        <div className="theme-row">
          {THEMES.map((t) => (
            <button type="button" key={t.name} className="theme" title={t.name} data-testid={`theme-${t.name.toLowerCase()}`}
              style={{ background: `linear-gradient(135deg, ${t.sidebarBg} 55%, ${t.accent} 55%)` }}
              onClick={() => update((c) => { c.style.accent = t.accent; c.style.sidebarBg = t.sidebarBg; })} />
          ))}
        </div>
        <div className="grid2">
          <ColorField label="Accent" name="color-accent" value={st.accent} onChange={set('accent')} {...common} />
          <ColorField label="Vlak" name="color-sidebar" value={st.sidebarBg} onChange={set('sidebarBg')} {...common} />
          <ColorField label="Koppen" name="color-heading" value={st.headingColor} optional minContrast={3} onChange={set('headingColor')} {...common} />
          <ColorField label="Tekst" name="color-text" value={st.textColor} optional minContrast={4.5} onChange={set('textColor')} {...common} />
          <ColorField label="Lijnen" name="color-divider" value={st.dividerColor} optional onChange={set('dividerColor')} {...common} />
        </div>
      </div>

      <div className="panel-group">
        <div className="group-title">Tekst</div>
        <FontPicker value={st.font} onChange={set('font')} />
        <div className="grid2">
          <NumberField label="Lettergrootte" unit="pt" min={MIN_FONT_PT} max={MAX_FONT_PT} step={0.5} value={st.fontSize} name="fontsize" onChange={set('fontSize')} slider />
          <NumberField label="Regelafstand" min={1.2} max={1.8} step={0.05} value={st.lineHeight} name="lineHeight" onChange={set('lineHeight')} slider />
        </div>
        <Toggle name="toggle-tech-colors" label="Merkkleuren bij tech-iconen" value={st.techColors} onChange={set('techColors')} />
        <div className="field">
          <span className="field-label">Koppen</span>
          <Segmented name="heading-style" value={st.headingStyle} onChange={set('headingStyle')}
            options={[{ value: 'caps', label: 'KAPITALEN' }, { value: 'title', label: 'Titel + lijn' }, { value: 'plain', label: 'Gewoon' }]} />
        </div>
      </div>
    </div>
  );
}
