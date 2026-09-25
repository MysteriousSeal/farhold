import { sh } from '../core/math';
import type { Roads } from '../world/roads';
/* ================= ART: dirt roads ================= */
// Packed earth with a darker worn edge and a lighter crown. Lane paths are built once per
// village.
type Ctx = CanvasRenderingContext2D;

function lanePath(pts: { x: number; y: number }[]) {
  const p = new Path2D();
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++)
    p.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 26);
  p.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  return p;
}
const cache = new WeakMap<Roads, { p: Path2D; w: number }[]>();

/** Draw the roads of the given villages (world transform set). */
export function drawRoads(c: Ctx, list: Roads[]) {
  if (!list.length) return;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const R of list) {
    let lanes = cache.get(R);
    if (!lanes) cache.set(R, (lanes = R.lanes.map((l) => ({ p: lanePath(l.pts), w: l.w }))));
    const P = R.plaza,
      layers: [string, number, number][] = [
        // colour, extra width, plaza scale: worn edge, dirt, lighter crown
        [sh(R.dirt, -0.24), 6, 1],
        [R.dirt, 0, 1],
        [sh(R.dirt, 0.08), -1, 0.75],
      ];
    for (const [col, grow, k] of layers) {
      c.strokeStyle = c.fillStyle = col;
      if (P) {
        c.beginPath();
        c.ellipse(
          P.x,
          P.y - (k < 1 ? 4 : 0),
          (P.rx + grow / 2) * (k < 1 ? 0.8 : 1),
          (P.ry + grow / 2) * (k < 1 ? 0.7 : 1),
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      for (const l of lanes) {
        c.lineWidth = grow < 0 ? l.w * 0.45 : l.w + grow;
        c.stroke(l.p);
      }
    }
  }
  c.restore();
}
