import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../icons';
import { SummaButton } from './button';

/** Label + invoer(en) in één <label>; optioneel met korte beschrijving en validatiemelding. */
export function SummaField({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  const eid = useId();
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error" id={eid} role="alert">{error}</span>}
    </label>
  );
}

/** Groep samenhangende bedieningselementen (bijv. een segmented control) met zichtbaar label. */
export function SummaFieldset({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/** Uitklapbare groep instellingen (progressive disclosure). */
export function SummaAccordion({ title, children, defaultOpen = false, badge, name, accent }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode; name?: string; accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={`accordion ${open ? 'open' : ''} ${accent ? 'accent' : ''}`}>
      <button type="button" className="accordion-head" aria-expanded={open} aria-controls={id} data-testid={name} onClick={() => setOpen((o) => !o)}>
        <span className={`chev ${open ? 'open' : ''}`}><Icon name="chevron" size={14} /></span>
        <span className="accordion-title">{title}</span>
        {badge}
      </button>
      {open && <div className="accordion-body" id={id} role="region" aria-label={title}>{children}</div>}
    </div>
  );
}

/** Container voor één onderdeel van het cv: kop met acties, uitklapbare inhoud. */
export function SummaSectionCard({ testid, secId, title, open, onToggle, lead, trail, badges, children, state, dropEdge, dragging, onDragOver, onDrop }: {
  testid: string; secId: string; title: string; open: boolean; onToggle: () => void; lead?: React.ReactNode; trail?: React.ReactNode; badges?: React.ReactNode;
  children?: React.ReactNode; state?: string; dropEdge?: 'before' | 'after' | null; dragging?: boolean; onDragOver?: (e: React.DragEvent) => void; onDrop?: (e: React.DragEvent) => void;
}) {
  const bid = useId();
  return (
    <div data-testid={testid} data-sec-id={secId} className={`card ${open ? 'open' : ''} ${state ?? ''} ${dragging ? 'dragging' : ''} ${dropEdge ? `ins-${dropEdge}` : ''}`} onDragOver={onDragOver} onDrop={onDrop}>
      <div className="card-head">
        {lead}
        <button type="button" className="card-title-btn" aria-expanded={open} aria-controls={bid} data-testid={`${testid}-expand`} onClick={onToggle}>
          <span className={`chev ${open ? 'open' : ''}`}><Icon name="chevron" size={14} /></span>
          <span className="card-title">{title}</span>
          {badges}
        </button>
        <div className="card-actions">{trail}</div>
      </div>
      {open && <div className="card-body" id={bid} role="region" aria-label={title}>{children}</div>}
    </div>
  );
}

/** Herhaald item binnen een onderdeel (functie, project, vaardigheidsgroep); ingeklapt zodra het een titel heeft. */
export function SummaItemCard({ title, onUp, onDown, onRemove, children, index, count, name }: {
  title: string; onUp: () => void; onDown: () => void; onRemove: () => void; children: React.ReactNode; index: number; count: number; name?: string;
}) {
  const [open, setOpen] = useState(() => !title);
  const bid = useId();
  return (
    <div className={`item-shell ${open ? 'open' : ''}`} data-testid={name}>
      <div className="item-head">
        <button type="button" className="item-toggle" aria-expanded={open} aria-controls={bid} onClick={() => setOpen((o) => !o)}>
          <span className={`chev ${open ? 'open' : ''}`}><Icon name="chevron" size={14} /></span>
          <strong>{title || 'Nieuw'}</strong>
        </button>
        <SummaButton small kind="ghost" icon title="Omhoog" disabled={index === 0} onClick={onUp}><Icon name="up" size={14} /></SummaButton>
        <SummaButton small kind="ghost" icon title="Omlaag" disabled={index === count - 1} onClick={onDown}><Icon name="down" size={14} /></SummaButton>
        <SummaButton small kind="ghost" icon title="Verwijderen" name={name ? `${name}-remove` : undefined} onClick={onRemove}><Icon name="trash" size={14} /></SummaButton>
      </div>
      {open && <div className="item-body" id={bid}>{children}</div>}
    </div>
  );
}

export interface MenuItem {
  key: string; label: string; onSelect: () => void; danger?: boolean; disabled?: boolean; testid?: string;
  /** Niet-klikbaar kopje boven de volgende items (bijv. "Verplaatsen naar"). */
  heading?: boolean;
  /** Huidige keuze: getoond met vinkje en niet te kiezen. */
  current?: boolean;
  ariaLabel?: string;
}

/** Overloopmenu voor minder vaak gebruikte acties; bediening met pijltjes, Enter en Escape. */
export function SummaMenu({ label, items, name }: { label: string; items: MenuItem[]; name: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mid = useId();
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    root.current?.querySelector<HTMLElement>('[role=menuitem]:not(:disabled)')?.focus();
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  const key = (e: React.KeyboardEvent) => {
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not(:disabled)') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); root.current?.querySelector<HTMLElement>(':scope > .tt-wrap > button, :scope > button')?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };
  return (
    <div className="menu" ref={root} onKeyDown={open ? key : undefined}>
      <SummaButton small kind="ghost" icon title={label} name={name} expanded={open} haspopup onClick={() => setOpen((o) => !o)}>
        <Icon name="more" size={16} />
      </SummaButton>
      {open && (
        <div className="popover menu-pop" role="menu" id={mid} aria-label={label}>
          {items.map((it) => it.heading ? (
            <div key={it.key} className="pop-title" role="presentation">{it.label}</div>
          ) : (
            <button type="button" role="menuitem" key={it.key} data-testid={it.testid} disabled={it.disabled || it.current} aria-label={it.ariaLabel}
              aria-current={it.current ? 'true' : undefined} className={`${it.danger ? 'danger' : ''} ${it.current ? 'current' : ''}`}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onSelect(); }}>
              {it.label}{it.current && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
