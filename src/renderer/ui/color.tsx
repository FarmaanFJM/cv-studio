import React, { useEffect, useId, useRef, useState } from 'react';
import { contrast, hexToHsv, hsvToHex, isHex, normalizeHex } from '../../shared/color';
import { ACCENTS } from '../../shared/model';
import { Icon } from '../icons';
import { SummaButton } from './button';

function Picker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label: string }) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(isHex(value) ? value : '#1f4e79'));
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isHex(value) && hsvToHex(...hsv) !== value.toLowerCase()) setHsv(hexToHsv(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const set = (h: number, s: number, v: number) => { setHsv([h, s, v]); onChange(hsvToHex(h, s, v)); };
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const pick = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    set(hsv[0], clamp01((e.clientX - r.left) / r.width), 1 - clamp01((e.clientY - r.top) / r.height));
  };
  const key = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowLeft') set(hsv[0], clamp01(hsv[1] - d), hsv[2]);
    else if (e.key === 'ArrowRight') set(hsv[0], clamp01(hsv[1] + d), hsv[2]);
    else if (e.key === 'ArrowUp') set(hsv[0], hsv[1], clamp01(hsv[2] + d));
    else if (e.key === 'ArrowDown') set(hsv[0], hsv[1], clamp01(hsv[2] - d));
    else return;
    e.preventDefault();
  };
  return (
    <div className="picker">
      <div ref={area} className="sv" data-testid="color-sv" tabIndex={0} role="application" aria-label={`${label}: kleurvlak (pijltjestoetsen)`}
        style={{ background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hsv[0]},100%,50%))` }}
        onKeyDown={key}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (e.buttons) pick(e); }}>
        <i style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%` }} />
      </div>
      <input type="range" className="hue" min={0} max={359} value={Math.round(hsv[0])} aria-label={`${label}: tint`}
        onChange={(e) => set(Number(e.target.value), hsv[1] || 0.6, hsv[2] || 0.7)} />
    </div>
  );
}

/** Kleurkiezer: kleurvlak + tint, hex-invoer met directe validatie, snelle kleuren en eigen opgeslagen kleuren. */
export function SummaColorPicker({ label, value, onChange, swatches = [], onSaveSwatch, optional, minContrast, name }: {
  label: string; value: string; onChange: (hex: string) => void; swatches?: string[]; onSaveSwatch?: (hex: string) => void;
  optional?: boolean; minContrast?: number; name: string;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [problem, setProblem] = useState<'' | 'invalid' | 'contrast'>('');
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const eid = useId();
  useEffect(() => { setHex(value); setProblem(''); }, [value]);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', f);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k); };
  }, [open]);

  const apply = (h: string) => {
    if (minContrast && contrast(h, '#ffffff') < minContrast) { setProblem('contrast'); return false; }
    setProblem(''); onChange(h); return true;
  };
  const msg = problem === 'invalid' ? 'Ongeldige kleur. Gebruik bijvoorbeeld #1F4E79.' : problem === 'contrast' ? 'Te laag contrast op wit; kies een donkerdere kleur.' : '';
  return (
    <div className="color-field" ref={root}>
      <span className="field-label">{label}</span>
      <button type="button" ref={btn} className="color-btn" data-testid={name} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${label}: ${value ? value.toUpperCase() : 'Auto'}`} onClick={() => setOpen((o) => !o)}>
        <i className={`sw ${value ? '' : 'auto'}`} style={value ? { background: value } : undefined} />
        <span>{value ? value.toUpperCase() : 'Auto'}</span>
      </button>
      {open && (
        <div className="popover color-pop" role="dialog" aria-label={`${label} kiezen`} data-testid={`${name}-pop`}>
          <Picker label={label} value={value || '#888888'} onChange={(h) => { setHex(h); apply(h); }} />
          <div className="hex-row">
            <input className="input" data-testid={`${name}-hex`} value={hex} maxLength={7} spellCheck={false} aria-label={`${label}: hex-waarde`}
              aria-invalid={problem !== '' || undefined} aria-describedby={msg ? eid : undefined}
              onChange={(e) => {
                setHex(e.target.value);
                const n = normalizeHex(e.target.value);
                if (n) apply(n); else setProblem(e.target.value.trim() === '' ? '' : 'invalid');
              }} />
            {onSaveSwatch && isHex(value) && <SummaButton small icon title="Kleur opslaan" name={`${name}-save`} onClick={() => onSaveSwatch(value)}><Icon name="plus" size={14} /></SummaButton>}
            {optional && <SummaButton small title="Automatische kleur gebruiken" name={`${name}-auto`} onClick={() => { onChange(''); setProblem(''); }}>Auto</SummaButton>}
          </div>
          {msg && <div className="field-error" id={eid} role="alert">{msg}</div>}
          <div className="swatch-row" role="group" aria-label="Snelle kleuren">
            {ACCENTS.map((c) => <button type="button" key={c} className="swatch" aria-label={`Kleur ${c}`} style={{ background: c }} onClick={() => { setHex(c); apply(c); }} />)}
          </div>
          {swatches.length > 0 && (
            <div className="swatch-row saved" role="group" aria-label="Eigen kleuren" data-testid="saved-swatches">
              {swatches.map((c) => <button type="button" key={c} className="swatch" aria-label={`Eigen kleur ${c}`} style={{ background: c }} onClick={() => { setHex(c); apply(c); }} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
