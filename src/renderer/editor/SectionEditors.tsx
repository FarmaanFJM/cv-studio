import React from 'react';
import { CV, Section, newItem, uid } from '../../shared/model';
import { Btn, Field, ItemShell, ListInput, TextArea, TextInput, move } from './fields';
import { PhotoEditor } from './PhotoEditor';

type Upd = (fn: (cv: CV) => void) => void;

/** Past een bepaald onderdeel (op id) aan. */
function useSec(update: Upd, id: string) {
  return <S extends Section>(fn: (s: S) => void) =>
    update((cv) => {
      const s = cv.sections.find((x) => x.id === id);
      if (s) fn(s as S);
    });
}

const AddBtn = ({ children, onClick, name }: { children: React.ReactNode; onClick: () => void; name?: string }) => (
  <Btn name={name} onClick={onClick}>+ {children}</Btn>
);

export function SectionEditor({ s, cv, update }: { s: Section; cv: CV; update: Upd }) {
  const edit = useSec(update, s.id);
  const P = cv.personal;
  const setP = (k: keyof typeof P) => (v: string) => update((c) => { c.personal[k] = v; });

  switch (s.type) {
    case 'personal':
      return (
        <div className="stack">
          <div className="grid2">
            <Field label="Volledige naam"><TextInput name="p-fullName" value={P.fullName} onChange={setP('fullName')} placeholder="Voornaam Achternaam" /></Field>
            <Field label="Functietitel"><TextInput name="p-title" value={P.title} onChange={setP('title')} placeholder="bijv. Stagiair Software Engineer" /></Field>
            <Field label="E-mail"><TextInput name="p-email" value={P.email} onChange={setP('email')} type="email" /></Field>
            <Field label="Telefoon"><TextInput name="p-phone" value={P.phone} onChange={setP('phone')} /></Field>
            <Field label="Locatie"><TextInput name="p-location" value={P.location} onChange={setP('location')} placeholder="Stad" /></Field>
            <Field label="LinkedIn"><TextInput name="p-linkedin" value={P.linkedin} onChange={setP('linkedin')} placeholder="linkedin.com/in/…" /></Field>
            <Field label="GitHub"><TextInput name="p-github" value={P.github} onChange={setP('github')} placeholder="github.com/…" /></Field>
            <Field label="Website (optioneel)"><TextInput name="p-website" value={P.website} onChange={setP('website')} /></Field>
          </div>
          <div className="field-label">Profielfoto</div>
          <PhotoEditor cv={cv} update={update} />
        </div>
      );
    case 'profile':
      return (
        <Field label="Korte introductie">
          <TextArea name="profile-text" rows={4} value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })}
            placeholder="Twee tot vier zinnen over jou en waar je naar op zoek bent." />
        </Field>
      );
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
                  <Field label="Einde"><TextInput value={it.end} placeholder="mm/jjjj of heden" onChange={(v) => edit<typeof s>((x) => { x.items[i].end = v; })} /></Field>
                </div>
              </div>
              <Field label="Beschrijving" hint="Begin een regel met - voor een opsommingsteken.">
                <TextArea name={`exp-${i}-desc`} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
              </Field>
            </ItemShell>
          ))}
          <AddBtn name="exp-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('experience')); })}>Werkervaring toevoegen</AddBtn>
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
                <Field label="Onderwijsinstelling"><TextInput value={it.school} onChange={(v) => edit<typeof s>((x) => { x.items[i].school = v; })} /></Field>
                <Field label="Start"><TextInput value={it.start} placeholder="jjjj" onChange={(v) => edit<typeof s>((x) => { x.items[i].start = v; })} /></Field>
                <Field label="Einde"><TextInput value={it.end} placeholder="jjjj of heden" onChange={(v) => edit<typeof s>((x) => { x.items[i].end = v; })} /></Field>
              </div>
              <Field label="Beschrijving"><TextArea value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} /></Field>
            </ItemShell>
          ))}
          <AddBtn name="edu-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('education')); })}>Opleiding toevoegen</AddBtn>
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
                <Field label="Projectnaam"><TextInput name={`proj-${i}-name`} value={it.name} onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} /></Field>
                <Field label="Periode"><TextInput value={it.period} placeholder="bijv. 2024" onChange={(v) => edit<typeof s>((x) => { x.items[i].period = v; })} /></Field>
                <Field label="Technologieën"><TextInput value={it.tech} placeholder="bijv. React, Node.js" onChange={(v) => edit<typeof s>((x) => { x.items[i].tech = v; })} /></Field>
                <Field label="GitHub-link (optioneel)"><TextInput value={it.github} onChange={(v) => edit<typeof s>((x) => { x.items[i].github = v; })} /></Field>
              </div>
              <Field label="Omschrijving" hint="Begin een regel met - voor een opsommingsteken.">
                <TextArea name={`proj-${i}-desc`} value={it.description} onChange={(v) => edit<typeof s>((x) => { x.items[i].description = v; })} />
              </Field>
            </ItemShell>
          ))}
          <AddBtn name="proj-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('projects')); })}>Project toevoegen</AddBtn>
        </div>
      );
    case 'skills':
      return (
        <div className="stack">
          {s.groups.map((g, i) => (
            <ItemShell key={g.id} name={`skill-${i}`} title={g.name} index={i} count={s.groups.length}
              onUp={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i - 1); })}
              onDown={() => edit<typeof s>((x) => { x.groups = move(x.groups, i, i + 1); })}
              onRemove={() => edit<typeof s>((x) => { x.groups.splice(i, 1); })}>
              <Field label="Categorie"><TextInput name={`skill-${i}-name`} value={g.name} placeholder="bijv. Programmeren" onChange={(v) => edit<typeof s>((x) => { x.groups[i].name = v; })} /></Field>
              <Field label="Vaardigheden" hint="Scheid met komma's.">
                <ListInput value={g.skills} onChange={(v) => edit<typeof s>((x) => { x.groups[i].skills = v; })} />
              </Field>
            </ItemShell>
          ))}
          <AddBtn name="skill-add" onClick={() => edit<typeof s>((x) => { x.groups.push({ id: uid(), name: '', skills: [] }); })}>Categorie toevoegen</AddBtn>
        </div>
      );
    case 'languages':
      return (
        <div className="stack">
          {s.items.map((it, i) => (
            <div className="lang-row" key={it.id}>
              <TextInput name={`lang-${i}-name`} value={it.name} placeholder="Taal" onChange={(v) => edit<typeof s>((x) => { x.items[i].name = v; })} />
              <TextInput value={it.level} placeholder="Niveau (optioneel)" onChange={(v) => edit<typeof s>((x) => { x.items[i].level = v; })} />
              <Btn small kind="ghost" disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}>↑</Btn>
              <Btn small kind="ghost" disabled={i === s.items.length - 1} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}>↓</Btn>
              <Btn small kind="danger" onClick={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>✕</Btn>
            </div>
          ))}
          <AddBtn name="lang-add" onClick={() => edit<typeof s>((x) => { x.items.push(newItem('languages')); })}>Taal toevoegen</AddBtn>
        </div>
      );
    case 'custom':
      return (
        <div className="stack">
          <div className="seg">
            <button type="button" className={s.mode === 'text' ? 'on' : ''} onClick={() => edit<typeof s>((x) => { x.mode = 'text'; })}>Tekst</button>
            <button type="button" className={s.mode === 'list' ? 'on' : ''} onClick={() => edit<typeof s>((x) => { x.mode = 'list'; })}>Lijst</button>
          </div>
          {s.mode === 'text' ? (
            <Field label="Tekst"><TextArea name="custom-text" value={s.text} onChange={(v) => edit<typeof s>((x) => { x.text = v; })} /></Field>
          ) : (
            <>
              {s.items.map((it, i) => (
                <div className="lang-row" key={it.id}>
                  <TextInput value={it.text} placeholder="Lijstitem" onChange={(v) => edit<typeof s>((x) => { x.items[i].text = v; })} />
                  <Btn small kind="ghost" disabled={i === 0} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i - 1); })}>↑</Btn>
                  <Btn small kind="ghost" disabled={i === s.items.length - 1} onClick={() => edit<typeof s>((x) => { x.items = move(x.items, i, i + 1); })}>↓</Btn>
                  <Btn small kind="danger" onClick={() => edit<typeof s>((x) => { x.items.splice(i, 1); })}>✕</Btn>
                </div>
              ))}
              <AddBtn onClick={() => edit<typeof s>((x) => { x.items.push({ id: uid(), text: '' }); })}>Item toevoegen</AddBtn>
            </>
          )}
        </div>
      );
  }
}
