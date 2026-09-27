import { ell, rr, shadow } from '../../dom';
import { OUT, TAU, sh } from '../../../core/math';
import { IT, type Furn } from '../../../model/world/interior';
/* ================= ART: tavern furniture ================= */
// The bar with its beer taps, the keg rack and bottle shelf behind it, and tables set with
// tankards. Same conventions as furniture.ts: (f.x, f.y) is the piece's centre at its front
// edge on the floor; wall pieces rise over the wall face.
type Ctx = CanvasRenderingContext2D;
const WOOD = '#8a5a36',
  WOOD_L = '#a8744a',
  WOOD_D = '#5e3c22',
  BRASS = '#e3b24a',
  IRON = '#4a4652';

/** A small foaming tankard standing on (x, y). */
function tankard(c: Ctx, x: number, y: number, k = 1) {
  c.lineWidth = 1.4;
  c.strokeStyle = OUT;
  c.beginPath();
  c.moveTo(x + 3.5 * k, y - 7 * k);
  c.quadraticCurveTo(x + 7.5 * k, y - 6 * k, x + 3.5 * k, y - 2.5 * k);
  c.stroke();
  rr(c, x - 4 * k, y - 9 * k, 8 * k, 9 * k, 1.5 * k, WOOD_L);
  c.fillStyle = WOOD_D;
  c.fillRect(x - 4 * k, y - 6.5 * k, 8 * k, 1);
  c.fillStyle = '#fff6e0';
  c.beginPath();
  c.arc(x - 2 * k, y - 9.4 * k, 2.2 * k, 0, TAU);
  c.arc(x + 1.2 * k, y - 10 * k, 2.4 * k, 0, TAU);
  c.arc(x + 3 * k, y - 9.2 * k, 1.6 * k, 0, TAU);
  c.fill();
  c.lineWidth = 2;
}

/** The long bar: a polished top, a panelled front with a brass foot rail, taps and mugs. */
export function bar(c: Ctx, f: Furn) {
  const x0 = f.cx * IT + 2,
    x1 = (f.cx + f.cw) * IT - 2,
    y = f.y,
    w = x1 - x0;
  shadow(c, (x0 + x1) / 2, y, w / 2, 5, 0.25);
  rr(c, x0, y - 30, w, 11, 2, WOOD_L); // top
  rr(c, x0, y - 20, w, 20, 2, WOOD); // front
  // panels on the front
  c.lineWidth = 1.2;
  for (let xx = x0 + 6; xx + 22 < x1; xx += 28) rr(c, xx, y - 17, 22, 13, 2, WOOD_D);
  // brass foot rail on little posts
  c.lineWidth = 1.6;
  for (let xx = x0 + 14; xx < x1 - 8; xx += 46) rr(c, xx - 1.5, y - 6, 3, 5, 1, BRASS);
  rr(c, x0 + 6, y - 7, w - 12, 3, 1.5, BRASS);
  c.lineWidth = 2;
  // top shine
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.fillRect(x0 + 4, y - 28, w - 8, 2);
  // beer taps near one end, mugs and a cloth along the top
  const tx = x0 + 22;
  for (let k = 0; k < 3; k++) {
    const px = tx + k * 12;
    c.lineWidth = 1.6;
    rr(c, px - 2, y - 44, 4, 16, 1.5, BRASS);
    rr(c, px - 3.5, y - 48, 7, 6, 2, k === 1 ? '#c8423a' : '#2f2a3a');
  }
  c.lineWidth = 2;
  for (const [mx, k] of [
    [x1 - 26, 1],
    [x1 - 44, 0.9],
    [(x0 + x1) / 2 + 6, 1],
  ])
    tankard(c, mx, y - 25, k);
  rr(c, (x0 + x1) / 2 - 18, y - 28, 14, 4, 1.5, '#e8e0d0'); // cloth
}

/** A rack of kegs lying on their sides against the back wall, with brass spigots. */
export function kegs(c: Ctx, f: Furn) {
  const { x, y } = f,
    w = f.cw * IT - 8;
  // the rack: two uprights and shelves
  rr(c, x - w / 2, y - 66, 5, 66, 1.5, WOOD_D);
  rr(c, x + w / 2 - 5, y - 66, 5, 66, 1.5, WOOD_D);
  rr(c, x - w / 2, y - 36, w, 5, 1.5, WOOD);
  rr(c, x - w / 2, y - 6, w, 6, 1.5, WOOD);
  const keg = (kx: number, ky: number) => {
    c.lineWidth = 2;
    c.fillStyle = WOOD_L;
    c.beginPath();
    c.ellipse(kx, ky, 13, 12, 0, 0, TAU);
    c.fill();
    c.stroke();
    // hoops and the lid
    c.strokeStyle = IRON;
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(kx, ky, 10, 9, 0, 0, TAU);
    c.stroke();
    c.strokeStyle = OUT;
    ell(c, kx, ky, 5, 4.5, WOOD);
    c.lineWidth = 1.4;
    rr(c, kx - 1.5, ky + 1, 3, 7, 1, BRASS);
    c.lineWidth = 2;
  };
  for (const kx of [x - 15, x + 15]) keg(kx, y - 19);
  keg(x, y - 49);
}

/** A tall shelf of bottles and jugs in many colours. */
export function bottles(c: Ctx, f: Furn) {
  const { x, y } = f,
    w = f.cw * IT - 10,
    cols = ['#3f8a4a', '#8a3a3a', '#4f6fb3', '#c9912c', '#6a3f8a', '#d8d0c0'];
  rr(c, x - w / 2, y - 76, w, 76, 2, WOOD); // back board
  c.fillStyle = WOOD_D;
  c.fillRect(x - w / 2 + 4, y - 72, w - 8, 68);
  let n = Math.floor(f.s * 97);
  for (const sy of [-52, -28, -4]) {
    rr(c, x - w / 2, y + sy - 2, w, 5, 1.5, WOOD_L); // shelf
    for (let bx = x - w / 2 + 8; bx < x + w / 2 - 6; bx += 9) {
      const col = cols[n++ % cols.length],
        jug = n % 5 === 0,
        ht = jug ? 11 : 15 + (n % 3) * 2;
      c.lineWidth = 1.3;
      const by = y + sy - 2; // the shelf top the bottle stands on
      if (jug) {
        rr(c, bx - 4, by - ht, 8, ht, 3, col);
      } else {
        // neck first, so the body's outline closes over its foot
        rr(c, bx - 1.3, by - ht, 2.6, 7, 1, col);
        rr(c, bx - 3, by - ht + 6, 6, ht - 6, 1.5, col);
      }
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.fillRect(bx - 1.8, by - ht + 7, 1, ht - 9);
    }
  }
  c.lineWidth = 2;
}

/** A tavern table set with two tankards and a candle between them. */
export function ttable(
  c: Ctx,
  f: Furn,
  flame: (c: Ctx, x: number, y: number, s: number, t: number, ph?: number) => void,
  t: number,
) {
  const { x, y } = f,
    w = f.cw * IT - 14;
  shadow(c, x, y, w / 2, 5, 0.25);
  for (const lx of [-w / 2 + 5, w / 2 - 5]) rr(c, x + lx - 2.5, y - 16, 5, 16, 1.5, WOOD_D);
  rr(c, x - w / 2, y - 30, w, 18, 3, WOOD_L);
  rr(c, x - w / 2, y - 14, w, 5, 2, WOOD);
  clutter(c, x, y - 20, w - 6, f.s, flame, t);
}

type Flame = (c: Ctx, x: number, y: number, s: number, t: number, ph?: number) => void;
/** Things on a table top centred at (x, y), across width `w`: a seeded mix of tankards, a
 * plate of bread, a bottle, a candle stub and a spilled ring. */
function clutter(c: Ctx, x: number, y: number, w: number, s: number, flame: Flame, t: number) {
  let n = Math.floor(s * 9973);
  const next = () => (n = (n * 16807) % 2147483647) / 2147483647,
    slots = Math.max(2, Math.round(w / 22)),
    items: string[] = [];
  for (let i = 0; i < slots; i++) {
    const r = next();
    items.push(
      r < 0.45 ? 'mug' : r < 0.62 ? 'plate' : r < 0.74 ? 'bottle' : r < 0.86 ? 'candle' : '',
    );
  }
  if (!items.includes('mug')) items[0] = 'mug';
  items.forEach((k, i) => {
    const ix = x - w / 2 + ((i + 0.5) * w) / slots + (next() - 0.5) * 6,
      iy = y + (next() - 0.5) * 4;
    c.lineWidth = 1.4;
    if (k === 'mug') tankard(c, ix, iy + 3, 0.9);
    else if (k === 'plate') {
      ell(c, ix, iy, 7, 3, '#e8e4dc');
      ell(c, ix - 1, iy - 1.5, 4, 2.2, '#d8a060');
    } else if (k === 'bottle') {
      rr(c, ix - 1.2, iy - 12, 2.4, 5, 1, '#3f8a4a');
      rr(c, ix - 3, iy - 8, 6, 9, 1.5, '#3f8a4a');
      c.fillStyle = 'rgba(255,255,255,.45)';
      c.fillRect(ix - 1.6, iy - 6, 1, 5);
    } else if (k === 'candle') {
      rr(c, ix - 2, iy - 6, 4, 6, 1, '#f4ecd8');
      flame(c, ix, iy - 6, 0.26, t, s * 7 + i);
    } else if (next() < 0.6) {
      c.fillStyle = 'rgba(90,50,20,.25)';
      c.beginPath();
      c.ellipse(ix, iy, 5, 2, 0, 0, TAU);
      c.fill();
    }
    c.lineWidth = 2;
  });
}
/** A round table on a single pedestal, set with a few things. */
export function rtable(c: Ctx, f: Furn, flame: Flame, t: number) {
  const { x, y } = f,
    rx = f.cw * IT * 0.42;
  shadow(c, x, y, rx * 0.8, 5, 0.25);
  rr(c, x - 4, y - 16, 8, 16, 2, WOOD_D); // pedestal
  ell(c, x, y - 1, 11, 3, WOOD_D); // foot
  ell(c, x, y - 18, rx, 8, WOOD); // rim
  ell(c, x, y - 21, rx, 8, WOOD_L); // top
  c.fillStyle = 'rgba(255,255,255,.18)';
  c.beginPath();
  c.ellipse(x - rx * 0.3, y - 23, rx * 0.4, 2.5, 0, 0, TAU);
  c.fill();
  clutter(c, x, y - 20, rx * 1.5, f.s, flame, t);
}
/** A long plank feast table on trestles. */
export function ltable(c: Ctx, f: Furn, flame: Flame, t: number) {
  const { x, y } = f,
    w = f.cw * IT - 12;
  shadow(c, x, y, w / 2, 5, 0.25);
  for (const lx of [-w / 2 + 8, w / 2 - 8]) {
    rr(c, x + lx - 3, y - 16, 6, 16, 1.5, WOOD_D);
    rr(c, x + lx - 8, y - 3, 16, 3, 1, WOOD_D);
  }
  rr(c, x - w / 2, y - 30, w, 18, 3, WOOD_L);
  // plank seams
  c.strokeStyle = 'rgba(94,60,34,.5)';
  c.lineWidth = 1;
  for (const k of [0.33, 0.66]) {
    c.beginPath();
    c.moveTo(x - w / 2 + 3, y - 30 + 18 * k);
    c.lineTo(x + w / 2 - 3, y - 30 + 18 * k);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  rr(c, x - w / 2, y - 14, w, 5, 2, WOOD);
  clutter(c, x, y - 20, w - 10, f.s, flame, t);
}
/** A plain bench: behind a table (only its top edge shows) or in front of it. */
export function bench(c: Ctx, f: Furn, front: boolean) {
  const { x, y } = f,
    w = f.cw * IT - 16;
  c.lineWidth = 1.8;
  if (front) {
    for (const lx of [-w / 2 + 6, w / 2 - 6]) rr(c, x + lx - 2, y - 10, 4, 10, 1, WOOD_D);
    rr(c, x - w / 2, y - 14, w, 7, 2, WOOD_L);
    rr(c, x - w / 2, y - 8, w, 3, 1, WOOD);
  } else rr(c, x - w / 2, y - 12, w, 6, 2, WOOD_L);
  c.lineWidth = 2;
}
/** A chair seen from behind, in front of the patron sitting on it: the backrest hides the
 * lower body, the seat edge and legs show underneath. */
export function chairBack(c: Ctx, f: Furn) {
  const { x, y } = f;
  c.lineWidth = 1.8;
  shadow(c, x, y, 10, 3, 0.2);
  for (const lx of [-8, 8]) rr(c, x + lx - 1.5, y - 9, 3, 9, 1, WOOD_D);
  rr(c, x - 10, y - 12, 20, 5, 2, WOOD_L); // seat edge
  rr(c, x - 9, y - 24, 18, 13, 3, WOOD); // backrest
  c.fillStyle = WOOD_D;
  c.fillRect(x - 5, y - 21, 10, 6);
  c.lineWidth = 2;
}
/** A chair from the side: `part` 'back' is the backrest (behind the sitter), 'seat' the seat
 * and legs drawn over their hips. `f.side` is -1 when the chair stands left of its table. */
export function chairSide(c: Ctx, f: Furn, part: 'back' | 'seat') {
  const { x, y } = f,
    s = f.side || 1;
  c.lineWidth = 1.8;
  if (part === 'back') {
    rr(c, x - 2.5, y - 30, 5, 26, 2, WOOD);
  } else {
    shadow(c, x, y, 10, 3, 0.2);
    for (const lx of [-7, 7]) rr(c, x + lx - 1.5, y - 10, 3, 10, 1, WOOD_D);
    rr(c, x - 10 - s * 2, y - 13, 20, 5, 2, WOOD_L);
  }
  c.lineWidth = 2;
}
/** A tall bar stool in front of the bar. */
export function barstool(c: Ctx, f: Furn) {
  const { x, y } = f;
  c.lineWidth = 1.8;
  shadow(c, x, y, 8, 3, 0.2);
  for (const lx of [-5, 5]) rr(c, x + lx - 1.5, y - 12, 3, 12, 1, WOOD_D);
  rr(c, x - 6, y - 6, 12, 2.5, 1, WOOD);
  ell(c, x, y - 12, 9, 4, WOOD_L);
  c.lineWidth = 2;
}
/** A dog asleep on the floor, curled up, breathing slowly. */
export function dog(c: Ctx, f: Furn, t: number) {
  const { x, y } = f,
    b = 1 + Math.sin(t * 1.6 + f.s * 9) * 0.04,
    fur = ['#b07a4a', '#6a4a36', '#d8c8a8', '#3a3036'][Math.floor(f.s * 4)];
  shadow(c, x, y, 16, 4, 0.25);
  c.lineWidth = 2;
  ell(c, x + 2, y - 8, 14 * b, 8 * b, fur); // body
  ell(c, x - 10, y - 5, 5, 3, fur); // tail curled round
  ell(c, x + 11, y - 7, 7, 6, fur); // head resting on the paws
  ell(c, x + 15, y - 11, 3, 4.5, sh(fur, -0.25)); // ear
  c.strokeStyle = OUT;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x + 9, y - 7.5);
  c.quadraticCurveTo(x + 11, y - 6, x + 13, y - 7.5); // closed eye
  c.stroke();
  c.fillStyle = OUT;
  c.beginPath();
  c.arc(x + 17.5, y - 6, 1.3, 0, TAU);
  c.fill();
  c.lineWidth = 2;
}
/** Spilled ale on the floorboards, with a tipped-over tankard now and then. */
export function spill(c: Ctx, f: Furn) {
  const { x, y } = f;
  c.fillStyle = 'rgba(200,140,40,.35)';
  c.beginPath();
  c.ellipse(x, y - 6, 12, 4.5, 0.1, 0, TAU);
  c.ellipse(x + 8, y - 4, 6, 2.6, 0, 0, TAU);
  c.fill();
  if (f.s > 0.5) {
    c.save();
    c.translate(x - 7, y - 8);
    c.rotate(-1.5);
    tankard(c, 0, 4, 0.85);
    c.restore();
  }
}
/** Where the bar turns the corner and runs back to the wall: that length of counter, seen from
 * above, with a darker hinged flap in it (brass hinges, a ring to lift it) that stays shut.
 * Its near end meets the bar top; (f.x, f.y) is the middle of that end at the floor. */
export function barflap(c: Ctx, f: Furn) {
  const x = f.x,
    w = 18,
    yTop = IT + 18 - 30, // the far end, against the wall, at counter height
    yEnd = f.y - 30, // the near end, where it meets the bar top
    x0 = x - w / 2;
  c.lineWidth = 2;
  rr(c, x0, yTop, w, yEnd - yTop + 11, 2, WOOD_L); // the counter top
  c.fillStyle = 'rgba(255,255,255,.2)';
  c.fillRect(x0 + 3, yTop + 3, 2, yEnd - yTop + 4);
  // the flap: a darker section across the middle, cut from the rest by two seams
  const fy0 = yTop + (yEnd - yTop) * 0.3,
    fy1 = yTop + (yEnd - yTop) * 0.78;
  c.lineWidth = 1.5;
  rr(c, x0 + 1.5, fy0, w - 3, fy1 - fy0, 1.5, WOOD);
  for (const hy of [fy0 - 1.5, fy1 - 1.5]) rr(c, x0 + 3, hy, 4, 3, 1, BRASS); // hinges
  // a ring pull on the flap
  c.strokeStyle = IRON;
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(x + 3, (fy0 + fy1) / 2, 2.2, 0, TAU);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
}
