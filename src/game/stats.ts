import type { Look, Stats } from './types';
import { sh } from '../core/math';
import { CLS, MATS, RACE, RAR, SLOTS } from '../data/classes';
import { rank } from '../data/skills';
import { itemStat } from './items';
import { game } from './state';
export function calcStats() {
  const s: Stats = {
    hp: 100,
    atk: 10,
    def: 0,
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
  const ad = (o) => {
    for (const k in o) s[k] += o[k];
  };
  ad(CLS[game.P.cls].st);
  ad(RACE[game.P.race].st);
  const l = game.P.lvl - 1;
  s.hp += l * 14;
  s.atk += l * 2.2;
  s.def += l * 0.8;
  for (const k of SLOTS) {
    const it = game.P.eq[k];
    if (it) for (const n in it.st) s[n] += itemStat(it, n);
  }
  const c = game.P.cls;
  if (c === 'warrior') {
    s.dmgMul += 0.06 * rank('a0');
    s.arc += 0.15 * rank('a1');
    s.critd += 25 * rank('a2');
    s.hpMul += 0.07 * rank('b0');
    s.defMul += 0.12 * rank('b1');
    s.regenPct = 0.4 * rank('b2');
    s.cdr += 10 * rank('c1');
  }
  if (c === 'ranger') {
    s.crit += 4 * rank('a0');
    s.pierce += rank('a1');
    s.dmgMul += 0.1 * rank('a2');
    s.spd *= 1 + 0.05 * rank('b0');
    s.rollCd -= 0.15 * rank('b1');
    s.hpMul += 0.08 * rank('b2');
    s.cdr += 10 * rank('c1');
    s.aspd += 5 * rank('c1');
  }
  if (c === 'mage') {
    s.dmgMul += 0.06 * rank('a0');
    s.rad += 0.15 * rank('a1');
    s.twin = 0.1 * rank('a2');
    s.defMul += 0.1 * rank('b0');
    s.hpMul += 0.04 * rank('b0');
    s.leech += 1.5 * rank('b1');
    s.hpMul += 0.08 * rank('b2');
    s.cdr += 10 * rank('c1');
  }
  s.hp = Math.round(s.hp * s.hpMul);
  s.atk = Math.round(s.atk * s.dmgMul * 10) / 10;
  s.def = Math.round(s.def * s.defMul);
  s.crit = Math.min(75, Math.round(s.crit * 10) / 10);
  s.spd = Math.round(Math.min(280, s.spd));
  s.cdr = Math.min(50, s.cdr);
  s.leech = Math.min(15, s.leech);
  game.ST = s;
  game.P.look = lookOfPlayer(game.P);
  if (game.P.hp > s.hp) game.P.hp = s.hp;
}
export const UNDERWEAR = '#e6dcc4';
export function lookOfPlayer(p) {
  const e = p.eq || {};
  // Without body armor the hero is bare-skinned in linen shorts; the class outfit comes with armor.
  const bare = !e.armor;
  const C2 = CLS[p.cls],
    L: Look = {
      skin: p.skin,
      hair: p.hair,
      hairC: p.hairC,
      race: p.race,
      cloth: bare ? p.skin : C2.cloth,
      cloth2: bare ? sh(p.skin, -0.2) : C2.cloth2,
      cape: bare ? null : C2.cape,
      robe: bare ? false : C2.robe,
      tusks: p.race === 'orc',
    };
  if (bare) {
    L.shorts = UNDERWEAR;
    L.pants = p.skin;
  }
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
