import { spawnWarpPortal } from './warp';
import { gainXp } from './combat';
import { xpNeed } from './stats';
import { SFX } from '../audio/sfx';
import { mulberry, strSeed } from '../core/math';
import { settings } from '../core/settings';
import { DTABLE, ET, typesFor } from '../data/enemies';
import { ELITES, dropAt, makeBoss, makeEnemy, unstick } from './enemies';
import { banner, burst, doFade, ring, toast } from './fx';
import { genItem } from './items';
import { questEvent } from './quests';
import { save } from './save';
import { game } from './state';
import { getChunk, solidAt } from '../world/chunks';
import { genDungeon } from '../world/dungeon';
import { CH } from '../world/terrain';
/* ================= DUNGEONS ================= */
export function enterDungeon(p) {
  doFade(() => {
    game.P.ret = { x: p.x, y: p.y + 44 };
    game.mode = 'dungeon';
    game.DG = genDungeon(p.key, p.lvl, p.b);
    game.DG.name = p.name;
    game.DG.poiKey = p.key;
    // this cave's saved cycle: which enemies died, guardian, chest, reset time
    const st = caveState(p.key),
      rnd = mulberry(strSeed(p.key + ':' + st.gen)),
      rpick = (a) => a[(rnd() * a.length) | 0];
    game.DG.cave = st;
    game.DG.cleared = !!game.P.cleared[p.key];
    game.DG.guardDead = st.guardDead;
    game.DG.chest.open = st.chestOpen;
    game.DG.chest.hidden = !st.guardDead; // the chest appears once the guardian is dead
    game.enemies = [];
    game.projs = [];
    game.drops = [];
    game.teles = [];
    game.zones = [];
    game.curBoss = null;
    game.P.x = game.DG.exit.x;
    game.P.y = game.DG.exit.y + 54;
    unstick(game.P);
    game.camX = game.P.x;
    game.camY = game.P.y;
    // enemy spawns are seeded per cave and cycle, so the same ones stay dead between visits
    const slots = [],
      rooms = game.DG.rooms.filter((r) => r !== game.DG.start),
      // ~40% of rooms hold a pack, bigger rooms first (with a little randomness)
      byArea = rooms
        .map((r) => ({ r, k: r.w * r.h * (0.75 + rnd() * 0.5) }))
        .sort((a, b) => b.k - a.k),
      packRooms = new Set(byArea.slice(0, Math.round(rooms.length * PACK_SHARE)).map((o) => o.r));
    let packId = 0;
    for (const r of rooms) {
      if (packRooms.has(r)) {
        addPack(slots, r, p.lvl, rnd, rpick, packId++);
        continue;
      }
      const dn = settings.density === 'few' ? 0 : settings.density === 'many' ? 2 : 1,
        n = Math.max(1, dn + (rnd() < 0.3 ? 1 : 0) + (r.w * r.h > 90 && rnd() < 0.6 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const x = (r.x + 1 + rnd() * (r.w - 2)) * game.DG.T,
          y = (r.y + 1 + rnd() * (r.h - 2)) * game.DG.T,
          lv = p.lvl + (rnd() < 0.2 ? 1 : 0),
          type = rpick(typesFor(DTABLE, lv)),
          elite = rnd() < 0.08 ? rpick(ELITES) : null;
        if (!solidAt(x, y, ET[type].r * 0.6)) slots.push({ x, y, lv, type, elite });
      }
    }
    // at least one in five cave enemies is elite
    let need = Math.ceil(slots.length * ELITE_SHARE) - slots.filter((q) => q.elite).length;
    while (need-- > 0) {
      const plain = slots.filter((q) => !q.elite);
      if (!plain.length) break;
      rpick(plain).elite = rpick(ELITES);
    }
    slots.forEach((q, i) => {
      if (st.dead.includes(i)) return;
      const e = makeEnemy(q.type, q.lv, q.x, q.y, { elite: q.elite });
      e.dg = true;
      e.dgi = i;
      if (q.pack != null) e.pack = q.pack;
      game.enemies.push(e);
    });
    const bt = rpick(['bonelord', 'lich', 'brood']);
    if (!st.guardDead) {
      const b = makeBoss(bt, p.lvl + 1, game.DG.chest.x, game.DG.chest.y + 80, {
        mini: true,
        key: p.key,
      });
      b.aggro = false;
      b.dormant = true;
      b.dg = true;
      b.dgi = -1;
      game.enemies.push(b);
      game.DG.guard = b;
    }
    // clearing progress: every spawn of this cycle (guardian included) counts; minions don't
    game.DG.total = slots.length + 1;
    game.DG.killed = st.dead.length + (st.guardDead ? 1 : 0);
    game.DG.bonus = game.DG.killed >= game.DG.total;
    game.genBudget = 99;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        getChunk(Math.floor(game.P.x / CH) + i, Math.floor(game.P.y / CH) + j, true);
    banner(p.name, 'Danger level ' + p.lvl);
    game.zoneName = p.name;
    save();
  });
}
export function leaveDungeon(instant?) {
  const go = () => {
    // leaving a fully cleared cave starts its reset timer
    const st = game.DG && game.DG.cave;
    if (st && st.done && !st.resetAt) st.resetAt = Date.now() + RESET_MS;
    game.mode = 'world';
    const r = game.P.ret || { x: 0, y: 60 };
    game.DG = null;
    game.P.x = r.x;
    game.P.y = r.y;
    unstick(game.P);
    game.enemies = [];
    game.projs = [];
    game.drops = [];
    game.teles = [];
    game.zones = [];
    game.curBoss = null;
    game.camX = game.P.x;
    game.camY = game.P.y;
    game.zoneName = '';
    save();
  };
  if (instant) go();
  else doFade(go);
}
export function openChest() {
  const c = game.DG.chest;
  if (c.open) return;
  if (!game.DG.guardDead) {
    toast('Defeat the guardian first');
    return;
  }
  c.open = true;
  game.DG.cave.chestOpen = true;
  SFX.chest();
  ring(c.x, c.y - 14, '#ffd27a', 30, 200, 3);
  const L = game.DG.lvl;
  for (let i = 0; i < 3; i++)
    dropAt(c.x, c.y, { kind: 'item', item: genItem(L, 0.2, null, i === 0 ? 2 : 1) });
  for (let i = 0; i < 10; i++) dropAt(c.x, c.y, { kind: 'gold', amt: Math.round(4 + L * 3) });
  dropAt(c.x, c.y, { kind: 'pot' });
  game.P.cleared[game.DG.poiKey] = 1;
  questEvent('cave', game.DG.poiKey);
  banner('Treasure claimed', game.DG.name + ' cleared');
  save();
}

/** Minimum share of elite enemies in a cave. */
export const ELITE_SHARE = 0.2;
/* ---- clearing bonus ---- */
/** Share of a level's XP (at the cave level) given for killing every enemy in a cave. */
export const CLEAR_BONUS = 0.6;
/** Share of that bonus on later full clears of the same cave. */
export const REPEAT_SHARE = 0.25;
export const clearBonusXp = (lvl: number, first: boolean) =>
  Math.round(xpNeed(lvl) * CLEAR_BONUS * (first ? 1 : REPEAT_SHARE));
/** Count a cave enemy's death; the last one completes the clear and pays the XP bonus. */
export function dungeonKill(e) {
  const D = game.DG;
  if (!D) return;
  const st = D.cave;
  if (e.dgi === -1) {
    // the guardian fell: its treasure chest appears
    st.guardDead = true;
    D.guardDead = true;
    revealChest();
  } else if (!st.dead.includes(e.dgi)) st.dead.push(e.dgi);
  if (D.bonus) return save();
  D.killed++;
  if (D.killed < D.total) return save();
  D.bonus = true;
  st.done = true; // the reset timer starts when the hero leaves the cave
  const first = !game.P.dgClear[D.poiKey];
  game.P.dgClear[D.poiKey] = 1;
  const xp = clearBonusXp(D.lvl, first);
  D.bonusXp = xp;
  gainXp(xp);
  SFX.quest();
  banner(D.name + ' cleared', '+' + xp + ' xp bonus' + (first ? '' : ' (repeat clear)'));
  spawnWarpPortal();
  save();
}

/* ---- cave cycles: a full clear keeps the cave empty for 5 minutes, then it resets ---- */
export const RESET_MS = 5 * 60 * 1000;
/** Saved state of a cave's current cycle; resets it (everything respawns) once its timer ran out. */
export function caveState(key: string) {
  const all = game.P.caves,
    fresh = (gen: number) => ({
      gen,
      dead: [],
      guardDead: false,
      chestOpen: false,
      done: false,
      resetAt: 0,
      layout: CAVE_LAYOUT,
    });
  let s = all[key];
  if (!s) s = all[key] = fresh(0);
  // enemy layouts changed (packs): old kill lists no longer match their slots
  if (s.layout !== CAVE_LAYOUT) {
    s.dead = [];
    s.layout = CAVE_LAYOUT;
  }
  if (s.resetAt && Date.now() >= s.resetAt) {
    all[key] = s = fresh(s.gen + 1);
    delete game.P.cleared[key];
  }
  return s;
}
/** Milliseconds until a cleared cave resets (0 if it isn't waiting to reset). */
export function resetLeft(key: string) {
  const s = game.P && game.P.caves[key];
  return s && s.resetAt ? Math.max(0, s.resetAt - Date.now()) : 0;
}
export const fmtClock = (ms: number) => {
  const t = Math.ceil(ms / 1000);
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};
function revealChest() {
  const c = game.DG.chest;
  if (!c.hidden) return;
  c.hidden = false;
  SFX.chest();
  ring(c.x, c.y - 14, '#ffd27a', 40, 240, 3);
  burst(c.x, c.y - 10, '#ffe38a', 24, 200, 3, 80, 1);
  toast('The treasure chest appeared');
}

/* ---- packs: themed groups of 3-5 cave enemies that fight together ---- */
const CAVE_LAYOUT = 2;
/** Share of cave rooms (bigger first) that hold a pack instead of scattered enemies. */
export const PACK_SHARE = 0.4;
// themed packs: minimum cave level and members (the first one leads)
const PACKS: [number, string[]][] = [
  [1, ['skeleton', 'skeleton', 'skelarcher', 'skeleton', 'skelarcher']],
  [1, ['spider', 'spider', 'spider', 'spider', 'spider']],
  [1, ['bat', 'bat', 'bat', 'bat', 'bat']],
  [1, ['slime', 'slime', 'slime', 'slime', 'slime']],
  [3, ['cultist', 'cultist', 'skeleton', 'cultist', 'cultist']],
  [4, ['mummy', 'skeleton', 'mummy', 'skelarcher', 'mummy']],
  [5, ['necro', 'skeleton', 'skeleton', 'skelarcher', 'skeleton']],
];
/** Add a themed pack of 3-5 enemies around a point in room `r`; 4+ get an elite leader. */
function addPack(slots, r, lvl: number, rnd: () => number, rpick, id: number) {
  const T = game.DG.T,
    cx = (r.x + 2 + rnd() * Math.max(0, r.w - 4)) * T,
    cy = (r.y + 2 + rnd() * Math.max(0, r.h - 4)) * T,
    members = rpick(PACKS.filter(([min]) => lvl >= min))[1],
    size = 3 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.15 ? 1 : 0),
    a0 = rnd() * Math.PI * 2;
  for (let i = 0; i < size; i++) {
    const a = a0 + (i / size) * Math.PI * 2,
      d = i === 0 ? 0 : 30 + rnd() * 16,
      x = cx + Math.cos(a) * d,
      y = cy + Math.sin(a) * d * 0.8,
      type = members[i],
      lv = lvl + (i === 0 && rnd() < 0.5 ? 1 : 0),
      elite = i === 0 && size >= 4 ? rpick(ELITES) : null;
    if (!solidAt(x, y, ET[type].r * 0.6)) slots.push({ x, y, lv, type, elite, pack: id });
  }
}
