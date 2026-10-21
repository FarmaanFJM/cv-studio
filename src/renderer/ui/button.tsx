import React, { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Korte uitleg bij hover én toetsenbordfocus; verdwijnt met Escape. Wordt in <body> getekend zodat scrollcontainers hem niet afknippen. */
export function SummaTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  const id = useId();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = wrap.current?.getBoundingClientRect();
      if (r) setPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
    }, delay);
  };
  const hide = () => { window.clearTimeout(timer.current); setPos(null); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!pos) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [pos]);
  return (
    <span ref={wrap} className="tt-wrap" onMouseEnter={() => show(450)} onMouseLeave={hide} onFocus={() => show(0)} onBlur={hide} onMouseDown={hide}>
      {isValidElement(children) ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { 'aria-describedby': pos ? id : undefined }) : children}
      {pos && createPortal(
        <span role="tooltip" id={id} className="tt" style={{ left: Math.min(Math.max(pos.x, 80), window.innerWidth - 80), top: pos.y }}>{label}</span>,
        document.body
      )}
    </span>
  );
}

export interface SummaButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  kind?: 'default' | 'primary' | 'danger' | 'ghost';
  /** Toegankelijke naam + tooltip. Verplicht voor knoppen met alleen een icoon. */
  title?: string;
  disabled?: boolean;
  name?: string;
  small?: boolean;
  icon?: boolean;
  type?: 'button' | 'submit';
  pressed?: boolean;
  expanded?: boolean;
  haspopup?: boolean;
}

/** Eén knopstijl voor de hele editor: primair, standaard, destructief en ghost; icoon-knoppen krijgen altijd een naam en tooltip. */
export function SummaButton({ children, onClick, kind = 'default', title, disabled, name, small, icon, type = 'button', pressed, expanded, haspopup }: SummaButtonProps) {
  const btn = (
    <button type={type} data-testid={name} className={`btn ${kind} ${small ? 'small' : ''} ${icon ? 'icon' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }} aria-label={icon ? title : undefined} aria-pressed={pressed}
      aria-expanded={expanded} aria-haspopup={haspopup ? 'menu' : undefined} disabled={disabled}>
      {children}
    </button>
  );
  return title ? <SummaTooltip label={title}>{btn}</SummaTooltip> : btn;
}
