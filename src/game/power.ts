import { equipSlot } from './items';
import { CLS } from '../data/classes';
import { game } from './state';
import { computeStats } from './stats';
/* ================= ITEM POWER ================= */
// How much stronger an item would make the hero, from the real combat formulas:
//  damage    = attack × crit multiplier × attack speed / class attack delay,
//              with ~20% of damage from skills that scale with cooldown reduction
//  toughness = health × armor mitigation (damage taken is ×100/(100+4·armor)),
//              plus a modest bonus for sustain (regen and life steal over 10 s)
//  speed     counts for a small share.

/** Damage / toughness weights of the overall score, per class. */
const WEIGHTS = { warrior: [0.5, 0.5], ranger: [0.65, 0.35], mage: [0.65, 0.35] };
const SPEED_W = 0.1;

export function powerOf(cls: string, s) {
  const critMul = 1 + (Math.min(75, s.crit) / 100) * (s.critd / 100),
    hitDps = (s.atk * critMul * (1 + s.aspd / 100)) / CLS[cls].cd,
    dmg = hitDps * (0.8 + 0.2 / (1 - Math.min(50, s.cdr) / 100)),
    ehp = s.hp * (1 + (s.def * 4) / 100),
    sustain = s.hp * (0.006 + (s.regenPct || 0) / 100) + s.regen + (hitDps * s.leech) / 100,
    tough = ehp * (1 + (0.25 * sustain * 10) / s.hp);
  return { dmg, tough, spd: s.spd };
}

/** Relative change (0.14 = +14%) if `it` replaced the item in its slot. */
export function compareItem(it, p = game.P) {
  const a = powerOf(p.cls, computeStats(p)),
    b = powerOf(p.cls, computeStats({ ...p, eq: { ...p.eq, [equipSlot(it, p.eq)]: it } })),
    [wd, wt] = WEIGHTS[p.cls] || [0.5, 0.5],
    dmg = b.dmg / a.dmg - 1,
    tough = b.tough / a.tough - 1,
    spd = b.spd / a.spd - 1;
  return { overall: wd * dmg + wt * tough + SPEED_W * spd, dmg, tough };
}

/** "+14%", "−5%" or "±0%". */
export const fmtPct = (x: number) => {
  const v = Math.round(x * 100);
  return v > 0 ? '+' + v + '%' : v < 0 ? '−' + -v + '%' : '±0%';
};
