import { DOOR_F } from '../../model/world/poi';
import { circ, ell, rr, shadow } from '../dom';
import { OUT, TAU, clamp, mulberry, rand, sh } from '../../core/math';
import { addLight } from '../../model/game/fx';
import { game } from '../../model/game/state';
/* ================= ART: houses ================= */
// Village houses come in five models (h.kind): the half-timbered cottage, a two-storey
// townhouse, a stone cottage, a thatched hut and a stone tower (plus Hearthfire's hall). They
// are drawn as vectors every frame (crisp at any zoom), with the origin at the middle of the
// house front at ground level (y grows downward). While drawing, a model records its windows
// (lit at night) and chimney top (smoke). Seeded extras (ivy, lanterns, curtains, moss, a
// garden patch, a cat) come from the house's seed, so a house always looks the same.

type Ctx = CanvasRenderingContext2D;
import {
  CUR,
  GLASS,
  STONE_FOUND,
  WOOD,
  chimney,
  door,
  eaveShadow,
  extra,
  foundation,
  hash2,
  ink,
  prop,
  setCur,
  sign,
  slateRoof,
  snowCap,
  stoneWall,
  tileRoof,
  timberWall,
  windowAt,
  type Win,
} from './houseParts';
import { keep, temple } from './landmarks';

/* ---------- models ---------- */
type Built = {
  wins: Win[];
  smoke: { x: number; y: number } | null;
  forgeAt?: { x: number; y: number };
};
function cottage(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    top = -46;
  timberWall(x, -w / 2, top, w, 46, h.wall);
  foundation(x, w);
  eaveShadow(x, w, top);
  const dx = h.door * w * DOOR_F,
    wx = -h.door * w * 0.24;
  door(x, dx, 16, 26, h.doorCol);
  windowAt(x, B.wins, wx, -26, 18, 14, { shut: h.shut, box: h.box });
  if (h.chim) B.smoke = chimney(x, w * 0.24, top - 30, 26);
  tileRoof(
    x,
    [
      [-w / 2 - 11, top + 5],
      [-w / 2 + 8, top - 46],
      [w / 2 - 8, top - 46],
      [w / 2 + 11, top + 5],
    ],
    h.roof,
    top - 46,
    top + 5,
    h.snow,
    h,
  );
}
function townhouse(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    g = -36, // ground floor top
    top = -76;
  // stone ground floor, jettied half-timber upper floor
  stoneWall(x, rnd, -w / 2, g, w, 36, h.stone);
  timberWall(x, -w / 2, top, w, 40, h.wall, 3);
  eaveShadow(x, w + 6, g, 5);
  eaveShadow(x, w, top);
  const dx = h.door * w * DOOR_F;
  door(x, dx, 16, 27, h.doorCol, true);
  windowAt(x, B.wins, -h.door * w * 0.26, -19, 16, 13, { box: h.box });
  windowAt(x, B.wins, -w * 0.24, -56, 15, 14, { shut: h.shut });
  windowAt(x, B.wins, w * 0.24, -56, 15, 14, { shut: h.shut });
  if (h.chim) B.smoke = chimney(x, -w * 0.26, top - 34, 30);
  const peak = top - 58;
  tileRoof(
    x,
    [
      [-w / 2 - 12, top + 5],
      [-w * 0.18, peak],
      [w * 0.18, peak],
      [w / 2 + 12, top + 5],
    ],
    h.roof,
    peak,
    top + 5,
    h.snow,
    h,
  );
  // dormer window in the roof
  ink(x);
  rr(x, -10, top - 34, 20, 18, 2, h.wall);
  windowAt(x, B.wins, 0, top - 25, 11, 10, {});
  x.beginPath();
  x.moveTo(-14, top - 32);
  x.lineTo(0, top - 44);
  x.lineTo(14, top - 32);
  x.closePath();
  x.fillStyle = h.roof[0];
  x.fill();
  x.stroke();
  if (h.sign) sign(x, h.door * (w / 2 + 3), -42, h.door, (h.seed * 10) | 0);
}
function stoneCottage(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    top = -40;
  stoneWall(x, rnd, -w / 2, top, w, 40, h.stone);
  eaveShadow(x, w, top, 6);
  const dx = h.door * w * DOOR_F;
  door(x, dx, 17, 27, h.doorCol, true);
  // windows stay on the side away from the door so they never overlap it
  const win = { arch: true, frame: '#5a5048' };
  if (w > 84) {
    windowAt(x, B.wins, -h.door * w * 0.1, -22, 11, 13, win);
    windowAt(x, B.wins, -h.door * w * 0.34, -22, 11, 13, win);
  } else windowAt(x, B.wins, -h.door * w * 0.26, -22, 12, 13, win);
  if (h.chim) B.smoke = chimney(x, -h.door * w * 0.3, top - 24, 24);
  slateRoof(
    x,
    [
      [-w / 2 - 9, top + 4],
      [-w / 2 + 12, top - 36],
      [w / 2 - 12, top - 36],
      [w / 2 + 9, top + 4],
    ],
    h.slate,
    top - 36,
    top + 4,
    h.snow,
    rnd,
    h,
  );
  if (h.sign) sign(x, -h.door * (w / 2 + 2), -34, -h.door, (h.seed * 10) | 0);
}
function hut(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    top = -32;
  // wattle-and-daub wall
  ink(x);
  rr(x, -w / 2, top, w, 32, 3, h.daub);
  x.save();
  x.strokeStyle = 'rgba(110,80,50,.35)';
  x.lineWidth = 1.2;
  for (let k = -w / 2 + 6; k < w / 2; k += 7) {
    x.beginPath();
    x.moveTo(k, top + 3);
    x.quadraticCurveTo(k + 2, top + 16, k, -3);
    x.stroke();
  }
  x.restore();
  foundation(x, w, '#8a8478');
  const dx = h.door * w * DOOR_F;
  door(x, dx, 15, 23, h.doorCol, true);
  windowAt(x, B.wins, -h.door * w * 0.27, -18, 11, 10, { arch: true, box: h.box });
  // thick thatched roof with a ragged fringe
  const rTop = top - 46,
    eave = top + 8;
  const roof = () => {
    x.beginPath();
    x.moveTo(-w / 2 - 14, eave);
    x.quadraticCurveTo(-w / 2 - 6, rTop + 8, -w * 0.12, rTop);
    x.quadraticCurveTo(0, rTop - 4, w * 0.12, rTop);
    x.quadraticCurveTo(w / 2 + 6, rTop + 8, w / 2 + 14, eave);
    for (let k = w / 2 + 14; k > -w / 2 - 14; k -= 6) x.lineTo(k - 3, eave + (k % 12 ? 3 : 5));
    x.closePath();
  };
  ink(x);
  roof();
  x.fillStyle = h.thatch;
  x.fill();
  x.save();
  roof();
  x.clip();
  for (let yy = eave, r = 0; yy > rTop - 4; yy -= 6, r++)
    for (let k = -w / 2 - 16 + (r % 2) * 3; k < w / 2 + 16; k += 3.5) {
      x.strokeStyle = rnd() < 0.5 ? sh(h.thatch, -0.22) : sh(h.thatch, 0.18);
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(k, yy);
      x.lineTo(k + (k / w) * 3, yy - 7);
      x.stroke();
    }
  const gr = x.createLinearGradient(0, rTop, 0, eave);
  gr.addColorStop(0, 'rgba(255,255,255,.12)');
  gr.addColorStop(1, 'rgba(0,0,0,.22)');
  x.fillStyle = gr;
  x.fillRect(-w, rTop - 10, w * 2, eave - rTop + 16);
  if (h.snow) snowCap(x, rTop, eave);
  x.restore();
  ink(x);
  roof();
  x.stroke();
  // ridge binding
  rr(x, -w * 0.16, rTop - 3, w * 0.32, 6, 3, sh(h.thatch, -0.3));
  if (h.chim) B.smoke = { x: w * 0.1, y: rTop - 4 };
}
function tower(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    top = -98;
  stoneWall(x, rnd, -w / 2, top, w, 98, h.stone);
  // rounded body: light from the left, shade on the right
  const g = x.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, 'rgba(255,255,255,.18)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,.28)');
  x.fillStyle = g;
  x.fillRect(-w / 2, top, w, 98);
  ink(x);
  x.strokeRect(-w / 2, top, w, 98);
  // crenellated gallery under the roof
  for (let k = -w / 2 - 4; k < w / 2 + 4; k += 10) rr(x, k, top - 8, 7, 9, 1, sh(h.stone, 0.08));
  rr(x, -w / 2 - 5, top - 1, w + 10, 5, 1.5, sh(h.stone, -0.1));
  eaveShadow(x, w, top + 4, 6);
  door(x, h.door * w * DOOR_F, 15, 28, h.doorCol, true);
  windowAt(x, B.wins, 0, -58, 8, 14, { arch: true, frame: '#5a5048' });
  windowAt(x, B.wins, 0, -84, 8, 12, { arch: true, frame: '#5a5048' });
  // conical roof with a banner
  const rTop = top - 70;
  const cone = () => {
    x.beginPath();
    x.moveTo(-w / 2 - 9, top - 6);
    x.quadraticCurveTo(-w * 0.2, top - 30, 0, rTop);
    x.quadraticCurveTo(w * 0.2, top - 30, w / 2 + 9, top - 6);
    x.quadraticCurveTo(0, top - 1, -w / 2 - 9, top - 6);
    x.closePath();
  };
  ink(x);
  cone();
  x.fillStyle = h.roof[0];
  x.fill();
  x.save();
  cone();
  x.clip();
  for (let k = -w; k < w; k += 7) {
    x.strokeStyle = h.roof[1];
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(0, rTop);
    x.lineTo(k, top);
    x.stroke();
  }
  const gc = x.createLinearGradient(-w / 2, 0, w / 2, 0);
  gc.addColorStop(0, 'rgba(255,255,255,.2)');
  gc.addColorStop(1, 'rgba(0,0,0,.25)');
  x.fillStyle = gc;
  x.fillRect(-w, rTop, w * 2, 80);
  if (h.snow) snowCap(x, rTop, top - 6);
  x.restore();
  ink(x);
  cone();
  x.stroke();
  ink(x, 1.8);
  x.beginPath();
  x.moveTo(0, rTop);
  x.lineTo(0, rTop - 18);
  x.stroke();
  ink(x);
  x.beginPath();
  x.moveTo(0, rTop - 18);
  x.quadraticCurveTo(10, rTop - 17, 18, rTop - 13);
  x.quadraticCurveTo(10, rTop - 11, 0, rTop - 9);
  x.closePath();
  x.fillStyle = h.banner;
  x.fill();
  x.stroke();
  circ(x, 0, rTop - 19, 2, '#f5c451');
}
function hall(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    top = -70;
  // stone front with a plinth and pilasters
  stoneWall(x, rnd, -w / 2, top, w, 70, h.stone);
  eaveShadow(x, w, top, 8);
  ink(x);
  rr(x, -w / 2 - 4, -8, w + 8, 8, 2, sh(h.stone, -0.12));
  for (const k of [-0.42, -0.2, 0.2, 0.42]) {
    const cx = k * w;
    ink(x);
    rr(x, cx - 7, top + 4, 14, 62, 2, sh(h.stone, 0.12));
    rr(x, cx - 9, top + 2, 18, 6, 1.5, sh(h.stone, 0.2));
    rr(x, cx - 9, -12, 18, 5, 1.5, sh(h.stone, 0.2));
    x.save();
    x.strokeStyle = 'rgba(60,50,45,.3)';
    x.lineWidth = 1;
    for (const f of [-3, 0, 3]) {
      x.beginPath();
      x.moveTo(cx + f, top + 9);
      x.lineTo(cx + f, -13);
      x.stroke();
    }
    x.restore();
  }
  // tall windows between the pilasters
  for (const k of [-0.31, 0.31])
    windowAt(x, B.wins, k * w, -40, 16, 26, { arch: true, frame: '#5a5048' });
  // grand double door with steps
  ink(x);
  for (let s = 0; s < 3; s++)
    rr(x, -30 + s * 4, -4 + s * -3 + 3, 60 - s * 8, 5, 1.5, sh(h.stone, 0.08 - s * 0.04));
  door(x, -9, 17, 38, h.doorCol, true);
  door(x, 9, 17, 38, h.doorCol, true);
  // banners
  for (const s of [-1, 1]) {
    const bx = s * w * 0.1 + s * 24;
    ink(x);
    x.beginPath();
    x.moveTo(bx - 7, top + 6);
    x.lineTo(bx + 7, top + 6);
    x.lineTo(bx + 7, top + 38);
    x.lineTo(bx, top + 32);
    x.lineTo(bx - 7, top + 38);
    x.closePath();
    x.fillStyle = h.banner;
    x.fill();
    x.stroke();
    circ(x, bx, top + 18, 3.5, '#f5c451');
  }
  // roof with a central pediment and round window
  tileRoof(
    x,
    [
      [-w / 2 - 12, top + 6],
      [-w / 2 + 16, top - 44],
      [w / 2 - 16, top - 44],
      [w / 2 + 12, top + 6],
    ],
    h.roof,
    top - 44,
    top + 6,
    !!h.snow,
    h,
  );
  ink(x);
  x.beginPath();
  x.moveTo(-48, top + 4);
  x.lineTo(0, top - 70);
  x.lineTo(48, top + 4);
  x.closePath();
  x.fillStyle = sh(h.stone, 0.1);
  x.fill();
  x.stroke();
  x.beginPath();
  x.moveTo(-58, top + 6);
  x.lineTo(0, top - 80);
  x.lineTo(58, top + 6);
  x.strokeStyle = h.roof[1];
  x.lineWidth = 6;
  x.stroke();
  ink(x);
  x.stroke();
  circ(x, 0, top - 26, 11, sh(h.stone, -0.15));
  circ(x, 0, top - 26, 8, GLASS);
  B.wins.push([-6, top - 32, 12, 12]);
  x.save();
  x.strokeStyle = '#5a5048';
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(-8, top - 26);
  x.lineTo(8, top - 26);
  x.moveTo(0, top - 34);
  x.lineTo(0, top - 18);
  x.stroke();
  x.restore();
  // bell on the ridge
  ink(x, 1.8);
  rr(x, -5, top - 96, 10, 16, 2, sh(h.stone, 0.1));
  circ(x, 0, top - 84, 3.5, '#d9a83a');
}
/**
 * An anvil silhouette for the smithy sign: a thick flat face with a short tapering horn, a
 * narrow waist and a wide foot. Spans -8k..11k across and -11k..0 up from (cx, by).
 */
function anvil(x: Ctx, cx: number, by: number, k = 1) {
  const P = (px: number, py: number) => [cx + px * k, by + py * k];
  x.beginPath();
  x.moveTo(...(P(-8, -11) as [number, number]));
  x.lineTo(...(P(5, -11) as [number, number]));
  x.quadraticCurveTo(...(P(9, -11) as [number, number]), ...(P(11, -9.6) as [number, number]));
  x.quadraticCurveTo(...(P(8, -8) as [number, number]), ...(P(4.5, -7.6) as [number, number]));
  x.lineTo(...(P(2.2, -4.2) as [number, number]));
  x.lineTo(...(P(5.5, 0) as [number, number]));
  x.lineTo(...(P(-5.5, 0) as [number, number]));
  x.lineTo(...(P(-2.2, -4.2) as [number, number]));
  x.lineTo(...(P(-4.8, -7.6) as [number, number]));
  x.lineTo(...(P(-8, -7.6) as [number, number]));
  x.closePath();
  x.fillStyle = '#4a4652';
  x.fill();
  x.stroke();
  x.fillStyle = 'rgba(255,255,255,.35)';
  x.fillRect(cx - 7 * k, by - 10.2 * k, 11 * k, 1.1 * k);
}
/**
 * A heavy double door: one frame, two plank leaves meeting in the middle, iron bands, handles
 * at the seam, a lintel over it and a single step (the smithy and the tavern).
 */
function doubleDoor(x: Ctx, dx: number, col: string, lintel: string) {
  ink(x);
  const dh = 29,
    dw2 = 26;
  rr(x, dx - dw2 / 2 - 2.5, -dh - 2.5, dw2 + 5, dh + 2.5, 2, sh(col, -0.35));
  for (const s0 of [-1, 1]) {
    const lx = s0 < 0 ? dx - dw2 / 2 : dx;
    rr(x, lx, -dh, dw2 / 2, dh, 1, col);
    x.save();
    x.strokeStyle = 'rgba(0,0,0,.28)';
    x.lineWidth = 1.1;
    x.beginPath();
    x.moveTo(lx + dw2 / 4, -dh);
    x.lineTo(lx + dw2 / 4, 0);
    x.stroke();
    x.restore();
  }
  x.save();
  x.strokeStyle = 'rgba(35,28,30,.7)';
  x.lineWidth = 1.8;
  for (const f of [0.3, 0.72]) {
    x.beginPath();
    x.moveTo(dx - dw2 / 2, -dh * f);
    x.lineTo(dx + dw2 / 2, -dh * f);
    x.stroke();
  }
  x.restore();
  ink(x, 1.2);
  circ(x, dx - 2.6, -dh * 0.45, 1.6, '#f5c451');
  circ(x, dx + 2.6, -dh * 0.45, 1.6, '#f5c451');
  ink(x);
  rr(x, dx - 17, -34, 34, 5, 1.5, lintel);
  rr(x, dx - dw2 / 2 - 5, -2.5, dw2 + 10, 5, 2, STONE_FOUND);
}
/** A foaming tankard, `k` scale, standing on (cx, by): the tavern sign and the outdoor table. */
function mug(x: Ctx, cx: number, by: number, k = 1) {
  ink(x, 1.3 * Math.min(1, k + 0.2));
  // handle
  x.beginPath();
  x.moveTo(cx + 4 * k, by - 8.5 * k);
  x.quadraticCurveTo(cx + 9 * k, by - 7.5 * k, cx + 8 * k, by - 4 * k);
  x.quadraticCurveTo(cx + 7.4 * k, by - 2.2 * k, cx + 4 * k, by - 2.6 * k);
  x.lineWidth = 3.4 * k;
  x.stroke();
  x.strokeStyle = '#8a5a36';
  x.lineWidth = 1.6 * k;
  x.stroke();
  ink(x, 1.3 * Math.min(1, k + 0.2));
  rr(x, cx - 5 * k, by - 10 * k, 10 * k, 10 * k, 1.5 * k, '#a8744a');
  x.fillStyle = '#6b4a32';
  x.fillRect(cx - 5 * k, by - 7.4 * k, 10 * k, 1.2 * k);
  x.fillRect(cx - 5 * k, by - 3 * k, 10 * k, 1.2 * k);
  // the foam head spilling over the rim
  x.fillStyle = '#fff6e0';
  x.beginPath();
  x.arc(cx - 3 * k, by - 10.5 * k, 2.4 * k, 0, TAU);
  x.arc(cx + 0.4 * k, by - 11.4 * k, 2.8 * k, 0, TAU);
  x.arc(cx + 3.4 * k, by - 10.4 * k, 2.2 * k, 0, TAU);
  x.fill();
}
/**
 * The tavern: a wide two-storey hall, stone below and timber above, with a centred double
 * door, warm windows, a big tankard sign, a lantern, and a bench, barrel table and kegs outside.
 */
function tavern(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    g = -38,
    top = -80;
  stoneWall(x, rnd, -w / 2, g, w, 38, h.stone);
  timberWall(x, -w / 2, top, w, 42, h.wall, 4);
  foundation(x, w, sh(h.stone, -0.15));
  eaveShadow(x, w + 8, g, 5);
  eaveShadow(x, w, top);
  doubleDoor(x, 0, h.doorCol, sh(h.stone, 0.12));
  // ground-floor windows either side of the door, upper windows under the eaves
  for (const s of [-1, 1]) windowAt(x, B.wins, s * w * 0.3, -20, 18, 14, { box: true });
  const up = w > 140 ? [-0.34, -0.12, 0.12, 0.34] : [-0.3, 0, 0.3];
  for (const f of up) windowAt(x, B.wins, f * w, -60, 15, 14, { shut: h.shut || '#6b4a32' });
  B.smoke = chimney(x, -w * 0.3, top - 30, 34);
  const peak = top - 56;
  tileRoof(
    x,
    [
      [-w / 2 - 12, top + 5],
      [-w * 0.24, peak],
      [w * 0.24, peak],
      [w / 2 + 12, top + 5],
    ],
    h.roof,
    peak,
    top + 5,
    h.snow,
    h,
  );
  // lantern on a bracket left of the door
  const lx = -22,
    ly = -32;
  ink(x, 1.6);
  x.beginPath();
  x.moveTo(-16, ly);
  x.lineTo(lx, ly);
  x.lineTo(lx, ly + 3);
  x.stroke();
  ink(x, 1.4);
  rr(x, lx - 3.5, ly + 3, 7, 9, 1.5, '#ffd27a');
  rr(x, lx - 4.5, ly + 1.5, 9, 2.5, 1, '#3a3440');
  rr(x, lx - 2.5, ly + 12, 5, 2, 1, '#3a3440');
  CUR.lanternAt = { x: lx, y: ly + 7 };
  // a big tankard sign hanging from an iron bracket at the right corner
  const sx = w / 2 + 3,
    bx = sx + 16;
  ink(x, 2);
  x.beginPath();
  x.moveTo(sx, -50);
  x.lineTo(sx + 30, -50);
  x.moveTo(sx, -40);
  x.lineTo(sx + 10, -50);
  x.moveTo(bx - 10, -50);
  x.lineTo(bx - 10, -46);
  x.moveTo(bx + 10, -50);
  x.lineTo(bx + 10, -46);
  x.stroke();
  ink(x);
  rr(x, bx - 14, -46, 28, 22, 3, '#b8844a');
  x.fillStyle = 'rgba(255,255,255,.18)';
  x.fillRect(bx - 12, -44, 24, 2);
  mug(x, bx - 1.5, -28, 1.05);
  // outside: a bench under the left window, a barrel table with mugs and a stack of kegs
  const bxl = -w * 0.3;
  ink(x);
  shadow(x, bxl, 5, 16, 3.5, 0.2);
  rr(x, bxl - 15, 0, 30, 4, 1.5, '#9a6a3a');
  rr(x, bxl - 12, 4, 3, 5, 1, '#7a4f2a');
  rr(x, bxl + 9, 4, 3, 5, 1, '#7a4f2a');
  const tx = w * 0.3;
  shadow(x, tx, 8, 13, 3.5, 0.22);
  ink(x);
  rr(x, tx - 8, -8, 16, 16, 4, '#9a6a3a');
  x.save();
  x.strokeStyle = '#5a5a60';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(tx - 8, -3);
  x.lineTo(tx + 8, -3);
  x.moveTo(tx - 8, 3);
  x.lineTo(tx + 8, 3);
  x.stroke();
  x.restore();
  ell(x, tx, -8, 9, 3, '#7a4f2a');
  mug(x, tx - 3.5, -8, 0.55);
  mug(x, tx + 4, -8.5, 0.5);
  const kx = w / 2 + 14;
  shadow(x, kx, 4, 16, 4, 0.22);
  for (const [ox, oy] of [
    [-7, 0],
    [7, 0],
    [0, -12],
  ]) {
    ink(x, 1.8);
    x.fillStyle = '#a8744a';
    x.beginPath();
    x.ellipse(kx + ox, oy - 5, 7, 6.5, 0, 0, TAU);
    x.fill();
    x.stroke();
    ell(x, kx + ox, oy - 5, 3.6, 3.4, '#7a4f2a');
    circ(x, kx + ox, oy - 5, 1.1, '#3a3440');
  }
}
/** The village smithy: a stone forge-house with a wide glowing chimney, a heavy double door,
 * an anvil sign, and an open lean-to with the outdoor forge. */
function smithy(x: Ctx, h, rnd: () => number, B: Built) {
  const w = h.w,
    top = -50,
    side = -(h.door || 1), // lean-to on the side away from the door
    lx0 = side * (w / 2),
    lx1 = side * (w / 2 + 30),
    col = sh(h.stone, -0.08);
  // lean-to: back wall, posts and a sloping roof
  ink(x);
  const L = Math.min(lx0, lx1),
    R = Math.max(lx0, lx1);
  rr(x, L, -34, R - L, 34, 1, sh(col, -0.25));
  // the outdoor forge glowing under the lean-to
  const fx = (lx0 + lx1) / 2;
  rr(x, fx - 11, -16, 22, 16, 2, '#7a6a64');
  x.fillStyle = '#ff8a2a';
  x.fillRect(fx - 7, -13, 14, 5);
  x.fillStyle = '#ffd24a';
  x.fillRect(fx - 4, -12, 8, 2);
  B.forgeAt = { x: fx, y: -10 };
  for (const px of [lx1 - side * 2, lx0 + side * 2]) rr(x, px - 2, -36, 4, 36, 1, WOOD);
  x.beginPath();
  x.moveTo(lx0, -46);
  x.lineTo(lx1 + side * 6, -32);
  x.lineTo(lx1 + side * 6, -36);
  x.lineTo(lx0, -52);
  x.closePath();
  x.fillStyle = sh(h.slate, -0.05);
  x.fill();
  x.stroke();
  // main stone house
  stoneWall(x, rnd, -w / 2, top, w, 50, col);
  foundation(x, w, sh(col, -0.15));
  eaveShadow(x, w, top, 7);
  // heavy double door under a stone lintel
  doubleDoor(x, h.door * w * DOOR_F, h.doorCol, sh(col, 0.12));
  // a small window glowing with forge light
  const wx = -h.door * w * 0.22;
  ink(x);
  rr(x, wx - 9, -33, 18, 14, 2, '#5a5048');
  const gl = x.createLinearGradient(0, -31, 0, -21);
  gl.addColorStop(0, '#ffb24a');
  gl.addColorStop(1, '#e0602a');
  x.fillStyle = gl;
  x.fillRect(wx - 6.5, -30.5, 13, 9);
  x.strokeStyle = '#5a5048';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(wx, -30.5);
  x.lineTo(wx, -21.5);
  x.stroke();
  B.wins.push([wx - 6.5, -30.5, 13, 9]);
  // slate roof
  slateRoof(
    x,
    [
      [-w / 2 - 9, top + 4],
      [-w / 2 + 12, top - 40],
      [w / 2 - 12, top - 40],
      [w / 2 + 9, top + 4],
    ],
    h.slate,
    top - 40,
    top + 4,
    h.snow,
    rnd,
    h,
  );
  // wide stone chimney over the forge side, glowing at the top
  const cx = side * (w / 2 - 16);
  ink(x);
  rr(x, cx - 11, top - 62, 22, 44, 2, sh(col, -0.05));
  x.save();
  x.strokeStyle = 'rgba(40,30,40,.35)';
  x.lineWidth = 1;
  x.beginPath();
  for (let yy = top - 56; yy < top - 20; yy += 7) {
    x.moveTo(cx - 11, yy);
    x.lineTo(cx + 11, yy);
  }
  x.stroke();
  x.restore();
  ink(x);
  rr(x, cx - 13, top - 66, 26, 6, 1.5, '#5a5048');
  x.fillStyle = '#ff9a3a';
  x.fillRect(cx - 9, top - 64, 18, 2.4);
  B.smoke = { x: cx, y: top - 68 };
  // hanging sign with an anvil, on an iron bracket with two links
  const sx = h.door * (w / 2 + 3),
    bx = sx + h.door * 13,
    k = 0.78;
  ink(x, 1.8);
  x.beginPath();
  x.moveTo(sx, -47);
  x.lineTo(sx + h.door * 26, -47);
  x.moveTo(bx - 8, -47);
  x.lineTo(bx - 8, -43);
  x.moveTo(bx + 8, -47);
  x.lineTo(bx + 8, -43);
  x.stroke();
  ink(x);
  rr(x, bx - 12, -43, 24, 17, 2, '#b8844a');
  ink(x, 1.1);
  // the anvil's outline spans -8k..11k across and -11k..0 up: centre it on the plank
  anvil(x, bx - 1.5 * k, -34.5 + 5.5 * k, k);
}
const MODELS = {
  cottage,
  townhouse,
  stone: stoneCottage,
  hut,
  tower,
  hall,
  smithy,
  tavern,
  keep,
  temple,
};
const WALL_TOP = {
  cottage: -46,
  townhouse: -76,
  stone: -40,
  hut: -32,
  tower: -98,
  hall: -70,
  smithy: -50,
  tavern: -80,
  keep: -96,
  temple: -104,
};

/** Ivy climbing a house corner: a wavy stem with leaf pairs. */
function ivy(x: Ctx, h) {
  const side = -(h.door || 1),
    bx = side * (h.w / 2 - 5),
    top = WALL_TOP[h.kind] * (0.65 + extra(h, 81) * 0.3),
    stem = new Path2D();
  stem.moveTo(bx, 0);
  for (let y = 0, k = 0; y > top; y -= 6, k++) stem.lineTo(bx + Math.sin(k * 1.3) * 3, y - 6);
  ink(x, 3);
  x.stroke(stem);
  x.strokeStyle = '#5a7a34';
  x.lineWidth = 1.6;
  x.stroke(stem);
  for (let y = -4, k = 0; y > top; y -= 5, k++)
    for (const s of [-1, 1]) {
      if (hash2(k, s + h.seed) < 0.3) continue;
      const lx = bx + Math.sin(k * 1.3) * 3 + s * 4,
        ly = y + s;
      x.fillStyle = hash2(s, k) < 0.5 ? '#4e8a3a' : '#62a44a';
      x.strokeStyle = '#2e5a2a';
      x.lineWidth = 0.9;
      x.beginPath();
      x.ellipse(lx, ly, 3.2, 2.2, s * 0.5, 0, TAU);
      x.fill();
      x.stroke();
    }
}
/** Small vegetable patch with a picket fence under the window side. */
function garden(x: Ctx, h) {
  const cx = -(h.door || 1) * h.w * 0.26;
  ink(x, 1.6);
  rr(x, cx - 17, 2, 34, 10, 4, '#7a5a3a');
  for (let k = 0; k < 3; k++) {
    const gx = cx - 10 + k * 10;
    x.fillStyle = k === 1 ? '#8aba4a' : '#62a44a';
    x.strokeStyle = '#2e5a2a';
    x.lineWidth = 1;
    x.beginPath();
    x.arc(gx, 6, 3.4, 0, TAU);
    x.fill();
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,.35)';
    x.beginPath();
    x.arc(gx - 1, 5, 1.2, 0, TAU);
    x.fill();
  }
  // picket fence along the front
  ink(x, 1.2);
  for (let k = -16; k <= 16; k += 5.3)
    rr(x, cx + k - 1.3, 5, 2.6, 9, [1.3, 1.3, 0, 0] as any, '#e8dcc0');
  rr(x, cx - 17, 9, 34, 2, 1, '#d8ccb0');
}
/** A cat sitting by the door. */
function cat(x: Ctx, h) {
  const cx = h.door * h.w * DOOR_F + (h.door || 1) * 16,
    col = ['#3a3440', '#e08a3a', '#f0ece4', '#8a8078'][Math.floor(extra(h, 96) * 4)],
    sway = 0;
  ink(x, 1.4);
  x.fillStyle = col;
  x.beginPath();
  x.ellipse(cx, -5, 5, 5.5, 0, 0, TAU);
  x.fill();
  x.stroke();
  x.beginPath();
  x.moveTo(cx + 4, -1);
  x.quadraticCurveTo(cx + 11, -2 + sway, cx + 9, -9);
  x.lineWidth = 2.6;
  x.stroke();
  x.strokeStyle = col;
  x.lineWidth = 1.4;
  x.stroke();
  ink(x, 1.4);
  x.fillStyle = col;
  for (const s of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx + s * 1.5, -14);
    x.lineTo(cx + s * 4, -18.5);
    x.lineTo(cx + s * 4.5, -13);
    x.closePath();
    x.fill();
    x.stroke();
  }
  x.beginPath();
  x.arc(cx, -12.5, 4.2, 0, TAU);
  x.fill();
  x.stroke();
  x.fillStyle = col === '#3a3440' ? '#ffd24a' : OUT;
  x.fillRect(cx - 2.3, -13.5, 1.3, 1.6);
  x.fillRect(cx + 1, -13.5, 1.3, 1.6);
}
/** Draw one house (and its seeded extras and props) at its place, live. */
function paintHouse(c: Ctx, h) {
  const kind = h.kind || 'cottage',
    B: Built = { wins: [], smoke: null },
    rnd = mulberry(((h.seed || 0.5) * 1e9) | 0);
  setCur(h);
  h.lanternAt = null;
  c.save();
  c.translate(h.x, h.y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 'smithy') {
    // cover the house and its lean-to (on the side away from the door)
    const side = -(h.door || 1);
    shadow(c, side * 15, 2, h.w / 2 + 24, 8, 0.28);
  } else shadow(c, 0, 3, h.w / 2 + 16, 11, 0.3);
  MODELS[kind](c, h, rnd, B);
  const plain = ['cottage', 'townhouse', 'stone', 'hut', 'tower'].includes(kind);
  if (plain && kind !== 'hut' && extra(h, 80) < 0.3) ivy(c, h);
  if (plain && kind !== 'tower' && extra(h, 90) < 0.3) garden(c, h);
  (h.props || []).forEach((pk, i) => {
    const side = i === 0 ? -h.door : h.door,
      px = side * (h.w / 2 + (i === 0 ? 16 : 22));
    prop(c, pk, px, rnd);
  });
  if (plain && extra(h, 95) < 0.2) cat(c, h);
  c.restore();
  setCur(null);
  h.wins = B.wins;
  h.smokeAt = B.smoke;
  h.forgeAt = B.forgeAt || null;
}
export function drawHouse(c, h, t, dark) {
  paintHouse(c, h);
  if (dark > 0.15 && h.lanternAt) {
    const lx = h.x + h.lanternAt.x,
      ly = h.y + h.lanternAt.y;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(lx, ly, 1, lx, ly, 26);
    g.addColorStop(0, 'rgba(255,200,110,' + (0.5 * dark).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,180,90,0)');
    c.fillStyle = g;
    c.fillRect(lx - 26, ly - 26, 52, 52);
    c.restore();
    addLight(lx, ly, 70, 0.6 * dark, '#ffc060');
  }
  if (dark > 0.15 && h.wins) {
    c.save();
    c.globalAlpha = clamp(dark * 1.4, 0, 1) * (0.85 + Math.sin(t * 3 + h.seed * 9) * 0.08);
    c.fillStyle = '#ffc25a';
    for (const [wx, wy, ww, wh] of h.wins) c.fillRect(h.x + wx + 1, h.y + wy + 1, ww - 2, wh - 2);
    c.restore();
    const w0 = h.wins[0];
    if (w0) addLight(h.x + w0[0] + w0[2] / 2, h.y + w0[1] + 6, 90, 0.6 * dark, '#ffb050');
  }
  if (h.forgeAt) {
    // the lean-to forge: a flickering glow and the odd spark
    const fx = h.x + h.forgeAt.x,
      fy = h.y + h.forgeAt.y,
      fl = 0.8 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.06;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(fx, fy, 2, fx, fy, 34);
    g.addColorStop(0, 'rgba(255,150,60,' + ((0.28 + dark * 0.3) * fl).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g;
    c.fillRect(fx - 34, fy - 34, 68, 68);
    c.restore();
    if (dark > 0.15) addLight(fx, fy, 90, 0.7 * dark, '#ff9a4a');
    if (Math.random() < 0.05)
      game.parts.push({
        x: fx + rand(-5, 5),
        y: fy - 4,
        vx: rand(-20, 20),
        vy: rand(-60, -30),
        life: 0.6,
        max: 0.6,
        col: '#ffd27a',
        sz: 2,
        g: 60,
        glow: 1,
      });
  }
  if (h.smokeAt && Math.random() < 0.06)
    game.parts.push({
      x: h.x + h.smokeAt.x,
      y: h.y + h.smokeAt.y,
      vx: rand(4, 12),
      vy: rand(-22, -14),
      life: 2.2,
      max: 2.2,
      col: 'rgba(230,230,235,.5)',
      sz: rand(6, 10),
      g: 0,
      smoke: 1,
    });
}
