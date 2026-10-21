
export const PAGE_W_MM = 210;
export const PAGE_H_MM = 297;
export const MM_PX = 96 / 25.4;

export interface SectionUsage {
  id: string;
  title: string;
  heightMm: number;
  overflowMm: number; // > 0: steekt voorbij de onderrand van de bruikbare pagina
}

export interface FitReport {
  fits: boolean;
  overflowMm: number; // grootste overschrijding
  sections: SectionUsage[];
}

/** Meet alle [data-sec]-elementen in de pagina en vergelijkt ze met de onderrand van de pagina. */
export function measurePage(page: HTMLElement, marginMm: number): FitReport {
  const rect = page.getBoundingClientRect();
  const scale = rect.width / (PAGE_W_MM * MM_PX) || 1;
  const toMm = (px: number) => px / scale / MM_PX;
  const limit = rect.top + (PAGE_H_MM - marginMm) * MM_PX * scale + 0.3 * MM_PX * scale;
  const sections: SectionUsage[] = [];
  page.querySelectorAll<HTMLElement>('[data-sec]').forEach((el) => {
    const r = el.getBoundingClientRect();
    sections.push({
      id: el.dataset.sec!,
      title: el.dataset.title || '',
      heightMm: Math.round(toMm(r.height) * 10) / 10,
      overflowMm: Math.max(0, Math.round(toMm(r.bottom - limit) * 10) / 10)
    });
  });
  const overflowMm = Math.max(0, ...sections.map((s) => s.overflowMm));
  return { fits: overflowMm === 0, overflowMm, sections };
}
