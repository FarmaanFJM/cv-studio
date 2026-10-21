import React from 'react';
import { CV, Photo, Section, SkillGroup } from '../../shared/model';
import { ContactIcon, ContactIconSvg } from '../icons';

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

function SkillList({ skills, display }: { skills: string[]; display: 'text' | 'list' | 'chips' }) {
  if (!skills.length) return null;
  if (display === 'chips') return <div className="chips">{skills.map((s, i) => <span className="chip" key={i}>{s}</span>)}</div>;
  if (display === 'list') return <ul className="skill-ul">{skills.map((s, i) => <li key={i}>{s}</li>)}</ul>;
  return <div className="skill-list">{skills.join(', ')}</div>;
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
              {i.tech && <div className="sub tech">{i.tech}</div>}
              <RichText text={i.description} />
              {i.github && <div className="proj-link"><Link value={cleanUrl(i.github)} link={href(i.github)} /></div>}
            </div>
          ))}
        </>
      );
    case 'skills': {
      if (s.mode === 'flat') {
        return <SkillList skills={s.groups.flatMap((g) => g.skills)} display={s.display} />;
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
              <SkillList skills={g.skills} display={s.display} />
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
                {i.text && <span className="k">{i.text}</span>}
                {i.value && <span className="v">{i.value}</span>}
              </div>
            ))}
          </div>
        );
      }
      return (
        <ul className="rich custom-list">
          {s.items.filter((i) => i.text.trim()).map((i) => <li key={i.id}>{i.text}</li>)}
        </ul>
      );
  }
}

export function SectionBlock({ s, cv, onPick }: { s: Section; cv: CV; onPick?: (id: string) => void }) {
  if (!s.visible || !hasContent(s, cv)) return null;
  return (
    <section className={`sec sec-${s.type}`} data-sec={s.id} data-title={s.title} onClick={() => onPick?.(s.id)}>
      <h2>{s.title}</h2>
      <SectionBody s={s} cv={cv} />
    </section>
  );
}
