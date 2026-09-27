import { hField } from './terrain';
/* ---------- Iso-lines of the height field (marching squares) ---------- */
/** Sampling step (world units) for traced contours. */
export const STEP = 4;
export const hAt = (x: number, y: number) => hField(x, y, Math.hypot(x, y));
/** Exact heights on a STEP grid covering a size×size square at (ox, oy). */
export function sampleHeights(ox: number, oy: number, size: number) {
  const n = size / STEP,
    v = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) v[j * (n + 1) + i] = hAt(ox + i * STEP, oy + j * STEP);
  return v;
}
type SegFn = (ax: number, ay: number, bx: number, by: number) => void;
/** Emit the line segments where the sampled height crosses `level`. */
export function march(
  v: Float32Array,
  size: number,
  ox: number,
  oy: number,
  level: number,
  seg: SegFn,
  step = STEP,
) {
  const n = size / step,
    w = n + 1;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = v[j * w + i],
        b = v[j * w + i + 1],
        c = v[(j + 1) * w + i + 1],
        d = v[(j + 1) * w + i];
      const k =
        (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const x = ox + i * step,
        y = oy + j * step,
        X = x + step,
        Y = y + step,
        e = (x0: number, y0: number, h0: number, x1: number, y1: number, h1: number) => {
          const t = (level - h0) / (h1 - h0);
          return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
        },
        T = () => e(x, y, a, X, y, b),
        R = () => e(X, y, b, X, Y, c),
        B = () => e(x, Y, d, X, Y, c),
        L = () => e(x, y, a, x, Y, d),
        s = (p: number[], q: number[]) => seg(p[0], p[1], q[0], q[1]);
      switch (k) {
        case 1:
        case 14:
          s(L(), B());
          break;
        case 2:
        case 13:
          s(B(), R());
          break;
        case 3:
        case 12:
          s(L(), R());
          break;
        case 4:
        case 11:
          s(T(), R());
          break;
        case 6:
        case 9:
          s(T(), B());
          break;
        case 7:
        case 8:
          s(L(), T());
          break;
        default: {
          // saddles (5, 10): resolve with the cell centre
          const cutAC = (a + b + c + d) / 4 > level !== (k === 10);
          if (cutAC) {
            s(L(), T());
            s(B(), R());
          } else {
            s(L(), B());
            s(T(), R());
          }
        }
      }
    }
}

/**
 * Filled iso-shape of a grid of values: the region where `v > level`, with smooth edges
 * (interpolated like march()) and its outline. `v` holds (nx+1)×(ny+1) values, row-major;
 * point (i, j) sits at (ox + i*step, oy + j*step).
 */
export function isoShape(
  v: ArrayLike<number>,
  nx: number,
  ny: number,
  ox: number,
  oy: number,
  step: number,
  level: number,
) {
  const fill = new Path2D(),
    edge = new Path2D(),
    w = nx + 1,
    px: number[] = [],
    py: number[] = [],
    cross: boolean[] = [];
  for (let j = 0; j < ny; j++) {
    let run = -1; // start of a run of fully inside cells (merged into one rectangle)
    const y = oy + j * step;
    for (let i = 0; i <= nx; i++) {
      const a = i < nx ? v[j * w + i] : 0,
        b = i < nx ? v[j * w + i + 1] : 0,
        c = i < nx ? v[(j + 1) * w + i + 1] : 0,
        d = i < nx ? v[(j + 1) * w + i] : 0,
        full = i < nx && a > level && b > level && c > level && d > level;
      if (full) {
        if (run < 0) run = i;
        continue;
      }
      if (run >= 0) {
        fill.rect(ox + run * step, y, (i - run) * step, step);
        run = -1;
      }
      if (i === nx || (a <= level && b <= level && c <= level && d <= level)) continue;
      // walk the cell's corners clockwise, adding inside corners and edge crossings
      const x = ox + i * step,
        cx = [x, x + step, x + step, x],
        cy = [y, y, y + step, y + step],
        cv = [a, b, c, d];
      px.length = py.length = cross.length = 0;
      for (let q = 0; q < 4; q++) {
        const n = (q + 1) & 3,
          inQ = cv[q] > level;
        if (inQ) {
          px.push(cx[q]);
          py.push(cy[q]);
          cross.push(false);
        }
        if (inQ !== cv[n] > level) {
          const t = (level - cv[q]) / (cv[n] - cv[q]);
          px.push(cx[q] + (cx[n] - cx[q]) * t);
          py.push(cy[q] + (cy[n] - cy[q]) * t);
          cross.push(true);
        }
      }
      fill.moveTo(px[0], py[0]);
      for (let k = 1; k < px.length; k++) fill.lineTo(px[k], py[k]);
      fill.closePath();
      for (let k = 0; k < px.length; k++) {
        const k2 = (k + 1) % px.length;
        if (cross[k] && cross[k2]) {
          edge.moveTo(px[k], py[k]);
          edge.lineTo(px[k2], py[k2]);
        }
      }
    }
  }
  return { fill, edge };
}
