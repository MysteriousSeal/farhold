import { ell, rr, shadow } from '../../core/dom';
import { OUT, TAU } from '../../core/math';
import { IT, type Furn } from '../../world/interior';
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
  // a spilled ring and the tankards in front of the two seats
  c.fillStyle = 'rgba(90,50,20,.25)';
  c.beginPath();
  c.ellipse(x - w / 4 + 6, y - 18, 5, 2, 0, 0, TAU);
  c.fill();
  tankard(c, x - IT * 0.45, y - 17);
  tankard(c, x + IT * 0.45, y - 17, 0.95);
  rr(c, x - 2, y - 32, 4, 9, 1, '#f4ecd8');
  flame(c, x, y - 32, 0.3, t, f.s * 6);
}
