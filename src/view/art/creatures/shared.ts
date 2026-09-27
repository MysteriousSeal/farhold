import { OUT, mixCol } from '../../../core/math';
import { shadow } from '../../dom';
/* ================= ART: creature helpers ================= */
/** Body colour with the hit flash (white) and frozen (icy) tints applied. */
export function fcol(e, col) {
  return e.flash > 0 ? '#ffffff' : e.frozen > 0 ? mixCol(col, '#9fe0ff', 0.55) : col;
}
/** Which way a four-legged creature is drawn: from the side, or from the front or back. */
export function creatureView(e): 'side' | 'front' | 'back' {
  const ax = Math.abs(e.dx || 0),
    ay = Math.abs(e.dy || 0);
  return ax >= ay * 0.8 ? 'side' : e.dy > 0 ? 'front' : 'back';
}
/**
 * Sets up drawing creature `e` at scale `s` seen from `view`: moves to it, lays its shadow
 * (rx wide from the side, rxEnd from the front or back, ry high), mirrors it when it faces
 * left and sets the bold outline. Pair it with c.restore().
 */
export function beginCreature(
  c,
  e,
  s: number,
  view: string,
  rx: number,
  rxEnd: number,
  ry: number,
) {
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, (view === 'side' ? rx : rxEnd) * s, ry * s);
  c.scale(s * (view === 'side' && e.dx < 0 ? -1 : 1), s);
  c.lineWidth = 2.2 / Math.sqrt(s);
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
