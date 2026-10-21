import React from 'react';
import { CV, Photo, Section, SkillGroup } from '../../shared/model';
import { ContactIcon, ContactIconSvg } from '../icons';
import { TechCtx, TechIcon, matchTech, resolveSkillIcon } from '../techIcons';

/** Tekst met regeleinden; regels die met "-", "•" of "*" beginnen worden opsommingstekens. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`u${out.length}`}>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
      bullets = [];
    }
  };
  lines.forEach((l) => {
    const m = /^\s*[-•*]\s+(.*)$/.exec(l);
    if (m) bullets.push(m[1]);
    else {
      flush();
      if (l.trim()) out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  });
  flush();
  return out.length ? <div className={`rich ${className ?? ''}`}>{out}</div> : null;
}

export const dateRange = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(' – ');
export const cleanUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export function PhotoView({ photo, size }: { photo: Photo; size: string }) {
  const { aspect, zoom, offsetX, offsetY } = photo;
  const w = zoom * (aspect >= 1 ? aspect : 1);
  const h = zoom * (aspect >= 1 ? 1 : 1 / aspect);
  const maxX = Math.max(0, (w - 1) / 2);
  const maxY = Math.max(0, (h - 1) / 2);
  const ox = Math.max(-maxX, Math.min(maxX, offsetX));
  const oy = Math.max(-maxY, Math.min(maxY, offsetY));
  return (
    <div className={`photo ${photo.shape}`} style={{ width: size, height: size }}>
      <img
        src={photo.src}
        alt=""
        draggable={false}
        style={{
          width: `${w * 100}%`,
          height: `${h * 100}%`,
          left: `${((1 - w) / 2 + ox) * 100}%`,
          top: `${((1 - h) / 2 + oy) * 100}%`
        }}
      />
    </div>
  );
}

export interface ContactRow { key: ContactIcon; label: string; value: string; link?: string }

export function contactRows(cv: CV): ContactRow[] {
  const p = cv.personal;
  const rows: ContactRow[] = [];
  if (p.email) rows.push({ key: 'email', label: 'E-mail', value: p.email, link: `mailto:${p.email}` });
  if (p.phone) rows.push({ key: 'phone', label: 'Telefoon', value: p.phone });
  if (p.location) rows.push({ key: 'location', label: 'Locatie', value: p.location });
  if (p.birthDate) rows.push({ key: 'birth', label: 'Geboortedatum', value: p.birthDate });
  if (p.linkedin) rows.push({ key: 'linkedin', label: 'LinkedIn', value: cleanUrl(p.linkedin), link: href(p.linkedin) });
  if (p.github) rows.push({ key: 'github', label: 'GitHub', value: cleanUrl(p.github), link: href(p.github) });
  if (p.website) rows.push({ key: 'website', label: 'Website', value: cleanUrl(p.website), link: href(p.website) });
  return rows;
}

const Link = ({ value, link }: { value: string; link?: string }) =>
  link ? <a href={link} onClick={(e) => e.preventDefault()}>{value}</a> : <>{value}</>;

export function ContactList({ cv }: { cv: CV }) {
  const icons = cv.style.icons;
  return (
    <div className={`contact ${icons ? 'with-icons' : ''}`}>
      {contactRows(cv).map((r) => (
        <div className="contact-row" key={r.key}>
          {icons ? <ContactIconSvg name={r.key} /> : <span className="lbl">{r.label}</span>}
          <span className="val"><Link value={r.value} link={r.link} /></span>
        </div>
      ))}
    </div>
  );
}

export function hasContent(s: Section, cv: CV): boolean {
  switch (s.type) {
    case 'personal': return contactRows(cv).length > 0;
    case 'profile': return s.text.trim() !== '';
    case 'experience': case 'education': case 'projects': case 'languages': return s.items.length > 0;
    case 'skills': return s.groups.some((g) => g.name.trim() || g.skills.length);
    case 'custom':
      return s.mode === 'text' ? s.text.trim() !== '' : s.items.some((i) => i.text.trim() || i.value.trim());
  }
}

const Dots = ({ n, of = 5 }: { n: number; of?: number }) => (
  <span className="dots" aria-hidden="true">
    {Array.from({ length: of }, (_, i) => <i key={i} className={`dot ${i < n ? 'on' : ''}`} />)}
  </span>
);

const urlIcon = (v: string): string | null => {
  if (/github\.com/i.test(v)) return 'github';
  if (/gitlab\./i.test(v)) return 'gitlab';
  if (/linkedin\.com/i.test(v)) return 'linkedin';
  return /^https?:\/\/|^[\w-]+(\.[\w-]+)+(\/|$)/i.test(v.trim()) ? 'globe' : null;
};

/** Vaardigheden als tekst, lijst of chips; met optionele iconen (icon-first). */
function SkillList({ skills, display, iconFor }: { skills: string[]; display: 'text' | 'list' | 'chips'; iconFor: (name: string) => string | null }) {
  if (!skills.length) return null;
  const icons = skills.map(iconFor);
  const item = (sk: string, i: number) => (
    <>{icons[i] && <TechIcon id={icons[i]!} />}<span className="tn">{sk}</span></>
  );
  if (display === 'chips') return <div className="chips">{skills.map((sk, i) => <span className={`chip ${icons[i] ? 'has-icon' : ''}`} key={i}>{item(sk, i)}</span>)}</div>;
  if (display === 'list') return <ul className={`skill-ul ${icons.some(Boolean) ? 'with-icons' : ''}`}>{skills.map((sk, i) => <li key={i}>{item(sk, i)}</li>)}</ul>;
  if (icons.some(Boolean)) return <div className="tech-inline">{skills.map((sk, i) => <span className="ti" key={i}>{item(sk, i)}</span>)}</div>;
  return <div className="skill-list">{skills.join(', ')}</div>;
}

function TechChips({ tech, icons }: { tech: string; icons: boolean }) {
  const list = tech.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="chips tech-chips">
      {list.map((t, i) => {
        const id = icons ? matchTech(t) : null;
        return <span className={`chip ${id ? 'has-icon' : ''}`} key={i}>{id && <TechIcon id={id} />}<span className="tn">{t}</span></span>;
      })}
    </div>
  );
}

export function SectionBody({ s, cv }: { s: Section; cv: CV }) {
  switch (s.type) {
    case 'personal':
      return <ContactList cv={cv} />;
    case 'profile':
      return <RichText text={s.text} />;
    case 'experience':
      return (
        <>
          {s.items.map((i) => (
            <div className="item" key={i.id}>
              <div className="row">
                <div className="strong">{i.role}</div>
                <div className="dates">{dateRange(i.start, i.end)}</div>
              </div>
              {(i.company || i.location) && <div className="sub">{[i.company, i.location].filter(Boolean).join(' · ')}</div>}
              <RichText text={i.description} />
            </div>
          ))}
        </>
      );
    case 'education':
      return (
        <>
          {s.items.map((i) => (
            <div className="item" key={i.id}>
              <div className="row">
                <div className="strong">{i.degree}</div>
                <div className="dates">{dateRange(i.start, i.end)}</div>
              </div>
              {i.school && <div className="sub">{i.school}</div>}
              <RichText text={i.description} />
            </div>
          ))}
        </>
      );
    case 'projects':
      return (
        <>
          {s.items.map((i) => (
            <div className="item" key={i.id}>
              <div className="row">
                <div className="strong">{i.name}</div>
                <div className="dates">{i.period}</div>
              </div>
              {i.tech && (s.techDisplay === 'chips' ? <TechChips tech={i.tech} icons={s.techIcons} /> : <div className="sub tech">{i.tech}</div>)}
              <RichText text={i.description} />
              {i.github && <div className="proj-link">{cv.style.icons && <ContactIconSvg name="github" />}<Link value={cleanUrl(i.github)} link={href(i.github)} /></div>}
            </div>
          ))}
        </>
      );
    case 'skills': {
      const iconFor = (n: string) => resolveSkillIcon(n, s.icons, s.iconOverrides);
      if (s.mode === 'flat') {
        return <SkillList skills={s.groups.flatMap((g) => g.skills)} display={s.display} iconFor={iconFor} />;
      }
      const groups: SkillGroup[] = s.groups.filter((g) => g.name.trim() || g.skills.length);
      return (
        <>
          {groups.map((g) => (
            <div className="skill-group" key={g.id}>
              {(g.name || (s.mode === 'levels' && g.level > 0)) && (
                <div className="skill-name">
                  <span>{g.name}</span>
                  {s.mode === 'levels' && g.level > 0 && <Dots n={g.level} />}
                </div>
              )}
              <SkillList skills={g.skills} display={s.display} iconFor={iconFor} />
            </div>
          ))}
        </>
      );
    }
    case 'languages':
      return (
        <div className="lang-list">
          {s.items.filter((i) => i.name.trim()).map((i) => (
            <div className="lang" key={i.id}>
              <span className="strong">{i.name}</span>
              {s.display === 'dots' ? (i.rating > 0 ? <Dots n={i.rating} /> : null) : i.level && <span className="level"> {i.level}</span>}
            </div>
          ))}
        </div>
      );
    case 'custom':
      if (s.mode === 'text') return <RichText text={s.text} />;
      if (s.mode === 'keyvalue') {
        return (
          <div className="kv-list">
            {s.items.filter((i) => i.text.trim() || i.value.trim()).map((i) => (
              <div className="kv" key={i.id}>
                {s.icons && (() => { const id = matchTech(i.text) ?? urlIcon(i.value) ?? urlIcon(i.text); return id ? <TechIcon id={id} /> : null; })()}
                {i.text && <span className="k">{i.text}</span>}
                {i.value && <span className="v">{i.value}</span>}
              </div>
            ))}
          </div>
        );
      }
      return (
        <ul className={`rich custom-list ${s.icons ? 'with-icons' : ''}`}>
          {s.items.filter((i) => i.text.trim()).map((i) => {
            const id = s.icons ? matchTech(i.text) ?? urlIcon(i.text) : null;
            return <li key={i.id}>{id && <TechIcon id={id} />}<span className="tn">{i.text}</span></li>;
          })}
        </ul>
      );
  }
}

/** Kleurmodus voor tech-iconen van dit onderdeel: eigen keuze, anders de globale stijl; plus plaatsing en achtergrond. */
function techCtx(s: Section, cv: CV) {
  const own = s.type === 'skills' || s.type === 'projects' || s.type === 'custom' ? s.techColor : 'inherit';
  const zone = cv.template === 'minimal' ? 'primary' : s.zone;
  const onColor = cv.template === 'sidebar' && zone === 'supplementary';
  return { mode: own === 'inherit' ? cv.style.techColorMode : own, zone, bg: onColor ? cv.style.sidebarBg : '#ffffff' } as const;
}

export function SectionBlock({ s, cv, onPick }: { s: Section; cv: CV; onPick?: (id: string) => void }) {
  if (!s.visible || !hasContent(s, cv)) return null;
  return (
    <TechCtx.Provider value={techCtx(s, cv)}>
      <section className={`sec sec-${s.type}`} data-sec={s.id} data-title={s.title} onClick={() => onPick?.(s.id)}>
        <h2>{s.title}</h2>
        <SectionBody s={s} cv={cv} />
      </section>
    </TechCtx.Provider>
  );
}
