import React, { useEffect, useRef, useState } from 'react';
import { CV } from '../shared/model';
import { api } from './api';
import { measurePage } from './layout';
import { CvPage } from './templates/CvPage';

/** Verborgen venster dat alleen de A4-pagina rendert; main-proces print dit naar PDF. */
export function PrintView() {
  const [cv, setCv] = useState<CV | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('print-mode');
    window.__cvPrintState = { ready: false, overflow: [] };
    void api.getPrintCv().then(setCv);
  }, []);

  useEffect(() => {
    if (!cv) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => undefined)));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      if (cancelled || !ref.current) return;
      const rep = measurePage(ref.current, cv.style.margin);
      window.__cvPrintState = { ready: true, overflow: rep.sections.filter((s) => s.overflowMm > 0).map((s) => s.title) };
    })();
    return () => { cancelled = true; };
  }, [cv]);

  if (!cv) return null;
  return <CvPage cv={cv} ref={ref} />;
}
