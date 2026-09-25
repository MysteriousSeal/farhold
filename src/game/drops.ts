import { solidAt } from '../world/chunks';
import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { RAR } from '../data/classes';
import { ftext, toast } from './fx';
import { game } from './state';
/* ================= DROPS ================= */
export const BAGMAX = 30;
export function updateDrops(dt) {
  for (const d of game.drops) {
    d.t += dt;
    if (d.vz || d.z > 0) {
      d.vz -= 520 * dt;
      d.z += d.vz * dt;
      if (d.z <= 0) {
        d.z = 0;
        d.vz = d.vz < -60 ? -d.vz * 0.4 : 0;
      }
      // bounce off walls, water, mountains and other solids
      const nx = d.x + d.vx * dt,
        ny = d.y + d.vy * dt;
      if (!solidAt(nx, d.y, 6)) d.x = nx;
      else d.vx = -d.vx * 0.6;
      if (!solidAt(d.x, ny, 6)) d.y = ny;
      else d.vy = -d.vy * 0.6;
      d.vx *= 0.97;
      d.vy *= 0.97;
    } else if (!d.placed) {
      // safety net: once landed, slide a drop off unreachable ground
      d.placed = true;
      if (solidAt(d.x, d.y, 4)) {
        const spot = nearestOpen(d.x, d.y);
        if (spot) {
          d.x = spot.x;
          d.y = spot.y;
        }
      }
    }
    const dx = game.P.x - d.x,
      dy = game.P.y - 6 - d.y,
      dist = Math.hypot(dx, dy);
    if (d.t < 0.5 || game.state !== 'play') continue;
    if (d.kind === 'gold' && dist < 120) {
      d.x += (dx / dist) * Math.min(dist, 440 * dt);
      d.y += (dy / dist) * Math.min(dist, 440 * dt);
    }
    if (dist < 24) {
      if (d.kind === 'gold') {
        game.P.gold += d.amt;
        d.gone = true;
        SFX.coin();
      } else if (d.kind === 'pot') {
        game.P.pot++;
        d.gone = true;
        SFX.pick();
        toast('Found a health potion');
      } else if (game.P.inv.length < BAGMAX) {
        game.P.inv.push(d.item);
        d.gone = true;
        SFX.pick();
        ftext(game.P.x, game.P.y - 60, d.item.name, RAR[d.item.r].c);
        $('#bagBtn').classList.add('pulse');
      } else if (!d.warned) {
        d.warned = true;
        toast('Bag is full. Sell something at a merchant.');
      }
    }
  }
  game.drops = game.drops.filter((d) => !d.gone && d.t < 300);
}

/** Closest walkable point around (x, y), searching outward in rings. */
function nearestOpen(x: number, y: number) {
  for (let r = 8; r <= 160; r += 8)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        px = x + Math.cos(a) * r,
        py = y + Math.sin(a) * r;
      if (!solidAt(px, py, 6)) return { x: px, y: py };
    }
  return null;
}
