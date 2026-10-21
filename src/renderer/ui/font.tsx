import React, { useEffect, useId, useRef, useState } from 'react';
import { FONTS } from '../../shared/model';
import { Icon } from '../icons';

/** Doorzoekbare lettertypekiezer (combobox/listbox) met voorbeeld in het eigen lettertype; bediening met pijltjes, Enter en Escape. */
export function SummaFontPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const cur = FONTS.find((f) => f.id === value) ?? FONTS[0];
  const term = q.trim().toLowerCase();
  const list = FONTS.filter((f) => !term || f.label.toLowerCase().includes(term) || (term.length > 1 && f.kind.startsWith(term)));

  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, listId]);

  const choose = (id: string) => { onChange(id); setOpen(false); btn.current?.focus(); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[active]) choose(list[active].id); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus(); }
  };
  return (
    <div className="font-picker" ref={root}>
      <span className="field-label">Lettertype</span>
      <button type="button" ref={btn} className="color-btn" data-testid="font-select" style={{ fontFamily: cur.css }} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`Lettertype: ${cur.label}`} onClick={() => { setOpen((o) => !o); setQ(''); }}>
        <span>{cur.label}</span><Icon name="down" size={14} />
      </button>
      {open && (
        <div className="popover font-pop">
          <div className="search"><Icon name="search" size={14} />
            <input autoFocus role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={list[active] ? `${listId}-${active}` : undefined}
              aria-label="Lettertype zoeken" data-testid="font-search" placeholder="Zoeken" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} />
          </div>
          <div className="font-list" role="listbox" id={listId} aria-label="Lettertypen">
            {list.map((f, i) => (
              <div role="option" id={`${listId}-${i}`} key={f.id} aria-selected={f.id === value} data-testid={`font-${f.id}`}
                className={`${f.id === value ? 'on' : ''} ${i === active ? 'active' : ''}`} style={{ fontFamily: f.css }}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(f.id)}>
                <span>{f.label}</span><span className="sample">Aa 123</span><small>{f.kind === 'serif' ? 'Serif' : 'Sans'}</small>
              </div>
            ))}
            {list.length === 0 && <div className="empty">Geen resultaat</div>}
          </div>
        </div>
      )}
    </div>
  );
}
