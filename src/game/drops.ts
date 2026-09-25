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
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.97;
      d.vy *= 0.97;
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
