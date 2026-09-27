import { circ, rr, shadow } from '../dom';
import { OUT, TAU, sh } from '../../core/math';
import { SPR } from './decor';
import { ink, prop } from './houseParts';
/* ================= ART: Hearthfire's street furniture ================= */
// Street clutter (barrels, crates, sacks, flower tubs, carts, benches), garden trees, the
// graveyard's stones and walls, and the keep's curtain walls running back to the town wall.

type Ctx = CanvasRenderingContext2D;
const STONE = '#b8ae9f';

/** One piece of street clutter, standing on (it.x, it.y). */
export function drawClutter(c: Ctx, it) {
  c.save();
  c.translate(it.x, it.y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const rnd = () => it.s;
  if (it.k === 'sacks') {
    shadow(c, 0, 1, 13, 4, 0.22);
    for (const [sx, sy, col] of [
      [-5, 0, '#d8c49a'],
      [5, 0, '#c9b184'],
      [0, -8, '#e0cfa8'],
    ] as [number, number, string][]) {
      ink(c, 1.8);
      c.beginPath();
      c.ellipse(sx, sy - 6, 7, 7.5, 0, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      ink(c, 1.4);
      c.beginPath();
      c.moveTo(sx - 2.5, sy - 13);
      c.lineTo(sx + 2.5, sy - 13);
      c.stroke();
    }
  } else if (it.k === 'tub') {
    // a wooden tub of flowers
    shadow(c, 0, 1, 11, 3.5, 0.22);
    const cols = [
      ['#e0443c', '#ffd24a'],
      ['#ff8fb0', '#fff6e0'],
      ['#b8d8ff', '#c872ff'],
    ][(it.s * 3) | 0];
    ink(c, 1.8);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (k / 4) * Math.PI;
      circ(c, Math.cos(a) * 7, -14 + Math.sin(a) * 4, 4.5, '#4c9a3a');
    }
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + ((k + 0.5) / 5) * Math.PI;
      c.fillStyle = cols[k % 2];
      c.beginPath();
      c.arc(Math.cos(a) * 6, -16 + Math.sin(a) * 4, 2.2, 0, TAU);
      c.fill();
    }
    ink(c, 2);
    rr(c, -9, -12, 18, 12, [1, 1, 4, 4] as any, '#9a6a3a');
    c.fillStyle = '#5a5a60';
    c.fillRect(-9, -8, 18, 1.6);
  } else if (it.k === 'cart') {
    shadow(c, 0, 2, 26, 6, 0.25);
    ink(c);
    // shafts
    c.beginPath();
    c.moveTo(14, -12);
    c.lineTo(34, -6);
    c.moveTo(14, -6);
    c.lineTo(34, 0);
    c.lineWidth = 3;
    c.stroke();
    ink(c);
    rr(c, -22, -26, 38, 16, 2, '#9a6a3e');
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(-22, -16, 38, 6);
    // load: hay or sacks
    if (it.s < 0.5) {
      ink(c, 1.8);
      c.beginPath();
      c.ellipse(-3, -28, 18, 8, 0, Math.PI, 0);
      c.fillStyle = '#e8c860';
      c.fill();
      c.stroke();
      c.strokeStyle = '#b8942a';
      c.lineWidth = 1;
      for (let k = -14; k < 12; k += 5) {
        c.beginPath();
        c.moveTo(k, -30);
        c.lineTo(k + 3, -26);
        c.stroke();
      }
    } else for (const sx of [-12, 0]) circ(c, sx, -30, 6.5, sx ? '#d8c49a' : '#c9b184');
    ink(c);
    circ(c, -8, -8, 8, '#7a4f2e');
    circ(c, -8, -8, 3, '#5a3a22');
    c.strokeStyle = '#5a3a22';
    c.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      c.beginPath();
      c.moveTo(-8 + Math.cos(a) * 7, -8 + Math.sin(a) * 7);
      c.lineTo(-8 - Math.cos(a) * 7, -8 - Math.sin(a) * 7);
      c.stroke();
    }
  } else prop(c, it.k, 0, rnd);
  c.restore();
}

/** A garden oak or the graveyard's yew, standing on (t.x, t.y). */
export function drawCityTree(c: Ctx, t) {
  const s = t.k === 'yew' ? SPR.pine : SPR.oak,
    k = t.k === 'yew' ? 0.95 : 0.85;
  if (!s) return;
  c.drawImage(s.c, t.x - s.ax * k, t.y - s.ay * k, s.w * k, s.h * k);
}

/** One gravestone: a rounded slab, a cross or a small obelisk. */
export function drawGrave(c: Ctx, g) {
  const { x, y } = g;
  shadow(c, x, y + 1, 9, 3, 0.25);
  ink(c, 1.8);
  const col = sh('#a8a298', ((g.x * 7) % 10) / 100 - 0.05);
  if (g.k === 0) {
    rr(c, x - 6, y - 16, 12, 16, [6, 6, 1, 1] as any, col);
    c.strokeStyle = 'rgba(40,30,40,.45)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - 3, y - 10);
    c.lineTo(x + 3, y - 10);
    c.moveTo(x - 3, y - 7);
    c.lineTo(x + 2, y - 7);
    c.stroke();
  } else if (g.k === 1) {
    rr(c, x - 2, y - 19, 4, 19, 1, col);
    rr(c, x - 7, y - 15, 14, 4, 1, col);
  } else {
    c.beginPath();
    c.moveTo(x - 5, y);
    c.lineTo(x - 3, y - 20);
    c.lineTo(x, y - 24);
    c.lineTo(x + 3, y - 20);
    c.lineTo(x + 5, y);
    c.closePath();
    c.fillStyle = col;
    c.fill();
    c.stroke();
  }
  // a mound of earth in front
  c.fillStyle = 'rgba(90,70,40,.35)';
  c.beginPath();
  c.ellipse(x, y + 5, 7, 3, 0, 0, TAU);
  c.fill();
}

/** A low stone wall between two points on the ground (the graveyard's). */
export function drawLowWall(c: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const H = 12;
  ink(c);
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.lineTo(x1, y1 - H);
  c.lineTo(x0, y0 - H);
  c.closePath();
  c.fillStyle = STONE;
  c.fill();
  c.stroke();
  const vert = Math.abs(x1 - x0) < 1;
  c.beginPath();
  if (vert) c.rect(x0 - 4, Math.min(y0, y1) - H, 8, Math.abs(y1 - y0));
  else c.rect(x0, y0 - H - 4, x1 - x0, 6);
  c.fillStyle = sh(STONE, 0.14);
  c.fill();
  c.stroke();
}

/** The graveyard's walls as depth-sorted pieces: [sort y, draw]. */
export function graveyardWalls(g): [number, (c: Ctx) => void][] {
  const mid = (g.x0 + g.x1) / 2;
  return [
    [g.y0, (c) => drawLowWall(c, g.x0, g.y0, g.x1, g.y0)],
    [g.y1 - 1, (c) => drawLowWall(c, g.x0, g.y0, g.x0, g.y1)],
    [g.y1 - 1, (c) => drawLowWall(c, g.x1, g.y0, g.x1, g.y1)],
    [g.y1 + 4, (c) => drawLowWall(c, g.x0, g.y1 + 4, mid - 16, g.y1 + 4)],
    [g.y1 + 4, (c) => drawLowWall(c, mid + 16, g.y1 + 4, g.x1, g.y1 + 4)],
  ];
}

/** A curtain wall running north from the keep to the town wall (seen end-on from the south). */
export function drawCurtain(c: Ctx, w) {
  const H = 96,
    T = 12;
  ink(c);
  // the wall-walk along the top
  c.beginPath();
  c.rect(w.x - T, w.y0 - H, T * 2, w.y1 - w.y0);
  c.fillStyle = sh(STONE, 0.12);
  c.fill();
  c.stroke();
  for (let y = w.y0 + 6; y < w.y1 - 6; y += 16)
    for (const s of [-1, 1]) rr(c, w.x + s * (T - 2) - 3, y - H - 8, 6, 9, 1.2, sh(STONE, 0.05));
  // the end face
  rr(c, w.x - T, w.y1 - H, T * 2, H, 1, STONE);
  c.strokeStyle = 'rgba(60,50,45,.38)';
  c.lineWidth = 1.2;
  for (let y = w.y1 - 9; y > w.y1 - H; y -= 9.5) {
    c.beginPath();
    c.moveTo(w.x - T, y);
    c.lineTo(w.x + T, y);
    c.stroke();
  }
  c.strokeStyle = OUT;
}
