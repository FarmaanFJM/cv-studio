import React, { useEffect, useRef, useState } from 'react';
import {
  CV, PlaceTarget, SECTION_PRESETS, SECTION_TITLES, Section, SectionType, emptySection, moveInZone, placeSection, zoneOf
} from '../../shared/model';
import { Icon } from '../icons';
import { FitReport } from '../layout';
import { Btn, Field, TextInput } from './fields';
import { SectionEditor } from './SectionEditors';

interface Props {
  cv: CV;
  update: (fn: (cv: CV) => void) => void;
  fit: FitReport | null;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onPlaced: (id: string, target: PlaceTarget) => void; // laat de bestemming in de preview oplichten
}

const STANDARD: SectionType[] = ['personal', 'profile', 'experience', 'education', 'projects', 'skills', 'languages'];

function AddMenu({ cv, onAdd }: { cv: CV; onAdd: (s: Section) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  const missing = STANDARD.filter((t) => !cv.sections.some((s) => s.type === t));
  const pick = (s: Section) => { onAdd(s); setOpen(false); };
  return (
    <div className="add-menu" ref={root}>
      <Btn name="add-section" onClick={() => setOpen((o) => !o)}><Icon name="plus" size={14} /> Onderdeel</Btn>
      {open && (
        <div className="popover add-pop">
          <div className="pop-title">Aanvullende inhoud</div>
          {SECTION_PRESETS.filter((p) => p.zone === 'supplementary').map((p) => (
            <button type="button" key={p.key} data-testid={`add-${p.key}`} onClick={() => pick(p.make())}>{p.label}</button>
          ))}
          <div className="pop-title">Hoofdinhoud</div>
          {SECTION_PRESETS.filter((p) => p.zone === 'primary').map((p) => (
            <button type="button" key={p.key} data-testid={`add-${p.key}`} onClick={() => pick(p.make())}>{p.label}</button>
          ))}
          {missing.map((t) => (
            <button type="button" key={t} data-testid={`add-std-${t}`} onClick={() => pick(emptySection(t))}>{SECTION_TITLES[t]}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionList({ cv, update, fit, openId, setOpenId, onPlaced }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const single = cv.template === 'minimal';
  // in het kopbalk-sjabloon heeft het contactblok een vaste plek (geen zone)
  const pinned = cv.template === 'header' ? cv.sections.find((s) => s.type === 'personal' && s.visible) : undefined;
  const groups: { key: PlaceTarget; label: string }[] = single
    ? [{ key: 'primary', label: 'Volgorde' }, { key: 'hidden', label: 'Verborgen' }]
    : [{ key: 'primary', label: 'Hoofdinhoud' }, { key: 'supplementary', label: 'Aanvullende inhoud' }, { key: 'hidden', label: 'Verborgen' }];

  const place = (id: string, target: PlaceTarget, beforeId?: string) => {
    update((c) => { c.sections = placeSection(c.sections, id, target, beforeId); });
    onPlaced(id, target);
  };
  const drop = (target: PlaceTarget, beforeId?: string) => {
    if (dragId && dragId !== beforeId) place(dragId, target, beforeId);
    setDragId(null); setOverKey(null);
  };

  const card = (s: Section) => {
    const u = fit?.sections.find((x) => x.id === s.id);
    const open = openId === s.id;
    const over = !!u && u.overflowMm > 0 && s.visible;
    const z = zoneOf(cv, s);
    const isPinned = pinned?.id === s.id;
    return (
      <div
        key={s.id}
        data-testid={`sec-${s.type}`}
        data-sec-id={s.id}
        className={`card ${open ? 'open' : ''} ${s.visible ? '' : 'hidden-sec'} ${over ? 'overflow' : ''} ${overKey === s.id && dragId !== s.id ? 'drop-target' : ''}`}
        onDragOver={(e) => { if (dragId) { e.preventDefault(); e.stopPropagation(); setOverKey(s.id); } }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(z, s.id); }}
      >
        <div className="card-head" onClick={() => setOpenId(open ? null : s.id)}>
          <span className="handle" draggable title="Slepen" onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); }}
            onDragEnd={() => { setDragId(null); setOverKey(null); }}><Icon name="grip" size={16} /></span>
          <span className="card-title">{s.type === 'personal' ? 'Persoonlijke gegevens' : s.title || SECTION_TITLES[s.type]}</span>
          {s.visible && u && u.heightMm > 0 && <span className={`usage ${over ? 'bad' : ''}`} title="Ruimte">{Math.round(u.heightMm)} mm</span>}
          <span className="spacer" />
          <Btn small kind="ghost" icon name={`sec-${s.type}-up`} title="Omhoog" onClick={() => update((c) => { c.sections = moveInZone(c.sections, s.id, -1, c.template); })}><Icon name="up" size={14} /></Btn>
          <Btn small kind="ghost" icon name={`sec-${s.type}-down`} title="Omlaag" onClick={() => update((c) => { c.sections = moveInZone(c.sections, s.id, 1, c.template); })}><Icon name="down" size={14} /></Btn>
          {s.visible ? (
            <>
              {!single && !isPinned && (
                <div className="seg zone-seg" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className={s.zone === 'primary' ? 'on' : ''} title="Naar hoofdinhoud" data-testid={`sec-${s.type}-zone-primary`}
                    onClick={() => place(s.id, 'primary')}>Hoofd</button>
                  <button type="button" className={s.zone === 'supplementary' ? 'on' : ''} title="Naar aanvullende inhoud" data-testid={`sec-${s.type}-zone-supplementary`}
                    onClick={() => place(s.id, 'supplementary')}>Aanvullend</button>
                </div>
              )}
              <Btn small kind="ghost" icon name={`sec-${s.type}-toggle`} title="Verbergen (niet in cv)" onClick={() => place(s.id, 'hidden')}><Icon name="eyeoff" size={14} /></Btn>
            </>
          ) : (
            <Btn small name={`sec-${s.type}-toggle`} title={`Tonen in ${s.zone === 'primary' ? 'hoofdinhoud' : 'aanvullende inhoud'}`} onClick={() => { update((c) => { const t = c.sections.find((x) => x.id === s.id); if (t) t.visible = true; }); onPlaced(s.id, s.zone); }}>Tonen</Btn>
          )}
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
                  onClick={() => { if (confirm(`"${s.title}" verwijderen?`)) update((c) => { c.sections = c.sections.filter((x) => x.id !== s.id); }); }}>
                  <Icon name="trash" size={14} /> Verwijderen
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sections" data-testid="section-list">
      {pinned && (
        <div className="zone zone-pinned" data-testid="zone-head">
          <div className="zone-title">Vaste plek</div>
          {card(pinned)}
        </div>
      )}
      {groups.map((g) => {
        const list = cv.sections.filter((s) => zoneOf(cv, s) === g.key && s.id !== pinned?.id);
        return (
          <div key={g.key} className={`zone zone-${g.key} ${overKey === `zone-${g.key}` ? 'drop-target' : ''}`} data-testid={`zone-${g.key}`}
            onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverKey(`zone-${g.key}`); } }}
            onDrop={(e) => { e.preventDefault(); drop(g.key); }}>
            <div className="zone-title">{g.label}<span className="count">{list.length}</span></div>
            {list.map(card)}
            {list.length === 0 && <div className="zone-empty">—</div>}
          </div>
        );
      })}
      <AddMenu cv={cv} onAdd={(n) => { update((c) => { c.sections.push(n); }); setOpenId(n.id); }} />
    </div>
  );
}
