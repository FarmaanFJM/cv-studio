import React, { useState } from 'react';
import {
  CATEGORY_BY_ID, SKILL_CATEGORIES, SkillCategory, SkillEntry, addSkill, categoryByName, cleanSkillName, compact, searchCategories, searchSkills, skillKey, splitSkills
} from '../../shared/skillCatalog';
import { TechIcon, matchTech } from '../techIcons';
import { Combobox, ComboOption } from '../ui/combobox';

const skillOption = (e: SkillEntry, withHint: boolean): ComboOption => {
  const icon = matchTech(e.name);
  return { id: compact(e.name), label: e.name, icon: icon ? <TechIcon id={icon} /> : undefined, hint: withHint ? CATEGORY_BY_ID.get(e.categories[0])?.label : undefined };
};

/**
 * Vaardigheden toevoegen zoals tags op GitHub: typ, kies een suggestie (Tab/Enter/klik) en de invoer is weer leeg voor de volgende.
 * Eigen namen kunnen altijd; duplicaten (hoofdletter- en spatieongevoelig) worden binnen dezelfde lijst genegeerd.
 */
export function SkillTagInput({ skills, onChange, name, label, category, placeholder = 'Typ een vaardigheid of open de lijst', autoFocus }: {
  skills: string[]; onChange: (v: string[]) => void; name?: string; label: string; category?: SkillCategory | null; placeholder?: string; autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState<string>(category ? 'suggested' : 'all');
  const boost = category?.id ?? null;

  const addMany = (names: string[]) => {
    let list = skills;
    const dup: string[] = [];
    for (const n of names) {
      const r = addSkill(list, n);
      if (r.duplicate) dup.push(r.name);
      list = r.list;
    }
    if (list !== skills) onChange(list);
    setNote(dup.length ? `${dup.join(', ')} staat er al in.` : '');
    setText('');
  };

  const getOptions = (q: string, browsing: boolean): ComboOption[] => {
    const cleaned = cleanSkillName(q);
    if (cleaned) {
      const res = searchSkills(cleaned, { exclude: skills, boost, limit: 30 }).map((e) => skillOption(e, false));
      const known = res.some((o) => skillKey(o.label) === skillKey(cleaned)) || skills.some((s) => skillKey(s) === skillKey(cleaned));
      if (!known) res.push({ id: '__custom', label: `“${cleaned}” toevoegen`, value: cleaned, custom: true });
      return res;
    }
    if (!browsing) return [];
    if (cat === 'suggested' && boost) return searchSkills('', { exclude: skills, category: boost, limit: 80 }).map((e) => skillOption(e, false));
    if (cat === 'all' || cat === 'suggested') return searchSkills('', { exclude: skills, boost, limit: 80 }).map((e) => skillOption(e, true));
    return searchSkills('', { exclude: skills, category: cat, limit: 80 }).map((e) => skillOption(e, false));
  };

  const chips: { id: string; label: string }[] = [
    ...(category ? [{ id: 'suggested', label: `Voorgesteld: ${category.label}` }] : []),
    { id: 'all', label: 'Alle' },
    ...SKILL_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
  ];

  return (
    <div className="skill-input">
      <Combobox
        name={name} label={label} placeholder={placeholder} chevronLabel={`${label}: lijst tonen`} emptyText="Geen vaardigheden gevonden. Typ een eigen naam en druk op Enter."
        value={text} onChange={(t) => { setText(t); setNote(''); }}
        getOptions={getOptions}
        onSelect={(o) => addMany([o.value ?? o.label])}
        onCommitText={(t) => addMany(splitSkills(t))}
        onBlurText={(t) => addMany(splitSkills(t))}
        onOpenBrowse={() => setCat(category ? 'suggested' : 'all')}
        autoFocus={autoFocus}
        toolbar={({ browsing }) => !browsing ? null : (
          <div className="combo-cats" role="group" aria-label="Categorie">
            {chips.map((c) => (
              <button type="button" tabIndex={-1} key={c.id} aria-pressed={cat === c.id} className={cat === c.id ? 'on' : ''} data-testid={`${name}-cat-${c.id}`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
        )}
      />
      {note && <p className="field-hint" role="status" data-testid="skill-note">{note}</p>}
    </div>
  );
}

/** Categorienaam: eigen tekst, of kies/zoek in de ingebouwde presets. Een preset maakt alleen de naam; er worden geen vaardigheden toegevoegd. */
export function CategoryInput({ value, onChange, name, label, autoFocus }: {
  value: string; onChange: (v: string) => void; name?: string; label: string; autoFocus?: boolean;
}) {
  const getOptions = (q: string, browsing: boolean): ComboOption[] => {
    const list = browsing ? SKILL_CATEGORIES : searchCategories(q);
    return list.map((c, i) => ({
      id: c.id, label: c.label, hint: undefined,
      group: browsing && (i === 0 || list[i - 1].kind !== c.kind) ? (c.kind === 'it' ? 'IT en techniek' : 'Algemeen') : undefined
    }));
  };
  return (
    <Combobox
      name={name} label={label} chevronLabel={`${label}: lijst tonen`} emptyText="Geen categorieën gevonden"
      value={value} onChange={onChange} getOptions={getOptions} onSelect={(o) => onChange(o.label)} autoFocus={autoFocus}
    />
  );
}

export { categoryByName };
export const splitTech = (v: string) => splitSkills(v);
