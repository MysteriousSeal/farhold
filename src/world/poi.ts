import type { Poi } from '../game/types';
import { TAU, angDiff, hs, mulberry, strSeed } from '../core/math';
import { BOSS } from '../data/bosses';
import { game } from '../game/state';
import { dangerAt, terr, walkT } from './terrain';
import { cityLaneStart, makeCity } from './city';
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
    ...v.houses.map((h) => ({ x: h.x + h.door * h.w * DOOR_F, y: h.y })),
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
  if (i === 0 && j === 0) p = makeCity('v0,0');
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
/* ---------- Houses ---------- */
/** Door offset from the house centre, as a share of its width (models and paths agree). */
export const DOOR_F = 0.22;
/** Drawn height of each house model above the ground (paths keep clear of it). */
export const HOUSE_HEIGHT = {
  cottage: 104,
  townhouse: 150,
  stone: 86,
  hut: 90,
  tower: 196,
  hall: 172,
  smithy: 120,
};
export const HOUSE_PROPS = ['barrel', 'crate', 'wood', 'pot', 'bench', 'fence'];
// model weights per biome: cottage, townhouse, stone, hut, tower
const HOUSE_MIX = [
  [4, 2, 1, 2, 0.6], // meadow
  [3, 1, 2, 3, 0.5], // forest
  [3, 3, 1, 1, 0.6], // autumn wood
  [2, 1, 4, 0, 0.8], // desert
  [2, 1, 4, 0, 0.8], // tundra
  [2, 0, 0.5, 5, 0], // swamp
  [0, 1, 4, 0, 1.2], // blightlands
];
const KINDS = ['cottage', 'townhouse', 'stone', 'hut', 'tower'],
  WIDTH = {
    cottage: [78, 26],
    townhouse: [72, 18],
    stone: [76, 22],
    hut: [64, 16],
    tower: [54, 8],
  },
  STONE = ['#a9a49a', '#a39e92', '#aea292', '#d6b27a', '#b8c0c8', '#8f9486', '#7a6a8a'],
  SLATE = ['#5f6a7c', '#5a6674', '#6a6070', '#a8785a', '#5a6272', '#55604e', '#4e4460'],
  DOORS = ['#6b4423', '#7a3b2a', '#3f5a7a', '#4f6b3a'],
  SHUTTERS = ['#3f6fa0', '#4f8a4a', '#a0443a', '#6b4a32'];
/** A village house: its model depends on the biome; colours and details are seeded. */
export function makeHouse(
  b: number,
  x: number,
  y: number,
  rnd: () => number,
  towerOk: boolean,
  weights: number[] = HOUSE_MIX[b],
) {
  const mix = weights.map((wgt, i) => (KINDS[i] === 'tower' && !towerOk ? 0 : wgt)),
    total = mix.reduce((a, q) => a + q, 0);
  let r = rnd() * total,
    ki = 0;
  while (r > mix[ki]) r -= mix[ki++];
  const kind = KINDS[ki],
    [w0, wr] = WIDTH[kind],
    props: string[] = [];
  for (let i = (rnd() * 3) | 0; i > 0; i--)
    props.push(HOUSE_PROPS[(rnd() * HOUSE_PROPS.length) | 0]);
  return {
    kind,
    x,
    y,
    w: (w0 + rnd() * wr) | 0,
    d: 44,
    roof: ROOFS[(rnd() * ROOFS.length) | 0],
    wall: b === 3 ? '#e8cfa0' : b === 4 ? '#e6e0d6' : '#f1e2c6',
    stone: STONE[b],
    slate: SLATE[b],
    thatch: b === 5 ? '#a89a52' : '#c9a55a',
    daub: b === 5 ? '#b8a880' : '#d8c49a',
    doorCol: DOORS[(rnd() * DOORS.length) | 0],
    shut: rnd() < 0.5 ? SHUTTERS[(rnd() * SHUTTERS.length) | 0] : null,
    box: rnd() < 0.5,
    sign: rnd() < 0.3,
    banner: rnd() < 0.5 ? '#c8423a' : '#3f6fa0',
    snow: b === 4,
    door: rnd() < 0.5 ? -1 : 1,
    chim: kind !== 'tower' && rnd() < 0.7,
    seed: rnd(),
    props,
    b, // biome (moss on roofs, ivy...); no extra random draw, so layouts stay the same
  };
}
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
    { e: 1, x: v.way.x, y: v.way.y - 2, rx: 22, ry: 8 },
    { x0: v.stall.x - 34, x1: v.stall.x + 34, y0: v.stall.y - 26, y1: v.stall.y + 2 },
    { x0: v.board.x - 24, x1: v.board.x + 24, y0: v.board.y - 8, y1: v.board.y + 2 },
  );
  const n = home ? 5 : 4 + ((rnd() * 3) | 0),
    base = rnd() * TAU;
  let tower = false;
  for (let k = 0; k < n; k++) {
    const a = base + (k / n) * TAU,
      rad = 212 + rnd() * 40,
      hx = x + Math.cos(a) * rad,
      hy = y + Math.sin(a) * rad * 0.8 + 30;
    if (Math.abs(hx - v.board.x) < 70 && hy < y - 60) continue;
    const h = makeHouse(v.b, hx, hy, rnd, !tower);
    if (
      v.houses.some((o) => Math.abs(o.x - h.x) < (o.w + h.w) / 2 + 14 && Math.abs(o.y - h.y) < 70)
    )
      continue;
    // keep the main road running south from the plaza clear of houses
    if (h.y > y && Math.abs(h.x - x) < h.w / 2 + 30) continue;
    if (h.kind === 'tower') tower = true;
    v.houses.push(h);
    v.solids.push({ x0: hx - h.w / 2, x1: hx + h.w / 2, y0: hy - 40, y1: hy });
  }
  makeSmithy(v, x + 160, y + 20);
  placeLamps(
    v,
    [], // no road leaves the village: lamps ring the plaza and line the house lanes
    v.houses.map((h) => ({ pts: houseRoute(v, h), w: 26 })),
    { x, y: y + 10, rx: 128, ry: 96 },
  );
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
    look: villagerLook(rnd),
  });
  const merchant = mk('merchant', v.stall.x, v.stall.y - 14),
    smith = mk('smith', 0, 0); // works inside the smithy (see world/interior.ts)
  v.npcs.push(merchant);
  merchant.look.cloth = '#3f7fbf';
  merchant.look.hat = '#c8523f';
  Object.assign(smith.look, {
    cloth: '#5a4636',
    apron: true,
    hair: 3,
    beard: true,
    fem: false,
    stubble: false,
  });
  v.smith = smith;
  for (let k = 0; k < (home ? 3 : 2 + ((rnd() * 3) | 0)); k++) {
    const a = rnd() * TAU;
    v.npcs.push(mk('villager', x + Math.cos(a) * 80, y + Math.sin(a) * 60 + 40));
  }
  return v;
}
/**
 * Turn the house nearest to (tx, ty) into the village smithy (not a tower or the hall): the
 * blacksmith works inside it, behind his counter.
 */
export function makeSmithy(v, tx: number, ty: number) {
  let best = null,
    bd = 1e9;
  for (const h of v.houses) {
    if (h.kind === 'tower' || h.kind === 'hall') continue;
    const d = Math.hypot(h.x - tx, h.y - ty);
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  if (!best) return;
  best.kind = 'smithy';
  best.props = [];
  best.chim = true;
  best.sign = true;
  v.smithy = best;
}
/**
 * A random villager's looks (gender, skin, hair and clothes) from the seeded `rnd`: about
 * half are women; some men have a beard or stubble.
 */
export function villagerLook(rnd: () => number): Record<string, any> {
  const skins = ['#f7d4b2', '#e6b187', '#c4895c', '#8a5838'],
    hairs = ['#2b1d14', '#6b3e1f', '#c9803a', '#f0d27a', '#e4e4e4'],
    cl = ['#8a6a4a', '#5a7a9a', '#9a5a5a', '#6a8a5a', '#a08050', '#7a6a9a'],
    fem = rnd() < 0.5,
    L: Record<string, any> = {
      skin: skins[(rnd() * 4) | 0],
      hair: fem
        ? [4, 12, 1, 2, 5, 11, 9, 6][(rnd() * 8) | 0]
        : [0, 7, 1, 2, 9, 10, 8, 3][(rnd() * 8) | 0],
      hairC: hairs[(rnd() * 5) | 0],
      race: 'human',
      cloth: cl[(rnd() * cl.length) | 0],
      cape: null,
      fem,
    };
  if (!fem) {
    const q = rnd();
    if (q < 0.22) L.beard = true;
    else if (q < 0.42) L.stubble = true;
  }
  return L;
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
      // the whole base of the rock mound; only the doorway at the front is reachable
      { x0: x - 84, x1: x + 84, y0: y - 68, y1: y - 6 },
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
    l.solids.push({ e: 1, x: px, y: py - 4, rx: 15, ry: 5 });
  }
  l.name = BOSS[bt].n + "'s Lair";
  return l;
}
/**
 * Is a body of radius `r` at (x, y) inside one of the place's solids? Solids are circles
 * (`c`), ellipses matching a prop's drawn base (`e`: rx × ry) or boxes (x0..x1, y0..y1).
 */
export function poiSolid(p, x, y, r) {
  for (const s of p.solids) {
    if (s.e) {
      const dx = (x - s.x) / (s.rx + r),
        dy = (y - s.y) / (s.ry + r * 0.6);
      if (dx * dx + dy * dy < 1) return true;
    } else if (s.c) {
      const dx = x - s.x,
        dy = (y - s.y) * 1.3;
      if (dx * dx + dy * dy < (s.r + r) * (s.r + r)) return true;
    } else if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r * 0.6 && y < s.y1 + r * 0.6)
      return true;
  }
  return false;
}

/** Is (x, y) inside one of the places near the player (dry ground, no swamp pools)? */
export const inPlaceNow = (x: number, y: number) =>
  game.activePois.some((p) => Math.hypot(x - p.x, (y - p.y) * 1.15) < p.r + 20);

/* ---------- Street lamps ---------- */
type Road = { pts: { x: number; y: number }[]; w: number };
const segDist = (x: number, y: number, a, b) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
};
/** Lamp spacing along streets and around squares (world units). */
export const LAMP_GAP = 130;
/**
 * Put lamps beside (never on) the roads: a ring just outside the square/plaza and rows along
 * `streets` on alternating sides. Spots on any road or lane, inside a building/wall or too
 * close to another lamp are skipped.
 */
export function placeLamps(v, streets: Road[], lanes: Road[], sq) {
  const roads = [...streets, ...lanes],
    lamps: { x: number; y: number }[] = [];
  const ok = (x: number, y: number) =>
    !roads.some((r) =>
      r.pts.some((p, i) => i > 0 && segDist(x, y, r.pts[i - 1], p) < r.w / 2 + 10),
    ) &&
    ((x - sq.x) / (sq.rx + 8)) ** 2 + ((y - sq.y) / (sq.ry + 8)) ** 2 > 1 &&
    !poiSolid(v, x, y, 16) &&
    lamps.every((l) => Math.hypot(l.x - x, l.y - y) > 70);
  const n = Math.max(4, Math.round((TAU * ((sq.rx + sq.ry) / 2 + 24)) / LAMP_GAP));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + 0.3,
      x = sq.x + Math.cos(a) * (sq.rx + 24),
      y = sq.y + Math.sin(a) * (sq.ry + 20);
    if (ok(x, y)) lamps.push({ x, y });
  }
  for (const s of streets) {
    let side = 1;
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1],
        b = s.pts[i],
        len = Math.hypot(b.x - a.x, b.y - a.y),
        nx = -(b.y - a.y) / len,
        ny = (b.x - a.x) / len;
      for (let d = 70; d < len; d += LAMP_GAP, side = -side) {
        const px = a.x + ((b.x - a.x) * d) / len + nx * side * (s.w / 2 + 16),
          py = a.y + ((b.y - a.y) * d) / len + ny * side * (s.w / 2 + 16);
        if (ok(px, py)) lamps.push({ x: px, y: py });
      }
    }
  }
  for (const l of lamps) {
    v.lamps.push(l);
    v.solids.push({ c: 1, x: l.x, y: l.y, r: 5 });
  }
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
export function houseRoute(v, h): Pt[] {
  // in the city, lanes branch off the nearest street; in villages they start at the plaza
  const P = v.city ? cityLaneStart(h) : { x: v.x, y: v.y + 10 },
    dx = h.x + h.door * h.w * DOOR_F,
    D = { x: dx, y: h.y - 4 },
    F = { x: dx, y: h.y + 34 },
    // house footprint including the roof, with a margin for the path width
    x0 = h.x - h.w / 2 - 22,
    x1 = h.x + h.w / 2 + 22,
    y0 = h.y - (HOUSE_HEIGHT[h.kind] || 104) - 14,
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
