import React, { useEffect, useRef, useState } from 'react';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

interface TProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  name?: string;
  type?: string;
}
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

export const Btn = ({ children, onClick, kind = 'default', title, disabled, name, small }: {
  children: React.ReactNode; onClick?: () => void; kind?: 'default' | 'primary' | 'danger' | 'ghost';
  title?: string; disabled?: boolean; name?: string; small?: boolean;
}) => (
  <button type="button" data-testid={name} className={`btn ${kind} ${small ? 'small' : ''}`} onClick={onClick} title={title} disabled={disabled}>
    {children}
  </button>
);

export function ItemShell({ title, onUp, onDown, onRemove, children, index, count, name }: {
  title: string; onUp: () => void; onDown: () => void; onRemove: () => void; children: React.ReactNode;
  index: number; count: number; name?: string;
}) {
  return (
    <div className="item-shell" data-testid={name}>
      <div className="item-head">
        <strong>{title || 'Nieuw item'}</strong>
        <span className="spacer" />
        <Btn small kind="ghost" title="Omhoog" disabled={index === 0} onClick={onUp}>↑</Btn>
        <Btn small kind="ghost" title="Omlaag" disabled={index === count - 1} onClick={onDown}>↓</Btn>
        <Btn small kind="danger" title="Verwijderen" name={name ? `${name}-remove` : undefined} onClick={onRemove}>Verwijder</Btn>
      </div>
      {children}
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
