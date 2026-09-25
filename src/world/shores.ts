import { vn } from '../core/math';
import { hAt, march } from './contour';
import { COL, terr } from './terrain';
/* ---------- Shorelines (vector, drawn every frame at full resolution) ---------- */
// Height levels of the lines, from deep water up to the grass edge.
const LEVELS = {
  deep: 0.36, // deep → shallow water
  ripple: 0.392, // a ripple line just off the shore
  surf: 0.3968, // soft surf band right before the foam
  shore: 0.4, // water → sand (foam)
  wet: 0.4035, // wet sand along the water
  grass: 0.425, // sand → grass
};
type Style = keyof typeof LEVELS;
const ORDER: Style[] = ['deep', 'ripple', 'surf', 'wet', 'shore', 'grass'];
/** Per chunk: flat segment lists [ax, ay, bx, by, ...] keyed by `style:biome`. */
export type Island = { pts: number[]; x0: number; y0: number; x1: number; y1: number };
export type Shores = {
  segs: Map<string, number[]>;
  paths?: Map<string, Path2D>;
  /** tiny grass patches inside the sand, turned back into sand (see smallIslands) */
  islands?: Island[];
};
/** Largest grass patch (world units across) that is treated as a stray island and removed. */
const ISLAND_MAX = 70;

/** Trace shore lines inside a size×size square from sampled heights `v`. */
export function traceShores(ox: number, oy: number, size: number, v: Float32Array): Shores {
  const bio = new Map<number, number>(),
    biomeAt = (x: number, y: number) => {
      const k = Math.floor(x / 32) * 100003 + Math.floor(y / 32);
      let b = bio.get(k);
      if (b === undefined) bio.set(k, (b = terr(x, y).b));
      return b;
    },
    segs = new Map<string, number[]>();
  for (const st of ORDER)
    march(v, size, ox, oy, LEVELS[st], (ax, ay, bx, by) => {
      const b = biomeAt((ax + bx) / 2, (ay + by) / 2);
      if ((st === 'ripple' || st === 'surf' || st === 'wet') && b === 4) return; // frozen lakes
      if (st === 'grass' && b === 3) return; // desert sand meets desert sand
      const k = st + ':' + b;
      let a = segs.get(k);
      if (!a) segs.set(k, (a = []));
      a.push(ax, ay, bx, by);
    });
  const islands: Island[] = [];
  for (const [k, a] of segs) {
    if (!k.startsWith('grass:')) continue;
    const { loops, keep } = smallIslands(a);
    islands.push(...loops);
    segs.set(k, keep);
  }
  return { segs, islands };
}

/**
 * Chain the grass-edge segments into outlines and pick out the small closed ones that ring a
 * rise above the grass line (a stray island of grass in the sand). Returns those outlines
 * and the remaining segments.
 */
function smallIslands(a: number[]) {
  const n = a.length / 4,
    key = (x: number, y: number) => Math.round(x * 16) + ',' + Math.round(y * 16),
    ends = new Map<string, number[]>();
  for (let i = 0; i < n; i++)
    for (const e of [0, 2]) {
      const k = key(a[i * 4 + e], a[i * 4 + e + 1]);
      const l = ends.get(k);
      if (l) l.push(i);
      else ends.set(k, [i]);
    }
  const used = new Uint8Array(n),
    drop = new Uint8Array(n),
    loops: Island[] = [];
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const chain = [i],
      pts = [a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]],
      start = key(a[i * 4], a[i * 4 + 1]);
    let cx = a[i * 4 + 2],
      cy = a[i * 4 + 3],
      closed = false;
    for (let guard = 0; guard < 400; guard++) {
      const k = key(cx, cy);
      if (k === start) {
        closed = true;
        break;
      }
      const j = (ends.get(k) || []).find((q) => !used[q]);
      if (j === undefined) break;
      used[j] = 1;
      chain.push(j);
      const fwd = key(a[j * 4], a[j * 4 + 1]) === k;
      cx = a[j * 4 + (fwd ? 2 : 0)];
      cy = a[j * 4 + (fwd ? 3 : 1)];
      pts.push(cx, cy);
    }
    if (!closed) continue;
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9,
      mx = 0,
      my = 0;
    for (let p = 0; p < pts.length; p += 2) {
      x0 = Math.min(x0, pts[p]);
      x1 = Math.max(x1, pts[p]);
      y0 = Math.min(y0, pts[p + 1]);
      y1 = Math.max(y1, pts[p + 1]);
      mx += pts[p];
      my += pts[p + 1];
    }
    mx /= pts.length / 2;
    my /= pts.length / 2;
    if (x1 - x0 > ISLAND_MAX || y1 - y0 > ISLAND_MAX || hAt(mx, my) <= LEVELS.grass) continue;
    for (const c of chain) drop[c] = 1;
    loops.push({ pts, x0, y0, x1, y1 });
  }
  const keep: number[] = [];
  for (let i = 0; i < n; i++)
    if (!drop[i]) keep.push(a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]);
  return { loops, keep };
}

const rgb = (c: number[], f: number, a = 1) =>
  'rgba(' + ((c[0] * f) | 0) + ',' + ((c[1] * f) | 0) + ',' + ((c[2] * f) | 0) + ',' + a + ')';
const GRASS_EDGE = COL[3].map((c) => rgb(c, 0.76));
function strokeStyle(st: Style, b: number, t: number): [string, number] {
  switch (st) {
    case 'deep':
      return b === 4 ? ['rgba(240,248,255,.9)', 2.6] : ['rgba(255,255,255,.2)', 2.2];
    case 'ripple': {
      const a = (0.2 + 0.16 * Math.sin(t * 1.7)).toFixed(3);
      return [b === 5 ? 'rgba(215,235,190,' + a + ')' : 'rgba(255,255,255,' + a + ')', 1.8];
    }
    case 'surf':
      return ['rgba(255,255,255,' + (0.16 + 0.1 * Math.sin(t * 1.3)).toFixed(3) + ')', 5];
    case 'wet':
      return ['rgba(80,60,35,.24)', 2.8];
    case 'shore':
      return b === 4
        ? ['rgba(255,255,255,.95)', 2.6]
        : b === 5
          ? ['rgba(210,230,185,.85)', 3]
          : b === 6
            ? ['rgba(228,208,255,.85)', 3]
            : ['rgba(250,253,255,.95)', 3.4];
    case 'grass':
      return [GRASS_EDGE[b], 3];
  }
}
function paths(s: Shores) {
  if (!s.paths) {
    s.paths = new Map();
    for (const [k, a] of s.segs) {
      const p = new Path2D();
      for (let i = 0; i < a.length; i += 4) {
        p.moveTo(a[i], a[i + 1]);
        p.lineTo(a[i + 2], a[i + 3]);
      }
      s.paths.set(k, p);
    }
  }
  return s.paths;
}
/** Stroke the shore lines of the visible chunks (world transform set). */
export function drawShores(c: CanvasRenderingContext2D, list: Shores[], t: number) {
  if (!list.length) return;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const st of ORDER)
    for (const s of list)
      for (const [k, p] of paths(s)) {
        const [kst, kb] = k.split(':');
        if (kst !== st) continue;
        const b = +kb,
          [col, w] = strokeStyle(st, b, t);
        c.strokeStyle = col;
        c.lineWidth = w;
        c.stroke(p);
      }
}

/* ---------- Swamp pools (wadeable) ---------- */
const POOL_STEP = 8,
  POOL_LEVEL = 0.66; // same threshold that turns marsh into pool water in classify()
export type Pools = {
  edge: number[];
  ripple: number[];
  reeds: number[];
  paths?: { edge: Path2D; ripple: Path2D };
};
/** Trace the banks of swamp pools inside a size×size square. */
export function tracePools(
  ox: number,
  oy: number,
  size: number,
  excluded: (x: number, y: number) => boolean = () => false,
): Pools {
  const n = size / POOL_STEP,
    v = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const x = ox + i * POOL_STEP,
        y = oy + j * POOL_STEP,
        T = terr(x, y);
      v[j * (n + 1) + i] =
        T.b === 5 && T.h >= 0.425 && T.h < 0.6 && !excluded(x, y)
          ? vn(x * 0.009, y * 0.009, 23)
          : 0;
    }
  const edge: number[] = [],
    ripple: number[] = [],
    reeds: number[] = [];
  march(
    v,
    size,
    ox,
    oy,
    POOL_LEVEL,
    (ax, ay, bx, by) => {
      edge.push(ax, ay, bx, by);
      const h = Math.sin(ax * 12.9898 + ay * 78.233) * 43758.5453;
      if (h - Math.floor(h) < 0.14) reeds.push((ax + bx) / 2, (ay + by) / 2, h - Math.floor(h));
    },
    POOL_STEP,
  );
  march(
    v,
    size,
    ox,
    oy,
    POOL_LEVEL + 0.022,
    (ax, ay, bx, by) => ripple.push(ax, ay, bx, by),
    POOL_STEP,
  );
  return { edge, ripple, reeds };
}
const toPath = (a: number[]) => {
  const p = new Path2D();
  for (let i = 0; i < a.length; i += 4) {
    p.moveTo(a[i], a[i + 1]);
    p.lineTo(a[i + 2], a[i + 3]);
  }
  return p;
};
/** Draw pool banks (muddy rim), a ripple line and reed clumps (world transform set). */
export function drawPools(c: CanvasRenderingContext2D, list: Pools[], t: number) {
  if (!list.length) return;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const p of list) {
    if (!p.paths) p.paths = { edge: toPath(p.edge), ripple: toPath(p.ripple) };
    c.strokeStyle = 'rgba(210,235,190,' + (0.3 + 0.14 * Math.sin(t * 1.6)).toFixed(3) + ')';
    c.lineWidth = 1.7;
    c.stroke(p.paths.ripple);
    c.strokeStyle = 'rgba(58,48,28,.9)';
    c.lineWidth = 5;
    c.stroke(p.paths.edge);
    c.strokeStyle = 'rgba(128,108,64,.55)';
    c.lineWidth = 1.6;
    c.stroke(p.paths.edge);
  }
  // reed clumps on the banks
  for (const p of list)
    for (let i = 0; i < p.reeds.length; i += 3) {
      const x = p.reeds[i],
        y = p.reeds[i + 1],
        q = p.reeds[i + 2];
      for (let k = 0; k < 4; k++) {
        const bx = x + (k - 1.5) * 3.2,
          lean = (k - 1.5) * 1.8 + Math.sin(t * 1.5 + x * 0.1 + k) * 1.2,
          ht = 13 + ((k * 7 + q * 20) % 6);
        c.strokeStyle = '#2a1d2c';
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(bx, y + 2);
        c.quadraticCurveTo(bx + lean * 0.3, y - ht * 0.5, bx + lean, y - ht);
        c.stroke();
        c.strokeStyle = k % 2 ? '#5f8a3a' : '#4e7430';
        c.lineWidth = 1.8;
        c.stroke();
        if (k % 2 === 0) {
          c.fillStyle = '#7a4a2a';
          c.strokeStyle = '#2a1d2c';
          c.lineWidth = 1;
          c.beginPath();
          c.ellipse(bx + lean, y - ht - 3, 2, 4, lean * 0.05, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        }
      }
    }
}
