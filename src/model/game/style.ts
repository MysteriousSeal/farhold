import { game } from './state';
/* ================= FIGHTING STYLE (from the equipped weapon) ================= */
// Heroes have no class: the weapon in hand decides how they fight. Weapons keep their family in
// `it.wc` ('warrior' = melee blade/axe, 'ranger' = bow, 'mage' = staff; the historical names
// are kept so older saves and item art keep working).
export type Style = 'warrior' | 'ranger' | 'mage';
export const STYLE_NAME: Record<Style, string> = {
  warrior: 'Melee',
  ranger: 'Bow',
  mage: 'Staff',
};
/** Seconds between basic attacks for each style (before attack speed). */
export const STYLE_CD: Record<Style, number> = { warrior: 0.36, ranger: 0.42, mage: 0.55 };
/** The fighting style a weapon gives (melee when bare-handed or unknown). */
export const weaponStyle = (it): Style =>
  it && (it.wc === 'ranger' || it.wc === 'mage') ? it.wc : 'warrior';
/** The hero's current fighting style, from their equipped weapon. */
export const heroStyle = (p = game.P): Style => weaponStyle(p && p.eq && p.eq.weapon);
