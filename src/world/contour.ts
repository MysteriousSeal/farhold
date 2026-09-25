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
) {
  const n = size / STEP,
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
      const x = ox + i * STEP,
        y = oy + j * STEP,
        X = x + STEP,
        Y = y + STEP,
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
