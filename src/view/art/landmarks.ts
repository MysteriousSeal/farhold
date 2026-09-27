import { circ, rr } from '../dom';
import { OUT, TAU, sh } from '../../core/math';
import {
  GLASS,
  door,
  eaveShadow,
  ink,
  slateRoof,
  stoneWall,
  windowAt,
  type Win,
} from './houseParts';
/* ================= ART: Hearthfire's landmarks (the castle keep, the temple) ================= */
// House models like the others in houses.ts: drawn with the origin at the middle of the front
// at ground level, recording lit windows in B.wins.

type Ctx = CanvasRenderingContext2D;
type Built = { wins: Win[]; smoke: { x: number; y: number } | null };

/** A row of merlons along y from x0 to x1. */
function merlons(x: Ctx, x0: number, x1: number, y: number, col: string, step = 11) {
  ink(x, 2);
  for (let k = x0; k < x1 - 4; k += step) rr(x, k, y - 9, step - 4, 10, 1.2, col);
  ink(x);
  rr(x, x0 - 3, y - 1, x1 - x0 + 6, 6, 1.5, sh(col, -0.1));
}
/** A pennant flying from a pole standing on (px, py). */
function pennant(x: Ctx, px: number, py: number, col: string, len = 22) {
  ink(x, 1.8);
  x.beginPath();
  x.moveTo(px, py);
  x.lineTo(px, py - 30);
  x.stroke();
  ink(x, 2);
  x.beginPath();
  x.moveTo(px, py - 30);
  x.quadraticCurveTo(px + len * 0.5, py - 29, px + len, py - 24);
  x.lineTo(px, py - 18);
  x.closePath();
  x.fillStyle = col;
  x.fill();
  x.stroke();
}
/** A hanging banner with a gold sun, top centre at (bx, by). */
function banner(x: Ctx, bx: number, by: number, col: string, ht = 34) {
  ink(x);
  x.beginPath();
  x.moveTo(bx - 8, by);
  x.lineTo(bx + 8, by);
  x.lineTo(bx + 8, by + ht);
  x.lineTo(bx, by + ht - 7);
  x.lineTo(bx - 8, by + ht);
  x.closePath();
  x.fillStyle = col;
  x.fill();
  x.stroke();
  circ(x, bx, by + 13, 4, '#f5c451');
}
/** A round tower (base centre cx, 0) with a conical slate roof. */
function roundTower(x: Ctx, h, rnd: () => number, cx: number, R: number, ht: number) {
  const top = -ht;
  x.save();
  x.translate(cx, 0);
  stoneWall(x, rnd, -R, top, R * 2, ht, h.stone);
  const g = x.createLinearGradient(-R, 0, R, 0);
  g.addColorStop(0, 'rgba(255,255,255,.2)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,.3)');
  x.fillStyle = g;
  x.fillRect(-R, top, R * 2, ht);
  ink(x);
  x.strokeRect(-R, top, R * 2, ht);
  rr(x, -R - 5, top - 4, R * 2 + 10, 7, 2, sh(h.stone, 0.1));
  eaveShadow(x, R * 2, top + 3, 6);
  for (const wy of [top + 40, top + 90])
    if (wy < -40) rr(x, -3, wy, 6, 14, [3, 3, 0, 0] as any, '#2a2233');
  // cone
  const rTop = top - R * 2.3;
  const cone = () => {
    x.beginPath();
    x.moveTo(-R - 8, top - 2);
    x.quadraticCurveTo(-R * 0.3, top - R, 0, rTop);
    x.quadraticCurveTo(R * 0.3, top - R, R + 8, top - 2);
    x.quadraticCurveTo(0, top + 5, -R - 8, top - 2);
    x.closePath();
  };
  ink(x);
  cone();
  x.fillStyle = h.roof[0];
  x.fill();
  x.save();
  cone();
  x.clip();
  x.strokeStyle = h.roof[1];
  x.lineWidth = 1.3;
  for (let k = -R * 2; k < R * 2; k += 6) {
    x.beginPath();
    x.moveTo(0, rTop);
    x.lineTo(k, top + 4);
    x.stroke();
  }
  for (let yy = top - 8; yy > rTop + 8; yy -= 9) {
    const f = (yy - rTop) / (top - rTop);
    x.beginPath();
    x.ellipse(0, yy, (R + 8) * f, 3 * f, 0, 0, Math.PI);
    x.stroke();
  }
  const gc = x.createLinearGradient(-R, 0, R, 0);
  gc.addColorStop(0, 'rgba(255,255,255,.22)');
  gc.addColorStop(1, 'rgba(0,0,0,.28)');
  x.fillStyle = gc;
  x.fillRect(-R - 10, rTop, R * 2 + 20, top - rTop + 6);
  x.restore();
  ink(x);
  cone();
  x.stroke();
  pennant(x, 0, rTop + 2, h.banner);
  x.restore();
}

/**
 * The castle keep: a crenellated curtain wall with a gatehouse in the middle (the way in),
 * a tall square donjon rising behind it and two round towers with slate cones at the ends.
 */
export function keep(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    cw = w / 2 - 26, // curtain half width (to the tower centres)
    ct = -96; // curtain top
  // the donjon behind
  const dw = 132,
    dt = -262;
  stoneWall(x, rnd, -dw / 2, dt, dw, -dt + ct, sh(h.stone, -0.06));
  eaveShadow(x, dw, dt + 4, 8);
  for (const s of [-1, 1]) {
    // corner turrets
    rr(x, s * (dw / 2) - 11, dt - 22, 22, 30, 2, sh(h.stone, 0.04));
    merlons(x, s * (dw / 2) - 13, s * (dw / 2) + 13, dt - 22, sh(h.stone, 0.08), 9);
  }
  merlons(x, -dw / 2 + 12, dw / 2 - 12, dt, sh(h.stone, 0.06));
  for (const k of [-0.28, 0.28])
    windowAt(x, B.wins, k * dw, dt + 54, 12, 22, { arch: true, frame: '#5a5048' });
  windowAt(x, B.wins, 0, dt + 50, 14, 26, { arch: true, frame: '#5a5048' });
  for (const k of [-0.3, 0, 0.3])
    rr(x, k * dw - 2.5, dt + 94, 5, 13, [2.5, 2.5, 0, 0] as any, '#2a2233');
  pennant(x, 0, dt - 22, h.banner, 30);
  banner(x, -34, dt + 84, h.banner, 40);
  banner(x, 34, dt + 84, h.banner, 40);
  // curtain wall
  stoneWall(x, rnd, -cw, ct, cw * 2, -ct, h.stone);
  eaveShadow(x, cw * 2, ct + 4, 7);
  merlons(x, -cw, cw, ct, sh(h.stone, 0.08));
  for (const k of [-0.62, -0.4, 0.4, 0.62])
    rr(x, k * cw - 2.5, ct + 28, 5, 14, [2.5, 2.5, 0, 0] as any, '#2a2233');
  // round towers at the ends
  for (const s of [-1, 1]) roundTower(x, h, rnd, s * cw, 30, 172);
  // the gatehouse
  const gw = 92,
    gt = -132;
  stoneWall(x, rnd, -gw / 2, gt, gw, -gt, sh(h.stone, 0.05));
  eaveShadow(x, gw, gt + 4, 7);
  merlons(x, -gw / 2 - 2, gw / 2 + 2, gt, sh(h.stone, 0.12), 10);
  // the arch: dark passage, oak doors, the portcullis raised above them
  ink(x);
  rr(x, -29, -64, 58, 64, [29, 29, 0, 0] as any, sh(h.stone, 0.18));
  rr(x, -23, -58, 46, 58, [23, 23, 0, 0] as any, '#2a2233');
  door(x, -11, 21, 40, h.doorCol);
  door(x, 11, 21, 40, h.doorCol);
  x.save();
  x.beginPath();
  x.roundRect(-23, -58, 46, 58, [23, 23, 0, 0]);
  x.clip();
  x.strokeStyle = '#4a4048';
  x.lineWidth = 2.4;
  for (let k = -20; k <= 20; k += 7) {
    x.beginPath();
    x.moveTo(k, -60);
    x.lineTo(k, -42);
    x.stroke();
  }
  x.beginPath();
  x.moveTo(-24, -48);
  x.lineTo(24, -48);
  x.stroke();
  x.restore();
  // keystone and a crest over the gate
  ink(x);
  rr(x, -6, -70, 12, 12, 2, sh(h.stone, 0.22));
  ink(x);
  x.beginPath();
  x.moveTo(-11, gt + 16);
  x.lineTo(11, gt + 16);
  x.lineTo(11, gt + 32);
  x.quadraticCurveTo(0, gt + 44, -11, gt + 32);
  x.closePath();
  x.fillStyle = h.banner;
  x.fill();
  x.stroke();
  circ(x, 0, gt + 26, 4, '#f5c451');
  for (const s of [-1, 1]) rr(x, s * 30 - 2.5, gt + 20, 5, 14, [2.5, 2.5, 0, 0] as any, '#2a2233');
  // steps
  ink(x);
  rr(x, -36, -4, 72, 6, 2, sh(h.stone, 0.1));
}

/**
 * The temple: a gabled stone front with a rose window and a tall arched door, a low aisle on
 * one side and a bell tower with a slate spire on the other.
 */
export function temple(x: Ctx, h, rnd: () => number, B: Built) {
  const nw = 74, // nave half width
    nt = -104, // eaves height at the front corners
    apex = -198;
  // side aisle (left) with a lean-to slate roof
  stoneWall(x, rnd, -nw - 22, -58, 26, 58, sh(h.stone, -0.05));
  slateRoof(
    x,
    [
      [-nw - 26, -54],
      [-nw - 22, -74],
      [-nw + 2, -84],
      [-nw + 2, -58],
    ],
    h.roof[0],
    -84,
    -54,
    false,
    rnd,
  );
  windowAt(x, B.wins, -nw - 9, -30, 8, 16, { arch: true, frame: '#5a5048' });
  // bell tower (right)
  const tx0 = nw - 4,
    tw = 46,
    tt = -250;
  stoneWall(x, rnd, tx0, tt, tw, -tt, sh(h.stone, 0.03));
  const tc = tx0 + tw / 2;
  eaveShadow(x, tw * 2, tt + 4, 6);
  // belfry with the bell
  ink(x);
  rr(x, tc - 12, tt + 12, 24, 34, [12, 12, 0, 0] as any, '#2a2233');
  ink(x, 1.6);
  x.beginPath();
  x.moveTo(tc - 8, tt + 36);
  x.quadraticCurveTo(tc - 8, tt + 20, tc, tt + 19);
  x.quadraticCurveTo(tc + 8, tt + 20, tc + 8, tt + 36);
  x.closePath();
  x.fillStyle = '#d9a83a';
  x.fill();
  x.stroke();
  circ(x, tc, tt + 38, 2.5, '#b8862a');
  x.fillStyle = 'rgba(255,255,255,.4)';
  x.fillRect(tc - 5, tt + 24, 2, 9);
  windowAt(x, B.wins, tc, tt + 96, 8, 18, { arch: true, frame: '#5a5048' });
  windowAt(x, B.wins, tc, tt + 156, 8, 18, { arch: true, frame: '#5a5048' });
  ink(x);
  rr(x, tx0 - 4, tt - 4, tw + 8, 7, 2, sh(h.stone, 0.12));
  // the spire
  const sp = () => {
    x.beginPath();
    x.moveTo(tx0 - 3, tt - 2);
    x.lineTo(tc, tt - 96);
    x.lineTo(tx0 + tw + 3, tt - 2);
    x.closePath();
  };
  ink(x);
  sp();
  x.fillStyle = h.roof[0];
  x.fill();
  x.save();
  sp();
  x.clip();
  x.strokeStyle = h.roof[1];
  x.lineWidth = 1.2;
  for (let yy = tt - 4; yy > tt - 96; yy -= 7) {
    x.beginPath();
    x.moveTo(tx0 - 4, yy);
    x.lineTo(tx0 + tw + 4, yy);
    x.stroke();
  }
  x.fillStyle = 'rgba(0,0,0,.25)';
  x.beginPath();
  x.moveTo(tc, tt - 96);
  x.lineTo(tx0 + tw + 3, tt - 2);
  x.lineTo(tc, tt - 2);
  x.closePath();
  x.fill();
  x.restore();
  ink(x);
  sp();
  x.stroke();
  // gold finial: a sun on a rod
  ink(x, 1.8);
  x.beginPath();
  x.moveTo(tc, tt - 96);
  x.lineTo(tc, tt - 114);
  x.stroke();
  circ(x, tc, tt - 118, 5, '#f5c451');
  // the gabled front
  const front = () => {
    x.beginPath();
    x.moveTo(-nw, 0);
    x.lineTo(-nw, nt);
    x.lineTo(0, apex);
    x.lineTo(nw, nt);
    x.lineTo(nw, 0);
    x.closePath();
  };
  x.save();
  front();
  x.clip();
  stoneWall(x, rnd, -nw, apex, nw * 2, -apex, h.stone);
  const g = x.createLinearGradient(0, apex, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,.12)');
  g.addColorStop(1, 'rgba(0,0,0,.08)');
  x.fillStyle = g;
  x.fillRect(-nw, apex, nw * 2, -apex);
  x.restore();
  ink(x);
  front();
  x.stroke();
  // slate coping along the gable
  for (const s of [-1, 1]) {
    x.beginPath();
    x.moveTo(s * (nw + 8), nt + 6);
    x.lineTo(0, apex - 8);
    ink(x, 12);
    x.stroke();
    x.strokeStyle = h.roof[0];
    x.lineWidth = 8;
    x.stroke();
  }
  ink(x, 1.8);
  x.beginPath();
  x.moveTo(0, apex - 10);
  x.lineTo(0, apex - 30);
  x.moveTo(-7, apex - 23);
  x.lineTo(7, apex - 23);
  x.stroke();
  // buttresses
  for (const s of [-1, 1]) {
    ink(x);
    rr(x, s * nw - 7, -76, 14, 76, 2, sh(h.stone, 0.1));
    x.beginPath();
    x.moveTo(s * nw - 7, -76);
    x.lineTo(s * nw, -88);
    x.lineTo(s * nw + 7, -76);
    x.closePath();
    x.fillStyle = sh(h.stone, 0.16);
    x.fill();
    x.stroke();
  }
  // rose window
  const ry = -134;
  circ(x, 0, ry, 23, sh(h.stone, -0.18));
  circ(x, 0, ry, 18, GLASS);
  const cols = ['#c8423a', '#3f6fa0', '#f5c451', '#4f8a4a'];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    x.fillStyle = cols[k % 4];
    x.beginPath();
    x.moveTo(0, ry);
    x.arc(0, ry, 16, a + 0.08, a + TAU / 8 - 0.08);
    x.closePath();
    x.fill();
  }
  ink(x, 1.6);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    x.beginPath();
    x.moveTo(0, ry);
    x.lineTo(Math.cos(a) * 18, ry + Math.sin(a) * 18);
    x.stroke();
  }
  circ(x, 0, ry, 5, '#f5c451');
  B.wins.push([-12, ry - 12, 24, 24]);
  // lancet windows and the great door
  for (const s of [-1, 1])
    windowAt(x, B.wins, s * 44, -58, 12, 32, { arch: true, frame: '#5a5048' });
  ink(x);
  rr(x, -26, -76, 52, 76, [26, 26, 0, 0] as any, sh(h.stone, 0.16));
  door(x, -10, 19, 60, h.doorCol, false);
  door(x, 10, 19, 60, h.doorCol, false);
  ink(x);
  x.beginPath();
  x.arc(0, -56, 20, Math.PI, 0);
  x.lineTo(20, -60);
  x.lineTo(-20, -60);
  x.closePath();
  x.fillStyle = sh(h.stone, -0.3);
  x.fill();
  x.stroke();
  circ(x, 0, -63, 5, '#f5c451');
  ink(x);
  rr(x, -34, -4, 68, 6, 2, sh(h.stone, 0.12));
  x.strokeStyle = OUT;
}
