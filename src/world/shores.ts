import { march } from './contour';
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
export type Shores = { segs: Map<string, number[]>; paths?: Map<string, Path2D> };

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
  return { segs };
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
