import React from 'react';
import { LOGO_MARK_PNG } from '../brand.generated';
import { Icon } from '../icons';
import { SummaTooltip } from '../ui';

/**
 * Compacte titelbalk in het ontwerp van de app. De systeemknoppen (verkleinen, maximaliseren, sluiten) worden door Electron over de
 * rechterkant van deze balk getekend (titleBarOverlay); de rest van de balk is sleepbaar, interactieve onderdelen niet.
 */
export function TitleBar({ cvName, version, updateDot, onAbout }: { cvName: string; version: string; updateDot: boolean; onAbout: () => void }) {
  return (
    <header className="titlebar" data-testid="titlebar">
      <div className="tb-brand">
        <img src={LOGO_MARK_PNG} alt="" width={22} height={22} draggable={false} data-testid="titlebar-logo" />
        <strong>CV Studio</strong>
        {version && <small data-testid="app-version" title={`CV Studio ${version}`}>v{version}</small>}
      </div>
      <span className="tb-sep" aria-hidden="true" />
      <span className="tb-doc" data-testid="titlebar-doc" title={cvName}>{cvName}</span>
      <div className="tb-actions">
        <SummaTooltip label="Over CV Studio en updates">
          <button type="button" className="tb-btn" data-testid="about-open" aria-label={updateDot ? 'Over CV Studio en updates, er is een update beschikbaar' : 'Over CV Studio en updates'} onClick={onAbout}>
            <Icon name="info" size={16} />
            {updateDot && <i className="tb-dot" aria-hidden="true" />}
          </button>
        </SummaTooltip>
      </div>
    </header>
  );
}
