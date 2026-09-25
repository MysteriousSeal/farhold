import { rr } from '../../core/dom';
import { OUT, TAU, sh } from '../../core/math';
import { game } from '../../game/state';
import { IT, type Interior } from '../../world/interior';
/* ================= ART: house interiors — room shell ================= */
// Floor (planks, flagstones, packed earth or the hall's checker with a carpet runner), the
// back wall face with its decorations, side and partition walls, the low front wall with the
// doorway, and warm light from hearths and candles. Everything is vector-drawn each frame.
type Ctx = CanvasRenderingContext2D;
export const WALL_H = 64; // height of the back wall face above the first floor row
const CAP = '#3a2a20',
  VOID = '#140e1a';
const hash = (a: number, b: number) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
/** Night outside (for the window glass), from the time of day. */
const nightOut = () => {
  const t = game.P ? game.P.tod : 0;
  return t > 0.52 && t < 0.95;
};

function floor(c: Ctx, I: Interior) {
  const x0 = IT,
    y0 = IT,
    x1 = (I.GW - 1) * IT,
    y1 = (I.GH - 1) * IT,
    f = I.pal.floor;
  c.save();
  c.beginPath();
  c.rect(x0, y0, x1 - x0, y1 - y0);
  c.clip();
  c.fillStyle = f;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.lineWidth = 1.2;
  if (I.floor === 'wood') {
    // planks: three per cell row, staggered seams, a slight tone change per plank
    const ph = IT / 3;
    for (let r = 0; r * ph < y1 - y0; r++) {
      const y = y0 + r * ph;
      let x = x0 - hash(r, 3) * 70;
      while (x < x1) {
        const len = 70 + hash(r, x) * 60;
        c.fillStyle = sh(f, (hash(x, r) - 0.5) * 0.14);
        c.fillRect(x, y, len, ph);
        c.strokeStyle = 'rgba(60,35,20,.45)';
        c.beginPath();
        c.moveTo(x, y + 1);
        c.lineTo(x, y + ph - 1);
        c.stroke();
        // a knot now and then
        if (hash(x, r * 7) < 0.12) {
          c.fillStyle = 'rgba(70,40,20,.35)';
          c.beginPath();
          c.ellipse(x + len * 0.5, y + ph / 2, 3, 1.4, 0, 0, TAU);
          c.fill();
        }
        x += len;
      }
      c.strokeStyle = 'rgba(50,30,15,.55)';
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      c.stroke();
      c.strokeStyle = 'rgba(255,230,190,.12)';
      c.beginPath();
      c.moveTo(x0, y + 1.5);
      c.lineTo(x1, y + 1.5);
      c.stroke();
    }
  } else if (I.floor === 'stone' || I.floor === 'hall') {
    const s = I.floor === 'hall' ? IT : IT / 2 + 4;
    for (let r = 0; r * s < y1 - y0 + s; r++)
      for (let q = -1; q * s < x1 - x0 + s; q++) {
        const x = x0 + q * s + (r % 2 ? s / 2 : 0),
          y = y0 + r * s,
          checker = I.floor === 'hall' && (q + r) % 2 === 0;
        c.fillStyle = sh(checker ? '#7a746e' : f, (hash(q, r) - 0.5) * 0.12);
        c.strokeStyle = 'rgba(40,32,40,.5)';
        c.beginPath();
        c.roundRect(x + 1, y + 1, s - 2, s - 2, 3);
        c.fill();
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,.08)';
        c.fillRect(x + 3, y + 2.5, s - 8, 2);
      }
    if (I.floor === 'hall') {
      // carpet runner from the door to the throne
      const cx = I.door.x,
        w = IT * 1.4;
      c.fillStyle = '#8e2a30';
      c.strokeStyle = OUT;
      c.lineWidth = 2;
      c.beginPath();
      c.rect(cx - w / 2, y0, w, y1 - y0 + 4);
      c.fill();
      c.stroke();
      c.strokeStyle = '#e3b24a';
      c.lineWidth = 2;
      c.strokeRect(cx - w / 2 + 5, y0 + 4, w - 10, y1 - y0);
    }
  } else {
    // packed earth with straw and pebbles
    for (let k = 0; k < ((x1 - x0) * (y1 - y0)) / 260; k++) {
      const x = x0 + hash(k, 1) * (x1 - x0),
        y = y0 + hash(k, 2) * (y1 - y0);
      if (hash(k, 3) < 0.6) {
        c.strokeStyle = hash(k, 4) < 0.5 ? 'rgba(230,200,120,.55)' : 'rgba(120,90,50,.35)';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (hash(k, 5) - 0.5) * 12, y + (hash(k, 6) - 0.5) * 5);
        c.stroke();
      } else {
        c.fillStyle = 'rgba(80,60,40,.35)';
        c.beginPath();
        c.ellipse(x, y, 2.2, 1.4, 0, 0, TAU);
        c.fill();
      }
    }
  }
  // a doormat just inside the front door
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.fillStyle = '#8a3a34';
  c.beginPath();
  c.roundRect(I.door.x - 16, y1 - 24, 32, 14, 3);
  c.fill();
  c.stroke();
  c.strokeStyle = '#d8b878';
  c.lineWidth = 1.2;
  c.strokeRect(I.door.x - 12, y1 - 21, 24, 8);
  // soft shadow along the back and side walls
  const g1 = c.createLinearGradient(0, y0, 0, y0 + 26);
  g1.addColorStop(0, 'rgba(20,12,20,.4)');
  g1.addColorStop(1, 'rgba(20,12,20,0)');
  c.fillStyle = g1;
  c.fillRect(x0, y0, x1 - x0, 26);
  for (const [xa, dir] of [
    [x0, 1],
    [x1, -1],
  ]) {
    const g2 = c.createLinearGradient(xa, 0, xa + dir * 18, 0);
    g2.addColorStop(0, 'rgba(20,12,20,.3)');
    g2.addColorStop(1, 'rgba(20,12,20,0)');
    c.fillStyle = g2;
    c.fillRect(Math.min(xa, xa + dir * 18), y0, 18, y1 - y0);
  }
  c.restore();
}

/** Back wall face: plaster with timber beams, or stone blocks; a skirting board below. */
function backWall(c: Ctx, I: Interior) {
  const x0 = IT - 12,
    x1 = (I.GW - 1) * IT + 12,
    top = IT - WALL_H,
    stone = I.kind === 'stone' || I.kind === 'tower' || I.kind === 'hall',
    col = I.pal.wall;
  c.fillStyle = col;
  c.fillRect(x0, top, x1 - x0, WALL_H);
  c.save();
  c.beginPath();
  c.rect(x0, top, x1 - x0, WALL_H);
  c.clip();
  if (stone) {
    const bh = 14;
    for (let r = 0; r * bh < WALL_H; r++)
      for (let q = -1; q * 30 < x1 - x0 + 30; q++) {
        const x = x0 + q * 30 + (r % 2 ? 15 : 0),
          y = top + r * bh;
        c.fillStyle = sh(col, (hash(q, r + 9) - 0.5) * 0.16);
        c.strokeStyle = 'rgba(40,30,35,.45)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.roundRect(x + 1, y + 1, 28, bh - 2, 2.5);
        c.fill();
        c.stroke();
      }
  } else {
    // plaster speckle and timber framing
    c.fillStyle = 'rgba(120,90,60,.08)';
    for (let k = 0; k < (x1 - x0) / 6; k++)
      c.fillRect(x0 + hash(k, 11) * (x1 - x0), top + hash(k, 12) * WALL_H, 2, 2);
    c.strokeStyle = OUT;
    c.lineWidth = 2;
    for (let x = x0 + IT * 1.5; x < x1 - 20; x += IT * 3) {
      c.fillStyle = I.pal.trim;
      c.fillRect(x - 5, top, 10, WALL_H);
      c.strokeRect(x - 5, top, 10, WALL_H);
    }
    c.fillStyle = I.pal.trim;
    c.fillRect(x0, top + 8, x1 - x0, 7);
    c.strokeRect(x0 - 2, top + 8, x1 - x0 + 4, 7);
  }
  c.restore();
  // skirting board and the wall's top
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.fillStyle = sh(I.pal.trim, -0.1);
  c.fillRect(x0, IT - 8, x1 - x0, 8);
  c.strokeRect(x0, IT - 8, x1 - x0, 8);
  c.fillStyle = CAP;
  c.fillRect(x0 - 2, top - 12, x1 - x0 + 4, 12);
  c.strokeRect(x0 - 2, top - 12, x1 - x0 + 4, 12);
  c.strokeRect(x0, top, x1 - x0, WALL_H);
}

/* ---------- wall decorations ---------- */
function window(c: Ctx, x: number, y: number, night: boolean) {
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  rr(c, x - 15, y - 13, 30, 28, 3, '#5a3a24');
  const g = c.createLinearGradient(0, y - 10, 0, y + 12);
  g.addColorStop(0, night ? '#1e2a5a' : '#bfe6ff');
  g.addColorStop(1, night ? '#344a86' : '#8ec8f0');
  c.fillStyle = g;
  c.fillRect(x - 11, y - 9, 22, 20);
  if (night) {
    c.fillStyle = '#fff6d0';
    c.beginPath();
    c.arc(x + 5, y - 3, 2.6, 0, TAU);
    c.fill();
  } else {
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath();
    c.moveTo(x - 9, y + 4);
    c.lineTo(x - 2, y - 7);
    c.lineTo(x + 1, y - 7);
    c.lineTo(x - 6, y + 4);
    c.fill();
  }
  c.strokeStyle = '#5a3a24';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(x, y - 9);
  c.lineTo(x, y + 11);
  c.moveTo(x - 11, y + 1);
  c.lineTo(x + 11, y + 1);
  c.stroke();
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.strokeRect(x - 11, y - 9, 22, 20);
  rr(c, x - 17, y + 13, 34, 5, 2, '#6b4a30'); // sill
}
function painting(c: Ctx, x: number, y: number, s: number, col: string) {
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  rr(c, x - 14, y - 11, 28, 22, 2, '#c9912c');
  const g = c.createLinearGradient(0, y - 8, 0, y + 8);
  g.addColorStop(0, s < 0.5 ? '#9ad0f0' : '#f0b878');
  g.addColorStop(1, s < 0.5 ? '#e8f4ff' : '#f8e0b0');
  c.fillStyle = g;
  c.fillRect(x - 10, y - 7, 20, 14);
  c.fillStyle = s < 0.5 ? '#5a9a5a' : sh(col, -0.2);
  c.beginPath();
  c.moveTo(x - 10, y + 7);
  c.lineTo(x - 4, y - 1);
  c.lineTo(x + 1, y + 3);
  c.lineTo(x + 6, y - 3);
  c.lineTo(x + 10, y + 7);
  c.fill();
  c.lineWidth = 1.4;
  c.strokeRect(x - 10, y - 7, 20, 14);
}
function wallShelf(c: Ctx, x: number, y: number, s: number) {
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  const pots = ['#c86a3a', '#4a7ab8', '#e8dcc0', '#6a9a5a'];
  for (let k = 0; k < 3; k++) {
    const px = x - 10 + k * 10,
      h = 7 + ((s * 10 + k * 3) % 5);
    rr(c, px - 3.5, y - h, 7, h, 2.5, pots[(k + Math.floor(s * 4)) % 4]);
  }
  rr(c, x - 17, y, 34, 4, 1.5, '#6b4a30');
  c.beginPath();
  c.moveTo(x - 12, y + 4);
  c.lineTo(x - 10, y + 9);
  c.moveTo(x + 12, y + 4);
  c.lineTo(x + 10, y + 9);
  c.stroke();
}
function wreath(c: Ctx, x: number, y: number) {
  c.strokeStyle = OUT;
  c.lineWidth = 7;
  c.beginPath();
  c.arc(x, y, 9, 0, TAU);
  c.stroke();
  c.strokeStyle = '#4e8a3a';
  c.lineWidth = 4.4;
  c.stroke();
  c.fillStyle = '#d8404a';
  for (const a of [0.4, 1.9, 3.3, 4.6]) {
    c.beginPath();
    c.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 1.6, 0, TAU);
    c.fill();
  }
  c.lineWidth = 1.6;
  c.fillStyle = '#d8404a';
  c.beginPath();
  c.moveTo(x, y + 8);
  c.lineTo(x - 5, y + 14);
  c.lineTo(x, y + 12);
  c.lineTo(x + 5, y + 14);
  c.closePath();
  c.fill();
  c.stroke();
}
function banner(c: Ctx, x: number, top: number, col: string) {
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  rr(c, x - 15, top + 2, 30, 4, 2, '#6b4a30');
  c.beginPath();
  c.moveTo(x - 12, top + 6);
  c.lineTo(x + 12, top + 6);
  c.lineTo(x + 12, top + 50);
  c.lineTo(x, top + 42);
  c.lineTo(x - 12, top + 50);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  c.strokeStyle = '#e3b24a';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x - 9, top + 9);
  c.lineTo(x + 9, top + 9);
  c.lineTo(x + 9, top + 44);
  c.lineTo(x, top + 38);
  c.lineTo(x - 9, top + 44);
  c.closePath();
  c.stroke();
  // emblem: a flame
  c.fillStyle = '#f5c451';
  c.beginPath();
  c.moveTo(x, top + 14);
  c.quadraticCurveTo(x + 6, top + 22, x + 3, top + 28);
  c.quadraticCurveTo(x, top + 31, x - 3, top + 28);
  c.quadraticCurveTo(x - 6, top + 22, x, top + 14);
  c.fill();
}
function decorations(c: Ctx, I: Interior) {
  const night = nightOut(),
    y = IT - WALL_H / 2 - 4;
  for (const d of I.deco) {
    if (d.k === 'window') window(c, d.x, y, night);
    else if (d.k === 'painting') painting(c, d.x, y, d.s, d.col);
    else if (d.k === 'wshelf') wallShelf(c, d.x, y + 2, d.s);
    else if (d.k === 'wreath') wreath(c, d.x, y);
    else if (d.k === 'banner') banner(c, d.x, IT - WALL_H, d.col || '#8e2a30');
  }
}

/** Side walls, seen from above as thick dark caps. */
function sideWalls(c: Ctx, I: Interior) {
  const top = IT - WALL_H - 12,
    bot = (I.GH - 1) * IT + 14,
    L = IT - 12,
    R = (I.GW - 1) * IT;
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.fillStyle = CAP;
  c.fillRect(L, top, 12, bot - top);
  c.strokeRect(L, top, 12, bot - top);
  c.fillRect(R, top, 12, bot - top);
  c.strokeRect(R, top, 12, bot - top);
}
/**
 * Interior partitions as depth-sorted pieces: each wall run (above and below its doorway) is
 * a dark cap with a short face at its lower end, sorted by that end.
 */
export function partitionPieces(I: Interior) {
  const out: { y: number; f: (c: Ctx) => void }[] = [];
  for (const px of I.parts) {
    const g0 = I.gaps[px],
      x = px * IT + 8,
      w = IT - 16,
      runs = [
        [IT - WALL_H - 4, g0 * IT],
        [(g0 + 2) * IT - 18, (I.GH - 1) * IT],
      ];
    for (const [a, b] of runs) {
      if (b - a < 20) continue;
      out.push({
        y: b,
        f: (c) => {
          c.strokeStyle = OUT;
          c.lineWidth = 2;
          c.fillStyle = CAP;
          c.fillRect(x, a, w, b - a - 14);
          c.strokeRect(x, a, w, b - a - 14);
          c.fillStyle = I.pal.wall;
          c.fillRect(x, b - 14, w, 14);
          c.strokeRect(x, b - 14, w, 14);
          c.fillStyle = sh(I.pal.trim, -0.1);
          c.fillRect(x, b - 4, w, 4);
        },
      });
    }
  }
  return out;
}

/** Everything behind the furniture: void, floor, walls and wall decorations. */
export function drawRoomBack(c: Ctx, I: Interior) {
  c.fillStyle = VOID;
  c.fillRect(-200, -300, I.GW * IT + 400, I.GH * IT + 600);
  backWall(c, I);
  decorations(c, I);
  floor(c, I);
}
/** Walls drawn over the room's contents: the sides and the low front wall with the door. */
export function drawRoomFront(c: Ctx, I: Interior) {
  sideWalls(c, I);
  const y = (I.GH - 1) * IT,
    L = IT - 12,
    R = (I.GW - 1) * IT + 12,
    dx0 = I.door.cx * IT + 4,
    dx1 = (I.door.cx + 1) * IT - 4;
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  for (const [a, b] of [
    [L, dx0],
    [dx1, R],
  ]) {
    c.fillStyle = CAP;
    c.fillRect(a, y - 2, b - a, 12);
    c.strokeRect(a, y - 2, b - a, 12);
    c.fillStyle = I.pal.wall;
    c.fillRect(a, y + 10, b - a, 12);
    c.strokeRect(a, y + 10, b - a, 12);
  }
  // the closed front door seen from above, lying in the wall line between two frame posts:
  // its top edge where the wall's cap is, its planks where the wall's face is
  const dw = dx1 - dx0;
  c.fillStyle = '#9a6a44';
  c.fillRect(dx0, y - 2, dw, 12);
  c.fillStyle = 'rgba(40,24,14,.3)';
  c.fillRect(dx0, y + 6, dw, 4); // the door's thickness, in shadow
  c.fillStyle = '#7a5234';
  c.fillRect(dx0, y + 10, dw, 12);
  c.strokeStyle = 'rgba(40,24,14,.5)';
  c.lineWidth = 1;
  c.beginPath();
  for (let k = 1; k < 4; k++) {
    c.moveTo(dx0 + (dw * k) / 4, y + 10);
    c.lineTo(dx0 + (dw * k) / 4, y + 22);
  }
  c.stroke();
  c.fillStyle = '#4a4652';
  c.fillRect(dx0, y + 17, dw, 3); // iron band
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.strokeRect(dx0, y - 2, dw, 24);
  c.beginPath();
  c.moveTo(dx0, y + 10);
  c.lineTo(dx1, y + 10);
  c.stroke();
  c.fillStyle = '#e3b24a';
  c.beginPath();
  c.arc(dx1 - 6, y + 13.5, 2, 0, TAU);
  c.fill();
  c.lineWidth = 1.2;
  c.stroke();
  // frame posts on both sides of the doorway
  c.lineWidth = 2;
  c.fillStyle = I.pal.trim;
  for (const px of [dx0 - 5, dx1 - 1]) {
    c.fillRect(px, y - 4, 6, 27);
    c.strokeRect(px, y - 4, 6, 27);
  }
}

const LIGHTS: Record<string, [number, number]> = {
  hearth: [150, 10],
  firepit: [130, 14],
  stove: [80, 14],
  candle: [110, 60],
  table: [70, 30],
  bantable: [70, 30],
};
/** Warm light from fires and candles, added over the room. */
export function drawRoomLights(c: Ctx, I: Interior, t: number) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const f of I.furn) {
    // light radius and height by piece
    const L = LIGHTS[f.k];
    if (!L) continue;
    const x = f.x,
      y = f.y - L[1],
      r = L[0];
    const fl = 0.85 + Math.sin(t * 7 + x) * 0.08 + Math.sin(t * 13 + y) * 0.05,
      g = c.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(255,170,80,' + (0.26 * fl).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.restore();
}
