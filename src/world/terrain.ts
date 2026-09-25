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
export function classify(h, m, tp, c, bl, sw) {
  let b;
  if (c > 0.35 && bl + c * 0.5 > 0.72) b = 6;
  else if (tp < 0.39) b = 4;
  else if (tp > 0.605 && m < 0.49) b = 3;
  else if (m > 0.59 && tp > 0.43) b = 5;
  else if (m > 0.53) b = tp > 0.5 && tp < 0.585 ? 2 : 1;
  else b = 0;
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
  const m = lerp(0.47, fbm(x * 0.0015 + 40, y * 0.0015, 3, 9), k),
    tp = lerp(0.5, fbm(x * 0.00052 - 90, y * 0.00052 + 30, 3, 17), k),
    c = corr(d);
  const bl = c > 0.35 ? fbm(x * 0.0009, y * 0.0009, 2, 41) : 0,
    sw = vn(x * 0.009, y * 0.009, 23),
    q = classify(h, m, tp, c, bl, sw);
  return { h, m, tp, d, t: q >> 3, b: q & 7, c };
}
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
  1: [
    [88, 170, 224],
    [84, 160, 214],
    [90, 164, 212],
    [92, 176, 226],
    [182, 222, 242],
    [90, 112, 70],
    [86, 70, 124],
  ],
  0: [
    [58, 120, 192],
    [54, 110, 180],
    [58, 112, 178],
    [58, 124, 196],
    [92, 142, 196],
    [60, 82, 58],
    [48, 38, 86],
  ],
};
const _gc = [0, 0, 0];
export function groundF(t, b, h, c, s1, s2, s3, s4, s5, sw) {
  const a = COL[t][b];
  let r = a[0],
    gg = a[1],
    bb = a[2],
    s = 0;
  if (b !== 6 && c > 0) {
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
