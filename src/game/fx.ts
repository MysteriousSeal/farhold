import { TAU, rand } from '../core/math';
import { game, lights } from './state';
// on-screen messages go through the ports (their view is ui/messages.ts)
export { banner, toast } from '../core/ports';
export function addLight(x, y, r, i, col) {
  if ((game.dark > 0.03 || game.mode === 'dungeon') && lights.length < 64)
    lights.push({ x, y, r, i, col });
}

/* ================= FX ================= */
export function burst(x, y, col, n = 10, sp = 120, sz = 3, up = 0, glow = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU,
      v = rand(0.3, 1) * sp;
    game.parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - up,
      life: rand(0.35, 0.7),
      max: 0.7,
      col,
      sz: rand(0.6, 1.2) * sz,
      g: 260,
      glow,
    });
  }
}
export function ring(x, y, col, n = 30, sp = 200, sz = 3) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    game.parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.6,
      life: 0.5,
      max: 0.5,
      col,
      sz,
      g: 0,
      glow: 1,
    });
  }
}
export function ftext(x, y, s, col, big?) {
  // a new text over a fresh one nearby goes above it instead of on top (LEVEL UP, +xp, loot…)
  for (let k = 0; k < 6; k++) {
    const near = game.texts.find(
      (t) => t.max - t.life < 0.45 && Math.abs(t.x - x) < 44 && Math.abs(t.y - y) < 15,
    );
    if (!near) break;
    y = near.y - 16;
  }
  game.texts.push({
    x,
    y,
    s,
    col,
    life: big ? 1.5 : 0.9,
    max: big ? 1.5 : 0.9,
    big,
    vx: rand(-20, 20),
  });
}
export function doFade(cb) {
  game.fadeDir = 1;
  game.fadeCb = cb;
}
