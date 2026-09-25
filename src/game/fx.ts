import { $ } from '../core/dom';
import { TAU, rand } from '../core/math';
import { game, lights } from './state';
export function addLight(x, y, r, i, col) {
  if (game.dark > 0.03 && lights.length < 64) lights.push({ x, y, r, i, col });
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
let toastT;
export function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.opacity = 0), 2200);
}
export function banner(big, small) {
  const z = $('#zone');
  z.innerHTML = big + (small ? '<small>' + small + '</small>' : '');
  z.style.opacity = 1;
  clearTimeout(z.t);
  z.t = setTimeout(() => (z.style.opacity = 0), 2800);
}
export function doFade(cb) {
  game.fadeDir = 1;
  game.fadeCb = cb;
}
