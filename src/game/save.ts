import { SLOTS } from '../data/classes';
import { game } from './state';
const KEY = 'farhold_save_v2',
  OLDKEY = 'farhold_save_v1';
export function migrate(p) {
  p.sp = p.sp || {};
  p.wps = p.wps || ['v0,0'];
  p.wpInfo = p.wpInfo || { 'v0,0': { name: 'Hearthfire', x: 0, y: 0, lvl: 1 } };
  p.home = p.home || 'v0,0';
  p.quests = p.quests || [];
  p.questLog = p.questLog || [];
  // bounties from before the journal: finished ones are gone, the first five are tracked
  p.quests = p.quests.filter((q) => !q.done);
  if (p.quests.every((q) => q.tracked === undefined))
    p.quests.forEach((q, i) => (q.tracked = i < 5));
  p.cleared = p.cleared || {};
  p.chests = p.chests || {};
  p.dgClear = p.dgClear || {};
  // one-time reset of cave progress: guardians, chests and full-clear bonuses come back
  if (!p.caveReset1) {
    for (const k of Object.keys(p.cleared)) if (k[0] === 'c') delete p.cleared[k];
    p.dgClear = {};
    p.caveReset1 = 1;
  }
  p.caves = p.caves || {};
  // caves cleared before cave cycles existed: guardian gone and chest looted
  for (const k of Object.keys(p.cleared))
    if (k[0] === 'c' && !p.caves[k])
      p.caves[k] = { gen: 0, dead: [], guardDead: true, chestOpen: true, resetAt: 0 };
  // a cleared cave whose timer never started (game closed inside it): loading puts the hero
  // outside, so the timer starts now
  for (const s of Object.values(p.caves) as any[])
    if (s.done && !s.resetAt) s.resetAt = Date.now() + 5 * 60 * 1000;
  p.tod = p.tod || 0.1;
  p.eq = p.eq || {};
  for (const k of SLOTS) if (!(k in p.eq)) p.eq[k] = null;
  for (const it of [...p.inv, ...Object.values(p.eq)])
    if (it) {
      it.plus = it.plus || 0;
      it.style = it.style || 0;
    }
  p.kills = p.kills || 0;
  return p;
}
export function save() {
  if (!game.P) return;
  try {
    const s = Object.assign({}, game.P);
    if (game.mode === 'dungeon' && game.P.ret) {
      s.x = game.P.ret.x;
      s.y = game.P.ret.y;
    }
    delete s.look;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {}
}
export function loadSave() {
  try {
    const s = localStorage.getItem(KEY) || localStorage.getItem(OLDKEY);
    return s ? migrate(JSON.parse(s)) : null;
  } catch (e) {
    return null;
  }
}
