import { PDFDocument } from 'pdf-lib';

export const A4_W_PT = 595.28;
export const A4_H_PT = 841.89;

export interface PdfCheck {
  pages: number;
  isA4: boolean;
}

/** Controleert achteraf het gegenereerde bestand: aantal pagina's en A4-afmeting. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfCheck> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPageCount();
  const isA4 = doc.getPages().every((p) => {
    const { width, height } = p.getSize();
    return Math.abs(width - A4_W_PT) < 2 && Math.abs(height - A4_H_PT) < 2;
  });
  return { pages, isA4 };
}
