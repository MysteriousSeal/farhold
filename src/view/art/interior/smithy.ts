import { ell, rr, shadow } from '../../dom';
import { OUT, TAU, sh } from '../../../core/math';
import { IT, type Furn } from '../../../model/world/interior';

import { BRASS, IRON, WOOD, WOOD_D, WOOD_L, barrel, flame } from './common';
type Ctx = CanvasRenderingContext2D;
/* ================= ART: smithy furniture ================= */
// The forge with its hood and bellows, the quench trough, the anvil, the grindstone and the
// workbench behind the counter, and the weapon racks, armour stand and spear barrel in front.
// Same conventions as furniture.ts.
export const STEEL = '#c8ced8',
  BRICK = '#9a5a44';
export function bigforge(c: Ctx, f: Furn, t: number) {
  const { x, y } = f;
  // hood narrowing up into the wall
  c.beginPath();
  c.moveTo(x - 34, y - 52);
  c.lineTo(x - 14, y - 92);
  c.lineTo(x + 14, y - 92);
  c.lineTo(x + 34, y - 52);
  c.closePath();
  c.fillStyle = '#6a6470';
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,.2)';
  c.fillRect(x + 6, y - 90, 8, 38);
  // brick hearth
  rr(c, x - 38, y - 52, 76, 52, 3, BRICK);
  c.save();
  c.beginPath();
  c.rect(x - 38, y - 52, 76, 52);
  c.clip();
  c.strokeStyle = 'rgba(40,20,20,.4)';
  c.lineWidth = 1.2;
  for (let r = 0; r < 6; r++) {
    const yy = y - 52 + r * 9;
    c.beginPath();
    c.moveTo(x - 38, yy);
    c.lineTo(x + 38, yy);
    c.stroke();
    for (let q = 0; q < 6; q++) {
      const xx = x - 38 + q * 14 + (r % 2 ? 7 : 0);
      c.beginPath();
      c.moveTo(xx, yy);
      c.lineTo(xx, yy + 9);
      c.stroke();
    }
  }
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.strokeRect(x - 38, y - 52, 76, 52);
  // fire bed with glowing coals
  rr(c, x - 28, y - 30, 56, 20, 4, '#2a1a1c');
  const fl = 0.85 + Math.sin(t * 8) * 0.1;
  for (let k = 0; k < 9; k++) {
    const cx = x - 22 + k * 5.5,
      cy = y - 16 + Math.sin(k * 2.1) * 2;
    c.fillStyle = k % 3 === 0 ? '#ffd24a' : k % 3 === 1 ? '#ff8a2a' : '#e0482a';
    c.globalAlpha = 0.7 + Math.sin(t * 5 + k) * 0.25;
    c.beginPath();
    c.arc(cx, cy, 3.2, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;
  flame(c, x - 8, y - 18, 0.9 * fl, t, 1);
  flame(c, x + 7, y - 18, 1.05 * fl, t, 4);
  rr(c, x - 40, y - 8, 80, 8, 2, sh(BRICK, -0.2));
}
export function bellows(c: Ctx, f: Furn, t: number) {
  // an upright leather bellows on a wooden frame against the wall, its nozzle reaching into
  // the forge beside it (f.flip: the forge is on the left)
  const d = f.flip ? -1 : 1,
    x = f.x,
    y = f.y,
    pump = Math.max(0, Math.sin(t * 2.2)) * 5;
  rr(c, x - 13, y - 64, 4, 64, 1, WOOD_D);
  rr(c, x + 9, y - 64, 4, 64, 1, WOOD_D);
  rr(c, x - 14, y - 66, 28, 5, 1.5, WOOD);
  // leather body between two boards; the top board rises and falls
  c.beginPath();
  c.moveTo(x - 9, y - 50 - pump);
  c.lineTo(x + 9, y - 50 - pump);
  c.quadraticCurveTo(x + 12, y - 36, x + 5, y - 22);
  c.lineTo(x - 5, y - 22);
  c.quadraticCurveTo(x - 12, y - 36, x - 9, y - 50 - pump);
  c.closePath();
  c.fillStyle = '#8a5a3a';
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(40,20,10,.45)';
  c.lineWidth = 1.2;
  for (const k of [0.3, 0.55, 0.8]) {
    const yy = y - 50 - pump + (28 + pump) * k;
    c.beginPath();
    c.moveTo(x - 8, yy);
    c.lineTo(x + 8, yy);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  rr(c, x - 11, y - 54 - pump, 22, 5, 1.5, WOOD_L);
  rr(c, x - 7, y - 24, 14, 5, 1.5, WOOD_L);
  // nozzle into the forge
  c.beginPath();
  c.moveTo(x + d * 4, y - 20);
  c.lineTo(x + d * 22, y - 17);
  c.lineTo(x + d * 22, y - 13);
  c.lineTo(x + d * 4, y - 15);
  c.closePath();
  c.fillStyle = IRON;
  c.fill();
  c.stroke();
  // pump handle
  rr(c, x - 2, y - 64 - pump, 4, 12, 1, WOOD_D);
}
export function trough(c: Ctx, f: Furn, t: number) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 17, 4);
  rr(c, x - 16, y - 16, 32, 16, 3, WOOD);
  c.fillStyle = '#3a6a9a';
  c.beginPath();
  c.ellipse(x, y - 15, 13, 3.4, 0, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.sin(t * 2) * 0.1).toFixed(3) + ')';
  c.fillRect(x - 8, y - 16, 7, 1.2);
  c.fillStyle = IRON;
  c.fillRect(x - 16, y - 10, 32, 2.5);
  c.strokeRect(x - 16, y - 16, 32, 16);
}
export function anvilPiece(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 15, 4.5);
  // stump
  rr(c, x - 10, y - 14, 20, 14, 3, WOOD);
  ell(c, x, y - 14, 10, 3, WOOD_L);
  // anvil
  c.beginPath();
  c.moveTo(x - 13, y - 26);
  c.lineTo(x + 8, y - 26);
  c.quadraticCurveTo(x + 17, y - 26, x + 19, y - 22);
  c.lineTo(x + 6, y - 20);
  c.lineTo(x + 4, y - 16);
  c.lineTo(x + 8, y - 13);
  c.lineTo(x - 8, y - 13);
  c.lineTo(x - 4, y - 16);
  c.lineTo(x - 6, y - 20);
  c.lineTo(x - 13, y - 21);
  c.closePath();
  c.fillStyle = '#4a4652';
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.fillRect(x - 11, y - 25, 18, 1.4);
  // a glowing bar on it
  rr(c, x - 7, y - 29, 13, 3, 1.5, '#ff9a3a');
}
export function grind(c: Ctx, f: Furn, t: number) {
  // an upright grinding wheel on an axle between two posts, its lower edge in a water trough,
  // with a crank on the axle
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 16, 4.5);
  rr(c, x - 14, y - 34, 4, 34, 1, WOOD_D);
  rr(c, x + 10, y - 34, 4, 34, 1, WOOD_D);
  // the wheel: a stone disc seen face-on, with a turning mark
  const wy = y - 22,
    a = t * 3;
  c.fillStyle = '#b8b0a4';
  c.beginPath();
  c.arc(x, wy, 12, 0, TAU);
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(60,50,40,.35)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(x, wy, 8, 0, TAU);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.5)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(x, wy, 10.5, a, a + 0.9);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  // axle and crank
  rr(c, x - 14, wy - 1.5, 30, 3, 1, IRON);
  const cx = x + 16 + Math.cos(a) * 3,
    cy = wy + Math.sin(a) * 3;
  c.beginPath();
  c.moveTo(x + 16, wy);
  c.lineTo(cx, cy + 6);
  c.lineWidth = 2.6;
  c.stroke();
  c.lineWidth = 2;
  // water trough the wheel dips into
  rr(c, x - 12, y - 12, 24, 12, 2, WOOD);
  c.fillStyle = '#3a6a9a';
  c.fillRect(x - 9, y - 11, 18, 3);
}
export function smithbench(c: Ctx, f: Furn) {
  // a heavy workbench like the counter: legs, a front apron and a top surface seen from above,
  // with work laid out on it
  const { x, y } = f,
    w = f.cw * IT - 12;
  for (const lx of [-w / 2 + 3, w / 2 - 8]) rr(c, x + lx, y - 16, 5, 16, 1, WOOD_D);
  rr(c, x - w / 2, y - 34, w, 12, 2, WOOD_L); // top surface
  rr(c, x - w / 2, y - 22, w, 8, 2, WOOD); // front apron
  c.strokeStyle = 'rgba(40,24,14,.35)';
  c.lineWidth = 1;
  for (const k of [0.33, 0.66]) {
    c.beginPath();
    c.moveTo(x - w / 2 + w * k, y - 33);
    c.lineTo(x - w / 2 + w * k, y - 23);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 1.6;
  // a blade blank and its tang, a dished helm, tongs
  rr(c, x - w / 2 + 6, y - 31, 22, 4, 1.5, STEEL);
  rr(c, x - w / 2 + 27, y - 31, 6, 3, 1, WOOD_D);
  ell(c, x + 10, y - 29, 7, 3.4, '#8a8a92');
  rr(c, x + 20, y - 33, 2.5, 9, 1, IRON);
  rr(c, x + 23.5, y - 33, 2.5, 9, 1, IRON);
  c.lineWidth = 2;
}
export function counter(c: Ctx, f: Furn) {
  const x0 = f.cx * IT,
    x1 = (f.cx + f.cw) * IT,
    y = f.y;
  // top and front panel of a long wooden counter
  rr(c, x0 + 2, y - 28, x1 - x0 - 4, 10, 2, WOOD_L);
  rr(c, x0 + 2, y - 18, x1 - x0 - 4, 18, 2, WOOD);
  c.strokeStyle = 'rgba(40,24,14,.45)';
  c.lineWidth = 1.2;
  for (let xx = x0 + IT; xx < x1 - 4; xx += IT) {
    c.beginPath();
    c.moveTo(xx, y - 17);
    c.lineTo(xx, y - 1);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  // wares on the counter: a sword, a hammer and a small coin tray
  const cx = (x0 + x1) / 2;
  rr(c, cx - 70, y - 27, 34, 3, 1.5, STEEL);
  rr(c, cx - 38, y - 28.5, 3, 6, 1, BRASS);
  rr(c, cx + 34, y - 30, 16, 4, 1.5, IRON);
  rr(c, cx + 40, y - 27, 3, 6, 1, WOOD_D);
  ell(c, cx + 70, y - 24, 7, 2.6, WOOD_D);
  c.fillStyle = BRASS;
  for (const k of [-2, 1.5, 3.5]) {
    c.beginPath();
    c.arc(cx + 70 + k, y - 25, 1.4, 0, TAU);
    c.fill();
  }
}
export function wrack(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 14, 4);
  rr(c, x - 14, y - 8, 28, 5, 1.5, WOOD);
  rr(c, x - 14, y - 40, 3, 36, 1, WOOD_D);
  rr(c, x + 11, y - 40, 3, 36, 1, WOOD_D);
  rr(c, x - 14, y - 36, 28, 3, 1, WOOD);
  // two swords and an axe standing in the rack
  for (const [bx, k] of [
    [-6, 0],
    [0, 2],
    [6, 1],
  ]) {
    if (k === 2) {
      rr(c, x + bx - 1, y - 46, 2.4, 40, 1, WOOD_D);
      c.beginPath();
      c.moveTo(x + bx + 1, y - 46);
      c.quadraticCurveTo(x + bx + 9, y - 44, x + bx + 8, y - 36);
      c.lineTo(x + bx + 1, y - 38);
      c.closePath();
      c.fillStyle = STEEL;
      c.fill();
      c.stroke();
      continue;
    }
    c.beginPath();
    c.moveTo(x + bx - 2, y - 12);
    c.lineTo(x + bx - 2, y - 44);
    c.lineTo(x + bx, y - 49);
    c.lineTo(x + bx + 2, y - 44);
    c.lineTo(x + bx + 2, y - 12);
    c.closePath();
    c.fillStyle = STEEL;
    c.fill();
    c.stroke();
    rr(c, x + bx - 4.5, y - 13, 9, 2.5, 1, BRASS);
  }
}
export function armour(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 12, 4);
  rr(c, x - 8, y - 4, 16, 4, 1.5, WOOD_D);
  rr(c, x - 1.5, y - 44, 3, 40, 1, WOOD_D);
  // breastplate and pauldrons
  c.beginPath();
  c.moveTo(x - 11, y - 38);
  c.lineTo(x + 11, y - 38);
  c.lineTo(x + 9, y - 18);
  c.quadraticCurveTo(x, y - 12, x - 9, y - 18);
  c.closePath();
  c.fillStyle = '#a8b0bc';
  c.fill();
  c.stroke();
  for (const sd of [-1, 1]) ell(c, x + sd * 12, y - 37, 5, 4, '#9aa3ad');
  c.strokeStyle = 'rgba(255,255,255,.5)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x - 6, y - 34);
  c.lineTo(x - 5, y - 22);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  // helm on top
  c.beginPath();
  c.arc(x, y - 44, 7, Math.PI, 0);
  c.lineTo(x + 7, y - 40);
  c.lineTo(x - 7, y - 40);
  c.closePath();
  c.fillStyle = '#9aa3ad';
  c.fill();
  c.stroke();
}
export function spears(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4;
  for (const [k, a] of [
    [-5, -0.12],
    [0, 0.02],
    [5, 0.14],
  ]) {
    c.save();
    c.translate(x + k, y - 12);
    c.rotate(a);
    rr(c, -1.2, -38, 2.4, 38, 1, WOOD_D);
    c.beginPath();
    c.moveTo(-3, -38);
    c.lineTo(0, -47);
    c.lineTo(3, -38);
    c.closePath();
    c.fillStyle = STEEL;
    c.fill();
    c.stroke();
    c.restore();
  }
  barrel(c, f);
}
