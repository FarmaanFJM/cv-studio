import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';

// ---------- toggle (schakelaar) ----------

export function SummaToggle({ label, checked, onChange, disabled, hint, name, labelHidden }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string; name?: string; labelHidden?: boolean;
}) {
  const hid = useId();
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" role="switch" data-testid={name} checked={checked} disabled={disabled} aria-describedby={hint ? hid : undefined}
        aria-label={labelHidden ? label : undefined} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true"><i /></span>
      {!labelHidden && <span className="toggle-text">{label}{hint && <small id={hid}>{hint}</small>}</span>}
    </label>
  );
}

// ---------- segmented control (kleine set exclusieve keuzes) ----------

export function SummaSegmented<T extends string>({ value, options, onChange, name, label, disabled }: {
  value: T; options: { value: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void; name?: string; label: string; disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.findIndex((o) => o.value === value);
  const key = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d || disabled) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className={`seg ${disabled ? 'is-disabled' : ''}`} role="radiogroup" aria-label={label} aria-disabled={disabled}>
      {options.map((o, i) => (
        <button type="button" key={o.value} role="radio" aria-checked={o.value === value} title={o.title} disabled={disabled}
          ref={(el) => { refs.current[i] = el; }} tabIndex={o.value === value || (idx < 0 && i === 0) ? 0 : -1}
          data-testid={name ? `${name}-${o.value}` : undefined} className={o.value === value ? 'on' : ''}
          onKeyDown={(e) => key(e, i)} onClick={(e) => { e.stopPropagation(); onChange(o.value); }}>{o.label}</button>
      ))}
    </div>
  );
}

// ---------- select (aangepaste keuzelijst, geen standaard <select>) ----------

export interface SelectAction { key: string; label: string; onSelect: () => void; icon?: React.ReactNode }

/**
 * Keuzelijst in de stijl van de app (ARIA "select-only combobox"): een knop met de huidige keuze en een lijst met opties in een popover.
 * Bediening: Enter, spatie of pijl omlaag opent; pijltjes, Home, End en typen om te zoeken; Enter kiest; Escape sluit; Tab sluit.
 * `actions` zijn losse acties onderaan de lijst (bijv. "Nieuw cv") en zijn net zo met het toetsenbord te bereiken.
 */
export function SummaSelect<T extends string>({ value, options, onChange, label, name, disabled, actions = [], className = '', icon }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; name?: string; disabled?: boolean;
  actions?: SelectAction[]; className?: string; icon?: React.ReactNode;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const items = [
    ...options.map((o) => ({ kind: 'option' as const, key: o.value as string, label: o.label })),
    ...actions.map((a) => ({ kind: 'action' as const, key: a.key, label: a.label, icon: a.icon }))
  ];
  const current = options.find((o) => o.value === value);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  const show = () => { if (disabled) return; setActive(selected); setOpen(true); };
  const hide = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const choose = (i: number) => {
    const it = items[i];
    if (!it) return;
    hide();
    if (it.kind === 'option') { if (it.key !== value) onChange(it.key as T); } else actions.find((a) => a.key === it.key)?.onSelect();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const up = below < 200 && r.top > below;
      setPos({ left: Math.min(r.left, window.innerWidth - Math.max(r.width, 260) - 8), width: Math.max(r.width, 260), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }), maxH: Math.max(140, Math.min(360, up ? r.top - 12 : below)) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!pop.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  useEffect(() => { if (open) pop.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open, pos]);

  const key = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    const n = items.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(n - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); }
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // typen om te zoeken: opeenvolgende tekens binnen een seconde vormen één zoekterm
      const t = typed.current;
      t.text = Date.now() - t.at < 900 ? t.text + e.key.toLowerCase() : e.key.toLowerCase();
      t.at = Date.now();
      const hit = items.findIndex((it) => it.kind === 'option' && it.label.toLowerCase().startsWith(t.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div className={`select ${className}`}>
      <button type="button" ref={trigger} className="select-btn" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${uid}-list`}
        aria-label={`${label}: ${current?.label ?? ''}`} data-testid={name} disabled={disabled}
        aria-activedescendant={open ? `${uid}-o${active}` : undefined}
        onClick={() => (open ? hide(false) : show())} onKeyDown={key}>
        {icon}
        <span className="select-value" data-testid={name ? `${name}-value` : undefined}>{current?.label ?? ''}</span>
        <span className="select-chev" aria-hidden="true"><Icon name="down" size={14} /></span>
      </button>
      {open && pos && createPortal(
        <div className="popover select-pop" ref={pop} onMouseDown={(e) => e.preventDefault()}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto', maxHeight: pos.maxH }}>
          <div id={`${uid}-list`} role="listbox" aria-label={label} className="select-list">
            {items.map((it, i) => (
              <React.Fragment key={`${it.kind}-${it.key}`}>
                {it.kind === 'action' && (i === 0 || items[i - 1].kind === 'option') && <div className="select-sep" role="presentation" />}
                <div id={`${uid}-o${i}`} data-idx={i} role="option" aria-selected={it.kind === 'option' && it.key === value}
                  data-testid={name ? `${name}-${it.kind === 'option' ? 'opt' : 'action'}-${it.key}` : undefined}
                  className={`select-opt ${it.kind === 'action' ? 'action' : ''} ${i === active ? 'active' : ''}`}
                  onMouseMove={() => { if (active !== i) setActive(i); }} onClick={() => choose(i)}>
                  {it.kind === 'action' && it.icon}
                  <span className="select-label">{it.label}</span>
                  {it.kind === 'option' && it.key === value && <Icon name="check" size={14} />}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ---------- slider + numerieke invoer ----------

const decimals = (step: number) => (String(step).split('.')[1] ?? '').length;

export function SummaSlider({ value, min, max, step, onChange, label, unit }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; unit?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <input type="range" aria-label={label} aria-valuetext={`${value}${unit ? ' ' + unit : ''}`} min={min} max={max} step={step} value={value}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(Number(e.target.value).toFixed(decimals(step))))} />
      <div className="slider-range" aria-hidden="true"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

/** Getal met −/+ knoppen, typen, pijltjestoetsen en optionele schuifregelaar; de invoer springt niet terug tijdens het typen. */
export function SummaNumberInput({ label, value, onChange, min, max, step = 1, unit, slider, name, disabled }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
  slider?: boolean; name?: string; disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);
  const id = useId();
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const commit = (v: number) => { const n = Number(clamp(v).toFixed(decimals(step))); setInvalid(false); setText(String(n)); onChange(n); };
  return (
    <div className="num-field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="num-row">
        <button type="button" className="btn small icon" data-testid={name ? `${name}-minus` : undefined} aria-label={`${label}: minder`}
          disabled={disabled || value <= min} onClick={() => commit(value - step)}>−</button>
        <div className="num-input">
          <input id={id} className="input" inputMode="decimal" role="spinbutton" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
            aria-invalid={invalid || undefined} title={`${min} – ${max}${unit ? ' ' + unit : ''}`} data-testid={name} value={text} disabled={disabled}
            onFocus={() => { focused.current = true; }}
            onBlur={() => { focused.current = false; setInvalid(false); setText(String(value)); }}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value.replace(',', '.'));
              const ok = e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max;
              setInvalid(!ok && e.target.value.trim() !== '');
              if (ok) onChange(Number(n.toFixed(decimals(step) + 1)));
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); commit(value + step); }
              if (e.key === 'ArrowDown') { e.preventDefault(); commit(value - step); }
              if (e.key === 'Enter') { e.currentTarget.blur(); }
            }} />
          {unit && <span className="unit" aria-hidden="true">{unit}</span>}
        </div>
        <button type="button" className="btn small icon" data-testid={name ? `${name}-plus` : undefined} aria-label={`${label}: meer`}
          disabled={disabled || value >= max} onClick={() => commit(value + step)}>+</button>
      </div>
      {invalid && <div className="field-error" role="alert">Kies een waarde van {min} tot {max}</div>}
      {slider && <SummaSlider value={value} min={min} max={max} step={step} label={label} unit={unit} onChange={commit} />}
    </div>
  );
}
