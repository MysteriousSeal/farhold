import { clamp, fbm, lerp, vn } from '../core/math';
/* ================= WORLD ================= */
export const CH = 512,
  RES = 4,
  N = CH / RES;
export const BIOMES = [
  'Meadow',
  'Forest',
  'Autumn wood',
  'Desert',
  'Tundra',
  'Swamp',
  'Blightlands',
];
export const corr = (d) => clamp((d - 5200) / 7000, 0, 1);
export function hField(x, y, d) {
  let h = fbm(x * 0.0011, y * 0.0011, 4, 1) + Math.max(0, 1 - d / 520) * 0.3;
  const k = clamp(1 - (d - 640) / 420, 0, 1); // Hearthfire stands on flat land
  if (k > 0) h = lerp(h, clamp(h, 0.47, 0.64), k);
  return h;
}
/** The biome the fields give (before small patches are absorbed, see biomeMix). */
export function rawBiome(m, tp, c, bl) {
  if (c > 0.35 && bl + c * 0.5 > 0.72) return 6;
  if (tp < 0.39) return 4;
  if (tp > 0.605 && m < 0.49) return 3;
  if (m > 0.59 && tp > 0.43) return 5;
  if (m > 0.53) return tp > 0.5 && tp < 0.585 ? 2 : 1;
  return 0;
}
/** Terrain type × 8 + biome. `bForce` (the absorbed biome at that place) replaces the fields'. */
export function classify(h, m, tp, c, bl, sw, bForce?: number) {
  let b = bForce ?? rawBiome(m, tp, c, bl);
  if (bForce == null) {
    b = rawBiome(m, tp, c, bl);
  }
  let t;
  if (h < 0.36) t = 0;
  else if (h < 0.4) t = 1;
  else if (h < 0.425) t = 2;
  else if (h > 0.745) t = 5;
  else if (h > 0.675) t = 4;
  else t = 3;
  if (b === 5 && t === 3 && h < 0.6 && sw > 0.66) t = 1;
  return t * 8 + b;
}
export function terr(x, y) {
  const d = Math.hypot(x, y);
  const h = hField(x, y, d);
  const k = clamp((d - 350) / 1300, 0, 1);
  // biome fields keep only their large-scale noise (one octave for moisture and blight), so
  // no biome region is smaller than about a screen across; world/chunks.ts must match
  const m = lerp(0.47, fbm(x * 0.0015 + 40, y * 0.0015, 1, 9), k),
    tp = lerp(0.5, fbm(x * 0.00052 - 90, y * 0.00052 + 30, 2, 17), k),
    c = corr(d);
  const bl = c > 0.35 ? fbm(x * 0.0009, y * 0.0009, 1, 41) : 0,
    sw = vn(x * 0.009, y * 0.009, 23),
    q = classify(h, m, tp, c, bl, sw, biomeMix(x, y));
  return { h, m, tp, d, t: q >> 3, b: q & 7, c };
}
/* ---------- biome patches: nothing smaller than about a screen across ---------- */
// Biomes come from smooth fields crossing thresholds; where a field only just dips past one, a
// small patch of another biome appears. On a coarse lattice, each connected patch is measured
// (flood fill, capped); a patch smaller than PATCH_MAX cells takes the biome that surrounds it
// most. Pure function of position, so chunks, the minimap and gameplay agree, and the edges of
// large regions stay exactly where the fields put them.
const LAT = 80, // lattice spacing (world units)
  PATCH_MAX = 90, // cells: about 750 units across
  rawMemo = new Map<number, number>(),
  patchMemo = new Map<number, number>(); // cell -> final biome of its patch
const key = (i: number, j: number) => (i + 40000) * 80000 + (j + 40000);
/** The fields' biome at lattice point (i, j), memoized. */
function latRaw(i: number, j: number) {
  const k = key(i, j);
  let b = rawMemo.get(k);
  if (b === undefined) {
    if (rawMemo.size > 400000) rawMemo.clear();
    const x = i * LAT,
      y = j * LAT,
      d = Math.hypot(x, y),
      kk = clamp((d - 350) / 1300, 0, 1),
      m = lerp(0.47, fbm(x * 0.0015 + 40, y * 0.0015, 1, 9), kk),
      tp = lerp(0.5, fbm(x * 0.00052 - 90, y * 0.00052 + 30, 2, 17), kk),
      c = corr(d),
      bl = c > 0.35 ? fbm(x * 0.0009, y * 0.0009, 1, 41) : 0;
    rawMemo.set(k, (b = rawBiome(m, tp, c, bl)));
  }
  return b;
}
const smoothMemo = [new Map<number, number>(), new Map<number, number>()];
/**
 * Lattice biome thinned (two passes, before patches are measured): a cell with at most 2 of
 * its 3×3 neighbourhood in its own biome (a band one cell wide) takes the majority.
 */
function latSmooth(i: number, j: number, pass = 1): number {
  const memo = smoothMemo[pass],
    k = key(i, j);
  let b = memo.get(k);
  if (b === undefined) {
    if (memo.size > 400000) memo.clear();
    const at = (a: number, c: number) => (pass === 0 ? latRaw(a, c) : latSmooth(a, c, 0)),
      cnt = new Int8Array(8);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) cnt[at(i + di, j + dj)]++;
    b = at(i, j);
    if (cnt[b] <= 2) {
      let best = -1;
      for (let q = 0; q < 8; q++)
        if (cnt[q] > best) {
          best = cnt[q];
          b = q;
        }
    }
    memo.set(k, b);
  }
  return b;
}
const sizeMemo = new Map<number, number>(); // cell -> patch size (capped at PATCH_MAX + 1)
/** Flood fill the raw patch of (i, j), capped: its cells and the neighbouring cells outside. */
function flood(i: number, j: number) {
  const b = latSmooth(i, j),
    cells: number[][] = [[i, j]],
    seen = new Set<number>([key(i, j)]),
    edge: number[][] = [];
  for (let n = 0; n < cells.length && cells.length <= PATCH_MAX; n++) {
    const [ci, cj] = cells[n];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = ci + di,
        nj = cj + dj,
        k = key(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      if (latSmooth(ni, nj) === b) cells.push([ni, nj]);
      else edge.push([ni, nj]);
    }
  }
  return { cells, edge, small: cells.length <= PATCH_MAX };
}
/** Is the raw patch of lattice cell (i, j) large (at least PATCH_MAX cells)? */
function isLarge(i: number, j: number) {
  const k = key(i, j);
  let n = sizeMemo.get(k);
  if (n === undefined) {
    if (sizeMemo.size > 400000) sizeMemo.clear();
    const f = flood(i, j);
    n = f.small ? f.cells.length : PATCH_MAX + 1;
    if (f.small) for (const [ci, cj] of f.cells) sizeMemo.set(key(ci, cj), n);
    else sizeMemo.set(k, n);
  }
  return n > PATCH_MAX;
}
/**
 * Final biome of the patch containing lattice cell (i, j): a small patch takes the biome of the
 * large region it touches most (never another small patch, so absorbed patches can't chain).
 */
function latFinal(i: number, j: number) {
  const k0 = key(i, j),
    hit = patchMemo.get(k0);
  if (hit !== undefined) return hit;
  if (patchMemo.size > 400000) patchMemo.clear();
  const b = latSmooth(i, j);
  if (isLarge(i, j)) {
    patchMemo.set(k0, b);
    return b;
  }
  const f = flood(i, j),
    around = new Int32Array(8),
    anyAround = new Int32Array(8);
  for (const [ei, ej] of f.edge) {
    const nb = latSmooth(ei, ej);
    anyAround[nb]++;
    if (isLarge(ei, ej)) around[nb]++;
  }
  const votes = around.some((n) => n > 0) ? around : anyAround;
  let fin = b,
    best = -1;
  for (let q = 0; q < 8; q++)
    if (votes[q] > best) {
      best = votes[q];
      fin = q;
    }
  for (const [ci, cj] of f.cells) patchMemo.set(key(ci, cj), fin);
  return fin;
}
const _bw = new Float64Array(8);
/**
 * Biome at (x, y) from the final biomes of the four surrounding lattice cells, bilinearly
 * weighted and sharpened, so a border is a smooth curve with a short soft transition. Also
 * fills the per-biome colour weights (biomeWeights, summing to 1).
 */
export function biomeMix(x: number, y: number) {
  const fi = x / LAT,
    fj = y / LAT,
    i0 = Math.floor(fi),
    j0 = Math.floor(fj),
    u = fi - i0,
    v = fj - j0;
  _bw.fill(0);
  _bw[latFinal(i0, j0)] += (1 - u) * (1 - v);
  _bw[latFinal(i0 + 1, j0)] += u * (1 - v);
  _bw[latFinal(i0, j0 + 1)] += (1 - u) * v;
  _bw[latFinal(i0 + 1, j0 + 1)] += u * v;
  let best = 0,
    sum = 0;
  for (let b = 0; b < 8; b++) {
    if (_bw[b] > _bw[best]) best = b;
    _bw[b] = _bw[b] ** 5; // sharpen: the transition spans about a third of a cell
    sum += _bw[b];
  }
  for (let b = 0; b < 8; b++) _bw[b] /= sum;
  return best;
}
/** Per-biome colour weights from the last biomeMix call (index = biome). */
export const biomeWeights = () => _bw;
/** Swamp pools: shallow marsh water (not lakes) that can be waded through, slowly. */
export const isPool = (T) => T.t === 1 && T.b === 5 && T.h >= 0.425;
/** Speed factor while wading through a swamp pool. */
export const WADE = 0.6;
export const walkT = (T) =>
  T.t === 2 || T.t === 3 || T.t === 4 || (T.t === 1 && T.b === 4) || isPool(T);
export const dangerAt = (x, y) => 1 + Math.floor(Math.hypot(x, y) / 420);
export const COL = {
  3: [
    [120, 198, 86],
    [82, 160, 78],
    [178, 168, 84],
    [232, 198, 124],
    [236, 242, 250],
    [104, 126, 76],
    [108, 88, 122],
  ],
  2: [
    [240, 218, 150],
    [236, 214, 150],
    [234, 208, 146],
    [244, 218, 158],
    [210, 224, 238],
    [130, 122, 86],
    [146, 122, 134],
  ],
  4: [
    [164, 162, 152],
    [150, 152, 146],
    [168, 156, 140],
    [200, 154, 112],
    [198, 208, 222],
    [120, 122, 110],
    [98, 86, 112],
  ],
  5: [
    [118, 112, 110],
    [104, 100, 100],
    [120, 104, 96],
    [170, 118, 86],
    [232, 238, 248],
    [92, 96, 88],
    [70, 58, 86],
  ],
  // water is the same classic blue in every biome (tundra lakes are frozen)
  1: [
    [88, 170, 224],
    [88, 170, 224],
    [88, 170, 224],
    [88, 170, 224],
    [182, 222, 242],
    [88, 170, 224],
    [88, 170, 224],
  ],
  0: [
    [58, 120, 192],
    [58, 120, 192],
    [58, 120, 192],
    [58, 120, 192],
    [92, 142, 196],
    [58, 120, 192],
    [58, 120, 192],
  ],
};
const _gc = [0, 0, 0],
  POOL = [90, 112, 70];
export function groundF(t, b, h, c, s1, s2, s3, s4, s5, sw) {
  const a = t === 1 && b === 5 && h >= 0.425 ? POOL : COL[t][b];
  let r = a[0],
    gg = a[1],
    bb = a[2],
    s = 0;
  if (b !== 6 && c > 0 && !(t <= 1 && !(t === 1 && b === 5 && h >= 0.425))) {
    // the far corridor's purple tint is for land only (water keeps its blue)
    const q = c * 0.35;
    r = lerp(r, 110, q);
    gg = lerp(gg, 92, q);
    bb = lerp(bb, 124, q);
  }
  if (t === 3) {
    s = (Math.floor(s1 * 3.2) / 3 - 0.4) * (b === 4 ? 10 : 20);
  } else if (t === 2) {
    s = (Math.floor(s1 * 3) / 3 - 0.5) * 8; // edges are drawn as vector lines (world/shores.ts)
  } else if (t === 4) {
    s = (Math.floor(s2 * 3) / 3 - 0.4) * 18;
    if (h < 0.68) s -= 10;
  } else if (t === 5) {
    s = 0; // peaks are styled by peakF
  } else if (t === 1) {
    if (b === 4) {
      s = (s5 - 0.5) * 14;
      if (h > 0.396) s -= 18;
    } else if (b === 5) {
      s = (Math.floor(s3 * 3) / 3 - 0.5) * 10;
      if (sw > 0.655 && h > 0.425) {
        r = lerp(r, 60, 0.5);
        gg = lerp(gg, 70, 0.5);
        bb = lerp(bb, 40, 0.5);
      }
    } else s = (Math.floor(s3 * 3) / 3 - 0.5) * 10;
  } else {
    s = (s4 - 0.5) * 10;
  }
  _gc[0] = r + s;
  _gc[1] = gg + s;
  _gc[2] = bb + s;
  return _gc;
}

/** Height at which impassable mountain peaks (terrain type 5) begin. */
export const PEAK_H = 0.745;
const SNOW = [238, 242, 248];
/**
 * Soft ground shading on and around an impassable peak: north-west light and snow caps on the
 * mountain, and a shadow on the walkable ground at the foot of south-facing cliffs. The crisp
 * parts (outline, cliff face) are vector-drawn every frame by world/cliffs.ts.
 * `gx`/`gy` is the height gradient per world unit. Mutates and returns `col`.
 */
export function peakF(col: number[], t: number, b: number, h: number, gx: number, gy: number) {
  const g = Math.hypot(gx, gy) || 1e-6,
    dist = (h - PEAK_H) / g, // world units inside the rim (negative outside)
    south = clamp(-gy / g, 0, 1); // 1 where the edge faces the camera (south)
  if (t !== 5) {
    if (t >= 2 && t <= 4 && dist > -16 && south > 0) {
      const k = (1 + dist / 16) * south * 0.3;
      for (let i = 0; i < 3; i++) col[i] *= 1 - k;
    }
    return col;
  }
  const light = clamp((gx + gy) * 1300, -1, 1) * 24;
  for (let i = 0; i < 3; i++) col[i] += light - 8;
  if (b !== 3 && b !== 6) {
    const f = clamp((h - 0.8) / 0.03, 0, 1) * 0.9;
    for (let i = 0; i < 3; i++) col[i] = lerp(col[i], SNOW[i] + light * 0.4, f);
  }
  return col;
}
