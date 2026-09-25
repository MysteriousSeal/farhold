import { mulberry, strSeed } from '../core/math';
import { game } from '../game/state';
import { villagerLook } from './poi';
/* ================= HOUSE INTERIORS (generation) ================= */
// Every village house (and Hearthfire's hall) has a seeded interior: a grid of floor cells
// inside walls, split into 1–3 rooms joined by doorways, furnished by house model and room
// purpose, with 0–3 residents who can be talked to. Coordinates are local to the interior;
// cell (i, j) covers [i*T, (i+1)*T] × [j*T, (j+1)*T]. Walls are the grid's border cells.

export const IT = 40; // cell size (world units)
export type Furn = {
  k: string;
  /** cell rectangle */
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  /** world anchor: centre x, base (front edge) y */
  x: number;
  y: number;
  s: number; // seed 0..1 for per-piece variation
  col?: string;
  flip?: boolean;
};
export type WallDeco = { k: string; x: number; w: number; s: number; col?: string };
export type Room = { x0: number; x1: number; purpose: string };
export type Interior = {
  key: string;
  name: string;
  sub: string;
  kind: string;
  floor: 'wood' | 'stone' | 'earth' | 'hall';
  pal: { wall: string; trim: string; floor: string; floor2: string; roof: string };
  GW: number;
  GH: number;
  grid: Uint8Array; // 1 = floor
  rooms: Room[];
  parts: number[]; // x cells of partition walls
  gaps: Record<number, number>; // partition x → first row of its doorway (2 rows)
  door: { cx: number; x: number; y: number };
  furn: Furn[];
  deco: WallDeco[];
  solids: any[]; // same shapes as place solids (see poiSolid)
  npcs: any[];
  b: number;
  miniImg?: HTMLCanvasElement;
};

// interior size (cells) and room count by house model
const SIZE = {
  hut: { w: [5, 6], d: [4, 4], rooms: [1, 1], floor: 'earth' },
  cottage: { w: [7, 8], d: [5, 5], rooms: [1, 2], floor: 'wood' },
  stone: { w: [8, 9], d: [5, 6], rooms: [2, 2], floor: 'stone' },
  townhouse: { w: [9, 11], d: [6, 6], rooms: [2, 3], floor: 'wood' },
  tower: { w: [7, 7], d: [6, 6], rooms: [1, 1], floor: 'stone' },
  hall: { w: [15, 15], d: [8, 8], rooms: [1, 1], floor: 'hall' },
};
const SURNAMES = [
  'Ashby',
  'Brandt',
  'Corwin',
  'Dunmore',
  'Elwood',
  'Fenwick',
  'Garrow',
  'Hale',
  'Ivers',
  'Kettle',
  'Lowell',
  'Marsh',
  'Norrow',
  'Oakes',
  'Pell',
  'Quill',
  'Reeve',
  'Sorrel',
  'Thorne',
  'Umber',
  'Vane',
  'Wick',
  'Yarrow',
  'Barrow',
  'Cobble',
  'Darrow',
  'Finch',
  'Holt',
  'Mercer',
];
const LINES = [
  'Mind the mud on your boots, traveller.',
  'The roads grow wilder every season.',
  'Stay for the fire a while. It keeps the dark out.',
  'My grandmother swore the waystones hum at night.',
  "If you're heading out, take a potion or three.",
  'Wolves took two of our sheep last week.',
  'The blacksmith can make old steel sing again.',
  "I'd not wander into caves alone, if I were you.",
  'Bounties pay well, but the dead spend nothing.',
  "Farther from Hearthfire, the beasts grow meaner. That's the old saying.",
  'Wipe your feet! Oh... never mind.',
  'Is it raining again? It always rains when the stew is ready.',
  'They say a warlord sleeps in a lair not far from here.',
  'Heroes come and go. Most go.',
  'Care for some bread? It is only a little stale.',
  "I heard the market's got new wares today.",
  'The nights have been restless. Something howls in the hills.',
  'Close the door behind you, the draught is terrible.',
];
const BIOME_LINES = [
  ['The meadows are lovely this time of year.', 'Good soil here. Good people too.'],
  ['The forest listens. Speak softly among the trees.', 'Spiders the size of dogs, deeper in.'],
  ['The leaves turn gold and the wolves turn bold.', 'Autumn smells of smoke and apples.'],
  ['Water is worth more than gold out in the dunes.', 'Scorpions hide in boots. Check yours.'],
  ['Keep the fire fed, or the cold creeps in.', 'Yetis come down from the peaks in winter.'],
  ['Watch your step in the bog. It swallows the careless.', 'The marsh lights lure folk away.'],
  ['The blight spreads a little further every year.', "Don't drink the water near the rot."],
];
const HALL_LINES = [
  'Welcome to the hall. The council meets here at dusk.',
  "Hearthfire's walls have never fallen. Not yet.",
  'Mind the banners, they were stitched by the elders.',
];

/** Deterministic interior for house `h` (index `idx`) of village `v`. */
export function genInterior(v, h, idx: number): Interior {
  const key = v.key + '/' + idx,
    rnd = mulberry((strSeed(key + ':in') ^ game.SEED) >>> 0),
    ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1)),
    kind = h.kind === 'hall' ? 'hall' : SIZE[h.kind] ? h.kind : 'cottage',
    S = SIZE[kind],
    w = ri(S.w[0], S.w[1]),
    d = ri(S.d[0], S.d[1]),
    GW = w + 2,
    GH = d + 2,
    grid = new Uint8Array(GW * GH),
    at = (i: number, j: number) => j * GW + i;
  for (let j = 1; j <= d; j++) for (let i = 1; i <= w; i++) grid[at(i, j)] = 1;
  // front door: mirrors the outside door (centred for the hall)
  const doorCx = Math.max(
    2,
    Math.min(w - 1, Math.round((w + 1) / 2 + (h.door || 0) * Math.round(w * 0.22))),
  );
  // the doorway stays solid: the door is closed, you leave with 'Go outside' on the doormat
  // rooms: partition walls with 2-row doorways
  const nRooms = kind === 'hall' ? 1 : ri(S.rooms[0], S.rooms[1]),
    parts: number[] = [],
    gaps: Record<number, number> = {};
  if (nRooms > 1) {
    const cuts = nRooms === 2 ? [0.5] : [0.34, 0.67];
    for (const f of cuts) {
      let px = Math.round(1 + w * f + (rnd() - 0.5) * 1.5);
      if (Math.abs(px - doorCx) < 2) px = doorCx + (px <= doorCx ? -2 : 2);
      if (px < 4 || px > w - 3 || parts.some((q) => Math.abs(q - px) < 4)) continue;
      parts.push(px);
    }
    parts.sort((a, b) => a - b);
    for (const px of parts) {
      const g0 = ri(1, d - 1);
      gaps[px] = g0;
      for (let j = 1; j <= d; j++) if (j !== g0 && j !== g0 + 1) grid[at(px, j)] = 0;
    }
  }
  const edges = [1, ...parts.map((p) => p + 1)],
    ends = [...parts.map((p) => p - 1), w],
    rooms: Room[] = edges.map((x0, i) => ({ x0, x1: ends[i], purpose: 'main' }));
  const main = rooms.findIndex((r) => doorCx >= r.x0 && doorCx <= r.x1);
  const others = ['bed', rnd() < 0.5 ? 'kitchen' : 'store'];
  let oi = 0;
  rooms.forEach((r, i) => {
    if (kind === 'hall') r.purpose = 'hall';
    else if (i !== main) r.purpose = others[oi++ % others.length];
  });
  // palette
  const woodFloors = ['#a8744a', '#b8845a', '#96643e'],
    pal = {
      wall: kind === 'stone' || kind === 'tower' ? h.stone || '#a49c94' : h.wall || '#e8d8b8',
      trim: '#6b4a30',
      floor:
        S.floor === 'stone'
          ? '#8e8a86'
          : S.floor === 'earth'
            ? '#9a7a52'
            : S.floor === 'hall'
              ? '#a09a92'
              : woodFloors[ri(0, 2)],
      floor2: '',
      roof: (h.roof && h.roof[1]) || '#8e3326',
    };
  pal.floor2 = pal.floor;
  const I: Interior = {
    key,
    name: '',
    sub: v.name,
    kind,
    floor: S.floor as Interior['floor'],
    pal,
    GW,
    GH,
    grid,
    rooms,
    parts,
    gaps,
    door: { cx: doorCx, x: (doorCx + 0.5) * IT, y: (GH - 1) * IT },
    furn: [],
    deco: [],
    solids: [],
    npcs: [],
    b: v.b || 0,
  };
  const sur = SURNAMES[ri(0, SURNAMES.length - 1)];
  I.name =
    kind === 'hall'
      ? v.name + ' Hall'
      : kind === 'hut'
        ? sur + "'s hut"
        : kind === 'tower'
          ? sur + "'s tower"
          : 'The ' + sur + ' house';
  furnish(I, rnd);
  addResidents(I, rnd, kind === 'hall');
  return I;
}

/** Tall pieces that stand flush against the back wall, and how deep they reach into the room. */
const WALL_TALL = new Set(['hearth', 'shelf', 'cupboard', 'stove']),
  WALL_DEPTH = 18;
/* ---------- furnishing ---------- */
function furnish(I: Interior, rnd: () => number) {
  const { GW, GH, grid } = I,
    d = GH - 2,
    occ = new Uint8Array(GW * GH), // 1 furniture, 2 kept clear
    at = (i: number, j: number) => j * GW + i,
    free = (i: number, j: number) => grid[at(i, j)] === 1 && !occ[at(i, j)],
    pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
  // keep the entrance and the partition doorways clear
  for (let j = d - 1; j <= d; j++) occ[at(I.door.cx, j)] = 2;
  for (const px of I.parts) {
    const g0 = I.gaps[px];
    for (const j of [g0, g0 + 1]) {
      if (px - 1 >= 1) occ[at(px - 1, j)] = 2;
      if (px + 1 <= GW - 2) occ[at(px + 1, j)] = 2;
    }
  }
  /** Every free floor cell still reachable from the door? */
  const connected = () => {
    const seen = new Uint8Array(GW * GH),
      st = [[I.door.cx, d]];
    seen[at(I.door.cx, d)] = 1;
    let n = 1,
      total = 0;
    for (let j = 1; j <= d; j++)
      for (let i = 1; i <= GW - 2; i++) if (grid[at(i, j)] && occ[at(i, j)] !== 1) total++;
    while (st.length) {
      const [i, j] = st.pop();
      for (const [a, b] of [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ]) {
        if (a < 1 || b < 1 || a > GW - 2 || b > d) continue;
        const k = at(a, b);
        if (seen[k] || !grid[k] || occ[k] === 1) continue;
        seen[k] = 1;
        n++;
        st.push([a, b]);
      }
    }
    return n >= total;
  };
  /** Try to place piece `k` covering cw×ch cells at (cx, cy); keeps the room walkable. */
  const place = (k: string, cx: number, cy: number, cw = 1, ch = 1, extra: Partial<Furn> = {}) => {
    for (let j = cy; j < cy + ch; j++)
      for (let i = cx; i < cx + cw; i++) if (i < 1 || j < 1 || !free(i, j)) return null;
    for (let j = cy; j < cy + ch; j++) for (let i = cx; i < cx + cw; i++) occ[at(i, j)] = 1;
    if (!connected()) {
      for (let j = cy; j < cy + ch; j++) for (let i = cx; i < cx + cw; i++) occ[at(i, j)] = 0;
      return null;
    }
    const f: Furn = {
      k,
      cx,
      cy,
      cw,
      ch,
      x: (cx + cw / 2) * IT,
      y: (cy + ch) * IT - 4,
      s: rnd(),
      ...extra,
    };
    I.furn.push(f);
    return f;
  };
  /** Place along the back wall (row 1) somewhere in [x0, x1]. */
  const back = (k: string, x0: number, x1: number, cw = 1, ch = 1, extra = {}) => {
    const xs = [];
    for (let i = x0; i <= x1 - cw + 1; i++) xs.push(i);
    xs.sort(() => rnd() - 0.5);
    for (const i of xs) {
      const f = place(k, i, 1, cw, ch, extra);
      if (f) return f;
    }
    return null;
  };
  /** Place against a side wall or in a corner of the room. */
  const side = (k: string, r: Room, extra = {}) => {
    const spots = [];
    for (let j = 1; j <= d; j++) spots.push([r.x0, j], [r.x1, j]);
    spots.sort(() => rnd() - 0.5);
    for (const [i, j] of spots) if (place(k, i, j, 1, 1, extra)) return true;
    return false;
  };
  /** A bed in a corner (back wall + side wall); a second bed goes right beside the first. */
  const bedIn = (r: Room, col: string) => {
    const beds = I.furn.filter((f) => f.k === 'bed' && f.cx >= r.x0 && f.cx <= r.x1),
      xs = beds.length
        ? beds.flatMap((b) => [b.cx - 1, b.cx + 1])
        : rnd() < 0.5
          ? [r.x0, r.x1]
          : [r.x1, r.x0];
    for (const i of xs) if (i >= r.x0 && i <= r.x1 && place('bed', i, 1, 1, 2, { col })) return;
  };
  /** Keep a rug's cells clear of later furniture. */
  const reserve = (cx: number, cy: number, cw: number, ch: number) => {
    for (let j = cy; j < cy + ch; j++)
      for (let i = cx; i < cx + cw; i++)
        if (i >= 1 && j >= 1 && i <= GW - 2 && j <= d && !occ[at(i, j)]) occ[at(i, j)] = 2;
  };
  const blankets = ['#b84a4a', '#4a6ab8', '#5a9a5a', '#9a6ab8', '#c8923a', '#4a9a9a'];
  for (const r of I.rooms) {
    const rw = r.x1 - r.x0 + 1;
    if (r.purpose === 'hall') {
      const mid = Math.floor((r.x0 + r.x1) / 2);
      place('throne', mid, 1, 1, 1);
      back('hearth', r.x0, mid - 2, 2, 1);
      back('hearth', mid + 2, r.x1, 2, 1);
      // pillars in two rows
      for (const px of [r.x0 + 1, r.x1 - 1])
        for (const py of [2, d - 2]) place('pillar', px, py, 1, 1);
      // banquet table with benches
      const tw = Math.min(7, rw - 6),
        tx = mid - Math.floor(tw / 2);
      const t = place('bantable', tx, 3, tw, 2);
      if (t) {
        I.furn.push({ ...t, k: 'rug', y: -1e4, cx: tx - 1, cy: 2, cw: tw + 2, ch: 4 });
        reserve(tx - 1, 2, tw + 2, 4);
      }
      for (const cx of [r.x0, r.x1]) place('candle', cx, 1, 1, 1);
      for (let n = 0; n < 4; n++) side(pick(['barrel', 'crate']), r);
      continue;
    }
    if (r.purpose === 'main') {
      if (I.kind === 'tower') place('stair', r.x1 - 1, 1, 2, 2);
      back(I.kind === 'hut' ? 'firepit' : 'hearth', r.x0, r.x1, 2, 1);
      // one-room homes sleep in a corner
      if (I.rooms.length === 1) bedIn(r, pick(blankets));
      if (rw >= 4 && d >= 4) {
        // table with chairs in the middle, on a rug
        const tx = Math.max(r.x0 + 1, Math.min(r.x1 - 2, Math.floor((r.x0 + r.x1) / 2))),
          ty = Math.max(d >= 5 ? 3 : 2, Math.floor(d / 2));
        const t = place('table', tx, ty, 2, 1);
        if (t) {
          // a rug under the table, unless it would run under the fire or other pieces
          const clear = I.furn.every(
            (o) =>
              o === t ||
              o.cx + o.cw <= tx - 1 ||
              o.cx >= tx + 3 ||
              o.cy + o.ch <= ty - 1 ||
              o.cy >= ty + 2,
          );
          if (clear) {
            I.furn.push({ ...t, k: 'rug', cx: tx - 1, cy: ty - 1, cw: 4, ch: 3, y: -1e4 });
          }
          // chairs behind the table only where those cells are still free
          for (const [ci, fx, fl] of [
            [tx, -IT * 0.45, false],
            [tx + 1, IT * 0.45, true],
          ] as [number, number, boolean][])
            if (free(ci, ty - 1)) {
              occ[at(ci, ty - 1)] = 2;
              I.furn.push({ ...t, k: 'chair', x: t.x + fx, y: t.y - IT + 2, flip: fl });
            }
          I.furn.push({ ...t, k: 'chairF', x: t.x, y: t.y + 16 });
          if (clear) reserve(tx - 1, ty - 1, 4, 3); // after the chairs, which sit on the rug
        }
      }
      back(pick(['shelf', 'cupboard']), r.x0, r.x1);
      for (let n = 0; n < 2; n++) side(pick(['barrel', 'plant', 'crate', 'sack']), r);
    } else if (r.purpose === 'bed') {
      const beds = rw >= 4 && rnd() < 0.5 ? 2 : 1;
      for (let n = 0; n < beds; n++) bedIn(r, pick(blankets));
      back('cupboard', r.x0, r.x1);
      side('chest', r);
      side('plant', r);
      if (rw >= 3) {
        const cx = Math.floor((r.x0 + r.x1) / 2);
        I.furn.push({
          k: 'rugS',
          cx,
          cy: d - 1,
          cw: 1,
          ch: 1,
          x: (cx + 0.5) * IT,
          y: -1e4,
          s: rnd(),
        });
      }
    } else if (r.purpose === 'kitchen') {
      back('stove', r.x0, r.x1);
      back('shelf', r.x0, r.x1);
      side('barrel', r);
      side('sack', r);
      if (rw >= 3) place('worktable', Math.floor((r.x0 + r.x1) / 2), Math.max(2, d - 2), 1, 1);
    } else {
      // store room
      back('shelf', r.x0, r.x1);
      for (let n = 0; n < 5; n++) side(pick(['barrel', 'crate', 'sack', 'crate']), r);
    }
  }
  // wall decorations on the back wall, between the tall pieces
  const tall = new Set(['hearth', 'shelf', 'cupboard', 'stove', 'throne', 'stair', 'candle']),
    busy = new Uint8Array(GW);
  for (const f of I.furn)
    if (tall.has(f.k) && f.cy === 1) for (let i = f.cx; i < f.cx + f.cw; i++) busy[i] = 1;
  for (const px of I.parts) busy[px] = 1;
  for (let i = 1; i <= GW - 2; i++) {
    if (busy[i]) continue;
    const q = rnd();
    const k =
      I.kind === 'hall'
        ? q < 0.5
          ? 'banner'
          : 'window'
        : q < 0.45
          ? 'window'
          : q < 0.62
            ? 'painting'
            : q < 0.75
              ? 'wshelf'
              : q < 0.82
                ? 'wreath'
                : '';
    if (!k) continue;
    I.deco.push({ k, x: (i + 0.5) * IT, w: IT, s: rnd(), col: pick(blankets) });
    i++; // leave a gap between wall pieces
  }
  // tall pieces stand with their backs flush against the back wall
  for (const f of I.furn) if (WALL_TALL.has(f.k) && f.cy === 1) f.y = IT + WALL_DEPTH;
  // collision boxes for the furniture (flat pieces stay walkable)
  const flat = new Set(['rug', 'rugS', 'chairF']);
  for (const f of I.furn) {
    if (flat.has(f.k)) continue;
    if (WALL_TALL.has(f.k) && f.cy === 1) {
      I.solids.push({ x0: f.cx * IT + 3, x1: (f.cx + f.cw) * IT - 3, y0: IT - 20, y1: f.y + 2 });
      continue;
    }
    if (f.k === 'chair') {
      I.solids.push({ e: 1, x: f.x, y: f.y - 4, rx: 7, ry: 5 });
      continue;
    }
    const x0 = f.cx * IT + 3,
      x1 = (f.cx + f.cw) * IT - 3,
      y1 = (f.cy + f.ch) * IT - 6,
      y0 = f.cy * IT + (f.cy === 1 ? -20 : 6);
    if (f.k === 'pillar' || f.k === 'plant' || f.k === 'barrel')
      I.solids.push({ e: 1, x: f.x, y: y1 - 10, rx: 13, ry: 9 });
    else I.solids.push({ x0, x1, y0, y1 });
  }
}

/* ---------- residents ---------- */
function addResidents(I: Interior, rnd: () => number, hall: boolean) {
  const q = rnd(),
    n = hall ? 2 + Math.floor(rnd() * 3) : q < 0.3 ? 0 : q < 0.65 ? 1 : q < 0.9 ? 2 : 3,
    lines = [...LINES, ...(BIOME_LINES[I.b] || []), ...(hall ? HALL_LINES : [])],
    d = I.GH - 2;
  const spots: number[][] = [];
  for (let j = 2; j <= d; j++)
    for (let i = 1; i <= I.GW - 2; i++) {
      const x = (i + 0.5) * IT,
        y = (j + 0.6) * IT;
      if (I.grid[j * I.GW + i] && !I.solids.some((s) => inSolid(s, x, y, 10))) spots.push([x, y]);
    }
  spots.sort(() => rnd() - 0.5);
  for (let k = 0; k < n && k < spots.length; k++) {
    const [x, y] = spots[k];
    I.npcs.push({
      role: 'resident',
      x,
      y,
      hx: x,
      hy: y,
      dx: 0,
      dy: 1,
      walk: 0,
      moving: false,
      wt: rnd() * 3,
      look: villagerLook(rnd),
      line: Math.floor(rnd() * lines.length),
      lines,
      say: null,
      sayT: 0,
    });
  }
}
/** Point-in-solid test for interior solids (same shapes as place solids). */
export function inSolid(s, x: number, y: number, r: number) {
  if (s.e) {
    const dx = (x - s.x) / (s.rx + r),
      dy = (y - s.y) / (s.ry + r * 0.6);
    return dx * dx + dy * dy < 1;
  }
  return x > s.x0 - r && x < s.x1 + r && y > s.y0 - r * 0.6 && y < s.y1 + r * 0.6;
}
