import { SFX } from '../../core/ports';
import { TAU, rand } from '../../core/math';
import { moveEnt } from './enemies';
import { burst } from './fx';
import { game } from './state';
import { solidAt } from '../world/chunks';
/* ================= NPCs ================= */
/**
 * Walks a person toward their target (n.tx, n.ty) at `speed`, colliding with radius `r`;
 * the target is dropped on arrival or when blocked. False when they have no target.
 */
export function walkToTarget(n, dt: number, speed: number, r: number) {
  if (n.tx == null) {
    n.moving = false;
    return false;
  }
  const dx = n.tx - n.x,
    dy = n.ty - n.y,
    d = Math.hypot(dx, dy);
  if (d < 4) {
    n.tx = null;
    n.moving = false;
    return true;
  }
  const ok = moveEnt(n, (dx / d) * speed * dt, (dy / d) * speed * dt, r);
  n.dx = dx;
  n.dy = dy;
  n.moving = true;
  n.walk += dt * 7;
  if (!ok) n.tx = null;
  return true;
}
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
            // around their own spot (not all on the waystone), never into the fountain,
            // a stall or any other solid
            n.tx = null;
            for (let k = 0; k < 8 && n.tx == null; k++) {
              const a = Math.random() * TAU,
                r = rand(20, n.range || 120),
                tx = n.hx + Math.cos(a) * r * 0.6,
                ty = n.hy + Math.sin(a) * r * 0.45;
              if (solidAt(tx, ty, 12) || Math.hypot(tx - p.way.x, ty - p.way.y) < 60) continue;
              n.tx = tx;
              n.ty = ty;
            }
          }
        }
        walkToTarget(n, dt, 38, 7);
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
