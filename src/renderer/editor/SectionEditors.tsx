import React from 'react';
import { CV, Section, SKILL_LEVEL_NAMES, newItem, newSkillGroup, uid } from '../../shared/model';
import { effectiveTech } from '../../shared/tech';
import { Icon } from '../icons';
import {
  SummaAccordion, SummaButton, SummaField, SummaFieldset, SummaItemCard, SummaListInput, SummaNumberInput, SummaSegmented,
  SummaTextArea, SummaTextInput, SummaToggle, move
} from '../ui';
import { PhotoEditor } from './PhotoEditor';
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
      return <SummaTextArea name="profile-text" rows={4} value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })} placeholder="Tekst" />;
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
              options={[{ value: 'text', label: 'Tekst', title: 'Alleen tekst, nooit iconen' }, { value: 'inline', label: 'Icoon + label' }, { value: 'chips', label: 'Chips' }]} />
          </SummaFieldset>
          {s.techDisplay !== 'text' && <TechSettingsPanel cv={cv} s={s} edit={edit} />}
          {s.items.map((it, i) => (
            <SummaItemCard key={it.id} name={`proj-${i}`} title={it.name} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <SummaField label="Naam"><SummaTextInput name={`proj-${i}-name`} value={it.name} onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} /></SummaField>
                <SummaField label="Periode"><SummaTextInput value={it.period} onChange={(v) => edit<typeof s>((x) => { x.items[i].period = v; })} /></SummaField>
                <SummaField label="Technologieën">
                  <SummaListInput suggest name={`proj-${i}-tech`} value={it.tech.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)} onChange={(v) => edit<typeof s>((x) => { x.items[i].tech = v.join(', '); })} />
                </SummaField>
                <SummaField label="GitHub"><SummaTextInput value={it.github} onChange={(v) => edit<typeof s>((x) => { x.items[i].github = v; })} /></SummaField>
              </div>
              <SummaTextArea name={`proj-${i}-desc`} placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </SummaItemCard>
          ))}
          <AddBtn name="proj-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('projects')); })}>Project</AddBtn>
        </div>
      );
    case 'skills': {
      const skillIconsShown = s.display !== 'text' && effectiveTech(cv.style, s).show;
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
                options={[{ value: 'text', label: 'Tekst', title: 'Alleen tekst, nooit iconen' }, { value: 'inline', label: 'Icoon + label' }, { value: 'list', label: 'Lijst' }, { value: 'chips', label: 'Chips' }]} />
            </SummaFieldset>
          </div>
          {s.display !== 'text' && <TechSettingsPanel cv={cv} s={s} edit={edit} />}
          {s.mode === 'flat' ? (
            <>
              <SummaListInput suggest name="skill-flat" value={s.groups.flatMap((g) => g.skills)} placeholder="Vaardigheid, vaardigheid, …"
                onChange={(v) => edit<typeof s>((x) => { if (!x.groups.length) x.groups.push(newSkillGroup()); x.groups[0].skills = v; x.groups.slice(1).forEach((g) => { g.skills = []; }); })} />
              <SkillPills skills={s.groups.flatMap((g) => g.skills)} show={skillIconsShown} overrides={s.iconOverrides}
                onOverride={(k, v) => edit<typeof s>((x) => { if (v === null) delete x.iconOverrides[k]; else x.iconOverrides[k] = v; })} />
            </>
          ) : (
            <>
              {s.groups.map((g, i) => (
                <SummaItemCard key={g.id} name={`skill-${i}`} title={g.name} index={i} count={s.groups.length}
                  onUp={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i - 1); })}
                  onDown={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i + 1); })}
                  onRemove={() => edit<typeof s>((x) => { x.groups.splice(i, 1); })}>
                  <div className="grid2">
                    <SummaField label={s.mode === 'levels' ? 'Niveau' : 'Categorie'}>
                      <SummaTextInput name={`skill-${i}-name`} value={g.name} onChange={(v) => edit<typeof s>((x) => { x.groups[i].name = v; })} />
                    </SummaField>
                    {s.mode === 'levels' && (
                      <SummaNumberInput label="Stippen" min={0} max={5} value={g.level} name={`skill-${i}-level`} onChange={(v) => edit<typeof s>((x) => { x.groups[i].level = v; })} />
                    )}
                  </div>
                  <SummaField label="Vaardigheden"><SummaListInput suggest name={`skill-${i}-list`} value={g.skills} placeholder="a, b, c" onChange={(v) => edit<typeof s>((x) => { x.groups[i].skills = v; })} /></SummaField>
                  <SkillPills skills={g.skills} show={skillIconsShown} overrides={s.iconOverrides}
                    onOverride={(k, v) => edit<typeof s>((x) => { if (v === null) delete x.iconOverrides[k]; else x.iconOverrides[k] = v; })} />
                </SummaItemCard>
              ))}
              <div className="btn-row">
                <AddBtn name="skill-add" onClick={() => edit<typeof s>((x) => { x.groups.push(newSkillGroup('', s.mode === 'levels' ? 1 : 0)); })}>{s.mode === 'levels' ? 'Niveau' : 'Groep'}</AddBtn>
                {s.mode === 'levels' && s.groups.length === 0 && (
                  <SummaButton onClick={() => edit<typeof s>((x) => { x.groups = SKILL_LEVEL_NAMES.map((n, i) => newSkillGroup(n, 5 - i)); })}>Standaardniveaus</SummaButton>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
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
