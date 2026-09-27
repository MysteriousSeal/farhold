import { TAU, clamp, fbm, hs, lerp, mulberry, vn } from '../../core/math';
import { game } from '../game/state';
import { traceCliffs } from './cliffs';
import { sampleHeights } from './contour';
import { tracePools, traceShores } from './shores';
import { genFlora } from './flora';
import { roadHit, roadsOf } from './roads';
import { IT } from './interior';
import { poiSolid, poisNear } from './poi';
import {
  CH,
  PEAK_H,
  biomeMix,
  biomeWeights,
  classify,
  corr,
  groundF,
  hField,
  peakF,
  terr,
  walkT,
} from './terrain';
/** A ground mark to paint on the chunk: local x, y, terrain type, biome, roll, and for a
 * mountain crack its angle and length. */
export type Mark = [number, number, number, number, number, number, number];
export type ChunkModel = {
  cx: number;
  cy: number;
  /** ground colours, FN × FN RGBA (one pixel per FR world units) */
  px: Uint8ClampedArray;
  marks: Mark[];
  waves: number[][];
  decor: { k: string; x: number; y: number; r: number; ph: number }[];
  cliffs;
  shores;
  pools;
  flora;
  pois;
  last: number;
};
/** Size of a chunk's colour buffer, in pixels per side (one per FR = 2 world units). */
export const CHUNK_FN = CH / 2;
/* ---------- World chunks ---------- */
export const WCH = new Map();
export function chunkRng(cx, cy) {
  return mulberry((game.SEED ^ Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0);
}
const GS = 8,
  GN = CH / GS + 1,
  FR = 2,
  FN = CH / FR,
  NF = 10,
  AE = 0.0014,
  HT = [0.36, 0.675, 0.68];
function startGen(cx, cy) {
  return {
    cx,
    cy,
    row: 0,
    phase: 0,
    F: new Float32Array(GN * GN * NF),
    img: new Uint8ClampedArray(FN * FN * 4), // ground colours, RGBA
    types: new Uint8Array(FN * FN),
    bio: new Uint8Array(FN * FN),
    // places in or near the chunk: swamp pools are kept out of them
    pois: poisNear(cx * CH + CH / 2, cy * CH + CH / 2, CH * 0.75),
  };
}
/** Is (x, y) inside a village, lair or cave area (where swamp pools are not allowed)? */
export const inPlace = (pois, x: number, y: number) =>
  pois.some((p) => Math.hypot(x - p.x, (y - p.y) * 1.15) < p.r + 20);
/** How far (world units) a biome border blends into its neighbour on either side. */
const BLEND_W = 12;
const _mix = [0, 0, 0];
const _sand = [0, 0, 0];
/**
 * In the desert, beach sand and desert ground meet without an outline (sand on sand): blend
 * the two across the sand line (height 0.425) over about BLEND_W either side.
 */
function desertSand(F, a, b2, c2, h, c, v, col) {
  const gh = Math.hypot(F[b2] - F[a], F[c2] - F[a]) / GS,
    dh = gh * BLEND_W,
    d = h - 0.425;
  if (!(dh > 0) || Math.abs(d) >= dh) return col;
  const k = 0.5 + 0.5 * (d / dh), // 0 on the beach side, 1 on the desert side
    w = k * k * (3 - 2 * k),
    r0 = col[0],
    g0 = col[1],
    b0 = col[2],
    onDesert = d >= 0, // this pixel is desert ground; the other side is beach sand
    o = groundF(onDesert ? 2 : 3, 3, h, c, v[5], v[6], v[7], v[8], v[9], v[4]),
    // desert ground colour (dr, dg, db) and beach colour (br, bg, bb)
    dr = onDesert ? r0 : o[0],
    dg = onDesert ? g0 : o[1],
    db = onDesert ? b0 : o[2],
    br = onDesert ? o[0] : r0,
    bg = onDesert ? o[1] : g0,
    bb = onDesert ? o[2] : b0;
  _sand[0] = br + (dr - br) * w;
  _sand[1] = bg + (dg - bg) * w;
  _sand[2] = bb + (db - bb) * w;
  return _sand;
}
function stepGen(G, steps) {
  const ox = G.cx * CH,
    oy = G.cy * CH,
    F = G.F;
  while (steps-- > 0 && G.phase < 2) {
    if (G.phase === 0) {
      const end = Math.min(GN, G.row + 14);
      for (let j = G.row; j < end; j++)
        for (let i = 0; i < GN; i++) {
          const x = ox + i * GS,
            y = oy + j * GS,
            d = Math.hypot(x, y),
            k = clamp((d - 350) / 1300, 0, 1),
            c = corr(d),
            o = (j * GN + i) * NF;
          F[o] = hField(x, y, d);
          F[o + 1] = lerp(0.47, fbm(x * 0.0015 + 40, y * 0.0015, 1, 9), k);
          F[o + 2] = lerp(0.5, fbm(x * 0.00052 - 90, y * 0.00052 + 30, 2, 17), k);
          F[o + 3] = c > 0.3 ? fbm(x * 0.0009, y * 0.0009, 1, 41) : 0;
          F[o + 4] = vn(x * 0.009, y * 0.009, 23);
          F[o + 5] = vn(x * 0.017, y * 0.017, 5);
          F[o + 6] = vn(x * 0.02, y * 0.02, 8);
          F[o + 7] = vn(x * 0.012, y * 0.012, 6);
          F[o + 8] = vn(x * 0.01, y * 0.01, 7);
          F[o + 9] = vn(x * 0.03, y * 0.03, 6);
        }
      G.row = end;
      if (G.row >= GN) {
        G.phase = 1;
        G.row = 0;
      }
    } else {
      const D = G.img,
        end = Math.min(FN, G.row + 32),
        v = new Float32Array(NF);
      for (let j = G.row; j < end; j++) {
        const gy = ((j + 0.5) * FR) / GS,
          j0 = gy | 0,
          fy = gy - j0,
          wy = oy + (j + 0.5) * FR;
        for (let i = 0; i < FN; i++) {
          const gx = ((i + 0.5) * FR) / GS,
            i0 = gx | 0,
            fx = gx - i0,
            wx = ox + (i + 0.5) * FR,
            a = (j0 * GN + i0) * NF,
            b2 = a + NF,
            c2 = a + GN * NF,
            d2 = c2 + NF,
            w00 = (1 - fx) * (1 - fy),
            w10 = fx * (1 - fy),
            w01 = (1 - fx) * fy,
            w11 = fx * fy;
          for (let k = 0; k < NF; k++)
            v[k] = F[a + k] * w00 + F[b2 + k] * w10 + F[c2 + k] * w01 + F[d2 + k] * w11;
          const c = corr(Math.hypot(wx, wy)),
            h = v[0],
            bF = biomeMix(wx, wy), // lattice biome: no small patches, soft borders
            q = classify(h, v[1], v[2], c, v[3], v[4], bF),
            b = q & 7,
            // a swamp pool inside a place is plain ground instead
            t = q >> 3 === 1 && b === 5 && h >= 0.425 && inPlace(G.pois, wx, wy) ? 3 : q >> 3,
            p = j * FN + i,
            o = p * 4;
          let col = groundF(t, b, h, c, v[5], v[6], v[7], v[8], v[9], v[4]);
          // soft biome borders: mix the neighbouring biomes' colours by their lattice weights
          const bw = biomeWeights();
          if (bw[b] < 0.995) {
            let r0 = 0,
              g0 = 0,
              b0 = 0;
            for (let q2 = 0; q2 < 8; q2++) {
              const wq = bw[q2];
              if (wq < 0.004) continue;
              const cq = q2 === b ? col : groundF(t, q2, h, c, v[5], v[6], v[7], v[8], v[9], v[4]);
              r0 += cq[0] * wq;
              g0 += cq[1] * wq;
              b0 += cq[2] * wq;
            }
            _mix[0] = r0;
            _mix[1] = g0;
            _mix[2] = b0;
            col = _mix;
          }
          if (b === 3 && (t === 2 || t === 3)) col = desertSand(F, a, b2, c2, h, c, v, col);
          if (h > PEAK_H - 0.012) {
            const e = 3,
              hx =
                (hField(wx + e, wy, Math.hypot(wx + e, wy)) -
                  hField(wx - e, wy, Math.hypot(wx - e, wy))) /
                (2 * e),
              hy =
                (hField(wx, wy + e, Math.hypot(wx, wy + e)) -
                  hField(wx, wy - e, Math.hypot(wx, wy - e))) /
                (2 * e);
            peakF(col, t, b, h, hx, hy);
          }
          let r = col[0],
            gg = col[1],
            bb = col[2];
          for (let n = 0; n < HT.length; n++) {
            const dd = h - HT[n];
            if (dd > -AE && dd < AE) {
              const h2 = dd < 0 ? HT[n] + AE : HT[n] - AE,
                q2 = classify(h2, v[1], v[2], c, v[3], v[4], bF),
                c2 = groundF(q2 >> 3, q2 & 7, h2, c, v[5], v[6], v[7], v[8], v[9], v[4]),
                f = 0.5 - (Math.abs(dd) / AE) * 0.5;
              r += (c2[0] - r) * f;
              gg += (c2[1] - gg) * f;
              bb += (c2[2] - bb) * f;
              break;
            }
          }
          D[o] = r;
          D[o + 1] = gg;
          D[o + 2] = bb;
          D[o + 3] = 255;
          G.types[p] = t;
          G.bio[p] = b;
        }
      }
      G.row = end;
      if (G.row >= FN) G.phase = 2;
    }
  }
  return G.phase === 2;
}
/** The chunk's model, sampling it all at once (or finishing a background sampling). */
function genChunkModel(cx, cy, G) {
  if (!G || G.cx !== cx || G.cy !== cy) G = startGen(cx, cy);
  stepGen(G, 99);
  return buildChunk(G);
}
/**
 * Everything a chunk holds besides its picture: ground marks to paint (grass, cracks, snow
 * ripples...), animated water ripples, decor (trees, rocks: they block the way), mountain
 * cliffs and shorelines, swamp pools and flora. The random draws keep their old order, so
 * every world is the same as before.
 */
function buildChunk(G): ChunkModel {
  const cx = G.cx,
    cy = G.cy,
    ox = cx * CH,
    oy = cy * CH,
    types = G.types,
    bio = G.bio;
  const rnd = chunkRng(cx, cy),
    at = (lx, ly) => {
      const q = clamp((ly / FR) | 0, 0, FN - 1) * FN + clamp((lx / FR) | 0, 0, FN - 1);
      return [types[q], bio[q]];
    };
  const pois = poisNear(ox + CH / 2, oy + CH / 2, CH * 0.75);
  const inPoi = (wx, wy, pad = 0) =>
    pois.some((p) => Math.hypot(wx - p.x, (wy - p.y) * 1.15) < p.r + pad);
  const waves = [],
    marks: Mark[] = [];
  for (let k = 0; k < 1000; k++) {
    const lx = rnd() * CH,
      ly = rnd() * CH,
      [t, b] = at(lx, ly),
      q = rnd(),
      wx = ox + lx,
      wy = oy + ly;
    if (t === 3) {
      if (inPoi(wx, wy, -20)) continue;
      marks.push([lx, ly, t, b, q, 0, 0]);
    } else if (t === 5 && q < 0.3) {
      // rugged mountain top: a crack takes two more draws for its angle and length
      if (q < 0.18) marks.push([lx, ly, t, b, q, rnd() * TAU, 6 + rnd() * 8]);
      else marks.push([lx, ly, t, b, q, 0, 0]);
    } else if (t === 4 && q < 0.2) marks.push([lx, ly, t, b, q, 0, 0]);
    else if (t === 1) {
      if ((b === 5 && q < 0.08) || (b === 4 && q < 0.05)) marks.push([lx, ly, t, b, q, 0, 0]);
      else if (q < 0.03 && b !== 4) waves.push([lx + ox, ly + oy, q * 200]);
    } else if (t === 0 && q < 0.02) waves.push([lx + ox, ly + oy, q * 300]);
  }
  const decor = [];
  const dcount = 70;
  for (let k = 0; k < dcount; k++) {
    const lx = rnd() * CH,
      ly = rnd() * CH,
      [t, b] = at(lx, ly),
      q = rnd(),
      wx = ox + lx,
      wy = oy + ly;
    if (inPoi(wx, wy, 30)) continue;
    let d = null;
    if (t === 3) {
      switch (b) {
        case 0:
          if (q < 0.07) d = 'oak';
          else if (q < 0.1) d = 'pine';
          else if (q < 0.2) d = 'bush';
          else if (q < 0.23) d = rockKind('rock', q, 0.2, 0.23);
          else if (q < 0.26) d = 'tallgrass';
          break;
        case 1:
          if (q < 0.4) d = 'oak';
          else if (q < 0.68) d = 'pine';
          else if (q < 0.76) d = 'bush';
          else if (q < 0.79) d = 'log';
          else if (q < 0.82) d = 'stump';
          break;
        case 2:
          if (q < 0.3) d = 'oakA';
          else if (q < 0.5) d = 'oakR';
          else if (q < 0.62) d = 'pine';
          else if (q < 0.7) d = 'bushA';
          else if (q < 0.73) d = 'log';
          break;
        case 3:
          if (q < 0.09) d = 'cactus';
          else if (q < 0.13) d = rockKind('sandrock', q, 0.09, 0.13);
          else if (q < 0.17) d = 'drybush';
          else if (q < 0.19) d = 'skull';
          else if (q < 0.2) d = 'palm';
          else if (q < 0.212) d = q < 0.206 ? 'bones' : 'remains';
          break;
        case 4:
          if (q < 0.25) d = 'snowpine';
          else if (q < 0.3) d = rockKind('icerock', q, 0.25, 0.3);
          else if (q < 0.34) d = 'deadtree';
          else if (q < 0.37) d = 'snowbush';
          break;
        case 5:
          if (q < 0.2) d = 'swamptree';
          else if (q < 0.35) d = 'reeds';
          else if (q < 0.42) d = 'mushroom';
          else if (q < 0.46) d = 'deadtree';
          break;
        case 6:
          // the old blight-tree band, split evenly across the three trees
          if (q < 0.14) d = q < 0.0467 ? 'blighttree' : q < 0.0934 ? 'sporetree' : 'glasstree';
          // the old crystal band, split evenly across the three Blightlands minerals
          else if (q < 0.24) d = q < 0.1734 ? 'crystal' : q < 0.2067 ? 'shard' : 'glass';
          else if (q < 0.3) d = q < 0.27 ? 'bones' : 'remains';
          else if (q < 0.35) d = rockKind('blightrock', q, 0.3, 0.35);
          break;
      }
    } else if (t === 4) {
      if (q < 0.3)
        d = rockKind(
          b === 4 ? 'icerock' : b === 3 ? 'sandrock' : b === 6 ? 'blightrock' : 'rock',
          q,
          0,
          0.3,
        );
      else if (q < 0.4) d = b === 4 ? 'snowpine' : 'pine';
    } else if (t === 5) {
      // boulders and a few hardy pines on the (impassable) mountain tops
      if (q < 0.22)
        d = rockKind(
          b === 4 ? 'icerock' : b === 3 ? 'sandrock' : b === 6 ? 'blightrock' : 'rock',
          q,
          0,
          0.22,
        );
      else if (q < 0.3 && b !== 3 && b !== 6) d = b === 4 ? 'snowpine' : 'pine';
    } else if (t === 2 && q < 0.05) d = b === 3 ? 'palm' : rockKind('rock', q, 0, 0.05);
    if (d) {
      const ph = rnd() * TAU,
        m = (DECOR_R[d] || 8) + 10,
        // keep decor and its footprint off lake shores and swamp-pool banks
        wet = [
          [m, 0],
          [-m, 0],
          [0, m * 0.6],
          [0, -m * 0.6],
        ].some(([dx, dy]) => at(lx + dx, ly + dy)[0] <= 1);
      if (!wet) decor.push({ k: d, x: wx, y: wy, r: DECOR_R[d] || 0, ph });
    }
  }
  decor.sort((a, b) => a.y - b.y);
  // crisp vector edges (mountain cliffs, shorelines) are traced only where they occur
  let lo = 1,
    hi = 0;
  for (let i = 0; i < G.F.length; i += NF) {
    if (G.F[i] < lo) lo = G.F[i];
    if (G.F[i] > hi) hi = G.F[i];
  }
  const hasPeak = hi > PEAK_H - 0.01,
    hasShore = lo < 0.435 && hi > 0.35,
    hv = hasPeak || hasShore ? sampleHeights(ox, oy, CH) : null,
    cliffs = hasPeak ? traceCliffs(ox, oy, CH, hv) : [],
    shores = hasShore ? traceShores(ox, oy, CH, hv) : null;
  let hasPool = false;
  for (let p = 0; p < types.length && !hasPool; p++) hasPool = types[p] === 1 && bio[p] === 5;
  const pools = hasPool ? tracePools(ox, oy, CH, (x, y) => inPlace(G.pois, x, y)) : null;
  // stray grass islands in the sand become sand again (their outline was dropped)
  const islands = (shores && shores.islands) || [];
  const onIsland = (wx: number, wy: number) =>
    islands.some((is) => wx > is.x0 - 4 && wx < is.x1 + 4 && wy > is.y0 - 4 && wy < is.y1 + 4);
  const flora = genFlora(
    cx,
    cy,
    CH,
    (lx, ly) => (onIsland(ox + lx, oy + ly) ? [2, at(lx, ly)[1]] : at(lx, ly)),
    (wx, wy) =>
      inPoi(wx, wy, -10) ||
      pois.some((p) => p.kind === 'village' && roadHit(roadsOf(p), wx, wy, 4)),
  );
  return { cx, cy, px: G.img, marks, waves, decor, cliffs, shores, pools, flora, pois, last: 0 };
}
/** One of the three rock shapes. `q` is inside [lo, hi). B is the peak, C the double hump. */
function rockKind(base, q, lo, hi) {
  const w = (hi - lo) / 3;
  return q < lo + w ? base : q < lo + 2 * w ? base + 'B' : base + 'C';
}
const DECOR_R = {
  oak: 11,
  oakA: 11,
  oakR: 11,
  pine: 9,
  snowpine: 9,
  rock: 13,
  rockB: 13,
  rockC: 13,
  sandrock: 13,
  sandrockB: 13,
  sandrockC: 13,
  icerock: 13,
  icerockB: 13,
  icerockC: 13,
  blightrock: 13,
  blightrockB: 13,
  blightrockC: 13,
  cactus: 8,
  deadtree: 6,
  swamptree: 9,
  blighttree: 8,
  sporetree: 8,
  glasstree: 8,
  crystal: 9,
  shard: 9,
  glass: 9,
  palm: 7,
  log: 10,
};
export function bgStep(cx, cy) {
  if (game.mode !== 'world') return;
  if (!game.bgGen) {
    const ci = Math.floor(cx / CH),
      cj = Math.floor(cy / CH);
    outer: for (let r = 1; r <= 2; r++)
      for (let i = ci - r; i <= ci + r; i++)
        for (let j = cj - r; j <= cj + r; j++)
          if (!WCH.has(i + ',' + j)) {
            game.bgGen = startGen(i, j);
            break outer;
          }
  }
  if (game.bgGen) {
    if (WCH.has(game.bgGen.cx + ',' + game.bgGen.cy)) {
      game.bgGen = null;
      return;
    }
    if (stepGen(game.bgGen, 1)) {
      WCH.set(game.bgGen.cx + ',' + game.bgGen.cy, buildChunk(game.bgGen));
      game.bgGen = null;
    }
  }
}
/**
 * The model of world chunk (i, j): made on demand while the frame's generation budget lasts
 * (`gen`), kept in WCH (the nearest 44). Its picture is painted by render/chunks.ts.
 */
export function chunkAt(i: number, j: number, gen: boolean): ChunkModel | null {
  const k = i + ',' + j;
  let c = WCH.get(k);
  if (!c && gen && game.genBudget > 0) {
    game.genBudget--;
    c = genChunkModel(
      i,
      j,
      game.bgGen && game.bgGen.cx === i && game.bgGen.cy === j ? game.bgGen : null,
    );
    if (game.bgGen && game.bgGen.cx === i && game.bgGen.cy === j) game.bgGen = null;
    WCH.set(k, c);
    if (WCH.size > 44) {
      const a = [...WCH.entries()].sort((p, q) => p[1].last - q[1].last);
      for (let n = 0; n < 10; n++) WCH.delete(a[n][0]);
    }
  }
  if (c) c.last = performance.now();
  return c || null;
}
export function solidAt(x, y, r) {
  if (game.mode === 'house') {
    const I = game.HS;
    for (const [ax, ay] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r * 0.6],
      [0, -r * 0.6],
    ]) {
      const i = Math.floor((x + ax) / IT),
        j = Math.floor((y + ay) / IT);
      if (i < 0 || j < 0 || i >= I.GW || j >= I.GH || !I.grid[j * I.GW + i]) return true;
    }
    return poiSolid(I, x, y, r);
  }
  if (game.mode === 'dungeon') {
    const T = game.DG.T;
    for (const [ax, ay] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r * 0.6],
      [0, -r * 0.6],
    ])
      if (!game.DG.isF(Math.floor((x + ax) / T), Math.floor((y + ay) / T))) return true;
    for (const p of game.DG.pillars) {
      const dx = x - p.x,
        dy = (y - p.y + 8) * 1.4;
      if (dx * dx + dy * dy < (14 + r) * (14 + r)) return true;
    }
    for (const p of game.DG.props) {
      if (!p.r) continue;
      const dx = x - p.x,
        dy = (y - p.y) * 1.4;
      if (dx * dx + dy * dy < (p.r + r) * (p.r + r)) return true;
    }
    return false;
  }
  if (!walkT(terr(x, y))) return true;
  const i = Math.floor(x / CH),
    j = Math.floor(y / CH);
  for (let a = i - 1; a <= i + 1; a++)
    for (let b = j - 1; b <= j + 1; b++) {
      const c = WCH.get(a + ',' + b);
      if (!c) continue;
      for (const d of c.decor) {
        if (!d.r) continue;
        const dx = d.x - x;
        if (dx > 40 || dx < -40) continue;
        const dy = (d.y - 3 - y) * 1.4;
        if (dx * dx + dy * dy < (d.r + r) * (d.r + r)) return true;
      }
    }
  for (const p of poisNear(x, y, 10)) if (poiSolid(p, x, y, r)) return true;
  return false;
}
export function regionName(x, y) {
  if (game.mode === 'dungeon') return game.DG.name;
  if (game.mode === 'house') return game.HS.name;
  const v = poisNear(x, y, 0).find((p) => Math.hypot(x - p.x, y - p.y) < p.r);
  if (v) return v.name;
  const T = terr(x, y);
  const i = Math.floor(x / 1400),
    j = Math.floor(y / 1400);
  const ADJ = [
    'Whispering',
    'Amber',
    'Hollow',
    'Sunken',
    'Thorned',
    'Silver',
    'Mossy',
    'Ashen',
    'Gloam',
    'Golden',
    'Weeping',
    'Howling',
    'Ember',
    'Quiet',
  ];
  const NOUN = [
    ['Fields', 'Downs', 'Meadows', 'Heath'],
    ['Wood', 'Thicket', 'Weald', 'Grove'],
    ['Wood', 'Glade', 'Copse', 'Vale'],
    ['Dunes', 'Wastes', 'Sands', 'Flats'],
    ['Tundra', 'Peaks', 'Frostlands', 'Snows'],
    ['Bog', 'Fen', 'Mire', 'Marsh'],
    ['Blight', 'Scar', 'Rot', 'Barrens'],
  ][T.b];
  return ADJ[(hs(i, j, 77) * ADJ.length) | 0] + ' ' + NOUN[(hs(i, j, 78) * NOUN.length) | 0];
}
