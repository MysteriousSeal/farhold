import type { Poi } from '../game/types';
import { TAU, mulberry, strSeed } from '../../core/math';
import { game } from '../game/state';
import { makeHouse, makeSmithy, placeLamps, tavernHouse, villagerLook } from './poi';
import { RIVER, riverDepth, riverY, terr } from './terrain';
/* ---------- Hearthfire: the walled starting town ---------- */
// A dense walled town (world units, y grows south). The market square with the waystone is in
// the middle; the main street crosses it west to east between the gates, the south street
// runs to the south gate and the north street up to the castle keep. Terraces of houses face
// the streets and lanes, the temple and its graveyard stand in the north-west, and a river
// crosses the south quarter under three bridges, entering and leaving through grated water
// gates in the wall (its water is carved into the terrain: terrain.ts).

export const CITY = {
  /** wall ellipse */
  cy: 20,
  rx: 820,
  ry: 660,
  /** market square */
  py: 12,
  prx: 270,
  pry: 186,
  /** main street width, lane width */
  sw: 52,
  lw: 40,
  /** half width of a gate opening */
  gate: 58,
  /** front (south edge) of the keep */
  keepY: -400,
};
/** Gate directions (angles on the wall ellipse): west, east, south. */
export const GATES = [Math.PI, 0, Math.PI / 2];
export const wallPt = (a: number, grow = 0) => ({
  x: Math.cos(a) * (CITY.rx + grow),
  y: CITY.cy + Math.sin(a) * (CITY.ry + grow),
});
const wallR = (a: number) => Math.hypot(Math.cos(a) * CITY.rx, Math.sin(a) * CITY.ry);
const angDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const gateHalfAngle = (a: number) => (CITY.gate + 24) / wallR(a);
const inGate = (a: number) => GATES.some((g) => angDiff(a, g) < gateHalfAngle(g));
/** Is (x, y) inside the wall ellipse shrunk by `m` units? */
export const inWall = (x: number, y: number, m = 0) =>
  (x / (CITY.rx - m)) ** 2 + ((y - CITY.cy) / (CITY.ry - m)) ** 2 < 1;

/** Where the river passes under the wall (angles on the ellipse, east then west). */
export const WATER_GATES = [0, Math.PI].map((side) => {
  // bisect for the wall point whose y is the river's centre line
  let lo = side ? Math.PI / 2 : 0.02,
    hi = side ? Math.PI - 0.02 : Math.PI / 2;
  const f = (a: number) => {
    const p = wallPt(a);
    return p.y - riverY(p.x);
  };
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (f(m) * f(lo) > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
});
const waterHalfAngle = (a: number) => (RIVER.w + 18) / wallR(a);
const inWater = (a: number) => WATER_GATES.some((g) => angDiff(a, g) < waterHalfAngle(g));

/* ---------- streets ---------- */
const LANE_N = -190, // lane along the top of the square
  LANE_K = -385, // lanes either side of the keep
  LANE_S = 612, // lane south of the river
  ALLEY = 540, // alleys between the main street and the north lane (±x)
  BRIDGE = 440; // side bridges (±x); the south street has the middle one
/** Street centre lines, as [x0, y0, x1, y1, width]. */
export const STREETS: number[][] = [
  [-CITY.prx + 20, CITY.cy, -CITY.rx - 80, CITY.cy, CITY.sw],
  [CITY.prx - 20, CITY.cy, CITY.rx + 80, CITY.cy, CITY.sw],
  [0, CITY.py + CITY.pry - 20, 0, CITY.cy + CITY.ry + 80, CITY.sw],
  [0, CITY.py - CITY.pry + 20, 0, CITY.keepY + 30, CITY.sw],
  [-720, LANE_N, 720, LANE_N, CITY.lw],
  [-600, LANE_K, -150, LANE_K, CITY.lw],
  [150, LANE_K, 600, LANE_K, CITY.lw],
  [-290, LANE_S, 290, LANE_S, CITY.lw],
  ...[-1, 1].flatMap((s) => [
    [s * ALLEY, CITY.cy, s * ALLEY, LANE_N, 30],
    [s * BRIDGE, CITY.cy, s * BRIDGE, riverY(s * BRIDGE), 34],
  ]),
];
/** The keep's forecourt (paved, in front of its gate). */
export const FORECOURT = { x0: -150, x1: 150, y0: CITY.keepY - 4, y1: CITY.keepY + 64 };
/** Bridges over the river: centre x, half width, and the centre line's y there. */
export const BRIDGES = [-BRIDGE, 0, BRIDGE].map((x) => ({
  x,
  hw: x ? 20 : 30,
  y: riverY(x),
}));
/** Half the length of a bridge deck (quay edge to quay edge, and a little onto each). */
export const BRIDGE_HL = RIVER.w + 18;
/** Is (x, y) on one of Hearthfire's bridges (walkable over the water)? */
export const onBridge = (x: number, y: number) =>
  Math.abs(y - RIVER.y) < 120 &&
  BRIDGES.some((b) => Math.abs(x - b.x) < b.hw && Math.abs(y - b.y) < BRIDGE_HL);

/** Distance from (x, y) to the segment (x0, y0)-(x1, y1). */
const segDist = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => {
  const dx = x1 - x0,
    dy = y1 - y0,
    t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - x0 - dx * t, y - y0 - dy * t);
};
/** City houses face a street: their doorway opens straight onto it. */
export function cityLaneStart(h) {
  return { x: h.x + h.door * h.w * 0.22, y: h.y + 60 };
}

// city model weights: cottage, townhouse, stone, hut, tower
const CITY_MIX = [2, 6, 2, 0, 0.5];

/** Rebuild the plain house nearest (tx, ty) as the city tavern, as wide as its neighbours allow. */
function cityTavern(v, tx: number, ty: number) {
  let best = -1,
    bd = 1e9;
  v.houses.forEach((h, i) => {
    if (!['cottage', 'townhouse', 'stone'].includes(h.kind)) return;
    const d = Math.hypot(h.x - tx, h.y - ty);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  if (best < 0) return;
  const old = v.houses[best];
  let x0 = old.x - 80,
    x1 = old.x + 80;
  for (const q of v.houses)
    if (q !== old && Math.abs(q.y - old.y) < 80) {
      if (q.x < old.x) x0 = Math.max(x0, q.x + q.w / 2 + 12);
      else x1 = Math.min(x1, q.x - q.w / 2 - 12);
    }
  const W = Math.max(old.w, x1 - x0),
    cx = W > old.w ? (x0 + x1) / 2 : old.x;
  const h: any = tavernHouse(v, cx, old.y, W, mulberry(strSeed(v.key + '/tavern') ^ game.SEED));
  h.street = true;
  v.houses[best] = h;
  const si = v.solids.findIndex((s) => s.y1 === old.y && s.x0 === old.x - old.w / 2);
  if (si >= 0) v.solids[si] = { x0: h.x - W / 2, x1: h.x + W / 2, y0: h.y - 40, y1: h.y };
  v.tavern = h;
}

export function makeCity(key: string) {
  const rnd = mulberry(strSeed(key) ^ game.SEED),
    b = terr(0, 0).b,
    { cy, py, prx, pry } = CITY;
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
    r: 900,
    houses: [],
    lamps: [],
    solids: [],
    npcs: [],
    market: [],
    clutter: [],
    gardens: [],
    trees: [],
  };
  v.way = { x: 0, y: -6 };
  v.stall = { x: -108, y: 36 };
  v.forge = { x: 112, y: 34 };
  v.board = { x: 4, y: -104 };
  v.fountain = { x: 0, y: 118 };
  v.well = { x: -150, y: 116 };
  v.shops = [
    { kind: 'potion', label: 'Alchemist', x: -130, y: -56, awning: '#7a4fb3', goods: 'potion' },
    { kind: 'fine', label: 'Fine goods', x: 134, y: -58, awning: '#c9912c', goods: 'fine' },
  ];
  // market stalls around the square (for show: bread, cloth, fish, fruit, pots...)
  const MARKET: [number, number, string, string][] = [
    [-215, -60, '#c8523f', 'bread'],
    [215, -60, '#3f8a5a', 'cloth'],
    [-222, 96, '#3f6fa0', 'fish'],
    [222, 96, '#c9912c', 'fruit'],
    [112, 60, '#8a5a9c', 'pots'],
    [118, 150, '#c8523f', 'bread'],
    [-100, 170, '#4f8a4a', 'cloth'],
  ];
  for (const [x, y, awning, goods] of MARKET) v.market.push({ x, y, awning, goods });
  v.solids.push(
    { e: 1, x: v.way.x, y: v.way.y - 2, rx: 22, ry: 8 },
    { x0: v.board.x - 24, x1: v.board.x + 24, y0: v.board.y - 8, y1: v.board.y + 2 },
    { e: 1, x: v.fountain.x, y: v.fountain.y - 7, rx: 42, ry: 22 },
    { e: 1, x: v.well.x, y: v.well.y - 6, rx: 18, ry: 12 },
    ...[v.stall, ...v.shops, ...v.market].map((s) => ({
      x0: s.x - 34,
      x1: s.x + 34,
      y0: s.y - 26,
      y1: s.y + 2,
    })),
  );
  const box = (x0: number, x1: number, y0: number, y1: number) => v.solids.push({ x0, x1, y0, y1 });
  const addHouse = (h) => {
    v.houses.push(h);
    box(h.x - h.w / 2, h.x + h.w / 2, h.y - 40, h.y);
  };

  // the keep closes the north street; its curtain walls run back to the town wall
  const keep = {
    kind: 'keep',
    x: 0,
    y: CITY.keepY,
    w: 300,
    d: 44,
    door: 0,
    street: true,
    roof: ['#4f5a74', '#343d52'],
    wall: '#f1e2c6',
    stone: '#b8b0a2',
    doorCol: '#5a3a22',
    banner: '#c8423a',
    seed: rnd(),
    props: [],
  };
  addHouse(keep);
  const backY = (x: number) => cy - CITY.ry * Math.sqrt(1 - (x / CITY.rx) ** 2);
  v.castle = [-1, 1].map((s) => ({ x: s * 138, y0: backY(138) + 8, y1: CITY.keepY - 40 }));
  for (const c of v.castle) box(c.x - 12, c.x + 12, c.y0, c.y1);

  // the temple, with its graveyard beside it
  const temple = {
    kind: 'temple',
    x: -520,
    y: LANE_N - 24,
    w: 184,
    d: 44,
    door: 0,
    street: true,
    closed: true, // no way in (yet)
    roof: ['#5f6a7c', '#434c5c'],
    wall: '#e8e0d0',
    stone: '#c4bcae',
    doorCol: '#6b3a24',
    banner: '#3f6fa0',
    seed: rnd(),
    props: [],
  };
  addHouse(temple);
  const gy = { x0: -408, x1: -300, y0: LANE_N - 128, y1: LANE_N - 26 };
  v.graveyard = { ...gy, stones: [] };
  for (let r = 0; r < 3; r++)
    for (let k = 0; k < 4; k++)
      if (rnd() < 0.85)
        v.graveyard.stones.push({
          x: gy.x0 + 16 + k * 25 + (rnd() - 0.5) * 5,
          y: gy.y0 + 30 + r * 30,
          k: (rnd() * 3) | 0,
        });
  v.trees.push({ x: gy.x1 - 14, y: gy.y0 + 26, k: 'yew' });
  // the graveyard's low wall (open to the lane at its middle)
  box(gy.x0 - 4, gy.x1 + 4, gy.y0 - 4, gy.y0 + 4);
  box(gy.x0 - 4, gy.x0 + 4, gy.y0, gy.y1);
  box(gy.x1 - 4, gy.x1 + 4, gy.y0, gy.y1);
  for (const [a, c] of [
    [gy.x0, (gy.x0 + gy.x1) / 2 - 16],
    [(gy.x0 + gy.x1) / 2 + 16, gy.x1],
  ])
    box(a - 4, c + 4, gy.y1 - 4, gy.y1 + 4);

  // terraces of houses along the streets
  const busy = [
    { x0: -300, x1: 300, y0: CITY.keepY - 60, y1: CITY.keepY + 70 }, // keep and forecourt
    { x0: temple.x - temple.w / 2 - 14, x1: gy.x1 + 14, y0: gy.y0 - 60, y1: temple.y + 10 },
  ];
  const clear = (x0: number, x1: number, y0: number, y1: number) =>
    !busy.some((k) => x0 < k.x1 && x1 > k.x0 && y0 < k.y1 && y1 > k.y0) &&
    // the whole house, and its roof, stays inside the wall and clear of the river
    [x0, x1].every((x) => inWall(x, y0 - 30, 46) && inWall(x, y1, 40)) &&
    [x0, (x0 + x1) / 2, x1].every((x) => riverDepth(x, y1 + 12) < -16);
  let towers = 0;
  /** Pack a row of houses facing south along [x0, x1], fronts at y (or at y(x)). */
  const row = (x0: number, x1: number, y: number | ((x: number) => number), gaps: number[][]) => {
    let x = x0 + rnd() * 8;
    while (x < x1) {
      const h: any = makeHouse(b, 0, 0, rnd, towers < 3, CITY_MIX),
        w = h.w;
      h.x = x + w / 2;
      h.y = typeof y === 'number' ? y : Math.round(y(h.x));
      const gap = gaps.find(([a, c]) => x < c && x + w > a);
      if (gap) {
        x = gap[1] + 4;
        continue;
      }
      if (x + w > x1) break;
      if (!clear(x, x + w, h.y - 44, h.y)) {
        x += 16;
        continue;
      }
      h.street = true;
      h.props = [];
      if (h.kind === 'tower') towers++;
      addHouse(h);
      x += w + 8 + rnd() * 14;
    }
  };
  const alleys = [
      [-ALLEY - 22, -ALLEY + 22],
      [ALLEY - 22, ALLEY + 22],
    ],
    bridges = [
      [-BRIDGE - 30, -BRIDGE + 30],
      [BRIDGE - 30, BRIDGE + 30],
    ];
  const quayFront = (x: number) => riverY(x) - RIVER.w - 50;
  // north of the main street, either side of the square
  row(-790, -prx - 16, cy - CITY.sw / 2 - 8, alleys);
  row(prx + 16, 790, cy - CITY.sw / 2 - 8, alleys);
  // along the north lane, the keep lanes, the river (facing its north quay) and the south lane
  row(-760, -36, LANE_N - 24, []);
  row(36, 760, LANE_N - 24, []);
  row(-660, -170, LANE_K - 24, []);
  row(170, 660, LANE_K - 24, []);
  row(-780, -40, quayFront, bridges);
  row(40, 780, quayFront, bridges);
  row(-400, -40, LANE_S - 22, []);
  row(40, 400, LANE_S - 22, []);

  // the smithy and the tavern face the main street near the square
  makeSmithy(v, 360, cy);
  cityTavern(v, -360, cy);

  // walled gardens behind the riverside houses (south of the main street)
  const gTop = cy + CITY.sw / 2 + 14,
    gGaps = [
      [-BRIDGE - 30, -BRIDGE + 30],
      [-40, 40],
      [BRIDGE - 30, BRIDGE + 30],
    ];
  for (let x = -720; x < 720;) {
    const x0 = x,
      x1 = x + 96 + ((rnd() * 60) | 0),
      g0 = gGaps.find(([a, c]) => x0 < c + 6 && x1 > a - 6);
    if (g0) {
      x = g0[1] + 14;
      continue;
    }
    x = x1 + 14;
    const backs = v.houses.filter((h) => h.y > cy && h.x + h.w / 2 > x0 && h.x - h.w / 2 < x1),
      y1 = Math.min(gTop + 110, ...backs.map((h) => h.y - 52));
    if (y1 - gTop < 60 || !inWall(x0, y1, 40) || !inWall(x1, y1, 40)) continue;
    // clear of the market square
    const sq = (x: number, y: number) => (x / (prx + 24)) ** 2 + ((y - py) / (pry + 24)) ** 2 < 1;
    if ([x0, x1].some((gx) => sq(gx, gTop) || sq(gx, y1))) continue;
    const g = { x0, x1, y0: gTop, y1, beds: [] as { x: number; y: number; c: number }[] };
    for (let k = (rnd() * 3) | 0; k >= 0; k--)
      g.beds.push({
        x: x0 + 20 + rnd() * (x1 - x0 - 40),
        y: gTop + 20 + rnd() * (y1 - gTop - 34),
        c: (rnd() * 4) | 0,
      });
    v.gardens.push(g);
    if (rnd() < 0.8) v.trees.push({ x: x0 + 24 + rnd() * (x1 - x0 - 48), y: y1 - 16, k: 'oak' });
  }
  for (const t of v.trees) v.solids.push({ c: 1, x: t.x, y: t.y - 2, r: 9 });

  // the wall: segments between towers, with gates and grated water gates
  const segs: number[][] = [],
    towerList: { a: number; x: number; y: number; gate: boolean }[] = [];
  const STEP = 0.04;
  for (let a = 0; a < TAU - 1e-6; a += STEP) {
    const m = a + STEP / 2;
    if (!inGate(m)) segs.push([a, a + STEP, inWater(m) ? 1 : 0]);
  }
  for (const g of GATES)
    for (const s of [-1, 1]) {
      const a = g + s * gateHalfAngle(g);
      towerList.push({ a, ...wallPt(a), gate: true });
    }
  for (const g of WATER_GATES)
    for (const s of [-1, 1]) {
      const a = g + s * (waterHalfAngle(g) + 0.02);
      towerList.push({ a, ...wallPt(a), gate: false });
    }
  for (let a = 0.18; a < TAU; a += 0.3) {
    const p = wallPt(a);
    if (towerList.some((t) => angDiff(t.a, a) < 0.16)) continue;
    if (p.y < 0 && Math.abs(p.x) < 180) continue; // behind the keep
    towerList.push({ a, ...p, gate: false });
  }
  v.wall = {
    segs: segs.filter((q) => !q[2]),
    towers: towerList,
    // grated arches over the river, spanning the segments left out
    water: WATER_GATES.map((g) => {
      const inside = segs.filter((q) => q[2] && angDiff((q[0] + q[1]) / 2, g) < 0.3);
      return { a0: Math.min(...inside.map((q) => q[0])), a1: Math.max(...inside.map((q) => q[1])) };
    }),
  };
  for (let a = 0; a < TAU; a += 0.025) if (!inGate(a)) v.solids.push({ c: 1, ...wallPt(a), r: 18 });
  for (const tw of towerList) v.solids.push({ c: 1, x: tw.x, y: tw.y, r: tw.gate ? 40 : 32 });

  // bridge parapets
  for (const br of BRIDGES)
    for (const s of [-1, 1])
      box(
        br.x + s * br.hw - (s < 0 ? 6 : 0),
        br.x + s * br.hw + (s > 0 ? 6 : 0),
        br.y - BRIDGE_HL + 6,
        br.y + BRIDGE_HL - 6,
      );

  // street clutter: barrels, crates and sacks by the houses, carts, benches and flower tubs
  /** Is (x, y) clear of every solid and of the water? */
  const clearAt = (x: number, y: number, r: number) =>
    !v.solids.some((s) =>
      s.c || s.e
        ? Math.hypot(x - s.x, (y - s.y) * 1.2) < (s.r || s.rx) + r + 6
        : x > s.x0 - r - 4 && x < s.x1 + r + 4 && y > s.y0 - r - 4 && y < s.y1 + r + 4,
    ) && riverDepth(x, y) < -14;
  /** Can clutter stand at (x, y): clear, and off the streets and doorsteps? */
  const free = (x: number, y: number, r: number) =>
    clearAt(x, y, r) &&
    Math.hypot(x - v.way.x, y - v.way.y) > 60 &&
    // never in front of a door
    !v.houses.some(
      (h) => Math.abs(x - h.x - (h.door || 0) * h.w * 0.22) < 24 && y > h.y - 4 && y < h.y + 44,
    ) &&
    !STREETS.some(([x0, y0, x1, y1, w]) => segDist(x, y, x0, y0, x1, y1) < w / 2 - 2);
  const put = (k: string, x: number, y: number, r = 8) => {
    if (!free(x, y, r)) return false;
    v.clutter.push({ k, x, y, s: rnd() });
    v.solids.push({ c: 1, x, y: y - 2, r });
    return true;
  };
  const SMALL = ['barrel', 'crate', 'sacks', 'barrel', 'crate', 'tub', 'wood'];
  for (const h of [...v.houses]) {
    if (!['cottage', 'townhouse', 'stone', 'tower'].includes(h.kind) || rnd() < 0.35) continue;
    const side = -(h.door || 1),
      px = h.x + side * (h.w / 2 - 10);
    put(SMALL[(rnd() * SMALL.length) | 0], px, h.y + 12);
    if (rnd() < 0.4) put(SMALL[(rnd() * SMALL.length) | 0], px + side * -16, h.y + 14);
  }
  for (const m of v.market) {
    const s = rnd() < 0.5 ? -1 : 1;
    put(rnd() < 0.5 ? 'crate' : 'sacks', m.x + s * 46, m.y - 4);
    if (rnd() < 0.5) put('barrel', m.x - s * 46, m.y - 6);
  }
  for (const br of BRIDGES)
    for (const s of [-1, 1])
      put(rnd() < 0.5 ? 'barrel' : 'crate', br.x + s * (br.hw + 40), br.y - RIVER.w - 30);
  for (const [x, y] of [
    [-460, cy + 48],
    [640, cy - 42],
    [-80, CITY.keepY + 100],
    [310, LANE_N + 34],
  ])
    put('cart', x, y, 16);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    put(k % 2 ? 'bench' : 'tub', Math.cos(a) * (prx - 14), py + Math.sin(a) * (pry - 12), 9);
  }

  // lamps beside the streets and around the square
  placeLamps(
    v,
    STREETS.map(([x0, y0, x1, y1, w]) => ({
      pts: [
        { x: x0, y: y0 },
        { x: x1, y: y1 },
      ],
      w: w + 8,
    })),
    [],
    { x: 0, y: py, rx: prx + 5, ry: pry + 5 },
  );
  // lamps too near the river or the wall go
  v.lamps = v.lamps.filter((l) => riverDepth(l.x, l.y) < -14 && inWall(l.x, l.y, 40));
  v.solids = v.solids.filter((s) => !(s.c && s.r === 5) || v.lamps.some((l) => l.x === s.x));

  // townsfolk, shopkeepers, gate and keep guards
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
    look: villagerLook(rnd),
    ...extra,
  });
  const merchant = mk('merchant', v.stall.x, v.stall.y - 14),
    smith = mk('smith', v.forge.x - 4, v.forge.y + 14),
    alch = mk('merchant', v.shops[0].x, v.shops[0].y - 14),
    jewel = mk('merchant', v.shops[1].x, v.shops[1].y - 14);
  Object.assign(merchant.look, { cloth: '#3f7fbf', hat: '#c8523f' });
  Object.assign(smith.look, {
    cloth: '#5a4636',
    apron: true,
    hair: 3,
    beard: true,
    fem: false,
    stubble: false,
  });
  Object.assign(alch.look, { cloth: '#5a3f8a', robe: true, hat: '#3f2a66' });
  Object.assign(jewel.look, { cloth: '#8a2a3a', cape: '#5a1a28', hat: '#c9912c' });
  v.npcs.push(merchant, alch, jewel);
  v.smith = smith; // works inside the smithy
  // stallholders behind the market stalls
  for (const m of v.market) v.npcs.push(mk('merchant', m.x, m.y - 14));
  // townsfolk: a crowd in the square, and people about the streets and the river
  /** Put a villager near (x, y), trying a few spots around it until one is clear. */
  const folk = (x: number, y: number, range: number, spread: number) => {
    for (let k = 0; k < 12; k++) {
      const fx = x + (rnd() - 0.5) * spread * (k ? 1 : 0),
        fy = y + (rnd() - 0.5) * spread * 0.6 * (k ? 1 : 0);
      if (inWall(fx, fy, 60) && clearAt(fx, fy, 10))
        return v.npcs.push(mk('villager', fx, fy, { range }));
    }
  };
  for (let k = 0; k < 12; k++) {
    const a = rnd() * TAU,
      r = 70 + rnd() * 150;
    folk(Math.cos(a) * r, py + 20 + Math.sin(a) * r * 0.62, 200, 80);
  }
  for (const [x0, y0, x1, y1] of STREETS.slice(0, 8)) {
    const t = 0.3 + rnd() * 0.4;
    folk(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 160, 40);
  }
  for (const x of [-300, 200, 600]) folk(x, riverY(x) - RIVER.w - 26, 140, 60);
  const guard = (x: number, y: number) => {
    const gd = mk('guard', x, y);
    Object.assign(gd.look, {
      cloth: '#8a2a24',
      cloth2: '#5a1a18',
      cape: '#5a1a18',
      helm: '#9aa3ad',
      armor: { k: 1, col: '#9aa3ad', trim: null },
      boots: '#3a2a22',
    });
    v.npcs.push(gd);
  };
  for (const g of GATES) {
    const inward = wallPt(g, -64),
      tx = -Math.sin(g),
      ty = Math.cos(g);
    for (const s of [-1, 1]) guard(inward.x + tx * s * 54, inward.y + ty * s * 54);
  }
  for (const s of [-1, 1]) guard(s * 44, CITY.keepY + 26);
  return v;
}
