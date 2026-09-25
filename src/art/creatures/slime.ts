import { shadow } from '../../core/dom';
import { OUT, TAU, clamp } from '../../core/math';
import { fcol } from './shared';
/* ================= ART: slimes ================= */
export function drawSlime(c, e, t) {
  const s = e.sc,
    hop = e.wind > 0 ? -0.25 * (1 - e.wind / 0.4) : Math.sin(e.walk * 1.3) * 0.12,
    z = e.air ? e.air : 0;
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, 14 * s, 5 * s, 0.28 - z * 0.002);
  c.translate(0, -z);
  c.scale(s * (1 + hop), s * (1 - hop));
  c.lineWidth = 2.2 / Math.sqrt(s);
  c.strokeStyle = OUT;
  c.beginPath();
  c.moveTo(-15, 0);
  c.quadraticCurveTo(-16, -22, 0, -24);
  c.quadraticCurveTo(16, -22, 15, 0);
  c.closePath();
  c.fillStyle = fcol(e, e.col);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.18)';
  c.beginPath();
  c.moveTo(-11, -2);
  c.quadraticCurveTo(-12, -16, -2, -19);
  c.quadraticCurveTo(-8, -12, -11, -2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.beginPath();
  c.ellipse(-6, -16, 4, 2.6, -0.5, 0, TAU);
  c.fill();
  const fx = clamp(e.dx, -1, 1) * 3;
  c.fillStyle = OUT;
  c.beginPath();
  c.ellipse(-4 + fx, -10, 2, 3, 0, 0, TAU);
  c.ellipse(4 + fx, -10, 2, 3, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(-3.4 + fx, -11, 0.8, 0, TAU);
  c.arc(4.6 + fx, -11, 0.8, 0, TAU);
  c.fill();
  if (e.boss) {
    c.fillStyle = '#f5c451';
    c.beginPath();
    c.moveTo(-9, -21);
    c.lineTo(-10, -31);
    c.lineTo(-5, -26);
    c.lineTo(0, -33);
    c.lineTo(5, -26);
    c.lineTo(10, -31);
    c.lineTo(9, -21);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.restore();
}
