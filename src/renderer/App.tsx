import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { SECTION_TITLES } from '../shared/model';
import { api } from './api';
import { useCvStore } from './store';
import { FitReport, MM_PX, PAGE_H_MM, PAGE_W_MM, measurePage } from './layout';
import { CvPage } from './templates/CvPage';
import { SectionList } from './editor/SectionList';
import { StylePanel } from './editor/StylePanel';
import { Btn } from './editor/fields';

type Toast = { kind: 'ok' | 'error'; text: string } | null;

function PromptModal({ title, initial, onDone }: { title: string; initial: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="modal-back" onClick={() => onDone(null)}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (v.trim()) onDone(v.trim()); }}>
        <h3>{title}</h3>
        <input className="input" autoFocus data-testid="prompt-input" value={v} onChange={(e) => setV(e.target.value)} />
        <div className="btn-row end">
          <Btn onClick={() => onDone(null)}>Annuleren</Btn>
          <button type="submit" className="btn primary" data-testid="prompt-ok">OK</button>
        </div>
      </form>
    </div>
  );
}

export function App() {
  const { state, cv, status, updateCv, setActive, addCv, duplicate, importCv, removeCv } = useCvStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [fit, setFit] = useState<FitReport | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<{ title: string; initial: string; resolve: (v: string | null) => void } | null>(null);
  const [scale, setScale] = useState(0.7);
  const paneRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'sections' | 'style'>('sections');

  const ask = useCallback((title: string, initial: string) =>
    new Promise<string | null>((resolve) => setPrompt({ title, initial, resolve })), []);

  const notify = useCallback((t: Toast) => {
    setToast(t);
    if (t) window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), t.kind === 'error' ? 9000 : 5000);
  }, []);

  // schaal de A4-pagina zodat hij in het paneel past
  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth - 48;
      const h = el.clientHeight - 24;
      setScale(Math.max(0.3, Math.min(w / (PAGE_W_MM * MM_PX), h / (PAGE_H_MM * MM_PX), 1.4)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state === null]);

  // meet na elke wijziging of de inhoud op één pagina past
  const measure = useCallback(() => {
    if (!pageRef.current || !cv) return;
    const rep = measurePage(pageRef.current, cv.style.spacing);
    pageRef.current.querySelectorAll('[data-sec]').forEach((el) => {
      const u = rep.sections.find((s) => s.id === (el as HTMLElement).dataset.sec);
      el.classList.toggle('is-over', !!u && u.overflowMm > 0);
    });
    setFit((prev) => (JSON.stringify(prev) === JSON.stringify(rep) ? prev : rep));
  }, [cv]);

  useLayoutEffect(() => {
    measure();
    let alive = true;
    void document.fonts.ready.then(() => alive && measure());
    const imgs = Array.from(pageRef.current?.querySelectorAll('img') ?? []);
    imgs.forEach((i) => i.addEventListener('load', measure));
    return () => { alive = false; imgs.forEach((i) => i.removeEventListener('load', measure)); };
  }, [measure, scale]);

  const pickFromPreview = useCallback((id: string) => {
    if (!id) return;
    setTab('sections');
    setOpenId(id);
    window.setTimeout(() => document.querySelector(`[data-sec-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  }, []);

  if (!state || !cv) return <div className="loading">Laden…</div>;

  const overSections = fit ? fit.sections.filter((s) => s.overflowMm > 0) : [];
  const biggest = fit ? [...fit.sections].filter((s) => s.id !== 'header' && s.id !== 'photo').sort((a, b) => b.heightMm - a.heightMm)[0] : undefined;
  const fits = !fit || fit.fits;

  const exportPdf = async () => {
    if (!fits || busy) return;
    setBusy(true);
    try {
      const r = await api.exportPdf(cv);
      if (r.ok) notify({ kind: 'ok', text: `PDF opgeslagen (${r.pages} pagina, A4): ${r.path}` });
      else if (!r.canceled) notify({ kind: 'error', text: r.error ?? 'Exporteren is mislukt.' });
    } catch (e) {
      notify({ kind: 'error', text: `Exporteren is mislukt: ${e instanceof Error ? e.message : e}` });
    } finally { setBusy(false); }
  };

  const exportJson = async () => {
    const r = await api.exportJson(cv);
    if (r.ok) notify({ kind: 'ok', text: `Gegevens geëxporteerd: ${r.path}` });
    else if (!r.canceled) notify({ kind: 'error', text: r.error ?? 'Exporteren is mislukt.' });
  };
  const importJson = async () => {
    const r = await api.importJson();
    if (r.ok) { importCv(r.cv); notify({ kind: 'ok', text: 'Cv geïmporteerd als nieuwe versie.' }); }
    else if (!r.canceled) notify({ kind: 'error', text: r.error ?? 'Importeren is mislukt.' });
  };

  const compact = () => updateCv((c) => { c.style.spacing = 'compact'; c.style.fontSize = Math.min(c.style.fontSize, 9); });

  return (
    <div className="app">
      <section className="editor">
        <div className="editor-top">
          <div className="brand">CV Studio</div>
          <div className="version-bar">
            <select className="input" data-testid="version-select" value={state.activeId} onChange={(e) => setActive(e.target.value)} aria-label="Cv-versie">
              {state.cvs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Btn small name="cv-new" title="Nieuw leeg cv" onClick={async () => { const n = await ask('Naam van het nieuwe cv', 'Nieuw cv'); if (n) addCv(n); }}>Nieuw</Btn>
            <Btn small name="cv-duplicate" title="Dupliceer dit cv" onClick={async () => { const n = await ask('Naam van de kopie', `${cv.name} (kopie)`); if (n) duplicate(n); }}>Dupliceren</Btn>
            <Btn small name="cv-rename" onClick={async () => { const n = await ask('Nieuwe naam voor deze versie', cv.name); if (n) updateCv((c) => { c.name = n; }); }}>Hernoemen</Btn>
            <Btn small kind="danger" name="cv-delete" disabled={state.cvs.length <= 1}
              onClick={() => { if (confirm(`Cv "${cv.name}" definitief verwijderen?`)) removeCv(); }}>Verwijderen</Btn>
          </div>
          <div className="version-bar">
            <Btn small name="json-export" onClick={exportJson}>Exporteer JSON</Btn>
            <Btn small name="json-import" onClick={importJson}>Importeer JSON</Btn>
            <span className={`save-status ${status}`} data-testid="save-status">
              {status === 'saved' ? 'Alles opgeslagen' : status === 'saving' ? 'Opslaan…' : 'Opslaan mislukt'}
            </span>
          </div>
        </div>
        <div className="tabs">
          <button type="button" className={tab === 'sections' ? 'on' : ''} data-testid="tab-sections" onClick={() => setTab('sections')}>Onderdelen</button>
          <button type="button" className={tab === 'style' ? 'on' : ''} data-testid="tab-style" onClick={() => setTab('style')}>Opmaak</button>
        </div>
        <div className="editor-scroll">
          {tab === 'sections' ? (
            <>
              <p className="hint">Klik op een onderdeel (ook in de preview) om het te bewerken. Sleep ⠿ of gebruik de pijlen om de volgorde te wijzigen.
                {cv.template === 'sidebar' && ' In het zijbalk-sjabloon staan gegevens, vaardigheden en talen links.'}</p>
              <SectionList cv={cv} update={updateCv} fit={fit} openId={openId} setOpenId={setOpenId} />
            </>
          ) : (
            <StylePanel cv={cv} update={updateCv} />
          )}
        </div>
      </section>

      <section className="preview">
        <div className="preview-top">
          <div className={`fit-badge ${fits ? 'ok' : 'bad'}`} data-testid="fit-badge">
            {fits ? '✓ Past op één A4-pagina' : '⚠ Past niet op één pagina'}
          </div>
          <span className="spacer" />
          <button type="button" className="btn primary big" data-testid="export-pdf" disabled={!fits || busy}
            title={fits ? 'Sla het cv op als PDF' : 'Maak het cv eerst korter: de inhoud past niet op één pagina'}
            onClick={exportPdf}>
            {busy ? 'Bezig…' : 'Exporteer PDF'}
          </button>
        </div>
        {!fits && fit && (
          <div className="overflow-banner" role="alert" data-testid="overflow-banner">
            <strong>De inhoud is {fit.overflowMm.toFixed(0)} mm te lang voor één A4-pagina.</strong>
            <div>
              Dit komt uit de pagina:{' '}
              {overSections.map((s) => s.title || SECTION_TITLES.custom).filter((t, i, a) => a.indexOf(t) === i).join(', ')}.
              {biggest && <> Grootste onderdeel: <b>{biggest.title}</b> ({Math.round(biggest.heightMm)} mm).</>}
            </div>
            <div className="btn-row">
              <Btn small onClick={compact}>Compactere opmaak toepassen</Btn>
              <Btn small onClick={() => { setTab('sections'); }}>Inhoud inkorten of verbergen</Btn>
            </div>
          </div>
        )}
        {toast && <div className={`toast ${toast.kind}`} role="status" data-testid="toast" onClick={() => setToast(null)}>{toast.text}</div>}
        <div className="preview-pane" ref={paneRef}>
          <div className="page-holder" style={{ width: PAGE_W_MM * MM_PX * scale, height: PAGE_H_MM * MM_PX * scale }}>
            <div className="page-scale" style={{ transform: `scale(${scale})` }} data-testid="page">
              <CvPage cv={cv} ref={pageRef} placeholders onPick={pickFromPreview} />
            </div>
          </div>
        </div>
      </section>
      {prompt && <PromptModal title={prompt.title} initial={prompt.initial} onDone={(v) => { prompt.resolve(v); setPrompt(null); }} />}
    </div>
  );
}
