import { OUT, clamp } from '../core/math';
import { hAt, march, sampleHeights } from './contour';
import { COL, PEAK_H, terr } from './terrain';
/* ---------- Mountain cliffs (vector, drawn every frame at full resolution) ---------- */
/** Height of a cliff face (world units) where the rim faces the camera (south). */
export const CLIFF_H = 26;
export type CliffSeg = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** how much each end faces south (0..1): scales the visible cliff face */
  sa: number;
  sb: number;
  /** biome index, for the rock colour */
  b: number;
};
function southness(x: number, y: number) {
  const e = 3,
    gx = hAt(x + e, y) - hAt(x - e, y),
    gy = hAt(x, y + e) - hAt(x, y - e);
  return clamp(-gy / (Math.hypot(gx, gy) || 1e-9), 0, 1);
}
/** Trace the rim of impassable peaks (height = PEAK_H) inside a size×size square. */
export function traceCliffs(ox: number, oy: number, size: number, v?: Float32Array) {
  v = v || sampleHeights(ox, oy, size);
  const out: CliffSeg[] = [];
  march(v, size, ox, oy, PEAK_H, (ax, ay, bx, by) =>
    out.push({
      ax,
      ay,
      bx,
      by,
      sa: southness(ax, ay),
      sb: southness(bx, by),
      b: terr((ax + bx) / 2, (ay + by) / 2).b,
    }),
  );
  return out;
}

const rgb = (c: number[], f: number) =>
  'rgb(' + ((c[0] * f) | 0) + ',' + ((c[1] * f) | 0) + ',' + ((c[2] * f) | 0) + ')';
const WALL = COL[5].map((c) => rgb(c, 0.58)),
  LIP = COL[5].map((c) => rgb([c[0] + 40, c[1] + 40, c[2] + 40], 1));
/** Draw cliff faces, lips and rim outlines for the visible segments (world transform set). */
export function drawCliffs(c: CanvasRenderingContext2D, segs: CliffSeg[]) {
  if (!segs.length) return;
  const H = CLIFF_H;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // cliff faces, grouped by biome colour
  for (let bi = 0; bi < 7; bi++) {
    let any = false;
    c.beginPath();
    for (const s of segs) {
      if (s.b !== bi || (s.sa < 0.02 && s.sb < 0.02)) continue;
      any = true;
      c.moveTo(s.ax, s.ay);
      c.lineTo(s.bx, s.by);
      c.lineTo(s.bx, s.by - H * s.sb);
      c.lineTo(s.ax, s.ay - H * s.sa);
      c.closePath();
    }
    if (!any) continue;
    c.fillStyle = WALL[bi];
    c.strokeStyle = WALL[bi];
    c.lineWidth = 1.2;
    c.fill();
    c.stroke();
  }
  // vertical rock streaks at fixed world x so they line up across segments
  c.beginPath();
  for (const s of segs) {
    const lo = Math.min(s.ax, s.bx),
      hi = Math.max(s.ax, s.bx);
    if (hi - lo < 0.01) continue;
    for (let x = Math.ceil(lo / 7) * 7; x <= hi; x += 7) {
      const t = (x - s.ax) / (s.bx - s.ax),
        y = s.ay + (s.by - s.ay) * t,
        f = s.sa + (s.sb - s.sa) * t;
      if (f < 0.2) continue;
      const top = y - H * f + 4,
        len = (y - 2 - top) * (0.55 + ((x * 0.37) % 1) * 0.45);
      c.moveTo(x, y - 2);
      c.lineTo(x, y - 2 - len);
    }
  }
  c.strokeStyle = 'rgba(20,14,26,.28)';
  c.lineWidth = 1.6;
  c.stroke();
  // lip: light bevel on the plateau edge, then its outline
  for (let bi = 0; bi < 7; bi++) {
    let any = false;
    c.beginPath();
    for (const s of segs) {
      if (s.b !== bi || (s.sa < 0.02 && s.sb < 0.02)) continue;
      any = true;
      c.moveTo(s.ax, s.ay - H * s.sa - 2.6);
      c.lineTo(s.bx, s.by - H * s.sb - 2.6);
    }
    if (!any) continue;
    c.strokeStyle = LIP[bi];
    c.lineWidth = 2.4;
    c.stroke();
  }
  c.beginPath();
  for (const s of segs) {
    if (s.sa < 0.02 && s.sb < 0.02) continue;
    c.moveTo(s.ax, s.ay - H * s.sa);
    c.lineTo(s.bx, s.by - H * s.sb);
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  c.stroke();
  // rim outline where the ground meets the mountain (the impassable edge)
  c.beginPath();
  for (const s of segs) {
    c.moveTo(s.ax, s.ay);
    c.lineTo(s.bx, s.by);
  }
  c.strokeStyle = OUT;
  c.lineWidth = 3.2;
  c.stroke();
}
