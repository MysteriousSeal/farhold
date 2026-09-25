import { ell, rr, shadow } from '../../core/dom';
import { OUT, TAU, sh } from '../../core/math';
import { IT, type Furn } from '../../world/interior';
/* ================= ART: house interiors — furniture ================= */
// One outlined, full-colour drawing per piece. Anchor (f.x, f.y) is the piece's centre at its
// front edge on the floor; pieces against the back wall rise over the wall face.
type Ctx = CanvasRenderingContext2D;
const WOOD = '#8a5a36',
  WOOD_L = '#a8744a',
  WOOD_D = '#5e3c22',
  STONE = '#a49c94',
  IRON = '#4a4652',
  GOLD = '#e3b24a';

function flame(c: Ctx, x: number, y: number, s: number, t: number, ph = 0) {
  const f = 1 + Math.sin(t * 11 + ph) * 0.1 + Math.sin(t * 17 + ph * 2) * 0.06;
  for (const [col, k] of [
    ['#ff7a2a', 1],
    ['#ffc24a', 0.66],
    ['#fff4b0', 0.34],
  ] as [string, number][]) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x, y - 16 * s * k * f);
    c.quadraticCurveTo(x + 7 * s * k, y - 6 * s * k, x + 5 * s * k, y);
    c.quadraticCurveTo(x, y + 2 * s * k, x - 5 * s * k, y);
    c.quadraticCurveTo(x - 7 * s * k, y - 6 * s * k, x, y - 16 * s * k * f);
    c.fill();
  }
}
function logs(c: Ctx, x: number, y: number) {
  c.lineWidth = 1.6;
  rr(c, x - 12, y - 5, 24, 5, 2.5, WOOD);
  rr(c, x - 9, y - 8, 18, 5, 2.5, WOOD_L);
}

function hearth(c: Ctx, f: Furn, t: number) {
  const { x, y } = f;
  // chimney breast rising up the wall
  rr(c, x - 38, y - 88, 76, 88, 3, STONE);
  c.save();
  c.beginPath();
  c.rect(x - 38, y - 88, 76, 88);
  c.clip();
  c.strokeStyle = 'rgba(40,30,35,.4)';
  c.lineWidth = 1.2;
  for (let r = 0; r < 7; r++) {
    const yy = y - 88 + r * 14;
    c.beginPath();
    c.moveTo(x - 38, yy);
    c.lineTo(x + 38, yy);
    c.stroke();
    for (let q = 0; q < 4; q++) {
      const xx = x - 38 + q * 22 + (r % 2 ? 11 : 0);
      c.beginPath();
      c.moveTo(xx, yy);
      c.lineTo(xx, yy + 14);
      c.stroke();
    }
  }
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.strokeRect(x - 38, y - 88, 76, 88);
  // mantel with a candle and a jug
  rr(c, x - 42, y - 46, 84, 7, 2, WOOD);
  rr(c, x - 30, y - 56, 5, 10, 1.5, '#f4ecd8');
  flame(c, x - 27.5, y - 56, 0.35, t, 1);
  rr(c, x + 20, y - 58, 9, 12, 3, '#c86a3a');
  // firebox with the fire
  c.fillStyle = '#1c1216';
  c.beginPath();
  c.moveTo(x - 24, y - 2);
  c.lineTo(x - 24, y - 26);
  c.quadraticCurveTo(x, y - 40, x + 24, y - 26);
  c.lineTo(x + 24, y - 2);
  c.closePath();
  c.fill();
  c.stroke();
  logs(c, x, y - 3);
  flame(c, x - 6, y - 8, 1, t, 0);
  flame(c, x + 6, y - 8, 0.8, t, 2);
  rr(c, x - 30, y - 4, 60, 5, 2, sh(STONE, -0.15)); // hearthstone
}
function firepit(c: Ctx, f: Furn, t: number) {
  const { x } = f,
    y = f.y - 14;
  shadow(c, x, y + 4, 22, 7);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU;
    ell(c, x + Math.cos(a) * 16, y + Math.sin(a) * 7, 5, 3.6, sh(STONE, (k % 3) * -0.08));
  }
  logs(c, x, y + 3);
  flame(c, x, y - 1, 1, t);
}
function shelf(c: Ctx, f: Furn) {
  const { x, y } = f,
    w = 34,
    h = 76;
  c.beginPath();
  c.moveTo(x - w / 2 - 1, y - h);
  c.lineTo(x - w / 2 + 3, y - h - 6);
  c.lineTo(x + w / 2 - 3, y - h - 6);
  c.lineTo(x + w / 2 + 1, y - h);
  c.closePath();
  c.fillStyle = WOOD_L;
  c.fill();
  c.stroke();
  rr(c, x - w / 2, y - h, w, h, 2, WOOD);
  c.fillStyle = WOOD_D;
  c.fillRect(x - w / 2 + 4, y - h + 5, w - 8, h - 10);
  const cols = ['#b84a4a', '#4a6ab8', '#5a9a5a', '#c8923a', '#7a5aa8', '#e8dcc0'];
  c.lineWidth = 1;
  for (let r = 0; r < 3; r++) {
    const sy = y - h + 26 + r * 22;
    let bx = x - w / 2 + 5;
    let k = 0;
    while (bx < x + w / 2 - 7) {
      const bw = 3 + ((f.s * 13 + r * 5 + k) % 3),
        bh = 12 + ((f.s * 17 + k * 3 + r) % 6);
      c.fillStyle = cols[Math.floor(f.s * 6 + k + r * 2) % cols.length];
      c.fillRect(bx, sy - bh, bw, bh);
      c.strokeRect(bx, sy - bh, bw, bh);
      bx += bw + 0.6;
      k++;
    }
    c.lineWidth = 2;
    rr(c, x - w / 2 + 2, sy, w - 4, 3, 1, WOOD_L);
    c.lineWidth = 1;
  }
  c.lineWidth = 2;
  c.strokeRect(x - w / 2, y - h, w, h);
}
/** Carved wardrobe standing against the wall: crown moulding, panelled doors, a drawer. */
function cupboard(c: Ctx, f: Furn) {
  const { x, y } = f,
    w = 36,
    h = 76,
    top = y - h;
  // top face, seen from above
  c.beginPath();
  c.moveTo(x - w / 2 - 2, top);
  c.lineTo(x - w / 2 + 2, top - 6);
  c.lineTo(x + w / 2 - 2, top - 6);
  c.lineTo(x + w / 2 + 2, top);
  c.closePath();
  c.fillStyle = WOOD_L;
  c.fill();
  c.stroke();
  // feet and body
  for (const fx of [-w / 2 + 2, w / 2 - 7]) rr(c, x + fx, y - 5, 5, 5, 1, WOOD_D);
  rr(c, x - w / 2, top + 5, w, h - 10, 2, WOOD);
  rr(c, x - w / 2 - 2, top, w + 4, 8, 2, WOOD_D); // crown moulding
  // two panelled doors
  for (const dx of [-w / 2 + 3, 1]) {
    rr(c, x + dx, top + 11, w / 2 - 4, h - 34, 2, WOOD_L);
    c.lineWidth = 1.4;
    rr(c, x + dx + 3, top + 15, w / 2 - 10, 18, 2, sh(WOOD_L, 0.08));
    rr(c, x + dx + 3, top + 37, w / 2 - 10, 18, 2, sh(WOOD_L, 0.08));
    c.lineWidth = 2;
  }
  // iron hinges and ring pulls
  c.fillStyle = IRON;
  for (const hy of [top + 16, top + 48]) {
    c.fillRect(x - w / 2 + 1, hy, 4, 5);
    c.fillRect(x + w / 2 - 5, hy, 4, 5);
  }
  // brass handles beside the centre seam
  c.lineWidth = 1.2;
  for (const kx of [-5, 2]) rr(c, x + kx, top + 33, 3, 10, 1.5, GOLD);
  c.lineWidth = 2;
  // drawer
  rr(c, x - w / 2 + 3, y - 20, w - 6, 11, 2, sh(WOOD, 0.06));
  c.fillStyle = GOLD;
  c.beginPath();
  c.arc(x, y - 14.5, 1.8, 0, TAU);
  c.fill();
  // a plate and a jug on top
  c.save();
  c.translate(x - 8, top - 10);
  ell(c, 0, 0, 5, 6, '#e8e4dc');
  c.lineWidth = 1.2;
  ell(c, 0, 0, 3, 3.6, null);
  c.restore();
  rr(c, x + 5, top - 16, 9, 12, 3.5, '#c86a3a');
}
/** A bed end (head or foot): a low board between two posts with round tops, base at y. */
function bedEnd(c: Ctx, x: number, y: number, w: number) {
  for (const px of [-w / 2 - 2, w / 2 - 3]) rr(c, x + px, y - 16, 5, 16, 1.5, WOOD_D);
  rr(c, x - w / 2 + 1, y - 13, w - 2, 9, 2, WOOD);
  c.fillStyle = WOOD_L;
  c.fillRect(x - w / 2 + 4, y - 11, w - 8, 2);
  for (const px of [-w / 2 - 2, w / 2 - 3]) ell(c, x + px + 2.5, y - 17, 3.2, 3.2, WOOD_L);
}
/** Cosy bed seen from the room's angle: headboard with posts, quilt, sheet fold, footboard. */
function bed(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y,
    // against the back wall the headboard stands right on the wall's base line
    top = f.cy === 1 ? IT - 6 : y - f.ch * IT + 4,
    col = f.col || '#b84a4a',
    w = 34;
  shadow(c, x, y + 1, 21, 5, 0.28);
  // headboard, matching the footboard
  bedEnd(c, x, top + 12, w);
  // mattress with its front edge showing
  rr(c, x - w / 2 + 1, top + 2, w - 2, y - top - 14, 4, '#f4ecd8');
  // pillow, plump and shaded
  rr(c, x - 11, top + 4, 22, 12, 6, '#ffffff');
  c.fillStyle = 'rgba(160,150,190,.25)';
  c.beginPath();
  c.ellipse(x + 3, top + 12, 8, 3, 0, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(120,110,140,.5)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x - 4, top + 9);
  c.quadraticCurveTo(x, top + 11, x + 4, top + 9);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  // quilt draping a little over the sides, with a stitched lattice
  const qy = top + 20,
    qh = y - qy - 12;
  rr(c, x - w / 2 - 1, qy, w + 2, qh, 4, col);
  c.save();
  c.beginPath();
  c.rect(x - w / 2, qy + 1, w, qh - 2);
  c.clip();
  c.strokeStyle = sh(col, 0.22);
  c.lineWidth = 1.2;
  for (let k = -3; k <= 3; k++) {
    c.beginPath();
    c.moveTo(x + k * 10 - 20, qy);
    c.lineTo(x + k * 10 + 20, qy + qh);
    c.moveTo(x + k * 10 + 20, qy);
    c.lineTo(x + k * 10 - 20, qy + qh);
    c.stroke();
  }
  c.fillStyle = 'rgba(0,0,0,.14)';
  c.fillRect(x + w / 2 - 6, qy, 6, qh); // shade on the far side
  c.restore();
  // folded-back sheet over the top of the quilt
  rr(c, x - w / 2, qy - 2, w, 7, 3, '#fbf6ea');
  c.strokeStyle = 'rgba(120,110,140,.45)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x - w / 2 + 3, qy + 3);
  c.lineTo(x + w / 2 - 3, qy + 3);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  // footboard with posts
  bedEnd(c, x, y, w);
}
function table(c: Ctx, f: Furn, t: number) {
  const { x, y } = f,
    w = f.cw * IT - 14;
  shadow(c, x, y, w / 2, 5, 0.25);
  for (const lx of [-w / 2 + 5, w / 2 - 5]) rr(c, x + lx - 2.5, y - 16, 5, 16, 1.5, WOOD_D);
  rr(c, x - w / 2, y - 30, w, 18, 3, WOOD_L); // top
  rr(c, x - w / 2, y - 14, w, 5, 2, WOOD); // apron
  // bread, mug, plate, candle
  ell(c, x - w / 4, y - 22, 8, 4.4, '#d8a060');
  c.strokeStyle = 'rgba(120,70,30,.6)';
  c.lineWidth = 1;
  for (const k of [-3, 0, 3]) {
    c.beginPath();
    c.moveTo(x - w / 4 + k - 1.5, y - 24);
    c.lineTo(x - w / 4 + k + 1.5, y - 20);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  ell(c, x + 4, y - 21, 7, 3, '#e8e4dc');
  rr(c, x + w / 4 - 3, y - 30, 7, 9, 2, '#9a7a5a');
  rr(c, x - 2, y - 36, 4, 9, 1, '#f4ecd8');
  flame(c, x, y - 36, 0.3, t, 3);
}
function chair(c: Ctx, f: Furn) {
  const { x, y } = f;
  c.lineWidth = 1.8;
  rr(c, x - 9, y - 30, 18, 20, 3, WOOD); // back
  c.fillStyle = WOOD_D;
  c.fillRect(x - 5, y - 26, 10, 12);
  rr(c, x - 10, y - 12, 20, 7, 2, WOOD_L); // seat
  c.lineWidth = 2;
}
function stool(c: Ctx, f: Furn) {
  const { x, y } = f;
  c.lineWidth = 1.8;
  for (const lx of [-5, 5]) rr(c, x + lx - 1.5, y - 8, 3, 8, 1, WOOD_D);
  ell(c, x, y - 9, 9, 4, WOOD_L);
  c.lineWidth = 2;
}
function rug(c: Ctx, f: Furn, small: boolean) {
  const x0 = f.cx * IT + 6,
    y0 = f.cy * IT + 8,
    w = f.cw * IT - 12,
    h = f.ch * IT - 16,
    cols = ['#9a3a3a', '#3a5a9a', '#5a7a3a', '#8a5aa0'],
    col = cols[Math.floor(f.s * cols.length)];
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  if (small) {
    ell(c, f.x, y0 + h / 2 + 4, 24, 12, col);
    c.strokeStyle = '#f0d890';
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(f.x, y0 + h / 2 + 4, 17, 8, 0, 0, TAU);
    c.stroke();
    return;
  }
  rr(c, x0, y0, w, h, 4, col);
  c.strokeStyle = '#f0d890';
  c.lineWidth = 1.6;
  c.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
  c.fillStyle = sh(col, 0.25);
  const cx = x0 + w / 2,
    cy = y0 + h / 2;
  c.beginPath();
  c.moveTo(cx, cy - h * 0.25);
  c.lineTo(cx + w * 0.18, cy);
  c.lineTo(cx, cy + h * 0.25);
  c.lineTo(cx - w * 0.18, cy);
  c.closePath();
  c.fill();
  // fringe
  c.strokeStyle = '#f0d890';
  c.lineWidth = 1.2;
  for (let xx = x0 + 3; xx < x0 + w - 2; xx += 5) {
    c.beginPath();
    c.moveTo(xx, y0);
    c.lineTo(xx, y0 - 3);
    c.moveTo(xx, y0 + h);
    c.lineTo(xx, y0 + h + 3);
    c.stroke();
  }
  c.strokeStyle = OUT;
}
function barrel(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 6;
  shadow(c, x, y + 2, 14, 4);
  c.beginPath();
  c.moveTo(x - 12, y - 30);
  c.quadraticCurveTo(x - 16, y - 15, x - 12, y);
  c.lineTo(x + 12, y);
  c.quadraticCurveTo(x + 16, y - 15, x + 12, y - 30);
  c.closePath();
  c.fillStyle = WOOD;
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(40,25,15,.5)';
  c.lineWidth = 1.2;
  for (const k of [-6, 0, 6]) {
    c.beginPath();
    c.moveTo(x + k, y - 29);
    c.lineTo(x + k * 1.1, y - 1);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  for (const hy of [-24, -7]) {
    c.fillStyle = IRON;
    c.fillRect(x - 14, y + hy - 2, 28, 4);
    c.strokeRect(x - 14, y + hy - 2, 28, 4);
  }
  ell(c, x, y - 30, 12, 4.5, WOOD_L);
}
function crate(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4,
    s = 26;
  shadow(c, x, y + 2, 16, 4);
  rr(c, x - s / 2, y - s - 8, s, 8, 1.5, WOOD_L); // top
  rr(c, x - s / 2, y - s, s, s, 1.5, WOOD);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x - s / 2 + 2, y - s + 2);
  c.lineTo(x + s / 2 - 2, y - 2);
  c.moveTo(x + s / 2 - 2, y - s + 2);
  c.lineTo(x - s / 2 + 2, y - 2);
  c.stroke();
  c.lineWidth = 2;
}
function sack(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 13, 4);
  c.beginPath();
  c.moveTo(x - 12, y);
  c.quadraticCurveTo(x - 15, y - 18, x - 5, y - 24);
  c.lineTo(x + 5, y - 24);
  c.quadraticCurveTo(x + 15, y - 18, x + 12, y);
  c.closePath();
  c.fillStyle = '#c8a878';
  c.fill();
  c.stroke();
  rr(c, x - 6, y - 28, 12, 5, 2, '#b89868');
  c.strokeStyle = 'rgba(90,60,30,.5)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x - 4, y - 16);
  c.quadraticCurveTo(x, y - 12, x + 5, y - 17);
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = OUT;
}
function chest(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 16, 4);
  rr(c, x - 15, y - 20, 30, 20, 2, WOOD);
  c.beginPath();
  c.moveTo(x - 15, y - 18);
  c.quadraticCurveTo(x, y - 32, x + 15, y - 18);
  c.closePath();
  c.fillStyle = WOOD_L;
  c.fill();
  c.stroke();
  c.fillStyle = IRON;
  for (const bx of [-10, 7]) {
    c.fillRect(x + bx, y - 26, 3, 26);
    c.strokeRect(x + bx, y - 26, 3, 26);
  }
  rr(c, x - 3, y - 19, 6, 7, 1.5, GOLD);
}
function plant(c: Ctx, f: Furn, t: number) {
  const x = f.x,
    y = f.y - 4;
  shadow(c, x, y + 2, 11, 3.5);
  c.beginPath();
  c.moveTo(x - 9, y - 14);
  c.lineTo(x + 9, y - 14);
  c.lineTo(x + 6, y);
  c.lineTo(x - 6, y);
  c.closePath();
  c.fillStyle = '#c8663a';
  c.fill();
  c.stroke();
  rr(c, x - 10.5, y - 17, 21, 4, 1.5, '#d8764a');
  const sway = Math.sin(t * 1.3 + f.s * 9) * 0.05;
  for (const [a, l, col] of [
    [-0.9, 18, '#4e8a3a'],
    [-0.35, 24, '#5a9a44'],
    [0.2, 22, '#4e8a3a'],
    [0.8, 17, '#62a84a'],
  ] as [number, number, string][]) {
    c.save();
    c.translate(x, y - 16);
    c.rotate(a + sway);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(6, -l * 0.5, 0, -l);
    c.quadraticCurveTo(-6, -l * 0.5, 0, 0);
    c.fillStyle = col;
    c.fill();
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
  }
  c.lineWidth = 2;
}
function stove(c: Ctx, f: Furn, t: number) {
  const { x, y } = f;
  rr(c, x - 17, y - 40, 34, 40, 3, IRON);
  c.fillStyle = '#1c1216';
  c.fillRect(x - 10, y - 20, 20, 13);
  c.strokeRect(x - 10, y - 20, 20, 13);
  flame(c, x, y - 8, 0.45, t, 5);
  rr(c, x - 4, y - 64, 8, 24, 1, sh(IRON, -0.1)); // flue
  // pot with steam
  rr(c, x - 12, y - 50, 24, 11, 4, '#6a6470');
  c.strokeStyle = 'rgba(255,255,255,.35)';
  c.lineWidth = 2.4;
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.7 + k * 0.5) % 1;
    c.globalAlpha = 1 - ph;
    c.beginPath();
    c.moveTo(x - 4 + k * 8, y - 52 - ph * 18);
    c.quadraticCurveTo(x + k * 8, y - 58 - ph * 18, x - 4 + k * 8, y - 64 - ph * 18);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.strokeStyle = OUT;
  c.lineWidth = 2;
}
function worktable(c: Ctx, f: Furn) {
  const { x, y } = f;
  shadow(c, x, y, 16, 4, 0.25);
  for (const lx of [-12, 12]) rr(c, x + lx - 2, y - 14, 4, 14, 1, WOOD_D);
  rr(c, x - 17, y - 26, 34, 14, 2, WOOD_L);
  rr(c, x - 12, y - 24, 14, 8, 2, '#d8b888'); // cutting board
  ell(c, x + 8, y - 20, 4, 3.4, '#e0703a'); // carrot / apple
  ell(c, x - 5, y - 21, 3, 2.4, '#8aba4a');
}
function stair(c: Ctx, f: Furn) {
  const cx = f.x,
    cy = f.y - IT;
  shadow(c, cx, cy + 34, 34, 9);
  // a spiral of wedge steps rising toward the back
  for (let k = 7; k >= 0; k--) {
    const a0 = -Math.PI / 2 + k * 0.72,
      a1 = a0 + 0.72,
      lift = k * 7;
    c.beginPath();
    c.moveTo(cx, cy - lift);
    c.arc(cx, cy - lift, 34, a0, a1);
    c.closePath();
    c.fillStyle = sh(STONE, -0.18 + k * 0.03);
    c.fill();
    c.stroke();
  }
  ell(c, cx, cy - 56, 7, 5, sh(STONE, 0.1));
  rr(c, cx - 4, cy - 58, 8, 58, 2, sh(STONE, -0.05)); // newel post
}
function pillar(c: Ctx, f: Furn) {
  const x = f.x,
    y = f.y - 6;
  shadow(c, x, y + 2, 17, 5);
  rr(c, x - 16, y - 10, 32, 10, 2, sh(STONE, -0.1));
  rr(c, x - 11, y - 96, 22, 88, 2, STONE);
  c.fillStyle = 'rgba(0,0,0,.12)';
  c.fillRect(x + 3, y - 96, 8, 88);
  rr(c, x - 15, y - 104, 30, 10, 2, sh(STONE, 0.08));
}
function throne(c: Ctx, f: Furn) {
  const { x, y } = f;
  rr(c, x - 26, y - 10, 52, 10, 3, sh(STONE, -0.05)); // dais
  rr(c, x - 17, y - 76, 34, 66, 6, '#7a2a30'); // high back
  c.fillStyle = GOLD;
  c.beginPath();
  c.moveTo(x - 17, y - 70);
  c.lineTo(x - 10, y - 86);
  c.lineTo(x - 3, y - 74);
  c.lineTo(x, y - 90);
  c.lineTo(x + 3, y - 74);
  c.lineTo(x + 10, y - 86);
  c.lineTo(x + 17, y - 70);
  c.closePath();
  c.fill();
  c.stroke();
  rr(c, x - 12, y - 64, 24, 36, 5, '#a8363e');
  rr(c, x - 21, y - 30, 42, 12, 3, GOLD); // seat
  rr(c, x - 22, y - 42, 8, 22, 2, sh(GOLD, -0.15));
  rr(c, x + 14, y - 42, 8, 22, 2, sh(GOLD, -0.15));
}
function bantable(c: Ctx, f: Furn, t: number) {
  const { x, y } = f,
    w = f.cw * IT - 10,
    d = f.ch * IT - 30;
  shadow(c, x, y, w / 2 + 6, 7, 0.25);
  // benches behind and in front
  rr(c, x - w / 2 + 6, y - d - 18, w - 12, 8, 2, WOOD);
  for (const lx of [-w / 2 + 8, w / 2 - 8]) rr(c, x + lx - 2.5, y - 14, 5, 14, 1.5, WOOD_D);
  rr(c, x - w / 2, y - d - 10, w, d, 3, WOOD_L); // top
  rr(c, x - w / 2, y - 14, w, 6, 2, WOOD);
  // plates, goblets and candles along the table
  for (let k = 0; k < Math.floor(w / 36); k++) {
    const px = x - w / 2 + 22 + k * 36;
    for (const py of [y - d + 2, y - 22]) ell(c, px, py, 6, 2.6, '#e8e4dc');
    rr(c, px + 9, y - d / 2 - 18, 4, 7, 1, GOLD);
    if (k % 2 === 0) {
      rr(c, px - 1.5, y - d / 2 - 22, 3, 10, 1, '#f4ecd8');
      flame(c, px, y - d / 2 - 22, 0.28, t, k);
    }
  }
  rr(c, x - w / 2 + 6, y - 8, w - 12, 8, 2, WOOD);
}
function candle(c: Ctx, f: Furn, t: number) {
  const x = f.x,
    y = f.y - 6;
  shadow(c, x, y + 2, 10, 3.5);
  rr(c, x - 9, y - 5, 18, 5, 2, IRON);
  rr(c, x - 2, y - 58, 4, 54, 1, IRON);
  rr(c, x - 14, y - 60, 28, 4, 2, IRON);
  for (const k of [-11, 0, 11]) {
    rr(c, x + k - 2, y - 70, 4, 10, 1, '#f4ecd8');
    flame(c, x + k, y - 70, 0.38, t, k);
  }
}

/** Draw one furniture piece. */
export function drawFurn(c: Ctx, f: Furn, t: number) {
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  switch (f.k) {
    case 'hearth':
      hearth(c, f, t);
      break;
    case 'firepit':
      firepit(c, f, t);
      break;
    case 'shelf':
      shelf(c, f);
      break;
    case 'cupboard':
      cupboard(c, f);
      break;
    case 'bed':
      bed(c, f);
      break;
    case 'table':
      table(c, f, t);
      break;
    case 'chair':
      chair(c, f);
      break;
    case 'chairF':
      stool(c, f);
      break;
    case 'rug':
      rug(c, f, false);
      break;
    case 'rugS':
      rug(c, f, true);
      break;
    case 'barrel':
      barrel(c, f);
      break;
    case 'crate':
      crate(c, f);
      break;
    case 'sack':
      sack(c, f);
      break;
    case 'chest':
      chest(c, f);
      break;
    case 'plant':
      plant(c, f, t);
      break;
    case 'stove':
      stove(c, f, t);
      break;
    case 'worktable':
      worktable(c, f);
      break;
    case 'stair':
      stair(c, f);
      break;
    case 'pillar':
      pillar(c, f);
      break;
    case 'throne':
      throne(c, f);
      break;
    case 'bantable':
      bantable(c, f, t);
      break;
    case 'candle':
      candle(c, f, t);
      break;
  }
  c.restore();
}
