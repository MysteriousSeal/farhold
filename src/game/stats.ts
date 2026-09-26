import type { Look, Stats } from './types';
import { sh } from '../core/math';
import { MATS, OUTFIT, RAR, SLOTS } from '../data/classes';
import { treeFx } from '../data/skills';
import { itemStat } from './items';
import { game } from './state';
/** Final stats for a hero `p` (level, gear, skills) without touching game state. */
/** Attack while no weapon is equipped (fists), as a share of the usual attack. */
export const UNARMED = 0.6;
export function computeStats(p = game.P): Stats {
  const s: Stats = {
    hp: 120,
    atk: 10,
    def: 2,
    crit: 5,
    critd: 80,
    spd: 150,
    aspd: 0,
    leech: 0,
    regen: 0,
    cdr: 0,
    dmgMul: 1,
    hpMul: 1,
    defMul: 1,
    arc: 1,
    rad: 1,
    pierce: 0,
    twin: 0,
    rollCd: 1,
  };
  const l = p.lvl - 1;
  s.hp += l * 14;
  s.atk += l * 2.2;
  s.def += l * 0.8;
  for (const k of SLOTS) {
    const it = p.eq[k];
    if (it) for (const n in it.st) s[n] += itemStat(it, n);
  }
  // the passive skill tree (data/tree.ts)
  const F = treeFx(p),
    f = (k: string) => F[k] || 0;
  s.dmgMul += f('dmg') / 100;
  s.hpMul += f('hp') / 100;
  s.defMul += f('armor') / 100;
  s.crit += f('crit');
  s.critd += f('critd');
  s.aspd += f('aspd');
  s.leech += f('leech');
  s.regenPct = f('regen');
  s.cdr += f('cdr');
  s.rollCd *= 1 - f('roll') / 100;
  s.arc += 0.15 * f('reach');
  s.rad += 0.15 * f('reach');
  s.pierce += f('reach');
  s.spd *= 1 + f('spd') / 100;
  s.goldMul = 1 + f('gold') / 100;
  s.xpMul = 1 + f('xp') / 100;
  s.dodge = f('dodge');
  s.dr = f('dr');
  s.killHeal = f('killHeal');
  s.potMul = 1 + f('pot') / 100;
  s.last = f('last');
  // tavern drink (ui/tavern.ts): one buff at a time
  const bk = p.buff && p.buff.t > 0 ? p.buff.k : '';
  if (bk === 'ale') s.dmgMul += 0.1;
  else if (bk === 'stew') s.hpMul += 0.1;
  else if (bk === 'mead') s.regen += 2 + p.lvl * 0.4;
  s.hp = Math.round(s.hp * s.hpMul);
  // bare-handed, the hero punches for a good deal less
  if (!p.eq || !p.eq.weapon) s.atk *= UNARMED;
  s.atk = Math.round(s.atk * s.dmgMul * 10) / 10;
  s.def = Math.round(s.def * s.defMul);
  s.crit = Math.min(75, Math.round(s.crit * 10) / 10);
  s.spd = Math.round(Math.min(280, s.spd));
  s.cdr = Math.min(50, s.cdr);
  s.leech = Math.min(15, s.leech);
  return s;
}
export function calcStats() {
  const s = computeStats(game.P);
  game.ST = s;
  game.P.look = lookOfPlayer(game.P);
  if (game.P.hp > s.hp) game.P.hp = s.hp;
}
export const UNDERWEAR = '#e6dcc4';
export function lookOfPlayer(p) {
  const e = p.eq || {};
  // Without body armor the hero is bare-skinned in linen shorts; the tunic comes with armor.
  const bare = !e.armor;
  const C2 = OUTFIT,
    L: Look = {
      skin: p.skin,
      hair: p.hair,
      hairC: p.hairC,
      fem: p.gender === 'f',
      beard: p.gender !== 'f' && p.beard === 2,
      stubble: p.gender !== 'f' && p.beard === 1,
      race: p.race,
      eyeC: p.eyeC,
      brow: p.brow,
      nose: p.nose,
      bareFeet: !e.boots,
      cloth: bare ? p.skin : C2.cloth,
      cloth2: bare ? sh(p.skin, -0.2) : C2.cloth2,
      cape: bare ? null : C2.cape,
      robe: false,
      tusks: p.race === 'orc',
    };
  // legs stay bare (linen shorts) until pants are worn; gloves colour the hands
  if (e.pants) L.pants = sh(MATS[e.pants.mat][1], -0.3);
  else {
    L.shorts = UNDERWEAR;
    L.pants = p.skin;
  }
  if (bare && p.gender === 'f') L.top = UNDERWEAR; // a linen top with the shorts
  if (e.gloves) L.gloves = sh(MATS[e.gloves.mat][1], -0.12);
  if (e.armor) {
    const n = e.armor.name;
    L.armor = {
      k: /Cuirass/.test(n) ? 2 : /Hauberk/.test(n) ? 1 : 0,
      col: MATS[e.armor.mat][1],
      trim: e.armor.r >= 2 ? RAR[e.armor.r].c : null,
    };
  }
  if (e.amulet) L.amulet = RAR[e.amulet.r].c;
  if (e.helm) {
    L.helm = MATS[e.helm.mat][1];
    if (e.helm.r >= 3) L.plume = RAR[e.helm.r].c;
  }
  L.boots = e.boots ? sh(MATS[e.boots.mat][1], -0.35) : sh(p.skin, -0.12);
  if (e.armor && e.armor.r >= 2 && L.cape) L.cape = sh(RAR[e.armor.r].c, -0.35);
  return L;
}
export const xpNeed = (l) => Math.round(40 * Math.pow(l, 1.55));
