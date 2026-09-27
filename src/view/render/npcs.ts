import { drawHumanoid, handPos } from '../art/humanoid';
import { rr } from '../dom';
import { OUT } from '../../core/math';
/* ================= RENDER: townsfolk, guards and indoor people ================= */
export function drawNpc(c, n, t) {
  // seated patrons sit (the sitting pose); the barmaid is drawn lower, so the bar hides her legs
  const sit = !!(n.seated && n.sits);
  drawHumanoid(c, n.x, n.y + (n.seated ? n.sink || 0 : 0), {
    look: n.look,
    dx: n.dx,
    dy: n.dy,
    moving: n.moving,
    walk: n.walk,
    time: t,
    sit,
  });
  if (n.role === 'guard') {
    // spear held upright
    const sx = n.x + 12,
      sy = n.y - 8;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = OUT;
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx, sy - 58);
    c.stroke();
    c.strokeStyle = '#8a5a36';
    c.lineWidth = 2.4;
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = OUT;
    c.beginPath();
    c.moveTo(sx - 4, sy - 58);
    c.lineTo(sx, sy - 72);
    c.lineTo(sx + 4, sy - 58);
    c.closePath();
    c.fillStyle = '#cbd5e0';
    c.fill();
    c.stroke();
    c.restore();
  }
  // the hammer only while working at the anvil (facing it, to his right)
  if (n.role === 'smith' && !(n.dy > 0)) {
    const k = n.ham || 0,
      a = k < 0.25 ? -1.6 + k * 6 : k < 0.35 ? -0.1 : -0.1 - Math.min(1.5, (k - 0.35) * 2);
    const hp = handPos(1, 0, false, 0, t, '', 1, n.look);
    c.save();
    c.translate(n.x + hp.x, n.y + hp.y);
    c.rotate(a);
    c.lineWidth = 2;
    c.strokeStyle = OUT;
    rr(c, -2, -2, 16, 4, 1, '#7a5230');
    rr(c, 12, -6, 7, 12, 2, '#6a6a72');
    c.restore();
  }
}
