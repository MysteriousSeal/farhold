import { OUT, TAU } from '../core/math';
import { TUFT_N, type Flora, type Flower } from '../world/flora';
/* ================= ART: grass tufts and flowers ================= */
// Tufts are curved blades in three greens (a dark edge, the body and a light tip), batched into
// one path per biome and layer each frame; flowers are small outlined shapes on stems. Both
// sway gently with the wind (`wind` 1 = calm, higher in rain).
type Ctx = CanvasRenderingContext2D;
const TUFT_COL = {
  0: ['#2e6a2e', '#4f9a3c', '#8fd462'],
  1: ['#24532c', '#3c7c3a', '#6cb24e'],
  2: ['#6a5a1e', '#a08a30', '#d8c05a'],
  5: ['#2e4628', '#56703c', '#8aa45a'],
  3: ['#7a5a26', '#c09a4e', '#f0d890'], // dry desert grass
  8: ['#4e6a30', '#8aa44a', '#d0dc98'], // beach grass
};
const PEBBLE = ['#b8a484', '#9c8a72', '#cdb690', '#8a7c70'];
const STEM = '#3f7a34',
  LEAF = '#5a9a44';

/** Draw the flora of the given chunks inside the view rectangle. */
export function drawFlora(
  c: Ctx,
  list: Flora[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
  wind: number,
) {
  if (!list.length) return;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  sandDetails(c, list, x0, y0, x1, y1);
  c.restore();
  const paths: Record<number, Path2D[]> = {};
  const lean = (wind - 1) * 0.9;
  for (const f of list) {
    const a = f.tufts;
    for (let i = 0; i < a.length; i += TUFT_N) {
      const x = a[i],
        y = a[i + 1];
      if (x < x0 - 12 || x > x1 + 12 || y < y0 - 4 || y > y1 + 14) continue;
      const s = a[i + 2],
        ph = a[i + 3],
        b = a[i + 4];
      const P = paths[b] || (paths[b] = [new Path2D(), new Path2D()]),
        nb = 3 + (Math.floor(ph * 7) % 3),
        sway = Math.sin(t * 1.7 + ph + x * 0.015) * 1.1 * wind + lean;
      for (let k = 0; k < nb; k++) {
        const ang = -0.8 + (1.6 * k) / (nb - 1) + Math.sin(ph * 3 + k) * 0.12,
          len = (6.5 + 3.5 * (1 - Math.abs(ang))) * s * (0.9 + ((ph * 13 + k) % 1) * 0.3),
          bx = x + (k - (nb - 1) / 2) * 1.1,
          tx = bx + Math.sin(ang) * len + (sway * len) / 9,
          ty = y - Math.cos(ang) * len,
          cx = bx + Math.sin(ang) * len * 0.15,
          cy = y - len * 0.6;
        P[0].moveTo(bx, y);
        P[0].quadraticCurveTo(cx, cy, tx, ty);
        // the upper half gets the light tip colour
        const mx = 0.25 * bx + 0.5 * cx + 0.25 * tx,
          my = 0.25 * y + 0.5 * cy + 0.25 * ty;
        P[1].moveTo(mx, my);
        P[1].lineTo(tx, ty);
      }
    }
  }
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const b in paths) {
    const [dark, body, tip] = TUFT_COL[b] || TUFT_COL[0],
      [full, tips] = paths[b];
    c.strokeStyle = dark;
    c.lineWidth = 3.2;
    c.stroke(full);
    c.strokeStyle = body;
    c.lineWidth = 1.7;
    c.stroke(full);
    c.strokeStyle = tip;
    c.lineWidth = 1.2;
    c.stroke(tips);
  }
  for (const f of list)
    for (const fl of f.flowers) {
      if (fl.x < x0 - 10 || fl.x > x1 + 10 || fl.y < y0 - 4 || fl.y > y1 + 16) continue;
      flower(c, fl, Math.sin(t * 1.7 + fl.s * 6 + fl.x * 0.015) * 1.1 * wind + lean);
    }
  c.restore();
}

/** Flat sand details under everything else: wind ripples, then pebbles. */
function sandDetails(c: Ctx, list: Flora[], x0: number, y0: number, x1: number, y1: number) {
  const dark = new Path2D(),
    light = new Path2D();
  for (const f of list) {
    const r = f.ripples;
    for (let i = 0; i < r.length; i += 4) {
      const x = r[i],
        y = r[i + 1],
        w = r[i + 2];
      if (x < x0 - w || x > x1 + w || y < y0 - 10 || y > y1 + 10) continue;
      const bend = 3 + r[i + 3] * 3;
      dark.moveTo(x - w / 2, y);
      dark.quadraticCurveTo(x, y - bend, x + w / 2, y);
      light.moveTo(x - w / 2 + 2, y - 1.6);
      light.quadraticCurveTo(x, y - bend - 1.6, x + w / 2 - 2, y - 1.6);
    }
  }
  c.strokeStyle = 'rgba(150,100,50,.4)';
  c.lineWidth = 1.7;
  c.stroke(dark);
  c.strokeStyle = 'rgba(255,244,210,.55)';
  c.lineWidth = 1.2;
  c.stroke(light);
  for (const f of list) {
    const p = f.pebbles;
    for (let i = 0; i < p.length; i += 4) {
      const x = p[i],
        y = p[i + 1];
      if (x < x0 - 6 || x > x1 + 6 || y < y0 - 6 || y > y1 + 6) continue;
      const s = p[i + 2],
        col = PEBBLE[p[i + 3] | 0];
      c.fillStyle = 'rgba(60,40,20,.18)';
      c.beginPath();
      c.ellipse(x + 0.6, y + 1.2 * s, 3 * s, 1.4 * s, 0, 0, TAU);
      c.fill();
      c.fillStyle = col;
      c.strokeStyle = 'rgba(60,45,35,.85)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(x, y, 2.8 * s, 1.9 * s, (p[i + 3] - 1.5) * 0.3, 0, TAU);
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.beginPath();
      c.ellipse(x - 0.8 * s, y - 0.6 * s, 1 * s, 0.5 * s, -0.3, 0, TAU);
      c.fill();
    }
  }
}
function succulent(c: Ctx, x: number, y: number, s: number) {
  c.fillStyle = 'rgba(60,40,20,.2)';
  c.beginPath();
  c.ellipse(x, y, 6, 2, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#2e5a44';
  c.lineWidth = 0.8;
  for (const [n, r, col] of [
    [7, 5.6, '#78b894'],
    [5, 3.4, '#a2d8b0'],
  ] as [number, number, string][]) {
    c.fillStyle = col;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + s * 3;
      c.beginPath();
      c.moveTo(x, y - 2);
      c.quadraticCurveTo(
        x + Math.cos(a - 0.4) * r,
        y - 2 + Math.sin(a - 0.4) * r * 0.6,
        x + Math.cos(a) * r * 1.2,
        y - 2 + Math.sin(a) * r * 0.7,
      );
      c.quadraticCurveTo(x + Math.cos(a + 0.4) * r, y - 2 + Math.sin(a + 0.4) * r * 0.6, x, y - 2);
      c.fill();
      c.stroke();
    }
  }
}
function sprout(c: Ctx, x: number, y: number, s: number) {
  c.strokeStyle = OUT;
  c.lineWidth = 1;
  c.fillStyle = 'rgba(60,40,20,.2)';
  c.beginPath();
  c.ellipse(x, y, 4, 1.5, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#5a9a4a';
  c.beginPath();
  c.roundRect(x - 3, y - 9, 6, 9, 3);
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(30,60,30,.6)';
  c.beginPath();
  c.moveTo(x, y - 8);
  c.lineTo(x, y - 1);
  c.stroke();
  if (s < 0.6) {
    c.fillStyle = s < 0.3 ? '#ff7ab0' : '#ffd24a';
    c.strokeStyle = OUT;
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(x, y - 9.5, 1.8, 0, TAU);
    c.fill();
    c.stroke();
  }
}
function trefoil(c: Ctx, x: number, y: number, r: number) {
  c.fillStyle = LEAF;
  c.strokeStyle = '#2e6a2e';
  c.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * TAU) / 3;
    c.beginPath();
    c.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.75, r, 0, TAU);
    c.fill();
    c.stroke();
  }
}
function petals(
  c: Ctx,
  x: number,
  y: number,
  n: number,
  d: number,
  rx: number,
  ry: number,
  col: string,
) {
  c.fillStyle = col;
  c.strokeStyle = OUT;
  c.lineWidth = 0.9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU - Math.PI / 2;
    c.beginPath();
    c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, rx, ry, a, 0, TAU);
    c.fill();
    c.stroke();
  }
}
function flower(c: Ctx, f: Flower, sway: number) {
  const { x, y, k, s } = f;
  if (k === 6) return succulent(c, x, y, s);
  if (k === 7) return sprout(c, x, y, s);
  if (k === 4) {
    trefoil(c, x, y - 2, 2.1);
    return;
  }
  const h = k === 5 ? 5 : 7 + s * 3,
    hx = x + sway * 0.8,
    hy = y - h;
  // stem and a leaf
  c.strokeStyle = STEM;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x, y - h * 0.5, hx, hy);
  c.stroke();
  if (k !== 5) {
    c.fillStyle = LEAF;
    c.beginPath();
    c.ellipse(x + 2, y - h * 0.35, 2.4, 1.1, -0.5, 0, TAU);
    c.fill();
  } else trefoil(c, x, y - 1, 1.8);
  if (k === 0) {
    petals(c, hx, hy, 8, 2.4, 1.7, 0.9, '#fbf8f0');
    dot(c, hx, hy, 1.5, '#f5c451');
  } else if (k === 1) {
    petals(c, hx, hy, 5, 1.7, 1.7, 1.5, '#ffd83a');
    dot(c, hx, hy, 1.1, '#e08a1a');
  } else if (k === 2) {
    petals(c, hx, hy, 5, 1.9, 1.8, 1.5, '#ff8fb8');
    dot(c, hx, hy, 1.1, '#c8406a');
  } else if (k === 3) {
    // bluebells hanging from an arching stem
    c.strokeStyle = STEM;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(hx, hy);
    c.quadraticCurveTo(hx + 4, hy - 3, hx + 6, hy + 1);
    c.stroke();
    c.fillStyle = '#6a8ae8';
    c.strokeStyle = OUT;
    c.lineWidth = 0.9;
    for (const [bx, by] of [
      [hx + 1, hy + 2],
      [hx + 4, hy + 1],
      [hx + 6.5, hy + 3.5],
    ]) {
      c.beginPath();
      c.ellipse(bx, by, 1.5, 2, 0, 0, TAU);
      c.fill();
      c.stroke();
    }
  } else {
    // clover flower: a round pom
    dot(c, hx, hy, 2.4, '#f4dcee');
    c.fillStyle = '#d88ab8';
    for (let q = 0; q < 4; q++) c.fillRect(hx - 1.5 + (q % 2) * 2, hy - 1.5 + (q >> 1) * 2, 1, 1);
  }
}
function dot(c: Ctx, x: number, y: number, r: number, col: string) {
  c.fillStyle = col;
  c.strokeStyle = OUT;
  c.lineWidth = 0.9;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.stroke();
}
