import React, { useEffect, useRef, useState } from 'react';
import { FONTS } from '../../shared/model';
import { ACCENTS } from '../../shared/model';
import { contrast, hexToHsv, hsvToHex, isHex, normalizeHex } from '../../shared/color';
import { Icon } from '../icons';

export function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

interface TProps { value: string; onChange: (v: string) => void; placeholder?: string; name?: string; type?: string }
export const TextInput = ({ value, onChange, placeholder, name, type = 'text' }: TProps) => (
  <input className="input" type={type} data-testid={name} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
);

export function TextArea({ value, onChange, placeholder, rows = 3, name }: TProps & { rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight + 2, rows * 20)}px`;
  }, [value, rows]);
  return (
    <textarea ref={ref} className="input textarea" data-testid={name} rows={rows} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />
  );
}

/** Komma-gescheiden lijst die tijdens het typen niet "terugspringt". */
export function ListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const parse = (t: string) => t.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const [raw, setRaw] = useState(value.join(', '));
  useEffect(() => {
    if (parse(raw).join('|') !== value.join('|')) setRaw(value.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input className="input" value={raw} placeholder={placeholder}
      onChange={(e) => { setRaw(e.target.value); onChange(parse(e.target.value)); }} />
  );
}

export const Btn = ({ children, onClick, kind = 'default', title, disabled, name, small, icon }: {
  children?: React.ReactNode; onClick?: () => void; kind?: 'default' | 'primary' | 'danger' | 'ghost';
  title?: string; disabled?: boolean; name?: string; small?: boolean; icon?: boolean;
}) => (
  <button type="button" data-testid={name} className={`btn ${kind} ${small ? 'small' : ''} ${icon ? 'icon' : ''}`}
    onClick={(e) => { e.stopPropagation(); onClick?.(); }} title={title} aria-label={title} disabled={disabled}>
    {children}
  </button>
);

export function Segmented<T extends string>({ value, options, onChange, name }: {
  value: T; options: { value: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void; name?: string;
}) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button type="button" key={o.value} title={o.title} data-testid={name ? `${name}-${o.value}` : undefined}
          className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

const decimals = (step: number) => (String(step).split('.')[1] ?? '').length;

/** Getal met −/+ knoppen, invoerveld en optioneel een schuifregelaar. */
export function NumberField({ label, value, onChange, min, max, step = 1, unit, slider, name }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
  slider?: boolean; name?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const commit = (v: number) => onChange(Number(clamp(v).toFixed(decimals(step))));
  return (
    <div className="num-field">
      <span className="field-label">{label}</span>
      <div className="num-row">
        <button type="button" className="btn small icon" data-testid={name ? `${name}-minus` : undefined} aria-label="Minder"
          disabled={value <= min} onClick={() => commit(value - step)}>−</button>
        <div className="num-input">
          <input className="input" inputMode="decimal" data-testid={name} value={text}
            onFocus={() => { focused.current = true; }}
            onBlur={() => { focused.current = false; setText(String(value)); }}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value.replace(',', '.'));
              if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(Number(n.toFixed(decimals(step) + 1)));
            }}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); commit(value + step); } if (e.key === 'ArrowDown') { e.preventDefault(); commit(value - step); } }} />
          {unit && <span className="unit">{unit}</span>}
        </div>
        <button type="button" className="btn small icon" data-testid={name ? `${name}-plus` : undefined} aria-label="Meer"
          disabled={value >= max} onClick={() => commit(value + step)}>+</button>
      </div>
      {slider && <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => commit(Number(e.target.value))} />}
    </div>
  );
}

// ---------- kleurkiezer ----------

function Picker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(isHex(value) ? value : '#1f4e79'));
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isHex(value) && hsvToHex(...hsv) !== value.toLowerCase()) setHsv(hexToHsv(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const set = (h: number, s: number, v: number) => { setHsv([h, s, v]); onChange(hsvToHex(h, s, v)); };
  const pick = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    set(hsv[0], Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  return (
    <div className="picker">
      <div ref={area} className="sv" data-testid="color-sv" style={{ background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hsv[0]},100%,50%))` }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (e.buttons) pick(e); }}>
        <i style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%` }} />
      </div>
      <input type="range" className="hue" min={0} max={359} value={Math.round(hsv[0])} aria-label="Tint"
        onChange={(e) => set(Number(e.target.value), hsv[1] || 0.6, hsv[2] || 0.7)} />
    </div>
  );
}

export function ColorField({ label, value, onChange, swatches = [], onSaveSwatch, optional, minContrast, name }: {
  label: string; value: string; onChange: (hex: string) => void; swatches?: string[]; onSaveSwatch?: (hex: string) => void;
  optional?: boolean; minContrast?: number; name: string;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [warn, setWarn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { setHex(value); }, [value]);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);

  const apply = (h: string) => {
    if (minContrast && contrast(h, '#ffffff') < minContrast) { setWarn(true); return false; }
    setWarn(false); onChange(h); return true;
  };
  return (
    <div className="color-field" ref={root}>
      <span className="field-label">{label}</span>
      <button type="button" className="color-btn" data-testid={name} onClick={() => setOpen((o) => !o)}>
        <i className={`sw ${value ? '' : 'auto'}`} style={value ? { background: value } : undefined} />
        <span>{value ? value.toUpperCase() : 'Auto'}</span>
      </button>
      {open && (
        <div className="popover color-pop" data-testid={`${name}-pop`}>
          <Picker value={value || '#888888'} onChange={(h) => { setHex(h); apply(h); }} />
          <div className="hex-row">
            <input className="input" data-testid={`${name}-hex`} value={hex} maxLength={7} spellCheck={false}
              onChange={(e) => { setHex(e.target.value); const n = normalizeHex(e.target.value); if (n) apply(n); }} />
            {onSaveSwatch && isHex(value) && <Btn small title="Kleur opslaan" name={`${name}-save`} onClick={() => onSaveSwatch(value)}><Icon name="plus" size={14} /></Btn>}
            {optional && <Btn small title="Automatisch" name={`${name}-auto`} onClick={() => { onChange(''); setWarn(false); }}>Auto</Btn>}
          </div>
          {warn && <div className="warn-text">Te laag contrast op wit</div>}
          <div className="swatch-row">
            {ACCENTS.map((c) => <button type="button" key={c} className="swatch" aria-label={c} style={{ background: c }} onClick={() => { setHex(c); apply(c); }} />)}
          </div>
          {swatches.length > 0 && (
            <div className="swatch-row saved" data-testid="saved-swatches">
              {swatches.map((c) => <button type="button" key={c} className="swatch" aria-label={c} style={{ background: c }} onClick={() => { setHex(c); apply(c); }} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- lettertype-keuze met zoekveld ----------

export function FontPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  const cur = FONTS.find((f) => f.id === value) ?? FONTS[0];
  const list = FONTS.filter((f) => f.label.toLowerCase().includes(q.trim().toLowerCase()) || f.kind.startsWith(q.trim().toLowerCase()) && q.trim().length > 1);
  return (
    <div className="font-picker" ref={root}>
      <span className="field-label">Lettertype</span>
      <button type="button" className="color-btn" data-testid="font-select" style={{ fontFamily: cur.css }} onClick={() => { setOpen((o) => !o); setQ(''); }}>
        <span>{cur.label}</span><Icon name="down" size={14} />
      </button>
      {open && (
        <div className="popover font-pop">
          <div className="search"><Icon name="search" size={14} /><input autoFocus data-testid="font-search" placeholder="Zoeken" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="font-list">
            {list.map((f) => (
              <button type="button" key={f.id} data-testid={`font-${f.id}`} className={f.id === value ? 'on' : ''} style={{ fontFamily: f.css }}
                onClick={() => { onChange(f.id); setOpen(false); }}>
                {f.label}<small>{f.kind === 'serif' ? 'Serif' : 'Sans'}</small>
              </button>
            ))}
            {list.length === 0 && <div className="empty">Geen resultaat</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- herhaalde items ----------

export function ItemShell({ title, onUp, onDown, onRemove, children, index, count, name }: {
  title: string; onUp: () => void; onDown: () => void; onRemove: () => void; children: React.ReactNode;
  index: number; count: number; name?: string;
}) {
  const [open, setOpen] = useState(() => !title);
  return (
    <div className={`item-shell ${open ? 'open' : ''}`} data-testid={name}>
      <div className="item-head" onClick={() => setOpen((o) => !o)}>
        <span className={`chev ${open ? 'open' : ''}`}><Icon name="chevron" size={14} /></span>
        <strong>{title || 'Nieuw'}</strong>
        <span className="spacer" />
        <Btn small kind="ghost" icon title="Omhoog" disabled={index === 0} onClick={() => onUp()}><Icon name="up" size={14} /></Btn>
        <Btn small kind="ghost" icon title="Omlaag" disabled={index === count - 1} onClick={() => onDown()}><Icon name="down" size={14} /></Btn>
        <Btn small kind="ghost" icon title="Verwijderen" name={name ? `${name}-remove` : undefined} onClick={() => onRemove()}><Icon name="trash" size={14} /></Btn>
      </div>
      {open && <div className="item-body">{children}</div>}
    </div>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}
