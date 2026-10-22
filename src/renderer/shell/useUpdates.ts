import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { UpdateStatus } from '../../shared/update';

/** Houdt de updatestatus uit het hoofdproces bij en biedt de acties aan de interface aan. */
export function useUpdates(saveNow: () => Promise<void>, onMessage: (kind: 'ok' | 'error', text: string) => void) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  useEffect(() => {
    let alive = true;
    void api.updates.getStatus().then((s) => alive && setStatus((cur) => cur ?? s));
    const off = api.updates.onStatus((s) => setStatus(s));
    return () => { alive = false; off(); };
  }, []);
  const run = useCallback(async (p: Promise<UpdateStatus>) => { setStatus(await p); }, []);
  return {
    status,
    check: () => run(api.updates.check()),
    download: () => run(api.updates.download()),
    setAutoCheck: (on: boolean) => run(api.updates.setAutoCheck(on)),
    openRelease: (url?: string) => api.updates.openRelease(url),
    // Eerst alles opslaan; pas daarna herstarten. De app sluit niet zonder dat het cv is weggeschreven.
    install: async () => {
      await saveNow();
      const r = await api.updates.install();
      if (!r.ok) onMessage('error', r.message ?? 'Installeren is niet gelukt.');
    }
  };
}
