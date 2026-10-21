import React, { useState } from 'react';
import { CV, Section, SKILL_LEVEL_NAMES, newItem, newSkillGroup, uid } from '../../shared/model';
import { effectiveTech } from '../../shared/tech';
import { Icon } from '../icons';
import {
  SummaButton, SummaField, SummaFieldset, SummaItemCard, SummaNumberInput, SummaSegmented,
  SummaTextArea, SummaTextInput, move
} from '../ui';
import { PhotoEditor } from './PhotoEditor';
import { CategoryInput, SkillTagInput, categoryByName } from './SkillInputs';
import { SkillPills } from './TechEditor';
import { TechSettingsPanel } from './TechSettings';

type Upd = (fn: (cv: CV) => void) => void;

function useSec(update: Upd, id: string) {
  return <S extends Section>(fn: (s: S) => void) =>
    update((cv) => { const s = cv.sections.find((x) => x.id === id); if (s) fn(s as S); });
}

const AddBtn = ({ children, onClick, name }: { children: React.ReactNode; onClick: () => void; name?: string }) => (
  <SummaButton name={name} onClick={onClick}><Icon name="plus" size={14} /> {children}</SummaButton>
);

const DESC_PH = 'Beschrijving (- = opsomming)';

export function SectionEditor({ s, cv, update }: { s: Section; cv: CV; update: Upd }) {
  const edit = useSec(update, s.id);
  const P = cv.personal;
  const setP = (k: keyof typeof P) => (v: string) => update((c) => { c.personal[k] = v; });

  switch (s.type) {
    case 'personal':
      return (
        <div className="stack">
          <div className="grid2">
            <SummaField label="Naam"><SummaTextInput name="p-fullName" value={P.fullName} onChange={setP('fullName')} /></SummaField>
            <SummaField label="Functietitel"><SummaTextInput name="p-title" value={P.title} onChange={setP('title')} /></SummaField>
            <SummaField label="E-mail"><SummaTextInput name="p-email" value={P.email} onChange={setP('email')} type="email" /></SummaField>
            <SummaField label="Telefoon"><SummaTextInput name="p-phone" value={P.phone} onChange={setP('phone')} /></SummaField>
            <SummaField label="Locatie"><SummaTextInput name="p-location" value={P.location} onChange={setP('location')} /></SummaField>
            <SummaField label="Geboortedatum"><SummaTextInput name="p-birthDate" value={P.birthDate} onChange={setP('birthDate')} /></SummaField>
            <SummaField label="LinkedIn"><SummaTextInput name="p-linkedin" value={P.linkedin} onChange={setP('linkedin')} /></SummaField>
            <SummaField label="GitHub"><SummaTextInput name="p-github" value={P.github} onChange={setP('github')} /></SummaField>
            <SummaField label="Website"><SummaTextInput name="p-website" value={P.website} onChange={setP('website')} /></SummaField>
          </div>
          <div className="field-label">Foto</div>
          <PhotoEditor cv={cv} update={update} />
        </div>
      );
    case 'profile':
      return (
        <SummaField label="Korte introductie">
          <SummaTextArea name="profile-text" rows={4} value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })}
            placeholder="Beschrijf kort je achtergrond, ervaring of interesses." />
        </SummaField>
      );
    case 'experience':
      return (
        <div className="stack">
          {s.items.map((it, i) => (
            <SummaItemCard key={it.id} name={`exp-${i}`} title={it.role || it.company} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <SummaField label="Functie"><SummaTextInput name={`exp-${i}-role`} value={it.role} onChange={(v) => edit<typeof s>((x) => { x.items[i].role = v; })} /></SummaField>
                <SummaField label="Werkgever"><SummaTextInput name={`exp-${i}-company`} value={it.company} onChange={(v) => edit<typeof s>((x) => { x.items[i].company = v; })} /></SummaField>
                <SummaField label="Locatie"><SummaTextInput value={it.location} onChange={(v) => edit<typeof s>((x) => { x.items[i].location = v; })} /></SummaField>
                <div className="grid2">
                  <SummaField label="Start"><SummaTextInput value={it.start} placeholder="mm/jjjj" onChange={(v) => edit<typeof s>((x) => { x.items[i].start = v; })} /></SummaField>
                  <SummaField label="Einde"><SummaTextInput value={it.end} placeholder="heden" onChange={(v) => edit<typeof s>((x) => { x.items[i].end = v; })} /></SummaField>
                </div>
              </div>
              <SummaTextArea name={`exp-${i}-desc`} placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </SummaItemCard>
          ))}
          <AddBtn name="exp-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('experience')); })}>Werkervaring</AddBtn>
        </div>
      );
    case 'education':
      return (
        <div className="stack">
          {s.items.map((it, i) => (
            <SummaItemCard key={it.id} name={`edu-${i}`} title={it.degree || it.school} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <SummaField label="Opleiding"><SummaTextInput name={`edu-${i}-degree`} value={it.degree} onChange={(v) => edit<typeof s>((x) => { x.items[i].degree = v; })} /></SummaField>
                <SummaField label="Instelling"><SummaTextInput value={it.school} onChange={(v) => edit<typeof s>((x) => { x.items[i].school = v; })} /></SummaField>
                <SummaField label="Start"><SummaTextInput value={it.start} onChange={(v) => edit<typeof s>((x) => { x.items[i].start = v; })} /></SummaField>
                <SummaField label="Einde"><SummaTextInput value={it.end} placeholder="heden" onChange={(v) => edit<typeof s>((x) => { x.items[i].end = v; })} /></SummaField>
              </div>
              <SummaTextArea placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </SummaItemCard>
          ))}
          <AddBtn name="edu-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('education')); })}>Opleiding</AddBtn>
        </div>
      );
    case 'projects':
      return (
        <div className="stack">
          <SummaFieldset label="Tech stack">
            <SummaSegmented name="tech-display" label="Weergave tech stack" value={s.techDisplay} onChange={(d) => edit<typeof s>((x) => { x.techDisplay = d; })}
              options={[{ value: 'text', label: 'Tekst', title: 'Gewone tekst, nooit iconen' }, { value: 'chips', label: 'Chips', title: 'Compacte chips, met iconen als die aanstaan' }]} />
          </SummaFieldset>
          {s.techDisplay === 'chips' && <TechSettingsPanel cv={cv} s={s} edit={edit} />}
          {s.items.map((it, i) => (
            <SummaItemCard key={it.id} name={`proj-${i}`} title={it.name} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <SummaField label="Naam"><SummaTextInput name={`proj-${i}-name`} value={it.name} onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} /></SummaField>
                <SummaField label="Periode"><SummaTextInput value={it.period} onChange={(v) => edit<typeof s>((x) => { x.items[i].period = v; })} /></SummaField>
                <SummaField label="GitHub"><SummaTextInput value={it.github} onChange={(v) => edit<typeof s>((x) => { x.items[i].github = v; })} /></SummaField>
              </div>
              <div className="field">
                <span className="field-label">Technologieën</span>
                <SkillTagInput name={`proj-${i}-tech`} label="Technologieën" placeholder="Typ een technologie of open de lijst"
                  skills={it.tech.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)} onChange={(v) => edit<typeof s>((x) => { x.items[i].tech = v.join(', '); })} />
                <SkillPills skills={it.tech.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)} show={false} overrides={{}} onOverride={() => undefined}
                  onRemove={(n) => edit<typeof s>((x) => { x.items[i].tech = x.items[i].tech.split(/[,;|]/).map((t) => t.trim()).filter(Boolean).filter((_, k) => k !== n).join(', '); })} />
              </div>
              <SummaTextArea name={`proj-${i}-desc`} placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </SummaItemCard>
          ))}
          <AddBtn name="proj-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('projects')); })}>Project</AddBtn>
        </div>
      );
    case 'skills': return <SkillsEditor s={s} cv={cv} edit={edit} />;
    case 'languages':
      return (
        <div className="stack">
          <SummaSegmented name="lang-display" label="Weergave talen" value={s.display} onChange={(d) => edit<typeof s>((x) => { x.display = d; })}
            options={[{ value: 'text', label: 'Niveau als tekst' }, { value: 'dots', label: 'Stippen' }]} />
          {s.items.map((it, i) => (
            <div className="lang-row" key={it.id}>
              <SummaTextInput name={`lang-${i}-name`} value={it.name} placeholder="Taal" onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} />
              {s.display === 'dots' ? (
                <div className="mini-num"><SummaNumberInput label="" min={0} max={5} value={it.rating} name={`lang-${i}-rating`} onChange={(v) => edit<typeof s>((x) => { x.items[i].rating = v; })} /></div>
              ) : (
                <SummaTextInput value={it.level} placeholder="Niveau" onChange={(v) => edit<typeof s>((x) => { x.items[i].level = v; })} />
              )}
              <SummaButton small kind="ghost" icon title="Omhoog" disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}><Icon name="up" size={14} /></SummaButton>
              <SummaButton small kind="ghost" icon title="Omlaag" disabled={i === s.items.length - 1} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}><Icon name="down" size={14} /></SummaButton>
              <SummaButton small kind="ghost" icon title="Verwijderen" onClick={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}><Icon name="trash" size={14} /></SummaButton>
            </div>
          ))}
          <AddBtn name="lang-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('languages')); })}>Taal</AddBtn>
        </div>
      );
    case 'custom':
      return (
        <div className="stack">
          <SummaSegmented name="custom-mode" label="Soort onderdeel" value={s.mode} onChange={(m) => edit<typeof s>((x) => { x.mode = m; })}
            options={[{ value: 'text', label: 'Tekst' }, { value: 'list', label: 'Lijst' }, { value: 'keyvalue', label: 'Label + waarde' }]} />
          {s.mode !== 'text' && <TechSettingsPanel cv={cv} s={s} edit={edit} />}
          {s.mode === 'text' ? (
            <SummaTextArea name="custom-text" placeholder="Tekst" value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })} />
          ) : (
            <>
              {s.items.map((it, i) => (
                <div className="lang-row" key={it.id}>
                  <SummaTextInput name={`custom-${i}-text`} value={it.text} placeholder={s.mode === 'keyvalue' ? 'Label' : 'Item'} onChange={(v) => edit<typeof s>((x) => { x.items[i].text = v; })} />
                  {s.mode === 'keyvalue' && <SummaTextInput value={it.value} placeholder="Waarde" onChange={(v) => edit<typeof s>((x) => { x.items[i].value = v; })} />}
                  <SummaButton small kind="ghost" icon title="Omhoog" disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}><Icon name="up" size={14} /></SummaButton>
                  <SummaButton small kind="ghost" icon title="Omlaag" disabled={i === s.items.length - 1} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}><Icon name="down" size={14} /></SummaButton>
                  <SummaButton small kind="ghost" icon title="Verwijderen" onClick={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}><Icon name="trash" size={14} /></SummaButton>
                </div>
              ))}
              <AddBtn name="custom-add" onClick={() => edit<typeof s>((x) => { x.items.push({ id: uid(), text: '', value: '' }); })}>Item</AddBtn>
            </>
          )}
        </div>
      );
  }
}

function SkillsEditor({ s, cv, edit }: { s: Extract<Section, { type: 'skills' }>; cv: CV; edit: ReturnType<typeof useSec> }) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const chips = s.display === 'chips';
  const iconsShown = chips && effectiveTech(cv.style, s).show;
  const flat = s.groups.flatMap((g) => g.skills);
  const override = (k: string, v: string | null) => edit<typeof s>((x) => { if (v === null) delete x.iconOverrides[k]; else x.iconOverrides[k] = v; });
  const levels = s.mode === 'levels';
  return (
    <div className="stack">
      <div className="inline-controls">
        <SummaFieldset label="Indeling">
          <SummaSegmented name="skill-mode" label="Indeling vaardigheden" value={s.mode} onChange={(m) => edit<typeof s>((x) => {
            x.mode = m;
            if (m === 'levels' && x.groups.length === 0) x.groups = SKILL_LEVEL_NAMES.map((n, i) => newSkillGroup(n, 5 - i));
            if (m === 'flat' && x.groups.length === 0) x.groups = [newSkillGroup()];
          })} options={[{ value: 'flat', label: 'Lijst' }, { value: 'grouped', label: 'Groepen' }, { value: 'levels', label: 'Niveaus' }]} />
        </SummaFieldset>
        <SummaFieldset label="Weergave">
          <SummaSegmented name="skill-display" label="Weergave vaardigheden" value={s.display} onChange={(d) => edit<typeof s>((x) => { x.display = d; })}
            options={[{ value: 'text', label: 'Tekst', title: 'Gewone tekst, nooit iconen' }, { value: 'chips', label: 'Chips', title: 'Compacte chips, met iconen als die aanstaan' }]} />
        </SummaFieldset>
      </div>
      {chips && <TechSettingsPanel cv={cv} s={s} edit={edit} />}
      {s.mode === 'flat' ? (
        <div className="stack tight">
          <SkillTagInput name="skill-flat" label="Vaardigheden" skills={flat}
            onChange={(v) => edit<typeof s>((x) => { if (!x.groups.length) x.groups.push(newSkillGroup()); x.groups[0].skills = v; x.groups.slice(1).forEach((g) => { g.skills = []; }); })} />
          <SkillPills skills={flat} show={iconsShown} overrides={s.iconOverrides} onOverride={override}
            onRemove={(n) => edit<typeof s>((x) => {
              const all = x.groups.flatMap((g) => g.skills).filter((_, k) => k !== n);
              x.groups[0].skills = all; x.groups.slice(1).forEach((g) => { g.skills = []; });
            })} />
        </div>
      ) : (
        <>
          {s.groups.map((g, i) => (
            <div className="subgroup" key={g.id} data-testid={`skill-${i}`}>
              <div className="subgroup-head">
                <div className="field grow">
                  <span className="field-label">{levels ? 'Niveau' : 'Categorie'}</span>
                  {levels
                    ? <SummaTextInput name={`skill-${i}-name`} label="Niveau" value={g.name} onChange={(v) => edit<typeof s>((x) => { x.groups[i].name = v; })} />
                    : <CategoryInput name={`skill-${i}-name`} label="Categorie" value={g.name} autoFocus={focusId === g.id}
                        onChange={(v) => edit<typeof s>((x) => { x.groups[i].name = v; })} />}
                </div>
                {levels && <div className="mini-num"><SummaNumberInput label="Stippen" min={0} max={5} value={g.level} name={`skill-${i}-level`} onChange={(v) => edit<typeof s>((x) => { x.groups[i].level = v; })} /></div>}
                <div className="subgroup-actions">
                  <SummaButton small kind="ghost" icon title="Omhoog" name={`skill-${i}-up`} disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i - 1); })}><Icon name="up" size={14} /></SummaButton>
                  <SummaButton small kind="ghost" icon title="Omlaag" name={`skill-${i}-down`} disabled={i === s.groups.length - 1} onClick={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i + 1); })}><Icon name="down" size={14} /></SummaButton>
                  <SummaButton small kind="ghost" icon title="Groep verwijderen" name={`skill-${i}-remove`} onClick={() => edit<typeof s>((x) => { x.groups.splice(i, 1); })}><Icon name="trash" size={14} /></SummaButton>
                </div>
              </div>
              <div className="field">
                <span className="field-label">Vaardigheden</span>
                <SkillTagInput name={`skill-${i}-list`} label={`Vaardigheden in ${g.name || 'deze groep'}`} skills={g.skills} category={levels ? null : categoryByName(g.name)}
                  onChange={(v) => edit<typeof s>((x) => { x.groups[i].skills = v; })} />
              </div>
              <SkillPills skills={g.skills} show={iconsShown} overrides={s.iconOverrides} onOverride={override}
                onRemove={(n) => edit<typeof s>((x) => { x.groups[i].skills.splice(n, 1); })} />
            </div>
          ))}
          <div className="btn-row">
            <AddBtn name="skill-add" onClick={() => {
              const g = newSkillGroup('', levels ? 1 : 0);
              edit<typeof s>((x) => { x.groups.push(g); });
              if (!levels) setFocusId(g.id);
            }}>{levels ? 'Niveau' : 'Groep'}</AddBtn>
            {levels && s.groups.length === 0 && (
              <SummaButton onClick={() => edit<typeof s>((x) => { x.groups = SKILL_LEVEL_NAMES.map((n, i) => newSkillGroup(n, 5 - i)); })}>Standaardniveaus</SummaButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}
