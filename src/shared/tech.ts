import type { StyleSettings, TechColorMode, TechSettings } from './model';

export interface EffectiveTech {
  show: boolean;
  color: TechColorMode;
  /** true = het onderdeel volgt de globale stijl (geen eigen instelling) */
  inherited: boolean;
}

/**
 * Voorrangsregels voor technologie-iconen (hoog naar laag):
 * 1. Globaal 'Toon iconen' uit -> nergens iconen, wat een onderdeel of vaardigheid ook kiest.
 * 2. Eigen instelling van het onderdeel (indien actief): 'Toon iconen' van het onderdeel.
 * 3. Keuze per technologie (eigen icoon of 'geen icoon') - zie resolveSkillIcon; geldt alleen als 1 en 2 iconen toestaan.
 * 4. Kleurmodus: eigen keuze van het onderdeel (indien actief), anders globaal.
 * 5. Automatische contrastterugval (monochroom) - zie resolveIconLook in techIcons.tsx.
 */
export function effectiveTech(style: Pick<StyleSettings, 'techIcons' | 'techColorMode'>, sec: TechSettings): EffectiveTech {
  const show = style.techIcons && (sec.techOverride ? sec.techShow : true);
  return { show, color: sec.techOverride ? sec.techColor : style.techColorMode, inherited: !sec.techOverride };
}
