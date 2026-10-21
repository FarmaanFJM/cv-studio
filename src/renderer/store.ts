import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, CV, createEmptyCv, duplicateCv, sanitizeCv } from '../shared/model';
import { api } from './api';

export type SaveStatus = 'saved' | 'saving' | 'error';

export function useCvStore() {
  const [state, setState] = useState<AppState | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const latest = useRef<AppState | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api.loadState().then((s) => { latest.current = s; setState(s); });
  }, []);

  const flush = useCallback(async () => {
    if (!latest.current || !dirty.current) return;
    dirty.current = false;
    setStatus('saving');
    try {
      const r = await api.saveState(latest.current);
      setStatus(r.ok ? 'saved' : 'error');
    } catch { setStatus('error'); }
  }, []);

  const commit = useCallback((next: AppState) => {
    latest.current = next;
    dirty.current = true;
    setState(next);
    setStatus('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 350);
  }, [flush]);

  // bij sluiten direct en synchroon wegschrijven
  useEffect(() => {
    const onUnload = () => { if (dirty.current && latest.current) { api.saveStateSync(latest.current); dirty.current = false; } };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const cv = state ? state.cvs.find((c) => c.id === state.activeId) ?? state.cvs[0] : null;

  const updateCv = useCallback((fn: (cv: CV) => void) => {
    const s = latest.current;
    if (!s) return;
    const idx = s.cvs.findIndex((c) => c.id === s.activeId);
    if (idx < 0) return;
    const copy: CV = structuredClone(s.cvs[idx]);
    fn(copy);
    copy.updatedAt = Date.now();
    commit({ ...s, cvs: s.cvs.map((c, i) => (i === idx ? copy : c)) });
  }, [commit]);

  const setActive = useCallback((id: string) => {
    const s = latest.current;
    if (s && s.cvs.some((c) => c.id === id)) commit({ ...s, activeId: id });
  }, [commit]);

  const addCv = useCallback((name: string) => {
    const s = latest.current!;
    const c = createEmptyCv(name);
    commit({ ...s, cvs: [...s.cvs, c], activeId: c.id });
  }, [commit]);

  const duplicate = useCallback((name: string) => {
    const s = latest.current!;
    const src = s.cvs.find((c) => c.id === s.activeId)!;
    const c = duplicateCv(src, name);
    commit({ ...s, cvs: [...s.cvs, c], activeId: c.id });
  }, [commit]);

  const importCv = useCallback((raw: CV) => {
    const s = latest.current!;
    const c = duplicateCv(sanitizeCv(raw), raw.name + ' (geïmporteerd)');
    commit({ ...s, cvs: [...s.cvs, c], activeId: c.id });
  }, [commit]);

  const removeCv = useCallback(() => {
    const s = latest.current!;
    if (s.cvs.length <= 1) return;
    const rest = s.cvs.filter((c) => c.id !== s.activeId);
    commit({ ...s, cvs: rest, activeId: rest[0].id });
  }, [commit]);

  return { state, cv, status, updateCv, setActive, addCv, duplicate, importCv, removeCv };
}
