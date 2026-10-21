import React from 'react';
import { ACCENTS, CV, FONTS, MAX_FONT_PT, MIN_FONT_PT } from '../../shared/model';
import { SPACING } from '../layout';
import { Field } from './fields';

export function StylePanel({ cv, update }: { cv: CV; update: (fn: (cv: CV) => void) => void }) {
  const st = cv.style;
  return (
    <div className="stack" data-testid="style-panel">
      <div>
        <div className="field-label">Sjabloon</div>
        <div className="template-pick">
          {([['sidebar', 'Zijbalk', 'Gekleurde zijbalk met foto, contact en vaardigheden'], ['minimal', 'Minimaal', 'Eén kolom, ATS-vriendelijk']] as const).map(([id, name, desc]) => (
            <button type="button" key={id} data-testid={`tpl-${id}`} className={`tpl ${cv.template === id ? 'on' : ''}`}
              onClick={() => update((c) => { c.template = id; })}>
              <span className={`tpl-thumb ${id}`} style={{ '--a': st.accent } as React.CSSProperties}><i /><b /><b /><b /></span>
              <strong>{name}</strong>
              <small>{desc}</small>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="field-label">Accentkleur</div>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button type="button" key={a} className={`swatch ${st.accent === a ? 'on' : ''}`} style={{ background: a }} aria-label={a}
              data-testid={`accent-${a.slice(1)}`} onClick={() => update((c) => { c.style.accent = a; })} />
          ))}
          <input type="color" value={st.accent} title="Eigen kleur" onChange={(e) => update((c) => { c.style.accent = e.target.value; })} />
        </div>
      </div>
      <div className="grid2">
        <Field label="Lettertype">
          <select className="input" data-testid="font-select" value={st.font} onChange={(e) => update((c) => { c.style.font = e.target.value as CV['style']['font']; })}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Witruimte">
          <select className="input" data-testid="spacing-select" value={st.spacing} onChange={(e) => update((c) => { c.style.spacing = e.target.value as CV['style']['spacing']; })}>
            {Object.entries(SPACING).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label={`Lettergrootte: ${st.fontSize.toFixed(1)} pt`} hint={`Minimaal ${MIN_FONT_PT} pt voor leesbaarheid.`}>
        <input type="range" data-testid="fontsize" min={MIN_FONT_PT} max={MAX_FONT_PT} step={0.5} value={st.fontSize}
          onChange={(e) => update((c) => { c.style.fontSize = Number(e.target.value); })} />
      </Field>
    </div>
  );
}
