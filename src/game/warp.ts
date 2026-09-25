import { SFX } from '../audio/sfx';
import { rand } from '../core/math';
import { leaveDungeon } from './dungeons';
import { ring, toast } from './fx';
import { game, hero } from './state';
import { solidAt } from '../world/chunks';
/* ================= WARP PORTAL ================= */
// A fully cleared cave opens a portal in front of the hero. Using it starts a 5 s channel that
// moving, rolling, attacking, casting or taking damage interrupts; at the end the hero lands
// outside the cave entrance.

export const WARP_TIME = 5;

export function spawnWarpPortal() {
  const P = game.P,
    l = Math.hypot(hero.dx, hero.dy) || 1;
  let pos = { x: P.x, y: P.y + 52 };
  for (const [dx, dy] of [
    [hero.dx / l, hero.dy / l],
    [0, 1],
    [1, 0],
    [-1, 0],
    [0, -1],
  ]) {
    const x = P.x + dx * 66,
      y = P.y + dy * 54;
    if (!solidAt(x, y, 22)) {
      pos = { x, y };
      break;
    }
  }
  game.DG.portal = { x: pos.x, y: pos.y };
  SFX.warp();
  ring(pos.x, pos.y - 34, '#9ad0ff', 40, 220, 3);
  toast('A warp portal opened: it takes you back outside the cave');
}

export function startWarp() {
  if (hero.warp || !game.DG || !game.DG.portal) return;
  hero.warp = { t: 0 };
  SFX.tele();
}

export function cancelWarp() {
  if (!hero.warp) return;
  hero.warp = null;
  toast('Warp interrupted');
}

export function updateWarp(dt: number) {
  const w = hero.warp;
  if (!w) return;
  if (game.mode !== 'dungeon' || !game.DG || !game.DG.portal) {
    hero.warp = null;
    return;
  }
  w.t += dt;
  if (Math.random() < 0.6)
    game.parts.push({
      x: game.P.x + rand(-16, 16),
      y: game.P.y + rand(-4, 4),
      vx: rand(-8, 8),
      vy: rand(-70, -35),
      life: 0.9,
      max: 0.9,
      col: Math.random() < 0.5 ? '#9ad0ff' : '#d0a8ff',
      sz: rand(2, 3.6),
      g: 0,
      glow: 1,
    });
  if (w.t >= WARP_TIME) {
    hero.warp = null;
    SFX.warp();
    leaveDungeon();
  }
}
