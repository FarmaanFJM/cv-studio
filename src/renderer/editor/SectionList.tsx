import React, { useState } from 'react';
import { CV, Section, SECTION_TITLES, SectionType, newCustomSection, uid } from '../../shared/model';
import { FitReport } from '../layout';
import { Btn, Field, TextInput, move } from './fields';
import { SectionEditor } from './SectionEditors';

interface Props {
  cv: CV;
  update: (fn: (cv: CV) => void) => void;
  fit: FitReport | null;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

const STANDARD: SectionType[] = ['personal', 'profile', 'experience', 'education', 'projects', 'skills', 'languages'];

function emptySection(type: SectionType): Section {
  const base = { id: uid(), title: SECTION_TITLES[type], visible: true };
  switch (type) {
    case 'personal': return { ...base, type };
    case 'profile': return { ...base, type, text: '' };
    case 'experience': return { ...base, type, items: [] };
    case 'education': return { ...base, type, items: [] };
    case 'projects': return { ...base, type, items: [] };
    case 'skills': return { ...base, type, groups: [] };
    case 'languages': return { ...base, type, items: [] };
    default: return newCustomSection();
  }
}

export function SectionList({ cv, update, fit, openId, setOpenId }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const missing = STANDARD.filter((t) => !cv.sections.some((s) => s.type === t));

  const reorder = (from: string, to: string) => {
    update((c) => {
      const a = c.sections.findIndex((s) => s.id === from);
      const b = c.sections.findIndex((s) => s.id === to);
      if (a >= 0 && b >= 0 && a !== b) c.sections = move(c.sections, a, b);
    });
  };

  return (
    <div className="sections" data-testid="section-list">
      {cv.sections.map((s, idx) => {
        const u = fit?.sections.find((x) => x.id === s.id);
        const open = openId === s.id;
        const over = !!u && u.overflowMm > 0 && s.visible;
        return (
          <div
            key={s.id}
            data-testid={`sec-${s.type}`}
            data-sec-id={s.id}
            className={`card ${open ? 'open' : ''} ${s.visible ? '' : 'hidden-sec'} ${over ? 'overflow' : ''} ${overId === s.id && dragId !== s.id ? 'drop-target' : ''}`}
            onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverId(s.id); } }}
            onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, s.id); setDragId(null); setOverId(null); }}
          >
            <div className="card-head" onClick={() => setOpenId(open ? null : s.id)}>
              <span className="handle" draggable title="Sleep om de volgorde te wijzigen"
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}>⠿</span>
              <span className="card-title">{s.type === 'personal' ? 'Persoonlijke gegevens' : s.title || SECTION_TITLES[s.type]}</span>
              {s.visible && u && u.heightMm > 0 && (
                <span className={`usage ${over ? 'bad' : ''}`} title="Ruimte op de pagina">{Math.round(u.heightMm)} mm</span>
              )}
              {!s.visible && <span className="usage muted-badge">verborgen</span>}
              <span className="spacer" />
              <button type="button" className="icon-btn" title="Omhoog" data-testid={`sec-${s.type}-up`} disabled={idx === 0}
                onClick={(e) => { e.stopPropagation(); update((c) => { c.sections = move(c.sections, idx, idx - 1); }); }}>↑</button>
              <button type="button" className="icon-btn" title="Omlaag" data-testid={`sec-${s.type}-down`} disabled={idx === cv.sections.length - 1}
                onClick={(e) => { e.stopPropagation(); update((c) => { c.sections = move(c.sections, idx, idx + 1); }); }}>↓</button>
              <button type="button" className={`icon-btn eye ${s.visible ? 'on' : ''}`} data-testid={`sec-${s.type}-toggle`}
                title={s.visible ? 'Verbergen in cv' : 'Tonen in cv'} aria-pressed={s.visible}
                onClick={(e) => { e.stopPropagation(); update((c) => { const t = c.sections.find((x) => x.id === s.id); if (t) t.visible = !t.visible; }); }}>
                {s.visible ? 'Zichtbaar' : 'Verborgen'}
              </button>
            </div>
            {open && (
              <div className="card-body">
                <Field label="Titel in cv">
                  <TextInput name="sec-title" value={s.title} onChange={(v) => update((c) => { const t = c.sections.find((x) => x.id === s.id); if (t) t.title = v; })} />
                </Field>
                <SectionEditor s={s} cv={cv} update={update} />
                {s.type !== 'personal' && (
                  <div className="card-foot">
                    <Btn kind="danger" small name={`sec-${s.type}-delete`}
                      onClick={() => { if (confirm(`Onderdeel "${s.title}" verwijderen?`)) update((c) => { c.sections = c.sections.filter((x) => x.id !== s.id); }); }}>
                      Onderdeel verwijderen
                    </Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="add-section">
        <Btn name="add-custom" onClick={() => { const n = newCustomSection(); update((c) => { c.sections.push(n); }); setOpenId(n.id); }}>+ Eigen onderdeel</Btn>
        {missing.map((t) => (
          <Btn key={t} small kind="ghost" onClick={() => { const n = emptySection(t); update((c) => { c.sections.push(n); }); setOpenId(n.id); }}>
            + {SECTION_TITLES[t]}
          </Btn>
        ))}
      </div>
    </div>
  );
}
