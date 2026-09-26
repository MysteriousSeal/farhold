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
  // lair bosses beaten so far (each first defeat gives a skill point)
  p.bossDone = p.bossDone || Object.keys(p.cleared).filter((k) => k[0] === 'l');
  // long hair, ponytails, curls and the topknot (a bun) are women's looks now: men with one
  // get the short cut
  if (p.gender !== 'f' && [1, 2, 9, 10].includes(p.hair)) p.hair = 0;
  // the passive skill tree replaced the old skill grid: every point spent comes back once
  p.tree = p.tree || [];
  if (p.treeV !== 1) {
    if (Object.keys(p.sp).length) p.treeNote = 1;
    p.sp = {};
    p.tree = [];
    p.treeV = 1;
  }
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
  // heroes are human now: former elves, dwarves and orcs convert (orc green skin to a tone)
  if (p.race && p.race !== 'human') {
    const ORC = ['#93c46c', '#74a85a', '#a3ac6c', '#5d8c70'],
      HUMAN = ['#f7d4b2', '#e6b187', '#c4895c', '#8a5838'], // the matching human tones
      k = ORC.indexOf(p.skin);
    if (k >= 0) p.skin = HUMAN[k];
  }
  p.race = 'human';
  // heroes from before gender choice are male, clean-shaven
  p.gender = p.gender || 'm';
  p.beard = p.beard || 0;
  // no more classes: weapons keep the family they were made as (their old owner's class when
  // unmarked), the style comes from the weapon held, and skill points are refunded once
  // into the shared tree
  if (p.cls) {
    for (const it of [...(p.inv || []), ...Object.values(p.eq || {})])
      if (it && it.slot === 'weapon' && !it.wc) it.wc = p.cls;
    delete p.cls;
  }
  if (!p.tree2) {
    p.sp = {};
    p.tree2 = 1;
  }
  return p;
}
/* ---------- save slots ---------- */
// Each hero lives in its own slot: localStorage['farhold_slot:<id>']. game.slot is the slot of
// the hero being played. The old single save is moved into a slot the first time.
const SLOT = 'farhold_slot:';
export type SlotInfo = { id: string; p: any };
/** Move a pre-slots save into its own slot (once). */
function legacy() {
  try {
    const old = localStorage.getItem(KEY) || localStorage.getItem(OLDKEY);
    if (!old) return;
    const id = 's' + Date.now().toString(36);
    const p = JSON.parse(old);
    p.last = p.last || Date.now();
    localStorage.setItem(SLOT + id, JSON.stringify(p));
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLDKEY);
  } catch (e) {}
}
/** Every saved hero, most recently played first. */
export function listSaves(): SlotInfo[] {
  legacy();
  const out: SlotInfo[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(SLOT)) continue;
      try {
        out.push({ id: k.slice(SLOT.length), p: migrate(JSON.parse(localStorage.getItem(k))) });
      } catch (e) {}
    }
  } catch (e) {}
  return out.sort((a, b) => (b.p.last || 0) - (a.p.last || 0));
}
/** A fresh slot id for a new hero. */
export const newSlot = () =>
  's' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
export function deleteSave(id: string) {
  try {
    localStorage.removeItem(SLOT + id);
  } catch (e) {}
}
export function save() {
  if (!game.P || !game.slot) return;
  try {
    const s = Object.assign({}, game.P);
    if ((game.mode === 'dungeon' || game.mode === 'house') && game.P.ret) {
      s.x = game.P.ret.x;
      s.y = game.P.ret.y;
    }
    delete s.look;
    s.last = Date.now();
    localStorage.setItem(SLOT + game.slot, JSON.stringify(s));
  } catch (e) {}
}
/** The most recently played hero (for Continue), or null. */
export function loadSave() {
  const l = listSaves();
  return l.length ? l[0] : null;
}
