import { ell, shadow } from '../../core/dom';
import { OUT, TAU, sh } from '../../core/math';
import { fcol } from './shared';
/* ================= ART: bats ================= */
export function drawBat(c, e, t) {
  const s = e.sc,
    fl = Math.sin(t * 22 + e.ph) * 0.9,
    z = 26 + Math.sin(t * 4 + e.ph) * 5;
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, 9 * s, 3 * s, 0.2);
  c.translate(0, -z * s);
  c.scale(s * (e.dx < 0 ? -1 : 1), s);
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  const col = fcol(e, e.col);
  for (const k of [-1, 1]) {
    c.save();
    c.scale(k, 1);
    c.rotate(-fl * 0.5);
    c.beginPath();
    c.moveTo(4, -2);
    c.quadraticCurveTo(14, -14, 22, -6);
    c.quadraticCurveTo(18, -2, 17, 2);
    c.quadraticCurveTo(13, -1, 11, 3);
    c.quadraticCurveTo(8, 0, 4, 3);
    c.closePath();
    c.fillStyle = sh(col, -0.15);
    c.fill();
    c.stroke();
    c.restore();
  }
  ell(c, 0, 0, 7, 8, col);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(-5, -5);
  c.lineTo(-6, -12);
  c.lineTo(-1, -7);
  c.moveTo(5, -5);
  c.lineTo(6, -12);
  c.lineTo(1, -7);
  c.fill();
  c.stroke();
  c.fillStyle = '#ff5a4a';
  c.beginPath();
  c.arc(-2.5, -2, 1.5, 0, TAU);
  c.arc(2.5, -2, 1.5, 0, TAU);
  c.fill();
  c.fillStyle = '#fff';
  c.fillRect(-2, 2, 1.3, 2);
  c.fillRect(0.8, 2, 1.3, 2);
  c.restore();
}
