import { mulberry, strSeed } from '../core/math';
import { game } from '../game/state';
/* ================= GROUND FLORA (grass tufts, clover, flowers) ================= */
// Generated once per world chunk and drawn as crisp vectors every frame (art/flora.ts), so
// they stay sharp at any zoom and can sway in the wind. Tufts grow in natural clusters with
// a few loose ones in between; flowers come in small patches of one kind.

/** Per tuft: x, y, size, sway phase, biome. */
export const TUFT_N = 5;
export type Flower = { x: number; y: number; k: number; s: number; b: number };
/** Sand details: pebbles [x, y, size, tone] and desert ripples [x, y, width, seed]. */
export type Flora = {
  tufts: Float32Array;
  flowers: Flower[];
  pebbles: Float32Array;
  ripples: Float32Array;
};
// flower kinds: 0 daisy, 1 buttercup, 2 pink, 3 bluebell, 4 clover (leaves), 5 clover flower,
// 6 succulent rosette, 7 cactus sprout (desert)
/** Tuft colour sets beyond the grassy biomes: dry desert grass and beach grass. */
export const DRY = 3,
  BEACH = 8;
const KINDS_BY_BIOME = {
  0: [0, 1, 2, 3, 4, 5, 0, 1],
  1: [3, 0, 4, 4],
  2: [1, 4],
  5: [0, 4],
};
const GRASSY = new Set([0, 1, 2, 5]);

/**
 * Tufts and flowers for chunk (cx, cy). `at(lx, ly)` gives [terrain type, biome] at local
 * coordinates; `blocked(wx, wy)` excludes places (villages, lairs, caves).
 */
export function genFlora(
  cx: number,
  cy: number,
  size: number,
  at: (lx: number, ly: number) => number[],
  blocked: (wx: number, wy: number) => boolean,
): Flora {
  const rnd = mulberry((strSeed('flora:' + cx + ',' + cy) ^ game.SEED) >>> 0),
    ox = cx * size,
    oy = cy * size,
    tufts: number[] = [],
    flowers: Flower[] = [],
    ok = (lx: number, ly: number) => {
      if (lx < 2 || ly < 2 || lx > size - 2 || ly > size - 2) return -1;
      const [t, b] = at(lx, ly);
      if (t !== 3 || !GRASSY.has(b) || blocked(ox + lx, oy + ly)) return -1;
      return b;
    },
    tuft = (lx: number, ly: number, s: number) => {
      const b = ok(lx, ly);
      if (b >= 0) tufts.push(ox + lx, oy + ly, s, rnd() * 6.28, b);
    };
  // clusters: a handful of tufts around a centre, sometimes with a flower patch
  for (let k = 0; k < 16; k++) {
    const x0 = rnd() * size,
      y0 = rnd() * size,
      n = 4 + Math.floor(rnd() * 6),
      r = 16 + rnd() * 18;
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28,
        d = Math.sqrt(rnd()) * r;
      tuft(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d * 0.7, 0.75 + rnd() * 0.6);
    }
    const b = ok(x0, y0);
    if (b < 0) continue;
    const kinds = KINDS_BY_BIOME[b],
      chance = b === 0 ? 0.6 : b === 1 ? 0.3 : 0.18;
    if (rnd() > chance) continue;
    const kind = kinds[Math.floor(rnd() * kinds.length)],
      m = 2 + Math.floor(rnd() * (kind === 4 ? 3 : 5));
    for (let i = 0; i < m; i++) {
      const a = rnd() * 6.28,
        d = 4 + rnd() * r * 0.7,
        lx = x0 + Math.cos(a) * d,
        ly = y0 + Math.sin(a) * d * 0.7;
      if (ok(lx, ly) >= 0) flowers.push({ x: ox + lx, y: oy + ly, k: kind, s: rnd(), b });
    }
  }
  // loose tufts in between
  for (let k = 0; k < 70; k++) tuft(rnd() * size, rnd() * size, 0.6 + rnd() * 0.5);
  // sand: desert (dry grass biome ground) and beaches
  const sand = (lx: number, ly: number) => {
      if (lx < 3 || ly < 3 || lx > size - 3 || ly > size - 3 || blocked(ox + lx, oy + ly)) return 0;
      const [t, b] = at(lx, ly);
      return t === 3 && b === 3 ? DRY : t === 2 && b !== 4 ? BEACH : 0;
    },
    pebbles: number[] = [],
    ripples: number[] = [];
  for (let k = 0; k < 40; k++) {
    const x0 = rnd() * size,
      y0 = rnd() * size,
      n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const lx = x0 + (rnd() - 0.5) * 14,
        ly = y0 + (rnd() - 0.5) * 9;
      if (sand(lx, ly)) pebbles.push(ox + lx, oy + ly, 0.6 + rnd() * 0.8, Math.floor(rnd() * 4));
    }
  }
  for (let k = 0; k < 46; k++) {
    const lx = rnd() * size,
      ly = rnd() * size;
    if (sand(lx, ly) === DRY) ripples.push(ox + lx, oy + ly, 16 + rnd() * 20, rnd());
  }
  for (let k = 0; k < 9; k++) {
    // sparse clumps of dry grass (desert) or beach grass
    const x0 = rnd() * size,
      y0 = rnd() * size,
      kind = sand(x0, y0);
    if (!kind || (kind === BEACH && rnd() < 0.5)) continue;
    for (let i = 0, n = 2 + Math.floor(rnd() * 3); i < n; i++) {
      const lx = x0 + (rnd() - 0.5) * 22,
        ly = y0 + (rnd() - 0.5) * 14;
      if (sand(lx, ly) === kind)
        tufts.push(ox + lx, oy + ly, 0.6 + rnd() * 0.5, rnd() * 6.28, kind);
    }
  }
  for (let k = 0; k < 10; k++) {
    const lx = rnd() * size,
      ly = rnd() * size;
    if (sand(lx, ly) === DRY)
      flowers.push({ x: ox + lx, y: oy + ly, k: rnd() < 0.55 ? 6 : 7, s: rnd(), b: DRY });
  }
  // back to front, so nearer tufts overlap farther ones
  const order = [...Array(tufts.length / TUFT_N).keys()].sort(
      (a, b) => tufts[a * TUFT_N + 1] - tufts[b * TUFT_N + 1],
    ),
    sorted = new Float32Array(tufts.length);
  order.forEach((o, i) => sorted.set(tufts.slice(o * TUFT_N, o * TUFT_N + TUFT_N), i * TUFT_N));
  flowers.sort((a, b) => a.y - b.y);
  return {
    tufts: sorted,
    flowers,
    pebbles: new Float32Array(pebbles),
    ripples: new Float32Array(ripples),
  };
}
