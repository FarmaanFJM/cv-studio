import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsStore } from '../electron/settings';
import { UpdateService, UpdaterBackend } from '../electron/updateService';
import {
  AUTO_INSTALL_BLOCKED_REASON, UpdateStatus, compareVersions, describeUpdateError, isNewerStable, notesToText, parseVersion, releaseUrlFor
} from '../src/shared/update';

describe('versies', () => {
  it('vergelijkt semver, pre-releases zijn ouder dan de release', () => {
    expect(compareVersions('3.1.0', '3.1.1')).toBeLessThan(0);
    expect(compareVersions('3.1.1', '3.1.0')).toBeGreaterThan(0);
    expect(compareVersions('3.1.0', '3.1.0')).toBe(0);
    expect(compareVersions('3.10.0', '3.9.0')).toBeGreaterThan(0); // numeriek, niet alfabetisch
    expect(compareVersions('3.1.0-beta.1', '3.1.0')).toBeLessThan(0);
    expect(compareVersions('3.1.0-beta.2', '3.1.0-beta.10')).toBeLessThan(0);
    expect(compareVersions('v3.1.0', '3.1.0')).toBe(0);
    expect(compareVersions('abc', '3.1.0')).toBeNaN();
    expect(parseVersion('3.1')).toBeNull();
  });
  it('alleen een strikt nieuwere stabiele versie is een update', () => {
    expect(isNewerStable('3.1.0', '3.1.1')).toBe(true);
    expect(isNewerStable('3.1.0', '4.0.0')).toBe(true);
    expect(isNewerStable('3.1.0', '3.1.0')).toBe(false); // gelijk
    expect(isNewerStable('3.1.0', '3.0.9')).toBe(false); // geen downgrade
    expect(isNewerStable('3.1.0', '3.2.0-beta.1')).toBe(false); // geen pre-release op het stabiele kanaal
    expect(isNewerStable('3.1.0', '3.2.0-rc.1+build5')).toBe(false);
    expect(isNewerStable('3.1.0', 'rommel')).toBe(false);
    expect(isNewerStable('3.1.0', '')).toBe(false);
  });
  it('releaselink wijst naar de officiële repository', () => {
    expect(releaseUrlFor('3.1.1')).toBe('https://github.com/FarmaanFJM/cv-studio/releases/tag/v3.1.1');
  });
});

describe('releasenotities en foutmeldingen', () => {
  it('zet HTML en lijsten om naar veilige platte tekst', () => {
    expect(notesToText('<h2>Nieuw</h2><ul><li>Een</li><li>Twee &amp; drie</li></ul><script>alert(1)</script>')).toBe('Nieuw\n- Een\n- Twee & drie');
    expect(notesToText([{ version: '3.1.1', note: 'Eerste' }, { version: '3.1.0', note: 'Tweede' }])).toBe('Eerste\n\nTweede');
    expect(notesToText(null)).toBe('');
    expect(notesToText('x'.repeat(9000)).length).toBe(4000);
  });
  it('geeft begrijpelijke Nederlandse meldingen', () => {
    expect(describeUpdateError(new Error('getaddrinfo ENOTFOUND github.com'))).toMatch(/Geen internetverbinding.*offline/);
    expect(describeUpdateError(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toMatch(/Geen internetverbinding/);
    expect(describeUpdateError(new Error('net::ERR_INTERNET_DISCONNECTED'))).toMatch(/Geen internetverbinding/);
    expect(describeUpdateError(new Error('socket hang up'), 'download')).toMatch(/onderbroken/);
    expect(describeUpdateError(new Error('HttpError: 403 rate limit exceeded'))).toMatch(/GitHub staat nu even geen verzoeken meer toe/);
    expect(describeUpdateError(Object.assign(new Error('x'), { statusCode: 429 }))).toMatch(/geen verzoeken/);
    expect(describeUpdateError(new Error('Cannot find channel "latest.yml" update info: HttpError: 404 Not Found'))).toMatch(/nog geen gepubliceerde release/);
    expect(describeUpdateError(new Error('sha512 checksum mismatch, expected a, got b'), 'download')).toMatch(/geweigerd.*echtheid.*niets geïnstalleerd/);
    expect(describeUpdateError(new Error('iets vreemds'), 'download')).toMatch(/Downloaden is mislukt/);
    expect(describeUpdateError(new Error('iets vreemds'), 'install')).toMatch(/cv-gegevens zijn niet aangetast/);
    expect(describeUpdateError('onbekend')).toMatch(/Controleren op updates is mislukt/);
    for (const m of [AUTO_INSTALL_BLOCKED_REASON, describeUpdateError(new Error('x'))]) expect(m).not.toMatch(/—|–/);
  });
});

describe('SettingsStore', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvs-settings-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  it('heeft veilige standaardwaarden en bewaart wijzigingen', () => {
    const file = path.join(dir, 'settings.json');
    const s = new SettingsStore(file);
    expect(s.get()).toEqual({ autoCheckUpdates: true, lastUpdateCheck: null, lastUpdateResult: null });
    s.set({ autoCheckUpdates: false, lastUpdateCheck: 123, lastUpdateResult: 'ok' });
    expect(new SettingsStore(file).get()).toEqual({ autoCheckUpdates: false, lastUpdateCheck: 123, lastUpdateResult: 'ok' });
  });
  it('herstelt van corrupte of ongeldige bestanden', () => {
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, '{niet json');
    expect(new SettingsStore(file).get().autoCheckUpdates).toBe(true);
    fs.writeFileSync(file, JSON.stringify({ autoCheckUpdates: 'ja', lastUpdateCheck: 'gisteren', lastUpdateResult: 5 }));
    expect(new SettingsStore(file).get()).toEqual({ autoCheckUpdates: true, lastUpdateCheck: null, lastUpdateResult: null });
  });
});

describe('UpdateService', () => {
  let dir: string;
  let statuses: UpdateStatus[];
  type Over = { canInstall?: boolean; isBusy?: () => boolean; now?: () => number; disabledReason?: string; backend?: Partial<UpdaterBackend> | null };
  const mk = (over: Over = {}) => {
    const backend: UpdaterBackend | null = over.backend === null ? null : {
      check: vi.fn(async () => ({ version: '3.1.1', notes: '- nieuw' })),
      download: vi.fn(async (cb) => { cb({ percent: 40.4, bytesPerSecond: 1000 }); cb({ percent: 100, bytesPerSecond: 1000 }); }),
      install: vi.fn(),
      ...over.backend
    };
    const settings = new SettingsStore(path.join(dir, 'settings.json'));
    const svc = new UpdateService({ currentVersion: '3.1.0', settings, canInstall: false, isBusy: () => false, broadcast: (s) => statuses.push(s), now: () => 1_000_000, ...over, backend });
    return { svc, backend, settings };
  };
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvs-upd-')); statuses = []; });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); vi.useRealTimers(); });

  it('meldt een nieuwere versie met notities, link en bewaart het resultaat', async () => {
    const { svc, settings } = mk();
    const s = await svc.check();
    expect(s.state).toEqual({ kind: 'available', version: '3.1.1', notes: '- nieuw', releaseUrl: releaseUrlFor('3.1.1') });
    expect(settings.get()).toMatchObject({ lastUpdateCheck: 1_000_000, lastUpdateResult: 'CV Studio 3.1.1 is beschikbaar.' });
    expect(statuses.map((x) => x.state.kind)).toEqual(['checking', 'available']);
  });
  it('geen update bij gelijke versie, oudere versie of pre-release (ook als de backend ze toch teruggeeft)', async () => {
    for (const v of ['3.1.0', '3.0.9', '3.2.0-beta.1']) {
      const { svc } = mk({ backend: { check: async () => ({ version: v }) } });
      const s = await svc.check();
      expect(s.state.kind, v).toBe('none');
      expect(s.lastResult).toBe('CV Studio 3.1.0 is de nieuwste versie.');
    }
    const { svc } = mk({ backend: { check: async () => null } });
    expect((await svc.check()).state.kind).toBe('none');
  });
  it('zonder vertrouwde ondertekening wordt nooit gedownload of geïnstalleerd', async () => {
    const { svc, backend } = mk({ canInstall: false });
    await svc.check();
    const s = await svc.download();
    expect(backend!.download).not.toHaveBeenCalled();
    expect(s.state).toMatchObject({ kind: 'error', phase: 'download', message: AUTO_INSTALL_BLOCKED_REASON, releaseUrl: releaseUrlFor('3.1.1') });
    expect(s.canInstall).toBe(false);
    expect(s.installBlockedReason).toBe(AUTO_INSTALL_BLOCKED_REASON);
    expect(svc.install()).toEqual({ ok: false, message: 'Er staat geen gedownloade update klaar.' });
    expect(backend!.install).not.toHaveBeenCalled();
  });
  it('met vertrouwen: voortgang, klaar, en herstarten alleen op uitdrukkelijke keuze', async () => {
    const { svc, backend } = mk({ canInstall: true });
    await svc.check();
    const s = await svc.download();
    expect(s.state).toEqual({ kind: 'ready', version: '3.1.1' });
    expect(statuses.filter((x) => x.state.kind === 'downloading').map((x) => (x.state as { percent: number }).percent)).toEqual([0, 40, 100]);
    expect(backend!.install).not.toHaveBeenCalled(); // klaar betekent nog niet herstarten
    expect(svc.install()).toEqual({ ok: true });
    expect(backend!.install).toHaveBeenCalledTimes(1);
  });
  it('herstart nooit tijdens een export', async () => {
    let busy = true;
    const { svc, backend } = mk({ canInstall: true, isBusy: () => busy });
    await svc.check(); await svc.download();
    expect(svc.install()).toMatchObject({ ok: false, message: expect.stringMatching(/exporteren/) });
    expect(backend!.install).not.toHaveBeenCalled();
    busy = false;
    expect(svc.install().ok).toBe(true);
  });
  it('mislukte download: duidelijke melding, opnieuw proberen kan', async () => {
    let n = 0;
    const { svc } = mk({ canInstall: true, backend: { download: async () => { if (n++ === 0) throw new Error('socket hang up'); } } });
    await svc.check();
    let s = await svc.download();
    expect(s.state).toMatchObject({ kind: 'error', phase: 'download', version: '3.1.1' });
    expect((s.state as { message: string }).message).toMatch(/onderbroken/);
    s = await svc.download();
    expect(s.state.kind).toBe('ready');
  });
  it('geweigerde (onechte) download wordt niet als klaar gemeld', async () => {
    const { svc } = mk({ canInstall: true, backend: { download: async () => { throw new Error('sha512 checksum mismatch'); } } });
    await svc.check();
    const s = await svc.download();
    expect(s.state.kind).toBe('error');
    expect(svc.install().ok).toBe(false);
  });
  it('mislukte installatie wordt gemeld; gegevens blijven ongemoeid', async () => {
    const { svc } = mk({ canInstall: true, backend: { install: () => { throw new Error('boem'); } } });
    await svc.check(); await svc.download();
    const r = svc.install();
    expect(r.ok).toBe(false);
    expect(svc.getStatus().state).toMatchObject({ kind: 'error', phase: 'install' });
    expect(r.message).toMatch(/cv-gegevens zijn niet aangetast/);
  });
  it('controle-fouten: offline en limieten, zonder uitzondering naar buiten', async () => {
    const { svc } = mk({ backend: { check: async () => { throw new Error('getaddrinfo ENOTFOUND'); } } });
    const s = await svc.check();
    expect(s.state).toMatchObject({ kind: 'error', phase: 'check' });
    expect(s.lastResult).toMatch(/Geen internetverbinding/);
  });
  it('dubbele of gelijktijdige controles starten maar één verzoek', async () => {
    let calls = 0; let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { svc } = mk({ backend: { check: async () => { calls++; await gate; return null; } } });
    const a = svc.check(); const b = svc.check();
    release();
    await Promise.all([a, b]);
    expect(calls).toBe(1);
  });
  it('uitgeschakeld (zonder backend): geen verzoeken, duidelijke reden', async () => {
    const { svc } = mk({ backend: null, disabledReason: 'Updates zijn alleen beschikbaar in de geïnstalleerde app.' });
    expect(svc.getStatus().state).toEqual({ kind: 'disabled', reason: 'Updates zijn alleen beschikbaar in de geïnstalleerde app.' });
    expect((await svc.check()).state.kind).toBe('disabled');
    svc.scheduleStartupCheck(0);
  });
  it('automatische controle: standaard aan, hoogstens eens per dag, uit te zetten, nooit zonder instelling', async () => {
    vi.useFakeTimers();
    let now = 10 * 24 * 3600 * 1000;
    const check = vi.fn(async () => null);
    const { svc, settings } = mk({ now: () => now, backend: { check } });
    svc.scheduleStartupCheck(1000);
    await vi.advanceTimersByTimeAsync(1100);
    expect(check).toHaveBeenCalledTimes(1);
    // direct daarna opnieuw opstarten: te kort geleden
    svc.scheduleStartupCheck(1000);
    await vi.advanceTimersByTimeAsync(1100);
    expect(check).toHaveBeenCalledTimes(1);
    // een dag later wel weer
    now += 25 * 3600 * 1000;
    svc.scheduleStartupCheck(1000);
    await vi.advanceTimersByTimeAsync(1100);
    expect(check).toHaveBeenCalledTimes(2);
    // uitgezet: nooit, en de voorkeur wordt bewaard
    now += 3 * 24 * 3600 * 1000;
    const st = svc.setAutoCheck(false);
    expect(st.autoCheck).toBe(false);
    expect(settings.get().autoCheckUpdates).toBe(false);
    svc.scheduleStartupCheck(1000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(check).toHaveBeenCalledTimes(2);
    // handmatig controleren blijft kunnen
    await svc.check();
    expect(check).toHaveBeenCalledTimes(3);
  });
});
