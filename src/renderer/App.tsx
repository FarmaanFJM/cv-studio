import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlaceTarget, SECTION_TITLES, SPACING_PRESETS } from '../shared/model';
import { api } from './api';
import { useCvStore } from './store';
import { FitReport, MM_PX, PAGE_H_MM, PAGE_W_MM, measurePage } from './layout';
import { CvPage } from './templates/CvPage';
import { SectionList } from './editor/SectionList';
import { LayoutPanel, StylePanel } from './editor/DesignPanels';
import { Btn } from './editor/fields';
import { Icon } from './icons';

type Toast = { kind: 'ok' | 'error'; text: string } | null;
type Tab = 'sections' | 'layout' | 'style';

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

const readWidth = () => {
  try { const n = Number(localStorage.getItem('cv-editor-width')); if (n >= 380) return n; } catch { /* geen opslag */ }
  return 600;
};

export function App() {
  const { state, cv, status, updateCv, setActive, addCv, duplicate, importCv, removeCv, addSwatch } = useCvStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [fit, setFit] = useState<FitReport | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<{ title: string; initial: string; resolve: (v: string | null) => void } | null>(null);
  const [scale, setScale] = useState(0.7);
  const [editorW, setEditorW] = useState(readWidth);
  const paneRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('sections');
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const cvRef = useRef(cv);
  cvRef.current = cv;
  const onPlaced = useCallback((id: string, target: PlaceTarget) => {
    if (target !== 'hidden') setFlash({ id, n: Date.now() });
  }, []);

  // laat na een verplaatsing kort zien waar het onderdeel in de preview staat (alleen op het scherm, nooit in de PDF)
  useEffect(() => {
    if (!flash) return;
    let t: number | undefined;
    let el: Element | null = null;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      const page = pageRef.current;
      if (!page) return;
      const sec = cvRef.current?.sections.find((s) => s.id === flash.id);
      el = page.querySelector(`[data-sec="${flash.id}"]`)
        ?? (sec ? page.querySelector(`[data-region="${sec.zone}"]`) : null); // leeg onderdeel: licht de zone zelf op
      if (!el) return;
      el.classList.remove('flash');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('flash');
      t = window.setTimeout(() => el?.classList.remove('flash'), 1900);
    }));
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); el?.classList.remove('flash'); };
  }, [flash]);

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
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 24;
      setScale(Math.max(0.3, Math.min(w / (PAGE_W_MM * MM_PX), h / (PAGE_H_MM * MM_PX), 1.6)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state === null]);

  const measure = useCallback(() => {
    if (!pageRef.current || !cv) return;
    const rep = measurePage(pageRef.current, cv.style.margin);
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

  // lettertypen die later laden kunnen de hoogte veranderen
  useEffect(() => {
    if (!cv) return;
    const f = document.fonts;
    const on = () => measure();
    f.addEventListener?.('loadingdone', on);
    return () => f.removeEventListener?.('loadingdone', on);
  }, [cv, measure]);

  const pickFromPreview = useCallback((id: string) => {
    if (!id) return;
    setTab('sections');
    setOpenId(id);
    window.setTimeout(() => document.querySelector(`[data-sec-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40);
  }, []);

  const startResize = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setEditorW(Math.max(400, Math.min(window.innerWidth * 0.7, ev.clientX)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setEditorW((w) => { try { localStorage.setItem('cv-editor-width', String(Math.round(w))); } catch { /* geen opslag */ } return w; });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

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
    if (r.ok) notify({ kind: 'ok', text: `Geëxporteerd: ${r.path}` });
    else if (!r.canceled) notify({ kind: 'error', text: r.error ?? 'Exporteren is mislukt.' });
  };
  const importJson = async () => {
    const r = await api.importJson();
    if (r.ok) { importCv(r.cv); notify({ kind: 'ok', text: 'Geïmporteerd als nieuwe versie.' }); }
    else if (!r.canceled) notify({ kind: 'error', text: r.error ?? 'Importeren is mislukt.' });
  };
  const compact = () => updateCv((c) => { Object.assign(c.style, SPACING_PRESETS.compact); c.style.fontSize = Math.min(c.style.fontSize, 9); });

  return (
    <div className="app" style={{ gridTemplateColumns: `${editorW}px 6px 1fr` }}>
      <section className="editor">
        <div className="editor-top">
          <div className="brand"><i className="logo" />CV Studio</div>
          <div className="version-bar">
            <select className="input" data-testid="version-select" value={state.activeId} onChange={(e) => setActive(e.target.value)} aria-label="Cv-versie">
              {state.cvs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Btn icon name="cv-new" title="Nieuw cv" onClick={async () => { const n = await ask('Naam van het nieuwe cv', 'Nieuw cv'); if (n) addCv(n); }}><Icon name="plus" /></Btn>
            <Btn icon name="cv-duplicate" title="Dupliceren" onClick={async () => { const n = await ask('Naam van de kopie', `${cv.name} (kopie)`); if (n) duplicate(n); }}><Icon name="copy" /></Btn>
            <Btn icon name="cv-rename" title="Hernoemen" onClick={async () => { const n = await ask('Nieuwe naam', cv.name); if (n) updateCv((c) => { c.name = n; }); }}><Icon name="edit" /></Btn>
            <Btn icon kind="danger" name="cv-delete" title="Verwijderen" disabled={state.cvs.length <= 1}
              onClick={() => { if (confirm(`Cv "${cv.name}" verwijderen?`)) removeCv(); }}><Icon name="trash" /></Btn>
            <span className="vsep" />
            <Btn icon name="json-export" title="Exporteer JSON" onClick={exportJson}><Icon name="download" /></Btn>
            <Btn icon name="json-import" title="Importeer JSON" onClick={importJson}><Icon name="upload" /></Btn>
          </div>
        </div>
        <div className="tabs">
          {([['sections', 'Inhoud'], ['layout', 'Layout'], ['style', 'Stijl']] as const).map(([k, label]) => (
            <button type="button" key={k} className={tab === k ? 'on' : ''} data-testid={`tab-${k}`} onClick={() => setTab(k)}>{label}</button>
          ))}
          <span className={`save-status ${status}`} data-testid="save-status">
            {status === 'saved' ? 'Alles opgeslagen' : status === 'saving' ? 'Opslaan…' : 'Opslaan mislukt'}
          </span>
        </div>
        <div className="editor-scroll">
          {tab === 'sections' && <SectionList cv={cv} update={updateCv} fit={fit} openId={openId} setOpenId={setOpenId} onPlaced={onPlaced} />}
          {tab === 'layout' && <LayoutPanel cv={cv} update={updateCv} />}
          {tab === 'style' && <StylePanel cv={cv} update={updateCv} swatches={state.swatches} onSaveSwatch={addSwatch} />}
        </div>
      </section>

      <div className="splitter" data-testid="splitter" onPointerDown={startResize} />

      <section className="preview">
        <div className="preview-top">
          <div className={`fit-badge ${fits ? 'ok' : 'bad'}`} data-testid="fit-badge">
            {fits ? '✓ 1 pagina A4' : '⚠ Past niet op één pagina'}
          </div>
          <span className="spacer" />
          <button type="button" className="btn primary big" data-testid="export-pdf" disabled={!fits || busy}
            title={fits ? 'Opslaan als PDF' : 'Inhoud past niet op één pagina'} onClick={exportPdf}>
            <Icon name="pdf" /> {busy ? 'Bezig…' : 'Exporteer PDF'}
          </button>
        </div>
        {!fits && fit && (
          <div className="overflow-banner" role="alert" data-testid="overflow-banner">
            <div>
              <strong>{fit.overflowMm.toFixed(0)} mm te lang.</strong>{' '}
              Over de rand: {overSections.map((s) => s.title || SECTION_TITLES.custom).filter((t, i, a) => a.indexOf(t) === i).join(', ')}.
              {biggest && <> Grootste: <b>{biggest.title}</b> ({Math.round(biggest.heightMm)} mm).</>}
            </div>
            <Btn small onClick={compact}>Compacter</Btn>
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
