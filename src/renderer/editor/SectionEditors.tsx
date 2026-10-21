import React from 'react';
import { CV, Section, SKILL_LEVEL_NAMES, newItem, newSkillGroup, uid } from '../../shared/model';
import { Icon } from '../icons';
import { Btn, Field, ItemShell, ListInput, NumberField, Segmented, TextArea, TextInput, move } from './fields';
import { PhotoEditor } from './PhotoEditor';

type Upd = (fn: (cv: CV) => void) => void;

function useSec(update: Upd, id: string) {
  return <S extends Section>(fn: (s: S) => void) =>
    update((cv) => { const s = cv.sections.find((x) => x.id === id); if (s) fn(s as S); });
}

const AddBtn = ({ children, onClick, name }: { children: React.ReactNode; onClick: () => void; name?: string }) => (
  <Btn name={name} onClick={onClick}><Icon name="plus" size={14} /> {children}</Btn>
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
            <Field label="Naam"><TextInput name="p-fullName" value={P.fullName} onChange={setP('fullName')} /></Field>
            <Field label="Functietitel"><TextInput name="p-title" value={P.title} onChange={setP('title')} /></Field>
            <Field label="E-mail"><TextInput name="p-email" value={P.email} onChange={setP('email')} type="email" /></Field>
            <Field label="Telefoon"><TextInput name="p-phone" value={P.phone} onChange={setP('phone')} /></Field>
            <Field label="Locatie"><TextInput name="p-location" value={P.location} onChange={setP('location')} /></Field>
            <Field label="Geboortedatum"><TextInput name="p-birthDate" value={P.birthDate} onChange={setP('birthDate')} /></Field>
            <Field label="LinkedIn"><TextInput name="p-linkedin" value={P.linkedin} onChange={setP('linkedin')} /></Field>
            <Field label="GitHub"><TextInput name="p-github" value={P.github} onChange={setP('github')} /></Field>
            <Field label="Website"><TextInput name="p-website" value={P.website} onChange={setP('website')} /></Field>
          </div>
          <div className="field-label">Foto</div>
          <PhotoEditor cv={cv} update={update} />
        </div>
      );
    case 'profile':
      return <TextArea name="profile-text" rows={4} value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })} placeholder="Tekst" />;
    case 'experience':
      return (
        <div className="stack">
          {s.items.map((it, i) => (
            <ItemShell key={it.id} name={`exp-${i}`} title={it.role || it.company} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <Field label="Functie"><TextInput name={`exp-${i}-role`} value={it.role} onChange={(v) => edit<typeof s>((x) => { x.items[i].role = v; })} /></Field>
                <Field label="Werkgever"><TextInput name={`exp-${i}-company`} value={it.company} onChange={(v) => edit<typeof s>((x) => { x.items[i].company = v; })} /></Field>
                <Field label="Locatie"><TextInput value={it.location} onChange={(v) => edit<typeof s>((x) => { x.items[i].location = v; })} /></Field>
                <div className="grid2">
                  <Field label="Start"><TextInput value={it.start} placeholder="mm/jjjj" onChange={(v) => edit<typeof s>((x) => { x.items[i].start = v; })} /></Field>
                  <Field label="Einde"><TextInput value={it.end} placeholder="heden" onChange={(v) => edit<typeof s>((x) => { x.items[i].end = v; })} /></Field>
                </div>
              </div>
              <TextArea name={`exp-${i}-desc`} placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </ItemShell>
          ))}
          <AddBtn name="exp-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('experience')); })}>Werkervaring</AddBtn>
        </div>
      );
    case 'education':
      return (
        <div className="stack">
          {s.items.map((it, i) => (
            <ItemShell key={it.id} name={`edu-${i}`} title={it.degree || it.school} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <Field label="Opleiding"><TextInput name={`edu-${i}-degree`} value={it.degree} onChange={(v) => edit<typeof s>((x) => { x.items[i].degree = v; })} /></Field>
                <Field label="Instelling"><TextInput value={it.school} onChange={(v) => edit<typeof s>((x) => { x.items[i].school = v; })} /></Field>
                <Field label="Start"><TextInput value={it.start} onChange={(v) => edit<typeof s>((x) => { x.items[i].start = v; })} /></Field>
                <Field label="Einde"><TextInput value={it.end} placeholder="heden" onChange={(v) => edit<typeof s>((x) => { x.items[i].end = v; })} /></Field>
              </div>
              <TextArea placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </ItemShell>
          ))}
          <AddBtn name="edu-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('education')); })}>Opleiding</AddBtn>
        </div>
      );
    case 'projects':
      return (
        <div className="stack">
          {s.items.map((it, i) => (
            <ItemShell key={it.id} name={`proj-${i}`} title={it.name} index={i} count={s.items.length}
              onUp={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>
              <div className="grid2">
                <Field label="Naam"><TextInput name={`proj-${i}-name`} value={it.name} onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} /></Field>
                <Field label="Periode"><TextInput value={it.period} onChange={(v) => edit<typeof s>((x) => { x.items[i].period = v; })} /></Field>
                <Field label="Technologieën"><TextInput value={it.tech} onChange={(v) => edit<typeof s>((x) => { x.items[i].tech = v; })} /></Field>
                <Field label="GitHub"><TextInput value={it.github} onChange={(v) => edit<typeof s>((x) => { x.items[i].github = v; })} /></Field>
              </div>
              <TextArea name={`proj-${i}-desc`} placeholder={DESC_PH} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
            </ItemShell>
          ))}
          <AddBtn name="proj-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('projects')); })}>Project</AddBtn>
        </div>
      );
    case 'skills':
      return (
        <div className="stack">
          <div className="inline-controls">
            <Segmented name="skill-mode" value={s.mode} onChange={(m) => edit<typeof s>((x) => {
              x.mode = m;
              if (m === 'levels' && x.groups.length === 0) x.groups = SKILL_LEVEL_NAMES.map((n, i) => newSkillGroup(n, 5 - i));
              if (m === 'flat' && x.groups.length === 0) x.groups = [newSkillGroup()];
            })} options={[{ value: 'flat', label: 'Lijst' }, { value: 'grouped', label: 'Groepen' }, { value: 'levels', label: 'Niveaus' }]} />
            <Segmented name="skill-display" value={s.display} onChange={(d) => edit<typeof s>((x) => { x.display = d; })}
              options={[{ value: 'text', label: 'Tekst' }, { value: 'list', label: 'Lijst' }, { value: 'chips', label: 'Chips' }]} />
          </div>
          {s.mode === 'flat' ? (
            <ListInput value={s.groups.flatMap((g) => g.skills)} placeholder="Vaardigheid, vaardigheid, …"
              onChange={(v) => edit<typeof s>((x) => { if (!x.groups.length) x.groups.push(newSkillGroup()); x.groups[0].skills = v; x.groups.slice(1).forEach((g) => { g.skills = []; }); })} />
          ) : (
            <>
              {s.groups.map((g, i) => (
                <ItemShell key={g.id} name={`skill-${i}`} title={g.name} index={i} count={s.groups.length}
                  onUp={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i - 1); })}
                  onDown={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i + 1); })}
                  onRemove={() => edit<typeof s>((x) => { x.groups.splice(i, 1); })}>
                  <div className="grid2">
                    <Field label={s.mode === 'levels' ? 'Niveau' : 'Categorie'}>
                      <TextInput name={`skill-${i}-name`} value={g.name} onChange={(v) => edit<typeof s>((x) => { x.groups[i].name = v; })} />
                    </Field>
                    {s.mode === 'levels' && (
                      <NumberField label="Stippen" min={0} max={5} value={g.level} name={`skill-${i}-level`} onChange={(v) => edit<typeof s>((x) => { x.groups[i].level = v; })} />
                    )}
                  </div>
                  <Field label="Vaardigheden"><ListInput value={g.skills} placeholder="a, b, c" onChange={(v) => edit<typeof s>((x) => { x.groups[i].skills = v; })} /></Field>
                </ItemShell>
              ))}
              <div className="btn-row">
                <AddBtn name="skill-add" onClick={() => edit<typeof s>((x) => { x.groups.push(newSkillGroup('', s.mode === 'levels' ? 1 : 0)); })}>{s.mode === 'levels' ? 'Niveau' : 'Groep'}</AddBtn>
                {s.mode === 'levels' && s.groups.length === 0 && (
                  <Btn onClick={() => edit<typeof s>((x) => { x.groups = SKILL_LEVEL_NAMES.map((n, i) => newSkillGroup(n, 5 - i)); })}>Standaardniveaus</Btn>
                )}
              </div>
            </>
          )}
        </div>
      );
    case 'languages':
      return (
        <div className="stack">
          <Segmented name="lang-display" value={s.display} onChange={(d) => edit<typeof s>((x) => { x.display = d; })}
            options={[{ value: 'text', label: 'Niveau als tekst' }, { value: 'dots', label: 'Stippen' }]} />
          {s.items.map((it, i) => (
            <div className="lang-row" key={it.id}>
              <TextInput name={`lang-${i}-name`} value={it.name} placeholder="Taal" onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} />
              {s.display === 'dots' ? (
                <div className="mini-num"><NumberField label="" min={0} max={5} value={it.rating} name={`lang-${i}-rating`} onChange={(v) => edit<typeof s>((x) => { x.items[i].rating = v; })} /></div>
              ) : (
                <TextInput value={it.level} placeholder="Niveau" onChange={(v) => edit<typeof s>((x) => { x.items[i].level = v; })} />
              )}
              <Btn small kind="ghost" icon title="Omhoog" disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}><Icon name="up" size={14} /></Btn>
              <Btn small kind="ghost" icon title="Omlaag" disabled={i === s.items.length - 1} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}><Icon name="down" size={14} /></Btn>
              <Btn small kind="ghost" icon title="Verwijderen" onClick={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}><Icon name="trash" size={14} /></Btn>
            </div>
          ))}
          <AddBtn name="lang-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('languages')); })}>Taal</AddBtn>
        </div>
      );
    case 'custom':
      return (
        <div className="stack">
          <Segmented name="custom-mode" value={s.mode} onChange={(m) => edit<typeof s>((x) => { x.mode = m; })}
            options={[{ value: 'text', label: 'Tekst' }, { value: 'list', label: 'Lijst' }, { value: 'keyvalue', label: 'Label + waarde' }]} />
          {s.mode === 'text' ? (
            <TextArea name="custom-text" placeholder="Tekst" value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })} />
          ) : (
            <>
              {s.items.map((it, i) => (
                <div className="lang-row" key={it.id}>
                  <TextInput name={`custom-${i}-text`} value={it.text} placeholder={s.mode === 'keyvalue' ? 'Label' : 'Item'} onChange={(v) => edit<typeof s>((x) => { x.items[i].text = v; })} />
                  {s.mode === 'keyvalue' && <TextInput value={it.value} placeholder="Waarde" onChange={(v) => edit<typeof s>((x) => { x.items[i].value = v; })} />}
                  <Btn small kind="ghost" icon title="Omhoog" disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}><Icon name="up" size={14} /></Btn>
                  <Btn small kind="ghost" icon title="Omlaag" disabled={i === s.items.length - 1} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}><Icon name="down" size={14} /></Btn>
                  <Btn small kind="ghost" icon title="Verwijderen" onClick={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}><Icon name="trash" size={14} /></Btn>
                </div>
              ))}
              <AddBtn name="custom-add" onClick={() => edit<typeof s>((x) => { x.items.push({ id: uid(), text: '', value: '' }); })}>Item</AddBtn>
            </>
          )}
        </div>
      );
  }
}
