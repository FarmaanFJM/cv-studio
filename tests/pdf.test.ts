import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { A4_H_PT, A4_W_PT, inspectPdf } from '../electron/pdf';

async function make(pages: Array<[number, number]>) {
  const d = await PDFDocument.create();
  pages.forEach(([w, h]) => d.addPage([w, h]));
  return d.save();
}

describe('PDF-controle na export (paginalimiet)', () => {
  it('accepteert precies één A4-pagina', async () => {
    expect(await inspectPdf(await make([[A4_W_PT, A4_H_PT]]))).toEqual({ pages: 1, isA4: true });
  });
  it('detecteert twee pagina\'s', async () => {
    expect((await inspectPdf(await make([[A4_W_PT, A4_H_PT], [A4_W_PT, A4_H_PT]]))).pages).toBe(2);
  });
  it('detecteert een niet-A4 formaat (Letter)', async () => {
    expect((await inspectPdf(await make([[612, 792]]))).isA4).toBe(false);
  });
  it('gooit bij een ongeldig bestand', async () => {
    await expect(inspectPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });
});
