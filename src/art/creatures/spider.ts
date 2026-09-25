import { ell, shadow } from '../../core/dom';
import { OUT, TAU, sh } from '../../core/math';
import { fcol } from './shared';
/* ================= ART: spiders ================= */
export function drawSpider(c, e, t) {
  const s = e.sc,
    flip = e.dx < 0,
    z = e.air || 0;
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, 18 * s, 6 * s);
  c.translate(0, -z);
  c.scale(s * (flip ? -1 : 1), s * (e.wind > 0 ? 0.85 : 1));
  c.lineWidth = 2.4 / Math.sqrt(s);
  c.strokeStyle = OUT;
  const col = fcol(e, e.col),
    w = e.moving ? e.walk : 0;
  for (let i = 0; i < 4; i++) {
    for (const k of [-1, 1]) {
      const ph = Math.sin(w * 1.4 + i * 1.6 + (k > 0 ? Math.PI : 0)) * 3,
        bx = -4 + i * 4,
        kx = bx + (i - 1.5) * 6,
        ky = -18 + k * 2;
      c.beginPath();
      c.moveTo(bx, -10);
      c.lineTo(kx + ph, ky);
      c.lineTo(kx * 1.5 + ph, -1 + k);
      c.lineWidth = 4;
      c.strokeStyle = OUT;
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = sh(col, -0.2);
      c.stroke();
    }
  }
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  ell(c, -10, -12, 13, 10, col);
  c.fillStyle = e.boss ? '#e0483e' : sh(col, 0.3);
  c.beginPath();
  c.moveTo(-10, -19);
  c.lineTo(-7, -12);
  c.lineTo(-10, -6);
  c.lineTo(-13, -12);
  c.fill();
  ell(c, 6, -10, 8, 7, sh(col, 0.1));
  c.fillStyle = '#ff4030';
  for (const [a, b] of [
    [9, -12],
    [12, -10],
    [8, -9],
    [11, -14],
  ]) {
    c.beginPath();
    c.arc(a, b, 1.3, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#e8dcc0';
  c.beginPath();
  c.moveTo(12, -7);
  c.lineTo(14, -3);
  c.lineTo(10, -6);
  c.fill();
  c.restore();
}
