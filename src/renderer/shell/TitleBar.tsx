import React from 'react';
import { LOGO_MARK_PNG } from '../brand.generated';
import { Icon } from '../icons';
import { MenuItem, SelectAction, SummaMenu, SummaSelect } from '../ui';

export interface TitleBarProps {
  version: string;
  cvs: { id: string; name: string }[];
  activeId: string;
  onSelectCv: (id: string) => void;
  onNewCv: () => void;
  exportDisabled: boolean;
  exportTitle: string;
  exporting: boolean;
  onExport: () => void;
  menuItems: MenuItem[];
  updateDot: boolean;
}

/**
 * Compacte werkbalk in de titelbalk, zoals in een documentapp: links logo, naam, versie en de cv-keuze;
 * rechts één hoofdactie (Exporteer PDF) en één menu met de overige acties. De systeemknoppen (verkleinen, maximaliseren, sluiten)
 * worden door Electron over de rechterrand getekend (titleBarOverlay); lege plekken in de balk slepen het venster, bediening niet.
 */
export function TitleBar({ version, cvs, activeId, onSelectCv, onNewCv, exportDisabled, exportTitle, exporting, onExport, menuItems, updateDot }: TitleBarProps) {
  const actions: SelectAction[] = [{ key: 'new', label: 'Nieuw cv', icon: <Icon name="plus" size={14} />, onSelect: onNewCv }];
  return (
    <header className="titlebar" data-testid="titlebar">
      <div className="tb-brand">
        <img src={LOGO_MARK_PNG} alt="" width={22} height={22} draggable={false} data-testid="titlebar-logo" />
        <strong>CV Studio</strong>
        {version && <small data-testid="app-version" title={`CV Studio ${version}`}>v{version}</small>}
      </div>
      <span className="tb-sep" aria-hidden="true" />
      <SummaSelect className="tb-doc" name="version-select" label="Cv-versie" value={activeId} onChange={onSelectCv}
        options={cvs.map((c) => ({ value: c.id, label: c.name }))} actions={actions} />
      <div className="tb-actions">
        <button type="button" className="btn primary" data-testid="export-pdf" disabled={exportDisabled} title={exportTitle} onClick={onExport}>
          <Icon name="pdf" size={15} /> {exporting ? 'Bezig…' : 'Exporteer PDF'}
        </button>
        <span className="tb-menu">
          <SummaMenu name="cv-menu" label={updateDot ? 'Meer acties, er is een update beschikbaar' : 'Meer acties'} items={menuItems} />
          {updateDot && <i className="tb-dot" aria-hidden="true" />}
        </span>
      </div>
    </header>
  );
}
