import React, { useEffect, useRef, useState } from 'react';
import { TECH_GROUPS, TECH_ICONS, TechIcon, compact, resolveSkillIcon } from '../techIcons';
import { Icon } from '../icons';

/** Zoekbare keuzelijst met alle meegeleverde iconen. */
function IconPicker({ current, onPick, onClose }: { current: string | null; onPick: (v: string | 'auto' | 'none') => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [onClose]);
  const k = compact(q);
  const match = (t: (typeof TECH_ICONS)[number]) => !k || [t.label, t.id, ...t.aliases].some((a) => compact(a).includes(k));
  return (
    <div className="popover icon-pop" ref={root} data-testid="icon-picker">
      <div className="search"><Icon name="search" size={14} /><input autoFocus data-testid="icon-search" placeholder="Zoeken" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="icon-actions">
        <button type="button" data-testid="icon-pick-auto" onClick={() => onPick('auto')}>Automatisch</button>
        <button type="button" data-testid="icon-pick-none" onClick={() => onPick('none')}>Geen icoon</button>
      </div>
      <div className="icon-scroll">
        {TECH_GROUPS.map((g) => {
          const list = TECH_ICONS.filter((t) => t.group === g && match(t));
          if (!list.length) return null;
          return (
            <div key={g}>
              <div className="pop-title">{g}</div>
              <div className="icon-grid">
                {list.map((t) => (
                  <button type="button" key={t.id} title={t.label} data-testid={`icon-pick-${t.id}`} className={t.id === current ? 'on' : ''} onClick={() => onPick(t.id)}>
                    <TechIcon id={t.id} /><span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Per vaardigheid: toont het gekozen/herkende icoon en laat je het wijzigen of uitzetten. */
export function SkillPills({ skills, show, overrides, onOverride }: {
  skills: string[]; show: boolean; overrides: Record<string, string>; onOverride: (key: string, value: string | null) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (!skills.length) return null;
  // iconen uit (globaal, voor dit onderdeel of door de weergave 'Tekst'): keuzes per vaardigheid blijven bewaard maar gelden niet
  if (!show) return <p className="field-hint" data-testid="pills-off">Iconen zijn uitgezet; keuzes per vaardigheid blijven bewaard.</p>;
  return (
    <div className="pills" data-testid="skill-pills">
      {skills.map((sk) => {
        const key = compact(sk);
        const icon = resolveSkillIcon(sk, show, overrides);
        return (
          <div className="pill-wrap" key={sk}>
            <button type="button" className={`pill ${icon ? 'has-icon' : ''} ${overrides[key] ? 'custom' : ''}`} data-testid={`skill-pill-${key}`}
              title="Icoon kiezen" onClick={() => setOpenKey(openKey === key ? null : key)}>
              {icon ? <TechIcon id={icon} /> : <span className="no-icon" />}{sk}
            </button>
            {openKey === key && (
              <IconPicker current={overrides[key] && overrides[key] !== 'none' ? overrides[key] : null} onClose={() => setOpenKey(null)}
                onPick={(v) => { onOverride(key, v === 'auto' ? null : v); setOpenKey(null); }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
