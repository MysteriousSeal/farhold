import { ell, shadow } from '../../dom';
import { OUT } from '../../../core/math';
import { type Furn } from '../../../model/world/interior';
/* ================= ART: interior pieces — shared ================= */
// The wood, stone and metal palette of indoor furniture, and the pieces several rooms share.
type Ctx = CanvasRenderingContext2D;
export const WOOD = '#8a5a36',
  WOOD_L = '#a8744a',
  WOOD_D = '#5e3c22',
  STONE = '#a49c94',
  IRON = '#4a4652',
  BRASS = '#e3b24a';
export function flame(c: Ctx, x: number, y: number, s: number, t: number, ph = 0) {
  const f = 1 + Math.sin(t * 11 + ph) * 0.1 + Math.sin(t * 17 + ph * 2) * 0.06;
  for (const [col, k] of [
    ['#ff7a2a', 1],
    ['#ffc24a', 0.66],
    ['#fff4b0', 0.34],
  ] as [string, number][]) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x, y - 16 * s * k * f);
    c.quadraticCurveTo(x + 7 * s * k, y - 6 * s * k, x + 5 * s * k, y);
    c.quadraticCurveTo(x, y + 2 * s * k, x - 5 * s * k, y);
    c.quadraticCurveTo(x - 7 * s * k, y - 6 * s * k, x, y - 16 * s * k * f);
    c.fill();
  }
}
export function barrel(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 6;
  shadow(c, x, y + 2, 14, 4);
  c.beginPath();
  c.moveTo(x - 12, y - 30);
  c.quadraticCurveTo(x - 16, y - 15, x - 12, y);
  c.lineTo(x + 12, y);
  c.quadraticCurveTo(x + 16, y - 15, x + 12, y - 30);
  c.closePath();
  c.fillStyle = WOOD;
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(40,25,15,.5)';
  c.lineWidth = 1.2;
  for (const k of [-6, 0, 6]) {
    c.beginPath();
    c.moveTo(x + k, y - 29);
    c.lineTo(x + k * 1.1, y - 1);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  for (const hy of [-24, -7]) {
    c.fillStyle = IRON;
    c.fillRect(x - 14, y + hy - 2, 28, 4);
    c.strokeRect(x - 14, y + hy - 2, 28, 4);
  }
  ell(c, x, y - 30, 12, 4.5, WOOD_L);
}
