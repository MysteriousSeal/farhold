import type { Poi } from '../game/types';
import { TAU, mulberry, strSeed } from '../core/math';
import { game } from '../game/state';
import { DOOR_F, houseRoute, makeHouse, placeLamps } from './poi';
import { terr } from './terrain';
/* ---------- Hearthfire: the walled starting town ---------- */
// Layout (world units, y grows south): a paved square around the waystone, four cobbled
// streets (west, east and south to the gates, north to the hall), townhouses in the four
// quarters and a crenellated wall with towers around it all.

export const CITY = {
  /** wall ellipse */
  cy: 20,
  rx: 540,
  ry: 440,
  /** paved square */
  py: 12,
  prx: 182,
  pry: 146,
  /** street width */
  sw: 46,
  /** half width of a gate opening */
  gate: 46,
  /** front (south edge) of the hall */
  hallY: -285,
};
/** Gate directions (angles on the wall ellipse): west, east, south. */
export const GATES = [Math.PI, 0, Math.PI / 2];
export const wallPt = (a: number, grow = 0) => ({
  x: Math.cos(a) * (CITY.rx + grow),
  y: CITY.cy + Math.sin(a) * (CITY.ry + grow),
});
const wallR = (a: number) => Math.hypot(Math.cos(a) * CITY.rx, Math.sin(a) * CITY.ry);
const gateHalfAngle = (a: number) => (CITY.gate + 20) / wallR(a);
const inGate = (a: number) =>
  GATES.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < gateHalfAngle(g));

/** Street centre lines, as [x0, y0, x1, y1]. */
export const STREETS = [
  [-CITY.prx + 20, CITY.cy, -CITY.rx - 70, CITY.cy],
  [CITY.prx - 20, CITY.cy, CITY.rx + 70, CITY.cy],
  [0, CITY.py + CITY.pry - 20, 0, CITY.cy + CITY.ry + 70],
  [0, CITY.py - CITY.pry + 20, 0, CITY.hallY + 10],
];

/** Where a house's lane leaves the street network (the nearest street or square edge). */
export function cityLaneStart(h) {
  const dx = h.x + h.door * h.w * DOOR_F,
    fy = h.y + 34,
    c = [
      { x: Math.abs(dx) < CITY.prx ? Math.sign(dx || 1) * CITY.prx : dx, y: CITY.cy },
      { x: 0, y: Math.min(CITY.cy + CITY.ry, Math.max(CITY.py + CITY.pry - 10, fy)) },
      { x: 0, y: Math.min(CITY.py - CITY.pry + 10, Math.max(CITY.hallY + 10, fy)) },
    ],
    a = Math.atan2((fy - CITY.py) / CITY.pry, dx / CITY.prx);
  c.push({ x: Math.cos(a) * CITY.prx * 0.9, y: CITY.py + Math.sin(a) * CITY.pry * 0.9 });
  let best = c[0];
  for (const p of c)
    if (Math.hypot(p.x - dx, p.y - fy) < Math.hypot(best.x - dx, best.y - fy)) best = p;
  return best;
}

// city model weights: cottage, townhouse, stone, hut, tower
const CITY_MIX = [2, 5, 2, 0, 0.6];
const rectsOverlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function makeCity(key: string) {
  const rnd = mulberry(strSeed(key) ^ game.SEED),
    b = terr(0, 0).b,
    { cy, rx, ry, py, prx, pry } = CITY;
  const v: Poi = {
    kind: 'village',
    key,
    x: 0,
    y: 0,
    home: true,
    city: true,
    name: 'Hearthfire',
    lvl: 1,
    b,
    r: 620,
    houses: [],
    lamps: [],
    solids: [],
    npcs: [],
  };
  v.way = { x: 0, y: -6 };
  v.stall = { x: -108, y: 36 };
  v.forge = { x: 112, y: 34 };
  v.board = { x: 4, y: -104 };
  v.fountain = { x: 0, y: 118 };
  v.well = { x: -120, y: 100 };
  v.shops = [
    { kind: 'potion', label: 'Alchemist', x: -130, y: -56, awning: '#7a4fb3', goods: 'potion' },
    { kind: 'fine', label: 'Fine goods', x: 134, y: -58, awning: '#c9912c', goods: 'fine' },
  ];
  v.solids.push(
    { e: 1, x: v.way.x, y: v.way.y - 2, rx: 22, ry: 8 },
    { x0: v.stall.x - 34, x1: v.stall.x + 34, y0: v.stall.y - 26, y1: v.stall.y + 2 },
    { x0: v.forge.x - 36, x1: v.forge.x + 30, y0: v.forge.y - 30, y1: v.forge.y + 2 },
    { x0: v.board.x - 24, x1: v.board.x + 24, y0: v.board.y - 8, y1: v.board.y + 2 },
    { e: 1, x: v.fountain.x, y: v.fountain.y - 7, rx: 42, ry: 22 },
    { e: 1, x: v.well.x, y: v.well.y - 6, rx: 18, ry: 12 },
    ...v.shops.map((s) => ({ x0: s.x - 34, x1: s.x + 34, y0: s.y - 26, y1: s.y + 2 })),
  );

  // the hall closes the north street
  const hall = {
    kind: 'hall',
    x: 0,
    y: CITY.hallY,
    w: 230,
    d: 44,
    door: 0,
    street: true, // reached by the north street, no lane of its own
    roof: ['#c8523f', '#8e3326'],
    wall: '#f1e2c6',
    stone: '#b3aa9c',
    doorCol: '#6b4423',
    banner: '#c8423a',
    seed: rnd(),
    props: [],
  };
  v.houses.push(hall);
  v.solids.push({ x0: hall.x - hall.w / 2, x1: hall.x + hall.w / 2, y0: hall.y - 40, y1: hall.y });

  // townhouses in the four quarters, on an inner and an outer ring
  const keepOut = [
    { x0: -rx - 80, x1: rx + 80, y0: cy - CITY.sw / 2 - 30, y1: cy + CITY.sw / 2 + 10 }, // W/E street
    { x0: -CITY.sw / 2 - 30, x1: CITY.sw / 2 + 30, y0: py, y1: cy + ry + 80 }, // south street
    { x0: -hall.w / 2 - 30, x1: hall.w / 2 + 30, y0: CITY.hallY - 60, y1: py - pry + 40 }, // hall + north street
  ];
  let tower = false;
  for (const mid of [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75])
    for (const [t, offs] of [
      [0.53, [-0.3, 0.3]],
      [0.78, [-0.34, 0, 0.34]],
    ] as [number, number[]][])
      for (const o of offs) {
        const a = mid + o + (rnd() - 0.5) * 0.08,
          hx = Math.cos(a) * rx * t,
          hy = cy + Math.sin(a) * ry * t + 30;
        const h = makeHouse(b, hx, hy, rnd, !tower, CITY_MIX),
          box = { x0: hx - h.w / 2 - 6, x1: hx + h.w / 2 + 6, y0: hy - 44, y1: hy + 30 };
        if (keepOut.some((k) => rectsOverlap(box, k))) continue;
        if (Math.hypot(hx / prx, (hy - py) / pry) < 1.15) continue;
        if (
          v.houses.some(
            (q) => Math.abs(q.x - h.x) < (q.w + h.w) / 2 + 16 && Math.abs(q.y - h.y) < 80,
          )
        )
          continue;
        if (h.kind === 'tower') tower = true;
        v.houses.push(h);
        v.solids.push({ x0: hx - h.w / 2, x1: hx + h.w / 2, y0: hy - 40, y1: hy });
      }

  // wall: segments between towers, with openings at the gates
  const segs: number[][] = [],
    towers: { a: number; x: number; y: number; gate: boolean }[] = [];
  const STEP = 0.05;
  for (let a = 0; a < TAU - 1e-6; a += STEP) {
    const m = a + STEP / 2;
    if (!inGate(m)) segs.push([a, a + STEP]);
  }
  for (const g of GATES)
    for (const s of [-1, 1]) {
      const a = g + s * gateHalfAngle(g);
      towers.push({ a, ...wallPt(a), gate: true });
    }
  for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75])
    towers.push({ a, ...wallPt(a), gate: false });
  v.wall = { segs, towers };
  for (let a = 0; a < TAU; a += 0.035) if (!inGate(a)) v.solids.push({ c: 1, ...wallPt(a), r: 16 });
  for (const tw of towers) v.solids.push({ c: 1, x: tw.x, y: tw.y, r: 26 });

  // lamps beside the streets and around the square
  placeLamps(
    v,
    STREETS.map(([x0, y0, x1, y1]) => ({
      pts: [
        { x: x0, y: y0 },
        { x: x1, y: y1 },
      ],
      w: CITY.sw + 8,
    })),
    v.houses.filter((h) => !h.street).map((h) => ({ pts: houseRoute(v, h), w: 27 })),
    { x: 0, y: py, rx: prx + 5, ry: pry + 5 },
  );

  // townsfolk, shopkeepers and gate guards
  const skins = ['#f7d4b2', '#e6b187', '#c4895c', '#8a5838'],
    hairs = ['#2b1d14', '#6b3e1f', '#c9803a', '#f0d27a', '#e4e4e4'],
    cl = ['#8a6a4a', '#5a7a9a', '#9a5a5a', '#6a8a5a', '#a08050', '#7a6a9a'];
  const mk = (role: string, px: number, py2: number, extra = {}) => ({
    role,
    x: px,
    y: py2,
    hx: px,
    hy: py2,
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
    ...extra,
  });
  const merchant = mk('merchant', v.stall.x, v.stall.y - 14),
    smith = mk('smith', v.forge.x - 4, v.forge.y + 14),
    alch = mk('merchant', v.shops[0].x, v.shops[0].y - 14),
    jewel = mk('merchant', v.shops[1].x, v.shops[1].y - 14);
  Object.assign(merchant.look, { cloth: '#3f7fbf', hat: '#c8523f' });
  Object.assign(smith.look, { cloth: '#5a4636', apron: true, hair: 3, beard: true });
  Object.assign(alch.look, { cloth: '#5a3f8a', robe: true, hat: '#3f2a66' });
  Object.assign(jewel.look, { cloth: '#8a2a3a', cape: '#5a1a28', hat: '#c9912c' });
  v.npcs.push(merchant, smith, alch, jewel);
  for (let k = 0; k < 9; k++) {
    const a = rnd() * TAU,
      r = 60 + rnd() * 160;
    v.npcs.push(mk('villager', Math.cos(a) * r, py + 40 + Math.sin(a) * r * 0.6, { range: 300 }));
  }
  for (const g of GATES) {
    const inward = wallPt(g, -52),
      tx = -Math.sin(g),
      ty = Math.cos(g);
    for (const s of [-1, 1]) {
      const gd = mk('guard', inward.x + tx * s * 44, inward.y + ty * s * 44);
      Object.assign(gd.look, {
        cloth: '#8a2a24',
        cloth2: '#5a1a18',
        cape: '#5a1a18',
        helm: '#9aa3ad',
        armor: { k: 1, col: '#9aa3ad', trim: null },
        boots: '#3a2a22',
      });
      v.npcs.push(gd);
    }
  }
  return v;
}
