import { mixCol } from '../../core/math';
/* ================= ART: creature helpers ================= */
/** Body colour with the hit flash (white) and frozen (icy) tints applied. */
export function fcol(e, col) {
  return e.flash > 0 ? '#ffffff' : e.frozen > 0 ? mixCol(col, '#9fe0ff', 0.55) : col;
}
