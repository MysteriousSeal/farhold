import { rr, shadow } from '../../core/dom';
import { OUT, sh } from '../../core/math';
import { fcol } from './shared';
/* ================= ART: golems ================= */
export function drawGolem(c, e, t) {
  const s = e.sc,
    flip = e.dx < 0,
    sw = e.moving ? Math.sin(e.walk) : 0,
    wind = e.wind > 0 ? 1 - e.wind / 0.8 : 0;
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, 20 * s, 6 * s, 0.32);
  c.scale(s * (flip ? -1 : 1), s);
  c.lineWidth = 2.4 / Math.sqrt(s);
  c.strokeStyle = OUT;
  const col = fcol(e, e.col),
    dk = sh(col, -0.25),
    glow = e.glow || '#ffb13a';
  rr(c, -12 + sw * 3, -14, 10, 14, 4, dk);
  rr(c, 3 - sw * 3, -14, 10, 14, 4, dk);
  c.beginPath();
  c.moveTo(-16, -14);
  c.lineTo(-18, -38);
  c.lineTo(-8, -46);
  c.lineTo(10, -46);
  c.lineTo(18, -36);
  c.lineTo(16, -14);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  c.fillStyle = sh(col, 0.2);
  c.beginPath();
  c.moveTo(-14, -37);
  c.lineTo(-7, -43);
  c.lineTo(6, -43);
  c.lineTo(-2, -36);
  c.closePath();
  c.fill();
  c.strokeStyle = glow;
  c.lineWidth = 2;
  c.globalAlpha = 0.8;
  c.beginPath();
  c.moveTo(-6, -28);
  c.lineTo(0, -22);
  c.lineTo(6, -30);
  c.stroke();
  c.globalAlpha = 1;
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  rr(c, -7, -58 - wind * 4, 16, 13, 4, col);
  c.fillStyle = glow;
  c.fillRect(-2, -53 - wind * 4, 3, 3);
  c.fillRect(4, -53 - wind * 4, 3, 3);
  const ay = -40 - wind * 22;
  rr(c, -26, ay, 11, 24, 5, col);
  rr(c, 16, ay, 11, 24, 5, col);
  rr(c, -27, ay + 18, 13, 11, 4, dk);
  rr(c, 15, ay + 18, 13, 11, 4, dk);
  c.restore();
}
