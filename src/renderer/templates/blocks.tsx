import React from 'react';
import { CV, Photo, Section } from '../../shared/model';

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

export function contactRows(cv: CV): { label: string; value: string; link?: string }[] {
  const p = cv.personal;
  const rows: { label: string; value: string; link?: string }[] = [];
  if (p.email) rows.push({ label: 'E-mail', value: p.email, link: `mailto:${p.email}` });
  if (p.phone) rows.push({ label: 'Telefoon', value: p.phone });
  if (p.location) rows.push({ label: 'Locatie', value: p.location });
  if (p.linkedin) rows.push({ label: 'LinkedIn', value: cleanUrl(p.linkedin), link: href(p.linkedin) });
  if (p.github) rows.push({ label: 'GitHub', value: cleanUrl(p.github), link: href(p.github) });
  if (p.website) rows.push({ label: 'Website', value: cleanUrl(p.website), link: href(p.website) });
  return rows;
}

const Link = ({ value, link }: { value: string; link?: string }) =>
  link ? <a href={link} onClick={(e) => e.preventDefault()}>{value}</a> : <>{value}</>;

/** Geeft true als een onderdeel inhoud heeft; lege onderdelen worden niet getoond (geen losse koppen). */
export function hasContent(s: Section, cv: CV): boolean {
  switch (s.type) {
    case 'personal': return contactRows(cv).length > 0;
    case 'profile': return s.text.trim() !== '';
    case 'experience': case 'education': case 'projects': case 'languages': return s.items.length > 0;
    case 'skills': return s.groups.some((g) => g.name.trim() || g.skills.length);
    case 'custom': return s.mode === 'text' ? s.text.trim() !== '' : s.items.some((i) => i.text.trim());
  }
}

interface Ctx { cv: CV; variant: 'side' | 'main' | 'minimal' }

/** Inhoud van een onderdeel (zonder kop). */
export function SectionBody({ s, cv, variant }: { s: Section } & Ctx) {
  const inline = variant === 'minimal';
  switch (s.type) {
    case 'personal':
      return (
        <div className="contact">
          {contactRows(cv).map((r) => (
            <div className="contact-row" key={r.label}>
              <span className="lbl">{r.label}</span>
              <span className="val"><Link value={r.value} link={r.link} /></span>
            </div>
          ))}
        </div>
      );
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
              {i.github && (
                <div className="proj-link"><Link value={cleanUrl(i.github)} link={href(i.github)} /></div>
              )}
            </div>
          ))}
        </>
      );
    case 'skills':
      return (
        <>
          {s.groups.filter((g) => g.name.trim() || g.skills.length).map((g) =>
            inline ? (
              <div className="skill-line" key={g.id}>
                {g.name && <span className="strong">{g.name}: </span>}
                {g.skills.join(', ')}
              </div>
            ) : (
              <div className="skill-group" key={g.id}>
                {g.name && <div className="skill-name">{g.name}</div>}
                <div className="skill-list">{g.skills.join(', ')}</div>
              </div>
            )
          )}
        </>
      );
    case 'languages':
      return (
        <div className={inline ? 'lang-inline' : 'lang-list'}>
          {s.items.map((i) => (
            <div className="lang" key={i.id}>
              <span className="strong">{i.name}</span>
              {i.level && <span className="level"> {inline ? `(${i.level})` : i.level}</span>}
            </div>
          ))}
        </div>
      );
    case 'custom':
      return s.mode === 'text' ? (
        <RichText text={s.text} />
      ) : (
        <ul className="rich custom-list">
          {s.items.filter((i) => i.text.trim()).map((i) => <li key={i.id}>{i.text}</li>)}
        </ul>
      );
  }
}

export function SectionBlock({ s, cv, variant, onPick }: { s: Section; onPick?: (id: string) => void } & Ctx) {
  if (!s.visible || !hasContent(s, cv)) return null;
  return (
    <section className={`sec sec-${s.type}`} data-sec={s.id} data-title={s.title} onClick={() => onPick?.(s.id)}>
      <h2>{s.title}</h2>
      <SectionBody s={s} cv={cv} variant={variant} />
    </section>
  );
}
