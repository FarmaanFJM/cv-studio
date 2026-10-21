import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';

export interface ComboOption {
  id: string;
  label: string;
  /** Alleen tekst: wat er in de invoer komt bij kiezen (standaard het label). */
  value?: string;
  /** Kleine toelichting rechts (bijv. categorie). */
  hint?: string;
  icon?: React.ReactNode;
  /** Eigen invoer ("X toevoegen"): telt niet als suggestie voor Tab. */
  custom?: boolean;
  /** Kopje boven deze optie (alleen bij de eerste optie van een groep). */
  group?: string;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
  /** Opties voor de huidige tekst; `browsing` is waar als de lijst via de chevron (of pijl omlaag) is geopend. */
  getOptions: (query: string, browsing: boolean) => ComboOption[];
  onSelect: (o: ComboOption) => void;
  /** Enter of komma zonder gekozen optie (alleen voor invoer die eigen tekst toevoegt). */
  onCommitText?: (text: string) => void;
  /** Focus verlaat het veld met tekst erin. */
  onBlurText?: (text: string) => void;
  /** Extra bediening boven de lijst (bijv. categoriefilter). Moet de focus in de invoer laten. */
  toolbar?: (ctx: { browsing: boolean }) => React.ReactNode;
  onOpenBrowse?: () => void;
  name?: string;
  label: string;
  placeholder?: string;
  chevronLabel: string;
  emptyText: string;
  autoFocus?: boolean;
  /** Beschrijving voor schermlezers (bijv. "Enter om toe te voegen"). */
  describedBy?: string;
}

/** Combobox volgens het ARIA-patroon (list autocomplete): invoer, chevron-knop en een listbox in een popover. */
export function Combobox({ value, onChange, getOptions, onSelect, onCommitText, onBlurText, toolbar, onOpenBrowse, name, label, placeholder, chevronLabel, emptyText, autoFocus, describedBy }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [active, setActive] = useState(-1);
  const [explicit, setExplicit] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const options = open ? getOptions(value, browsing) : [];
  const firstReal = options.findIndex((o) => !o.custom);
  const activeOpt = active >= 0 ? options[active] : undefined;

  const close = () => { setOpen(false); setActive(-1); setExplicit(false); };
  const openBrowse = () => { setBrowsing(true); setOpen(true); setActive(-1); setExplicit(false); onOpenBrowse?.(); };

  // eerste echte suggestie is standaard gemarkeerd (impliciet) zodat Tab/Enter die kunnen overnemen
  useEffect(() => {
    if (!open) return;
    if (!explicit) setActive(!browsing && firstReal >= 0 ? firstReal : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, browsing, firstReal, options.length]);

  // popover onder de invoer (of erboven als er onder te weinig ruimte is); volgt scrollen en formaatwijziging
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 220 && above > below;
      setPos({ left: r.left, width: r.width, ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }), maxH: Math.max(140, Math.min(360, up ? above : below)) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) list.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);

  const accept = (o: ComboOption, viaTab = false) => {
    // Exact dezelfde tekst (alleen hoofdletters verschillen) en geen bewuste keuze: de ingevoerde schrijfwijze blijft staan
    if (!explicit && !o.custom && !viaTab && o.label.toLowerCase() === value.trim().toLowerCase() && onCommitText) { close(); onCommitText(value); return; }
    close();
    onSelect(o);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = options.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { openBrowse(); setExplicit(true); setActive(e.key === 'ArrowDown' ? 0 : -1); return; }
      if (!n) return;
      setExplicit(true);
      setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % n : (a - 1 + n) % n));
    } else if (e.key === 'Home' && open && explicit) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && open && explicit) { e.preventDefault(); setActive(n - 1); }
    else if (e.key === 'Enter') {
      if (open && activeOpt) { e.preventDefault(); accept(activeOpt); }
      else if (onCommitText && value.trim()) { e.preventDefault(); close(); onCommitText(value); }
    } else if (e.key === 'Tab') {
      // Tab neemt alleen een echte suggestie over; anders gedraagt Tab zich normaal
      if (open && activeOpt && !activeOpt.custom && !e.shiftKey) { e.preventDefault(); accept(activeOpt, true); }
      else if (open) close();
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); close(); }
    } else if (e.key === ',' && onCommitText && value.trim()) {
      e.preventDefault(); close(); onCommitText(value);
    }
  };

  const shown = open && (options.length > 0 || browsing);
  const status = !shown ? '' : options.length ? `${options.length} suggesties` : emptyText;

  return (
    <div className="combo" ref={wrap}
      onBlur={(e) => {
        if (wrap.current?.contains(e.relatedTarget as Node)) return;
        const had = value.trim();
        close(); setBrowsing(false);
        if (had) onBlurText?.(value);
      }}>
      <input ref={input} className="input combo-input" data-testid={name} role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={shown}
        aria-controls={listId} aria-haspopup="listbox" aria-activedescendant={shown && active >= 0 ? `${uid}-o${active}` : undefined}
        aria-describedby={describedBy} autoComplete="off" spellCheck={false} placeholder={placeholder} value={value}
        onChange={(e) => {
          const t = e.target.value;
          // plakken van "a, b, c": direct als losse waarden verwerken
          if (onCommitText && /[,;\n]/.test(t) && t.trim().replace(/[,;\s]+$/, '') !== '' && t.length > value.length + 1) { onCommitText(t); close(); return; }
          onChange(t); setBrowsing(false); setExplicit(false); setOpen(true);
        }}
        onKeyDown={onKey} />
      <button type="button" className="combo-chevron" tabIndex={-1} aria-label={chevronLabel} aria-expanded={shown} data-testid={name ? `${name}-chevron` : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { input.current?.focus(); if (open && browsing) { close(); } else openBrowse(); }}>
        <Icon name="down" size={14} />
      </button>
      <span className="sr-only" role="status" aria-live="polite">{status}</span>
      {shown && pos && createPortal(
        <div className="popover combo-pop" data-testid={name ? `${name}-popup` : undefined} onMouseDown={(e) => e.preventDefault()}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto', maxHeight: pos.maxH }}>
          {toolbar?.({ browsing })}
          <div className="combo-list" id={listId} role="listbox" aria-label={label} ref={list}>
            {options.map((o, i) => (
              <React.Fragment key={o.id}>
                {o.group && <div className="combo-group" role="presentation">{o.group}</div>}
                <div id={`${uid}-o${i}`} data-idx={i} data-testid={name ? `${name}-opt-${o.id}` : undefined} role="option" aria-selected={i === active}
                  className={`combo-opt ${i === active ? 'active' : ''} ${o.custom ? 'custom' : ''}`}
                  onMouseMove={() => { if (active !== i) { setActive(i); setExplicit(true); } }}
                  onClick={() => accept(o)}>
                  {o.icon}
                  <span className="combo-label">{o.label}</span>
                  {o.hint && <small>{o.hint}</small>}
                </div>
              </React.Fragment>
            ))}
            {options.length === 0 && <div className="combo-empty" data-testid={name ? `${name}-empty` : undefined}>{emptyText}</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
