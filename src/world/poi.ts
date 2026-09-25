import type { Poi } from '../game/types';
import { TAU, angDiff, hs, mulberry, rand, strSeed } from '../core/math';
import { BOSS } from '../data/bosses';
import { game } from '../game/state';
import { dangerAt, terr, walkT } from './terrain';
/* ---------- Points of interest ---------- */
export const PC = 1700,
  poiCache = new Map();
const VPRE = [
    'Oak',
    'Ash',
    'Mill',
    'Brook',
    'Stone',
    'Wynd',
    'Thorn',
    'Elder',
    'Fern',
    'Frost',
    'Sand',
    'Marsh',
    'Raven',
    'Bramble',
    'Gold',
  ],
  VSUF = ['ford', 'haven', 'stead', 'wick', 'bury', 'dale', 'mere', 'holt', 'by', 'well'];
const CPRE = [
    'Gloom',
    'Echo',
    'Bone',
    'Whisper',
    'Crystal',
    'Spider',
    'Drip',
    'Shadow',
    'Rat',
    'Howl',
  ],
  CSUF = ['hollow', 'deep', 'warren', 'grotto', 'pit', 'caverns', 'den'];
const BNAMES = [
  'Gorvak',
  'Morgra',
  'Skarn',
  'Vexis',
  'Ulgoth',
  'Thrask',
  'Nyssa',
  'Korrin',
  'Zalthor',
  'Bryn',
  'Hagra',
  'Oskel',
];
function checkVillage(v) {
  for (const pt of [
    v.stall,
    v.forge,
    v.board,
    v.way,
    { x: v.x, y: v.y + 40 },
    ...v.houses.map((h) => ({ x: h.x + h.door * h.w * 0.22, y: h.y })),
  ]) {
    for (const dy of [0, 30]) {
      const T = terr(pt.x, pt.y + dy);
      if (!walkT(T) || T.t === 1) return null;
    }
  }
  return v;
}
function areaOk(px, py, rad) {
  const T0 = terr(px, py);
  if (!walkT(T0) || T0.t >= 4 || T0.t === 1) return false;
  for (const f of [0.35, 0.7, 1])
    for (let q = 0; q < 12; q++) {
      const T = terr(
        px + Math.cos((q / 12) * TAU) * rad * f,
        py + Math.sin((q / 12) * TAU) * rad * f * 0.85,
      );
      if (!walkT(T) || T.t === 1 || T.t === 5) return false;
    }
  return true;
}
function findLand(x, y, rad) {
  for (let a = 0; a < 18; a++) {
    const px = x + (a ? Math.cos(a * 2.4) * a * 45 : 0),
      py = y + (a ? Math.sin(a * 2.4) * a * 45 : 0);
    if (areaOk(px, py, rad)) return { x: px, y: py };
  }
  return null;
}
export function poiAt(i, j) {
  const k = i + ',' + j;
  if (poiCache.has(k)) return poiCache.get(k);
  let p = null;
  if (i === 0 && j === 0) p = makeVillage(0, 0, 'v0,0', true);
  else {
    const r = hs(i, j, 101),
      x = (i + 0.22 + hs(i, j, 102) * 0.56) * PC,
      y = (j + 0.22 + hs(i, j, 103) * 0.56) * PC;
    if (Math.hypot(x, y) > 1000) {
      const kind = r < 0.27 ? 'village' : r < 0.54 ? 'cave' : r < 0.8 ? 'lair' : null;
      if (kind) {
        const s = findLand(x, y, kind === 'village' ? 270 : kind === 'lair' ? 190 : 120);
        if (s)
          p =
            kind === 'village'
              ? checkVillage(makeVillage(s.x, s.y, 'v' + k))
              : kind === 'cave'
                ? makeCave(s.x, s.y, 'c' + k)
                : makeLair(s.x, s.y, 'l' + k);
      }
    }
  }
  poiCache.set(k, p);
  return p;
}
export function poisNear(x, y, rad) {
  const out = [];
  const i0 = Math.floor((x - rad - 400) / PC),
    i1 = Math.floor((x + rad + 400) / PC),
    j0 = Math.floor((y - rad - 400) / PC),
    j1 = Math.floor((y + rad + 400) / PC);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const p = poiAt(i, j);
      if (p && Math.abs(p.x - x) < rad + p.r && Math.abs(p.y - y) < rad + p.r) out.push(p);
    }
  return out;
}
const ROOFS = [
  ['#c8523f', '#8e3326'],
  ['#4f6fb3', '#34497c'],
  ['#6b8f4a', '#475f31'],
  ['#b9853f', '#7d5a2a'],
  ['#8a5a9c', '#5e3b6c'],
];
function makeVillage(x, y, key, home?) {
  const rnd = mulberry(strSeed(key) ^ game.SEED),
    T = terr(x, y);
  const v: Poi = {
    kind: 'village',
    key,
    x,
    y,
    home: !!home,
    name: home ? 'Hearthfire' : VPRE[(rnd() * VPRE.length) | 0] + VSUF[(rnd() * VSUF.length) | 0],
    lvl: Math.max(1, dangerAt(x, y)),
    b: T.b,
    r: 290,
    houses: [],
    lamps: [],
    solids: [],
    npcs: [],
  };
  v.way = { x, y: y - 6 };
  v.stall = { x: x - 108, y: y + 36 };
  v.forge = { x: x + 112, y: y + 34 };
  v.board = { x: x + 4, y: y - 104 };
  v.solids.push(
    { c: 1, x: v.way.x, y: v.way.y - 4, r: 15 },
    { x0: v.stall.x - 34, x1: v.stall.x + 34, y0: v.stall.y - 26, y1: v.stall.y + 2 },
    { x0: v.forge.x - 36, x1: v.forge.x + 30, y0: v.forge.y - 30, y1: v.forge.y + 2 },
    { x0: v.board.x - 24, x1: v.board.x + 24, y0: v.board.y - 8, y1: v.board.y + 2 },
  );
  const n = home ? 4 : 3 + ((rnd() * 3) | 0),
    base = rnd() * TAU;
  for (let k = 0; k < n; k++) {
    const a = base + (k / n) * TAU + rand(-0.2, 0.2) * 0,
      rad = 205 + rnd() * 25,
      hx = x + Math.cos(a) * rad,
      hy = y + Math.sin(a) * rad * 0.8 + 30,
      w = (78 + rnd() * 26) | 0;
    if (Math.abs(hx - v.board.x) < 70 && hy < y - 60) continue;
    const roof = ROOFS[(rnd() * ROOFS.length) | 0],
      h = {
        x: hx,
        y: hy,
        w,
        d: 44,
        roof,
        wall: v.b === 3 ? '#e8cfa0' : v.b === 4 ? '#e6e0d6' : '#f1e2c6',
        snow: v.b === 4,
        door: rnd() < 0.5 ? -1 : 1,
        chim: rnd() < 0.7,
        seed: rnd(),
      };
    if (
      v.houses.some((o) => Math.abs(o.x - h.x) < (o.w + h.w) / 2 + 14 && Math.abs(o.y - h.y) < 70)
    )
      continue;
    // keep the main road running south from the plaza clear of houses
    if (h.y > y && Math.abs(h.x - x) < w / 2 + 30) continue;
    v.houses.push(h);
    v.solids.push({ x0: hx - w / 2, x1: hx + w / 2, y0: hy - 40, y1: hy });
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.785;
    v.lamps.push({ x: x + Math.cos(a) * 140, y: y + Math.sin(a) * 112 + 10 });
    v.solids.push({ c: 1, x: x + Math.cos(a) * 140, y: y + Math.sin(a) * 112 + 10, r: 5 });
  }
  const skins = ['#f7d4b2', '#e6b187', '#c4895c', '#8a5838'],
    hairs = ['#2b1d14', '#6b3e1f', '#c9803a', '#f0d27a', '#e4e4e4'],
    cl = ['#8a6a4a', '#5a7a9a', '#9a5a5a', '#6a8a5a', '#a08050', '#7a6a9a'];
  const mk = (role, px, py) => ({
    role,
    x: px,
    y: py,
    hx: px,
    hy: py,
    dx: 0,
    dy: 1,
    walk: 0,
    moving: false,
    wt: rnd() * 3,
    look: {
      skin: skins[(rnd() * 4) | 0],
      hair: (rnd() * 4) | 0,
      hairC: hairs[(rnd() * 5) | 0],
      race: 'human',
      cloth: cl[(rnd() * cl.length) | 0],
      cape: null,
    },
  });
  v.npcs.push(
    Object.assign(mk('merchant', v.stall.x, v.stall.y - 14), {}),
    Object.assign(mk('smith', v.forge.x - 4, v.forge.y + 14), {}),
  );
  v.npcs[0].look.cloth = '#3f7fbf';
  v.npcs[0].look.hat = '#c8523f';
  v.npcs[1].look.cloth = '#5a4636';
  v.npcs[1].look.apron = true;
  v.npcs[1].look.hair = 3;
  v.npcs[1].look.beard = true;
  for (let k = 0; k < (home ? 3 : 2 + ((rnd() * 3) | 0)); k++) {
    const a = rnd() * TAU;
    v.npcs.push(mk('villager', x + Math.cos(a) * 80, y + Math.sin(a) * 60 + 40));
  }
  return v;
}
function makeCave(x, y, key) {
  const rnd = mulberry(strSeed(key) ^ game.SEED);
  return {
    kind: 'cave',
    key,
    x,
    y,
    r: 120,
    lvl: dangerAt(x, y) + 1,
    b: terr(x, y).b,
    name: 'The ' + CPRE[(rnd() * CPRE.length) | 0] + CSUF[(rnd() * CSUF.length) | 0],
    solids: [
      { c: 1, x: x - 34, y: y - 34, r: 30 },
      { c: 1, x: x + 34, y: y - 34, r: 30 },
      { c: 1, x, y: y - 52, r: 34 },
    ],
  };
}
const BIOME_BOSS = [
  ['warlord', 'slimeking'],
  ['brood', 'warlord'],
  ['warlord', 'brood'],
  ['colossus', 'bonelord'],
  ['troll', 'bonelord'],
  ['slimeking', 'lich'],
  ['demonlord', 'lich'],
];
function makeLair(x, y, key) {
  const rnd = mulberry(strSeed(key) ^ game.SEED),
    b = terr(x, y).b,
    bt = BIOME_BOSS[b][(rnd() * 2) | 0];
  const l: Poi = {
    kind: 'lair',
    key,
    x,
    y,
    r: 200,
    lvl: dangerAt(x, y) + 2,
    b,
    boss: bt,
    bname: BNAMES[(rnd() * BNAMES.length) | 0],
    solids: [],
    pillars: [],
  };
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + rnd() * 0.3;
    if (Math.abs(angDiff(a, Math.PI / 2)) < 0.4) continue;
    const px = x + Math.cos(a) * 160,
      py = y + Math.sin(a) * 120;
    l.pillars.push({ x: px, y: py, h: (30 + rnd() * 40) | 0, broken: rnd() < 0.5 });
    l.solids.push({ c: 1, x: px, y: py - 4, r: 13 });
  }
  l.name = BOSS[bt].n + "'s Lair";
  return l;
}
export function poiSolid(p, x, y, r) {
  for (const s of p.solids) {
    if (s.c) {
      const dx = x - s.x,
        dy = (y - s.y) * 1.3;
      if (dx * dx + dy * dy < (s.r + r) * (s.r + r)) return true;
    } else if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r * 0.6 && y < s.y1 + r * 0.6)
      return true;
  }
  return false;
}

/* ---------- Village paths ---------- */
type Pt = { x: number; y: number };
const segHitsRect = (a: Pt, b: Pt, x0: number, y0: number, x1: number, y1: number) => {
  // Liang–Barsky clip of segment ab against the rectangle
  let t0 = 0,
    t1 = 1;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - x0],
    [dx, x1 - a.x],
    [-dy, a.y - y0],
    [dy, y1 - a.y],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
};
/**
 * Waypoints for the dirt path from a village plaza to a house door. The path walks around the
 * house (walls and roof) and always arrives at the door from the front.
 */
export function houseRoute(v: Pt, h): Pt[] {
  const P = { x: v.x, y: v.y + 10 },
    dx = h.x + h.door * h.w * 0.22,
    D = { x: dx, y: h.y - 4 },
    F = { x: dx, y: h.y + 34 },
    // house footprint including the roof, with a margin for the path width
    x0 = h.x - h.w / 2 - 22,
    x1 = h.x + h.w / 2 + 22,
    y0 = h.y - 118,
    y1 = h.y + 14,
    corners = (s: number) => ({
      top: { x: h.x + s * (h.w / 2 + 34), y: h.y - 128 },
      bot: { x: h.x + s * (h.w / 2 + 34), y: h.y + 34 },
    });
  const routes: Pt[][] = [[P, F, D]];
  for (const s of [h.door, -h.door]) {
    const c = corners(s);
    routes.push([P, c.bot, F, D], [P, c.top, c.bot, F, D]);
  }
  const len = (r: Pt[]) =>
    r.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - r[i].x, q.y - r[i].y), 0);
  const ok = (r: Pt[]) =>
    // the final F -> D step goes into the doorway by design
    r.slice(1, -1).every((q, i) => !segHitsRect(r[i], q, x0, y0, x1, y1));
  const valid = routes.filter(ok).sort((a, b) => len(a) - len(b));
  return valid[0] || routes[routes.length - 1];
}
