import React, { useEffect, useRef, useState } from 'react';
import { TechIcon, getTech, matchTech, suggestTech } from '../techIcons';

interface TProps { value: string; onChange: (v: string) => void; placeholder?: string; name?: string; type?: string; label?: string }
export const SummaTextInput = ({ value, onChange, placeholder, name, type = 'text', label }: TProps) => (
  <input className="input" type={type} data-testid={name} value={value} placeholder={placeholder} aria-label={label} onChange={(e) => onChange(e.target.value)} />
);

export function SummaTextArea({ value, onChange, placeholder, rows = 3, name, label }: TProps & { rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight + 2, rows * 20)}px`;
  }, [value, rows]);
  return (
    <textarea ref={ref} className="input textarea" data-testid={name} rows={rows} value={value} placeholder={placeholder} aria-label={label}
      onChange={(e) => onChange(e.target.value)} />
  );
}

/** Komma-gescheiden lijst die tijdens het typen niet "terugspringt"; optioneel met technologie-suggesties. */
export function SummaListInput({ value, onChange, placeholder, suggest, name, label }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggest?: boolean; name?: string; label?: string;
}) {
  const parse = (t: string) => t.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const [raw, setRaw] = useState(value.join(', '));
  useEffect(() => {
    if (parse(raw).join('|') !== value.join('|')) setRaw(value.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const set = (t: string) => { setRaw(t); onChange(parse(t)); };
  const last = raw.split(/[,\n]/).pop()?.trim() ?? '';
  // een volledig herkende naam krijgt alleen nog een spelling-suggestie ("typescript" -> "TypeScript")
  const exact = suggest ? getTech(matchTech(last)) : undefined;
  const sugg = !suggest ? [] : exact ? (exact.label !== last ? [exact] : []) : suggestTech(last);
  return (
    <div className="list-input">
      <input className="input" data-testid={name} value={raw} placeholder={placeholder} aria-label={label} onChange={(e) => set(e.target.value)} />
      {sugg.length > 0 && (
        <div className="suggest" data-testid="suggestions" role="group" aria-label="Suggesties">
          {sugg.map((t) => (
            <button type="button" key={t.id} data-testid={`suggest-${t.id}`} title="Aanvullen"
              onClick={() => { const cut = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('\n')); set(`${cut >= 0 ? raw.slice(0, cut + 1) + ' ' : ''}${t.label}, `); }}>
              <TechIcon id={t.id} />{t.label}
            </button>
          ))}
        </div>
      )}
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
