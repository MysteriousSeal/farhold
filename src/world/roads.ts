import { mulberry, strSeed } from '../core/math';
import { TUFT_N, type Flora } from './flora';
import { houseRoute } from './poi';
/* ================= DIRT ROADS (geometry) ================= */
// Village plazas and the lanes to each house, built once per village and drawn as crisp
// vectors by art/roads.ts. Edges get small grass tufts and the dirt some pebbles (drawn with
// the ground flora).

type Pt = { x: number; y: number };
const segDist = (x: number, y: number, a: Pt, b: Pt) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
};
export type Lane = { pts: Pt[]; w: number };
export type Roads = {
  dirt: string;
  plaza: { x: number; y: number; rx: number; ry: number } | null;
  lanes: Lane[];
  flora: Flora;
};

// packed earth, a touch darker and redder than the sand in the desert so roads still read there
export const dirtOf = (b: number) => (b === 4 ? '#c9c2b8' : b === 3 ? '#c4935f' : '#c9a26e');
// grass lip colours per village biome (tuft colour sets of art/flora.ts)
const LIP = { 0: 0, 1: 1, 2: 2, 5: 5, 3: 3 };

/** Is (x, y) on one of the road surfaces of `R` (plaza and lanes), within margin `m`? */
export function roadHit(R: Roads, x: number, y: number, m: number) {
  const P = R.plaza;
  if (P && ((x - P.x) / (P.rx + m)) ** 2 + ((y - P.y) / (P.ry + m)) ** 2 < 1) return true;
  const segs = (pts: Pt[], half: (i: number) => number) =>
    pts.some((b, i) => i > 0 && segDist(x, y, pts[i - 1], b) < half(i) + m);
  return R.lanes.some((l) => segs(l.pts, () => l.w / 2));
}
/** Road network of a village (or Hearthfire's country roads), cached on the place. */
export function roadsOf(v): Roads {
  if (v.roads) return v.roads;
  const rnd = mulberry(strSeed(v.key + ':roads')),
    R: Roads = {
      dirt: dirtOf(v.b),
      plaza: null,
      lanes: [],
      flora: {
        tufts: new Float32Array(0),
        flowers: [],
        pebbles: new Float32Array(0),
        ripples: new Float32Array(0),
      },
    };
  // plaza and the lanes to each house (roads that led out into nowhere were dropped;
  // Hearthfire's streets are paved and drawn by art/city.ts)
  if (!v.city) {
    R.plaza = { x: v.x, y: v.y + 10, rx: 128, ry: 96 };
    for (const h of v.houses) R.lanes.push({ pts: houseRoute(v, h), w: 22 });
  }
  // grass tufts along the edges, pebbles on the dirt
  const tufts: number[] = [],
    pebbles: number[] = [],
    lip = LIP[v.b];
  const onRoad = (x: number, y: number, m: number) => roadHit(R, x, y, m);
  const tuft = (x: number, y: number) => {
    if (lip === undefined || rnd() > (lip === 3 ? 0.22 : 0.42) || onRoad(x, y - 3, 1)) return;
    tufts.push(x, y, 0.55 + rnd() * 0.35, rnd() * 6.28, lip);
  };
  const along = (pts: Pt[], half: (i: number) => number, step: number) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        len = Math.hypot(b.x - a.x, b.y - a.y) || 1,
        nx = -(b.y - a.y) / len,
        ny = (b.x - a.x) / len;
      for (let d = 0; d < len; d += step) {
        const x = a.x + ((b.x - a.x) * d) / len,
          y = a.y + ((b.y - a.y) * d) / len,
          hw = half(i);
        if (hw < 3) continue;
        for (const s of [-1, 1]) tuft(x + nx * s * (hw + 1.5), y + ny * s * (hw + 1.5) + 3);
        if (rnd() < 0.12)
          pebbles.push(
            x + nx * (rnd() - 0.5) * hw,
            y + ny * (rnd() - 0.5) * hw,
            0.5 + rnd() * 0.5,
            Math.floor(rnd() * 4),
          );
      }
    }
  };
  for (const l of R.lanes) along(l.pts, () => l.w / 2, 13);
  if (R.plaza) {
    const { x, y, rx, ry } = R.plaza;
    for (let a = 0; a < 6.28; a += 0.16)
      tuft(x + Math.cos(a) * (rx + 2), y + Math.sin(a) * (ry + 2) + 3);
    for (let k = 0; k < 26; k++) {
      const a = rnd() * 6.28,
        d = Math.sqrt(rnd()) * 0.85;
      pebbles.push(
        x + Math.cos(a) * rx * d,
        y + Math.sin(a) * ry * d,
        0.6 + rnd() * 0.6,
        Math.floor(rnd() * 4),
      );
    }
  }
  // back to front, like the ground tufts
  const n = tufts.length / TUFT_N,
    order = [...Array(n).keys()].sort((a, b) => tufts[a * TUFT_N + 1] - tufts[b * TUFT_N + 1]),
    sorted = new Float32Array(tufts.length);
  order.forEach((o, i) => sorted.set(tufts.slice(o * TUFT_N, o * TUFT_N + TUFT_N), i * TUFT_N));
  R.flora.tufts = sorted;
  R.flora.pebbles = new Float32Array(pebbles);
  return (v.roads = R);
}
