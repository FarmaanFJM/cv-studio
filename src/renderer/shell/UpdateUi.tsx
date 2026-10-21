import React, { useEffect, useRef, useState } from 'react';
import { LOGO_MARK_PNG } from '../brand.generated';
import { UpdateStatus, msgAvailable } from '../../shared/update';
import { SummaButton, SummaToggle } from '../ui';
import { Icon } from '../icons';

type Actions = {
  check: () => Promise<void>; download: () => Promise<void>; install: () => Promise<void>;
  setAutoCheck: (on: boolean) => Promise<void>; openRelease: (url?: string) => Promise<void>;
};

const fmtTime = (t: number | null) => (t ? new Date(t).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nog niet gecontroleerd');

function Progress({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} data-testid="update-progress">
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Melding (geen modaal venster): verschijnt rustig onderin en onderbreekt het bewerken of exporteren niet. */
export function UpdateBanner({ status, actions, dismissed, onDismiss }: { status: UpdateStatus | null; actions: Actions; dismissed: string | null; onDismiss: (key: string) => void }) {
  const [notes, setNotes] = useState(false);
  const s = status?.state;
  if (!status || !s) return null;
  const key = s.kind === 'available' || s.kind === 'ready' ? `${s.kind}-${s.version}` : s.kind === 'error' && s.phase !== 'check' ? `error-${s.version}` : '';
  if (!key || dismissed === key) return s.kind === 'downloading' ? <DownloadBanner status={status} /> : null;
  if (s.kind === 'downloading') return <DownloadBanner status={status} />;
  return (
    <div className="update-banner" role="status" data-testid="update-banner" data-kind={s.kind}>
      {s.kind === 'available' && (
        <>
          <strong>Update beschikbaar</strong>
          <p>{msgAvailable(s.version)}</p>
          {notes && <pre className="notes" data-testid="update-notes">{s.notes || 'Geen releasenotities beschikbaar.'}</pre>}
          {!status.canInstall && <p className="muted small" data-testid="update-blocked">{status.installBlockedReason}</p>}
          <div className="btn-row">
            {status.canInstall
              ? <SummaButton kind="primary" name="update-go" onClick={actions.download}>Bijwerken</SummaButton>
              : <SummaButton kind="primary" name="update-open" onClick={() => actions.openRelease(s.releaseUrl)}>Naar downloadpagina</SummaButton>}
            <SummaButton name="update-later" onClick={() => onDismiss(key)}>Later</SummaButton>
            <SummaButton kind="ghost" name="update-notes-toggle" expanded={notes} onClick={() => setNotes((n) => !n)}>Wat is er nieuw?</SummaButton>
          </div>
        </>
      )}
      {s.kind === 'ready' && (
        <>
          <strong>Update klaar</strong>
          <p>CV Studio {s.version} is gedownload. Je cv wordt eerst opgeslagen; daarna herstart de app.</p>
          <div className="btn-row">
            <SummaButton kind="primary" name="update-install" onClick={actions.install}>Herstarten en installeren</SummaButton>
            <SummaButton name="update-later" onClick={() => onDismiss(key)}>Later</SummaButton>
          </div>
        </>
      )}
      {s.kind === 'error' && (
        <>
          <strong>Bijwerken niet gelukt</strong>
          <p data-testid="update-error">{s.message}</p>
          <div className="btn-row">
            {status.canInstall && <SummaButton kind="primary" name="update-retry" onClick={actions.download}>Opnieuw proberen</SummaButton>}
            <SummaButton name="update-open" onClick={() => actions.openRelease(s.releaseUrl)}>Naar downloadpagina</SummaButton>
            <SummaButton kind="ghost" name="update-later" onClick={() => onDismiss(key)}>Sluiten</SummaButton>
          </div>
        </>
      )}
    </div>
  );
}

function DownloadBanner({ status }: { status: UpdateStatus }) {
  const s = status.state;
  if (s.kind !== 'downloading') return null;
  return (
    <div className="update-banner" role="status" data-testid="update-banner" data-kind="downloading">
      <strong>Update downloaden</strong>
      <p>CV Studio {s.version}: {s.percent}%. Je kunt gewoon verder werken.</p>
      <Progress percent={s.percent} label="Voortgang van de download" />
    </div>
  );
}

/** Over CV Studio: versie en compacte update-instellingen. */
export function AboutDialog({ status, actions, onClose }: { status: UpdateStatus | null; actions: Actions; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const s = status?.state;
  const busy = s?.kind === 'checking' || s?.kind === 'downloading';
  const disabled = !status || s?.kind === 'disabled';
  let line = status?.lastResult ?? 'Nog niet gecontroleerd';
  if (s?.kind === 'checking') line = 'Controleren…';
  else if (s?.kind === 'disabled') line = s.reason;
  else if (s?.kind === 'available') line = msgAvailable(s.version);
  else if (s?.kind === 'ready') line = `CV Studio ${s.version} is klaar om te installeren.`;
  else if (s?.kind === 'error') line = s.message;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal about" role="dialog" aria-modal="true" aria-labelledby="about-title" data-testid="about-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="about-head">
          <img src={LOGO_MARK_PNG} alt="" width={40} height={40} />
          <div>
            <h3 id="about-title">CV Studio</h3>
            <p className="muted" data-testid="about-version">Versie {status?.currentVersion ?? ''}</p>
          </div>
          <button type="button" ref={close} className="btn ghost icon about-x" aria-label="Sluiten" data-testid="about-close" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <section className="about-section" aria-labelledby="upd-title">
          <h4 id="upd-title" className="group-title">Updates</h4>
          <dl className="kv-rows">
            <div><dt>Huidige versie</dt><dd data-testid="upd-current">{status?.currentVersion}</dd></div>
            {s?.kind === 'available' && <div><dt>Beschikbaar</dt><dd data-testid="upd-available">{s.version}</dd></div>}
            <div><dt>Laatste controle</dt><dd data-testid="upd-last">{fmtTime(status?.lastCheckAt ?? null)}</dd></div>
            <div><dt>Resultaat</dt><dd><span data-testid="upd-result" role="status">{line}</span></dd></div>
          </dl>
          {s?.kind === 'downloading' && <Progress percent={s.percent} label="Voortgang van de download" />}
          <div className="btn-row">
            <SummaButton name="upd-check" disabled={disabled || busy} onClick={actions.check}>Controleren op updates</SummaButton>
            {s?.kind === 'available' && (status?.canInstall
              ? <SummaButton kind="primary" name="upd-download" onClick={actions.download}>Bijwerken</SummaButton>
              : <SummaButton kind="primary" name="upd-open" onClick={() => actions.openRelease(s.releaseUrl)}>Naar downloadpagina</SummaButton>)}
            {s?.kind === 'ready' && <SummaButton kind="primary" name="upd-install" onClick={actions.install}>Herstarten en installeren</SummaButton>}
            {s?.kind === 'error' && status?.canInstall && s.phase === 'download' && <SummaButton name="upd-retry" onClick={actions.download}>Opnieuw proberen</SummaButton>}
          </div>
          <SummaToggle name="upd-auto" label="Automatisch controleren op updates" checked={!!status?.autoCheck} disabled={disabled}
            onChange={(v) => actions.setAutoCheck(v)}
            hint="Hoogstens één keer per dag, kort na het opstarten." />
          <p className="field-hint" data-testid="upd-privacy">
            Bij een controle maakt CV Studio verbinding met GitHub om te zien of er een nieuwe versie is. Er wordt geen cv-inhoud verstuurd en er is geen telemetrie. Zonder internet werkt de app gewoon verder.
          </p>
          {status && !status.canInstall && !disabled && <p className="field-hint" data-testid="upd-blocked">{status.installBlockedReason}</p>}
        </section>
        <div className="btn-row end">
          <SummaButton kind="ghost" name="upd-releases" onClick={() => actions.openRelease()}>Releasepagina</SummaButton>
          <SummaButton name="about-done" onClick={onClose}>Sluiten</SummaButton>
        </div>
      </div>
    </div>
  );
}
