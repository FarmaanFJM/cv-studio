import React, { useEffect, useRef, useState } from 'react';
import {
  CV, PlaceTarget, SECTION_PRESETS, SECTION_TITLES, Section, SectionType, emptySection, moveInZone, relocateSection, zoneOf
} from '../../shared/model';
import { Icon } from '../icons';
import { FitReport } from '../layout';
import { SummaButton, SummaField, SummaMenu, SummaSectionCard, SummaTextInput, SummaToggle } from '../ui';
import { SectionEditor } from './SectionEditors';
import { SectionFooterEditor } from './FooterEditor';

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

interface DropSpot { zone: PlaceTarget; beforeId: string | null; noop: boolean }
const EDGE = 56; // px vanaf de rand van de editor waarbinnen tijdens slepen automatisch wordt gescrold

export function SectionList({ cv, update, fit, openId, setOpenId, onPlaced }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDropState] = useState<DropSpot | null>(null);
  const dropRef = useRef<DropSpot | null>(null);
  const [focusHandle, setFocusHandle] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerY = useRef(0);
  const single = cv.template === 'minimal';
  // in het kopbalk-sjabloon heeft het contactblok een vaste plek (geen zone): niet te slepen of te verplaatsen, wel te tonen/verbergen
  const fixedId = cv.template === 'header' ? cv.sections.find((s) => s.type === 'personal')?.id : undefined;
  const pinned = fixedId ? cv.sections.find((s) => s.id === fixedId && s.visible) : undefined;
  const groups: { key: PlaceTarget; label: string }[] = single
    ? [{ key: 'primary', label: 'Volgorde' }, { key: 'hidden', label: 'Verborgen' }]
    : [{ key: 'primary', label: 'Hoofdinhoud' }, { key: 'supplementary', label: 'Aanvullende inhoud' }, { key: 'hidden', label: 'Verborgen' }];

  const setDrop = (d: DropSpot | null) => {
    const prev = dropRef.current;
    if (prev?.zone === d?.zone && prev?.beforeId === d?.beforeId && prev?.noop === d?.noop) return;
    dropRef.current = d; setDropState(d);
  };

  useEffect(() => {
    if (!focusHandle) return;
    document.querySelector<HTMLElement>(`[data-handle="${focusHandle}"]`)?.focus();
    setFocusHandle(null);
  }, [focusHandle, cv.sections]);

  // automatisch scrollen als je dicht bij de boven- of onderrand van de editor sleept
  useEffect(() => {
    if (!dragId) return;
    const sc = rootRef.current?.closest<HTMLElement>('.editor-scroll');
    if (!sc) return;
    let raf = 0;
    const tick = () => {
      const r = sc.getBoundingClientRect();
      const y = pointerY.current;
      if (y > 0) {
        if (y < r.top + EDGE) sc.scrollTop -= Math.ceil(((r.top + EDGE - y) / EDGE) * 16);
        else if (y > r.bottom - EDGE) sc.scrollTop += Math.ceil(((y - (r.bottom - EDGE)) / EDGE) * 16);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragId]);

  const place = (id: string, target: PlaceTarget, beforeId?: string) => {
    update((c) => { c.sections = relocateSection(c.sections, id, target, beforeId, c.template); });
    onPlaced(id, target);
  };
  const endDrag = () => { setDragId(null); setDrop(null); pointerY.current = 0; };
  const commit = () => {
    const d = dropRef.current;
    if (dragId && d && !d.noop) place(dragId, d.zone, d.beforeId ?? undefined);
    endDrag();
  };
  const step = (id: string, dir: -1 | 1) => update((c) => { c.sections = moveInZone(c.sections, id, dir, c.template); });

  const inZone = (zone: PlaceTarget) => cv.sections.filter((s) => zoneOf(cv, s) === zone && s.id !== pinned?.id);

  const card = (s: Section) => {
    const u = fit?.sections.find((x) => x.id === s.id);
    const open = openId === s.id;
    const over = !!u && u.overflowMm > 0 && s.visible;
    const z = zoneOf(cv, s);
    const fixed = s.id === fixedId;
    const title = s.type === 'personal' ? 'Persoonlijke gegevens' : s.title || SECTION_TITLES[s.type];
    const siblings = inZone(z);
    const at = siblings.findIndex((x) => x.id === s.id);
    const edge: 'before' | 'after' | null = !drop || drop.noop ? null
      : drop.beforeId === s.id ? 'before'
      : drop.beforeId === null && drop.zone === z && at === siblings.length - 1 && siblings[at].id !== dragId ? 'after' : null;
    return (
      <SummaSectionCard
        key={s.id} testid={`sec-${s.type}`} secId={s.id} title={title} open={open}
        state={`${s.visible ? '' : 'hidden-sec'} ${over ? 'overflow' : ''}`}
        dragging={dragId === s.id} dropEdge={edge}
        onDragOver={(e) => {
          if (!dragId || fixed) return;
          e.preventDefault(); e.stopPropagation();
          if (s.id === dragId) { setDrop({ zone: z, beforeId: null, noop: true }); return; }
          const r = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < r.top + r.height / 2;
          const nextId = before ? s.id : siblings[at + 1]?.id ?? null;
          const insertAt = nextId ? siblings.findIndex((x) => x.id === nextId) : siblings.length;
          // invoegen direct voor of na het gesleepte onderdeel zelf verandert niets
          setDrop({ zone: z, beforeId: nextId, noop: siblings[insertAt - 1]?.id === dragId || siblings[insertAt]?.id === dragId });
        }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); commit(); }}
        onToggle={() => { setOpenId(open ? null : s.id); if (!open && s.visible) onPlaced(s.id, s.zone); }}
        lead={
          <button type="button" className="handle" draggable={!fixed} disabled={fixed} data-handle={s.id}
            aria-label={fixed ? `${title}: vaste plek in dit sjabloon` : `${title} verplaatsen: sleep, of gebruik pijltje omhoog of omlaag`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(s.id, e.key === 'ArrowUp' ? -1 : 1); setFocusHandle(s.id); }
            }}
            onDragStart={(e) => {
              setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id);
              const head = (e.currentTarget as HTMLElement).closest('.card-head');
              if (head) e.dataTransfer.setDragImage(head, 24, 20);
            }}
            onDragEnd={endDrag}><Icon name="grip" size={16} /></button>
        }
        badges={s.visible && u && u.heightMm > 0 ? <span className={`usage ${over ? 'bad' : ''}`} title="Ruimte op de pagina">{Math.round(u.heightMm)} mm{over ? ' · te lang' : ''}</span> : undefined}
        trail={
          <>
            <SummaToggle labelHidden name={`sec-${s.type}-toggle`} label={`${title} tonen in cv`} checked={s.visible}
              onChange={(v) => {
                if (!v) place(s.id, 'hidden');
                else { update((c) => { const t = c.sections.find((x) => x.id === s.id); if (t) t.visible = true; }); onPlaced(s.id, s.zone); }
              }} />
            <SummaMenu name={`sec-${s.type}-menu`} label={`Meer acties voor ${title}`} items={[
              ...(fixed ? [] : [
                { key: 'move-h', heading: true, label: 'Verplaatsen naar', onSelect: () => undefined },
                ...groups.map((g) => ({
                  key: `move-${g.key}`, label: g.label, ariaLabel: `${title} verplaatsen naar ${g.label}`, testid: `sec-${s.type}-move-${g.key}`,
                  current: z === g.key, onSelect: () => { place(s.id, g.key); setFocusHandle(s.id); }
                }))
              ]),
              { key: 'order-h', heading: true, label: 'Volgorde', onSelect: () => undefined },
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
        <SectionFooterEditor footer={s.footer} onChange={(f) => update((c) => {
          const t = c.sections.find((x) => x.id === s.id);
          if (!t) return;
          if (f) t.footer = f; else delete t.footer;
        })} />
      </SummaSectionCard>
    );
  };

  return (
    <div className={`sections ${dragId ? 'is-dragging' : ''}`} data-testid="section-list" ref={rootRef}
      onDragOverCapture={(e) => { pointerY.current = e.clientY; }}
      onDragLeave={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node)) setDrop(null); }}>
      {pinned && (
        <div className="zone zone-pinned" data-testid="zone-head">
          <div className="zone-title">Vaste plek</div>
          {card(pinned)}
        </div>
      )}
      {groups.map((g) => {
        const list = inZone(g.key);
        const active = drop?.zone === g.key;
        return (
          <div key={g.key} className={`zone zone-${g.key} ${active ? 'drop-target' : ''}`} data-testid={`zone-${g.key}`}
            onDragOver={(e) => { if (dragId) { e.preventDefault(); setDrop({ zone: g.key, beforeId: null, noop: list.length > 0 && list[list.length - 1].id === dragId }); } }}
            onDrop={(e) => { e.preventDefault(); commit(); }}>
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
