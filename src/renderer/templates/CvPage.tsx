import React, { forwardRef } from 'react';
import { CV, FONTS, Section } from '../../shared/model';
import { readableOn } from '../../shared/color';
import { ContactList, PhotoView, SectionBlock, contactRows } from './blocks';

interface Props {
  cv: CV;
  placeholders?: boolean; // alleen in de preview, nooit in de PDF
  onPick?: (id: string) => void;
}

export const CvPage = forwardRef<HTMLDivElement, Props>(function CvPage({ cv, placeholders, onPick }, ref) {
  const st = cv.style;
  const font = FONTS.find((f) => f.id === st.font)?.css ?? FONTS[0].css;
  const sideFg = readableOn(st.sidebarBg);
  const style = {
    '--accent': st.accent,
    '--side-bg': st.sidebarBg,
    '--side-fg': sideFg,
    '--heading': st.headingColor || st.accent,
    '--text': st.textColor || '#1f2933',
    '--divider': st.dividerColor || '#d3d9e0',
    '--fs': `${st.fontSize}pt`,
    '--lh': st.lineHeight,
    '--font': font,
    '--sec-gap': `${st.sectionGap}mm`,
    '--item-gap': `${st.itemGap}mm`,
    '--mar': `${st.margin}mm`,
    '--side-w': `${st.sidebarWidth}mm`,
    '--photo': `${st.photoSize}mm`
  } as React.CSSProperties;
  const cls = `cv-page t-${cv.template} hs-${st.headingStyle} il-${st.itemLayout}`;

  const name = cv.personal.fullName.trim();
  const title = cv.personal.title.trim();
  const photo = cv.photo && cv.photo.visible ? cv.photo : null;
  const personal = cv.sections.find((s) => s.type === 'personal');
  const showContact = !!personal?.visible;
  const pickPersonal = () => onPick?.(personal?.id ?? '');

  const nameBlock = (
    <header className="head" data-sec="header" data-title="Naam en functie" onClick={pickPersonal}>
      <h1 className={!name && placeholders ? 'ph' : ''}>{name || (placeholders ? 'Jouw naam' : '')}</h1>
      {(title || placeholders) && <div className={`job-title ${!title ? 'ph' : ''}`}>{title || 'Functietitel'}</div>}
    </header>
  );
  const blocks = (list: Section[]) => list.map((s) => <SectionBlock key={s.id} s={s} cv={cv} onPick={onPick} />);
  const visible = cv.sections.filter((s) => s.visible);

  // ---------- Minimal: één kolom ----------
  if (cv.template === 'minimal') {
    const rows = showContact ? contactRows(cv) : [];
    return (
      <div className={cls} style={style} ref={ref}>
        <div className="min-top">
          <div className="min-id">
            {nameBlock}
            {rows.length > 0 && (
              <div className="min-contact" data-sec={personal!.id} data-title={personal!.title} onClick={pickPersonal}>
                <ContactList cv={cv} />
              </div>
            )}
          </div>
          {photo && <PhotoView photo={photo} size="26mm" />}
        </div>
        <div className="col-main" data-region="primary">{blocks(visible.filter((s) => s.type !== 'personal'))}</div>
      </div>
    );
  }

  // ---------- Header: brede kopbalk ----------
  if (cv.template === 'header') {
    const rest = visible.filter((s) => s.type !== 'personal');
    const side = rest.filter((s) => s.zone === 'supplementary');
    const main = rest.filter((s) => s.zone === 'primary');
    return (
      <div className={cls} style={style} ref={ref}>
        <header className="band" data-region="header" data-sec="header" data-title="Kopbalk" onClick={pickPersonal}>
          {photo && <PhotoView photo={photo} size="var(--photo)" />}
          <div className="band-id">
            <h1 className={!name && placeholders ? 'ph' : ''}>{name || (placeholders ? 'Jouw naam' : '')}</h1>
            {(title || placeholders) && <div className={`job-title ${!title ? 'ph' : ''}`}>{title || 'Functietitel'}</div>}
          </div>
          {showContact && contactRows(cv).length > 0 && <div className="band-contact"><ContactList cv={cv} /></div>}
        </header>
        <div className={`hbody ${side.length ? '' : 'no-side'}`}>
          {side.length > 0 && <aside className="col-side" data-region="supplementary">{blocks(side)}</aside>}
          <main className="col-main" data-region="primary">{blocks(main)}</main>
        </div>
      </div>
    );
  }

  // ---------- Sidebar: sterke zijbalk links ----------
  const side = visible.filter((s) => s.zone === 'supplementary');
  const main = visible.filter((s) => s.zone === 'primary');
  return (
    <div className={cls} style={style} ref={ref}>
      <aside className="col-side side" data-region="supplementary">
        {photo && <div className="side-photo" data-sec="photo" data-title="Foto"><PhotoView photo={photo} size="var(--photo)" /></div>}
        {st.nameInSidebar && nameBlock}
        {blocks(side)}
      </aside>
      <main className="col-main main" data-region="primary">
        {!st.nameInSidebar && nameBlock}
        {blocks(main)}
      </main>
    </div>
  );
});
