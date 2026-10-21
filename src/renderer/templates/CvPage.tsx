import React, { forwardRef } from 'react';
import { CV, FONTS } from '../../shared/model';
import { SPACING } from '../layout';
import { PhotoView, SectionBlock, contactRows } from './blocks';

interface Props {
  cv: CV;
  placeholders?: boolean; // alleen in de preview, nooit in de PDF
  onPick?: (id: string) => void;
}

const SIDE_TYPES = new Set(['personal', 'skills', 'languages']);

export const CvPage = forwardRef<HTMLDivElement, Props>(function CvPage({ cv, placeholders, onPick }, ref) {
  const sp = SPACING[cv.style.spacing];
  const font = FONTS.find((f) => f.id === cv.style.font)?.css ?? FONTS[0].css;
  const style = {
    '--accent': cv.style.accent,
    '--fs': `${cv.style.fontSize}pt`,
    '--font': font,
    '--sec-gap': `${sp.sec}mm`,
    '--item-gap': `${sp.item}mm`,
    '--mar': `${sp.mar}mm`
  } as React.CSSProperties;

  const name = cv.personal.fullName.trim();
  const title = cv.personal.title.trim();
  const photo = cv.photo && cv.photo.visible ? cv.photo : null;
  const personalSec = cv.sections.find((s) => s.type === 'personal');
  const showContact = personalSec?.visible !== false;

  const header = (
    <header className="head" data-sec="header" data-title="Naam en functie" onClick={() => onPick?.(personalSec?.id ?? '')}>
      <h1 className={!name && placeholders ? 'ph' : ''}>{name || (placeholders ? 'Jouw naam' : '')}</h1>
      {(title || placeholders) && <div className={`job-title ${!title ? 'ph' : ''}`}>{title || 'Functietitel'}</div>}
    </header>
  );

  if (cv.template === 'minimal') {
    const rows = showContact ? contactRows(cv) : [];
    return (
      <div className="cv-page t-minimal" style={style} ref={ref}>
        <div className="min-top">
          <div className="min-id">
            {header}
            {rows.length > 0 && (
              <div className="min-contact" data-sec={personalSec?.id} data-title={personalSec?.title} onClick={() => onPick?.(personalSec!.id)}>
                {rows.map((r, i) => (
                  <span key={r.label}>
                    {i > 0 && <span className="sep"> | </span>}
                    {r.link ? <a href={r.link} onClick={(e) => e.preventDefault()}>{r.value}</a> : r.value}
                  </span>
                ))}
              </div>
            )}
          </div>
          {photo && <PhotoView photo={photo} size="26mm" />}
        </div>
        {cv.sections.filter((s) => s.type !== 'personal').map((s) => (
          <SectionBlock key={s.id} s={s} cv={cv} variant="minimal" onPick={onPick} />
        ))}
      </div>
    );
  }

  const side = cv.sections.filter((s) => SIDE_TYPES.has(s.type) && (s.type !== 'personal' || showContact));
  const main = cv.sections.filter((s) => !SIDE_TYPES.has(s.type));
  return (
    <div className="cv-page t-sidebar" style={style} ref={ref}>
      <aside className="side">
        {photo && <div className="side-photo" data-sec="photo" data-title="Foto"><PhotoView photo={photo} size="40mm" /></div>}
        {side.map((s) => <SectionBlock key={s.id} s={s} cv={cv} variant="side" onPick={onPick} />)}
      </aside>
      <main className="main">
        {header}
        {main.map((s) => <SectionBlock key={s.id} s={s} cv={cv} variant="main" onPick={onPick} />)}
      </main>
    </div>
  );
});
