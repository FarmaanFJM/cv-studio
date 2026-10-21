import React, { useEffect, useId, useRef, useState } from 'react';

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

// ---------- select (grotere lijsten) ----------

export function SummaSelect<T extends string>({ value, options, onChange, label, name, disabled }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; name?: string; disabled?: boolean;
}) {
  return (
    <select className="input select" aria-label={label} data-testid={name} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
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
