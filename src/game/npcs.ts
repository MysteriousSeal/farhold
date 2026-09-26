import { drawHumanoid, handPos } from '../art/humanoid';
import { SFX } from '../audio/sfx';
import { rr } from '../core/dom';
import { OUT, TAU, rand } from '../core/math';
import { moveEnt } from './enemies';
import { burst } from './fx';
import { game } from './state';
/* ================= NPCs ================= */
export function updateNpcs(dt) {
  for (const p of game.activePois) {
    if (p.kind !== 'village') continue;
    for (const n of p.npcs) {
      if (n.role === 'villager') {
        n.wt -= dt;
        if (n.wt <= 0) {
          n.wt = rand(1.5, 4);
          if (Math.random() < 0.4) {
            n.tx = null;
          } else {
            const a = Math.random() * TAU,
              r = rand(20, n.range || 120);
            n.tx = p.x + Math.cos(a) * r;
            n.ty = p.y + 30 + Math.sin(a) * r * 0.7;
          }
        }
        if (n.tx != null) {
          const dx = n.tx - n.x,
            dy = n.ty - n.y,
            d = Math.hypot(dx, dy);
          if (d < 4) {
            n.tx = null;
            n.moving = false;
          } else {
            const sp = 38;
            const ok = moveEnt(n, (dx / d) * sp * dt, (dy / d) * sp * dt, 7);
            n.dx = dx;
            n.dy = dy;
            n.moving = true;
            n.walk += dt * 7;
            if (!ok) n.tx = null;
          }
        } else n.moving = false;
      } else if (n.role === 'smith') {
        n.dx = 1;
        n.dy = 0;
        n.ham = (n.ham || 0) + dt;
        if (n.ham > 1.3) {
          n.ham = 0;
          if (Math.hypot(game.P.x - n.x, game.P.y - n.y) < 500) {
            burst(n.x + 24, n.y - 18, '#ffd27a', 6, 120, 2, 60, 1);
            if (Math.hypot(game.P.x - n.x, game.P.y - n.y) < 260) SFX.anvil();
          }
        }
      } else {
        const dx = game.P.x - n.x,
          dy = game.P.y - n.y;
        if (Math.hypot(dx, dy) < 160) {
          n.dx = dx;
          n.dy = dy;
        } else {
          n.dx = 0;
          n.dy = 1;
        }
      }
    }
  }
}
export function drawNpc(c, n, t) {
  // seated patrons and the barmaid are drawn lower, so the table or bar hides their legs
  drawHumanoid(c, n.x, n.y + (n.seated ? n.sink || 0 : 0), {
    look: n.look,
    dx: n.dx,
    dy: n.dy,
    moving: n.moving,
    walk: n.walk,
    time: t,
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
