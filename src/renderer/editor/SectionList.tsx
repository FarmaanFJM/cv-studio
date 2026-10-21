import React, { useEffect, useRef, useState } from 'react';
import {
  CV, PlaceTarget, SECTION_PRESETS, SECTION_TITLES, Section, SectionType, emptySection, moveInZone, placeSection, zoneOf
} from '../../shared/model';
import { Icon } from '../icons';
import { FitReport } from '../layout';
import { SummaButton, SummaField, SummaMenu, SummaSectionCard, SummaTextInput, SummaToggle } from '../ui';
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
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', f);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k); };
  }, [open]);
  const missing = STANDARD.filter((t) => !cv.sections.some((s) => s.type === t));
  const pick = (s: Section) => { onAdd(s); setOpen(false); };
  return (
    <div className="add-menu" ref={root}>
      <SummaButton name="add-section" expanded={open} haspopup onClick={() => setOpen((o) => !o)}><Icon name="plus" size={14} /> Onderdeel toevoegen</SummaButton>
      {open && (
        <div className="popover add-pop" role="menu" aria-label="Onderdeel toevoegen">
          <div className="pop-title">Aanvullende inhoud</div>
          {SECTION_PRESETS.filter((p) => p.zone === 'supplementary').map((p) => (
            <button type="button" role="menuitem" key={p.key} data-testid={`add-${p.key}`} onClick={() => pick(p.make())}>{p.label}</button>
          ))}
          <div className="pop-title">Hoofdinhoud</div>
          {SECTION_PRESETS.filter((p) => p.zone === 'primary').map((p) => (
            <button type="button" role="menuitem" key={p.key} data-testid={`add-${p.key}`} onClick={() => pick(p.make())}>{p.label}</button>
          ))}
          {missing.map((t) => (
            <button type="button" role="menuitem" key={t} data-testid={`add-std-${t}`} onClick={() => pick(emptySection(t))}>{SECTION_TITLES[t]}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionList({ cv, update, fit, openId, setOpenId, onPlaced }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [focusHandle, setFocusHandle] = useState<string | null>(null);
  const single = cv.template === 'minimal';
  // in het kopbalk-sjabloon heeft het contactblok een vaste plek (geen zone)
  const pinned = cv.template === 'header' ? cv.sections.find((s) => s.type === 'personal' && s.visible) : undefined;
  const groups: { key: PlaceTarget; label: string; hint?: string }[] = single
    ? [{ key: 'primary', label: 'Volgorde' }, { key: 'hidden', label: 'Verborgen' }]
    : [{ key: 'primary', label: 'Hoofdinhoud' }, { key: 'supplementary', label: 'Aanvullende inhoud' }, { key: 'hidden', label: 'Verborgen' }];

  useEffect(() => {
    if (!focusHandle) return;
    document.querySelector<HTMLElement>(`[data-handle="${focusHandle}"]`)?.focus();
    setFocusHandle(null);
  }, [focusHandle, cv.sections]);

  const place = (id: string, target: PlaceTarget, beforeId?: string) => {
    update((c) => { c.sections = placeSection(c.sections, id, target, beforeId); });
    onPlaced(id, target);
  };
  const drop = (target: PlaceTarget, beforeId?: string) => {
    if (dragId && dragId !== beforeId) place(dragId, target, beforeId);
    setDragId(null); setOverKey(null);
  };
  const step = (id: string, dir: -1 | 1) => update((c) => { c.sections = moveInZone(c.sections, id, dir, c.template); });

  const card = (s: Section) => {
    const u = fit?.sections.find((x) => x.id === s.id);
    const open = openId === s.id;
    const over = !!u && u.overflowMm > 0 && s.visible;
    const z = zoneOf(cv, s);
    const isPinned = pinned?.id === s.id;
    const title = s.type === 'personal' ? 'Persoonlijke gegevens' : s.title || SECTION_TITLES[s.type];
    return (
      <SummaSectionCard
        key={s.id} testid={`sec-${s.type}`} secId={s.id} title={title} open={open}
        state={`${s.visible ? '' : 'hidden-sec'} ${over ? 'overflow' : ''}`}
        dragTarget={overKey === s.id && dragId !== s.id}
        onDragOver={(e) => { if (dragId) { e.preventDefault(); e.stopPropagation(); setOverKey(s.id); } }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(z, s.id); }}
        onToggle={() => { setOpenId(open ? null : s.id); if (!open && s.visible) onPlaced(s.id, s.zone); }}
        lead={
          <button type="button" className="handle" draggable data-handle={s.id} aria-label={`${title} verplaatsen: sleep, of gebruik pijltje omhoog of omlaag`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(s.id, e.key === 'ArrowUp' ? -1 : 1); setFocusHandle(s.id); }
            }}
            onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); }}
            onDragEnd={() => { setDragId(null); setOverKey(null); }}><Icon name="grip" size={16} /></button>
        }
        badges={s.visible && u && u.heightMm > 0 ? <span className={`usage ${over ? 'bad' : ''}`} title="Ruimte op de pagina">{Math.round(u.heightMm)} mm{over ? ' · te lang' : ''}</span> : undefined}
        trail={
          <>
            {!single && !isPinned && (
              <div className="zone-seg-wrap">
                <div className={`seg zone-seg ${s.visible ? '' : 'is-disabled'}`} role="radiogroup" aria-label={`Plaatsing van ${title}`}>
                  <button type="button" role="radio" aria-checked={s.zone === 'primary'} disabled={!s.visible} className={s.zone === 'primary' ? 'on' : ''} title="Naar hoofdinhoud"
                    data-testid={`sec-${s.type}-zone-primary`} onClick={() => place(s.id, 'primary')}>Hoofd</button>
                  <button type="button" role="radio" aria-checked={s.zone === 'supplementary'} disabled={!s.visible} className={s.zone === 'supplementary' ? 'on' : ''} title="Naar aanvullende inhoud"
                    data-testid={`sec-${s.type}-zone-supplementary`} onClick={() => place(s.id, 'supplementary')}>Aanvullend</button>
                </div>
              </div>
            )}
            <SummaToggle labelHidden name={`sec-${s.type}-toggle`} label={`${title} tonen in cv`} checked={s.visible}
              onChange={(v) => {
                if (!v) place(s.id, 'hidden');
                else { update((c) => { const t = c.sections.find((x) => x.id === s.id); if (t) t.visible = true; }); onPlaced(s.id, s.zone); }
              }} />
            <SummaMenu name={`sec-${s.type}-menu`} label={`Meer acties voor ${title}`} items={[
              { key: 'up', label: 'Omhoog', testid: `sec-${s.type}-up`, onSelect: () => step(s.id, -1) },
              { key: 'down', label: 'Omlaag', testid: `sec-${s.type}-down`, onSelect: () => step(s.id, 1) },
              ...(s.type !== 'personal' ? [{
                key: 'del', label: 'Onderdeel verwijderen…', danger: true, testid: `sec-${s.type}-delete`,
                onSelect: () => { if (confirm(`"${s.title}" verwijderen?`)) update((c) => { c.sections = c.sections.filter((x) => x.id !== s.id); }); }
              }] : [])
            ]} />
          </>
        }
      >
        <SummaField label="Titel in cv">
          <SummaTextInput name="sec-title" value={s.title} onChange={(v) => update((c) => { const t = c.sections.find((x) => x.id === s.id); if (t) t.title = v; })} />
        </SummaField>
        <SectionEditor s={s} cv={cv} update={update} />
      </SummaSectionCard>
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
            {list.length === 0 && <div className="zone-empty">{dragId ? 'Hier neerzetten' : 'Leeg'}</div>}
          </div>
        );
      })}
      <AddMenu cv={cv} onAdd={(n) => { update((c) => { c.sections.push(n); }); setOpenId(n.id); onPlaced(n.id, n.zone); }} />
    </div>
  );
}
