import { circ, ell, rr, shadow } from '../dom';
import { OUT, TAU, sh } from '../../core/math';
/* ================= ART: house building blocks ================= */
// Walls (stone, timber), foundations, doors and windows, roofs (tile, slate) with trim, moss
// and snow, chimneys, shop signs and the little props by the door, used by the house models in
// houses.ts. The blocks read the house being drawn (CUR, set by setCur) for its extras.
type Ctx = CanvasRenderingContext2D;
export type Win = [number, number, number, number];
export const LW = 2.2,
  WOOD = '#6b4a32',
  GLASS = '#3a4466',
  STONE_FOUND = '#9a948a';

/** Seeded value 0..1 for extra `k` of house `h` (no effect on world generation). */
export const extra = (h, k: number) => {
  const v = Math.sin((h.seed || 0.5) * 9973 + k * 77.7) * 43758.5453;
  return v - Math.floor(v);
};
/** The house being drawn (building blocks read its seeded extras). */
export let CUR = null;
/** Start (or with null, end) drawing house `h`: the building blocks read its extras. */
export const setCur = (h) => (CUR = h);
/** Cheap position hash for plaster speckle and grain. */
export const hash2 = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/* ---------- building blocks ---------- */
export function ink(x: Ctx, w = LW) {
  x.strokeStyle = OUT;
  x.lineWidth = w;
  x.lineJoin = 'round';
  x.lineCap = 'round';
}
/** Plank door with frame, iron bands, knob and a stone step; `arch` rounds the top. */
export function door(x: Ctx, cx: number, w: number, ht: number, col: string, arch = false) {
  ink(x);
  const ar = arch ? [w / 2 + 2, w / 2 + 2, 0, 0] : 2,
    ai = arch ? [w / 2, w / 2, 0, 0] : 1;
  rr(x, cx - w / 2 - 2.5, -ht - 2.5, w + 5, ht + 2.5, ar as any, sh(col, -0.35));
  rr(x, cx - w / 2, -ht, w, ht, ai as any, col);
  x.save();
  x.beginPath();
  if (x.roundRect) x.roundRect(cx - w / 2, -ht, w, ht, ai as any);
  else x.rect(cx - w / 2, -ht, w, ht);
  x.clip();
  x.strokeStyle = 'rgba(0,0,0,.28)';
  x.lineWidth = 1.1;
  for (let k = 1; k < 3; k++) {
    x.beginPath();
    x.moveTo(cx - w / 2 + (k * w) / 3, -ht);
    x.lineTo(cx - w / 2 + (k * w) / 3, 0);
    x.stroke();
  }
  x.strokeStyle = 'rgba(35,28,30,.7)';
  x.lineWidth = 1.8;
  for (const f of [0.3, 0.72]) {
    x.beginPath();
    x.moveTo(cx - w / 2, -ht * f);
    x.lineTo(cx + w / 2, -ht * f);
    x.stroke();
  }
  x.fillStyle = 'rgba(255,255,255,.12)';
  x.fillRect(cx - w / 2, -ht, 3, ht);
  x.restore();
  ink(x, 1.2);
  circ(x, cx + w * 0.28, -ht * 0.45, 1.7, '#f5c451');
  ink(x);
  rr(x, cx - w / 2 - 5, -2.5, w + 10, 5, 2, STONE_FOUND);
  if (CUR && !CUR.lanternAt && extra(CUR, 70) < 0.45) {
    // wall lantern on an iron bracket beside the door
    const s = extra(CUR, 71) < 0.5 ? -1 : 1,
      lx = cx + s * (w / 2 + 7),
      ly = -ht + 2;
    ink(x, 1.6);
    x.beginPath();
    x.moveTo(cx + s * (w / 2 + 3), ly);
    x.lineTo(lx, ly);
    x.lineTo(lx, ly + 3);
    x.stroke();
    ink(x, 1.4);
    rr(x, lx - 3.5, ly + 3, 7, 9, 1.5, '#ffd27a');
    rr(x, lx - 4.5, ly + 1.5, 9, 2.5, 1, '#3a3440');
    rr(x, lx - 2.5, ly + 12, 5, 2, 1, '#3a3440');
    CUR.lanternAt = { x: lx, y: ly + 7 };
  }
}
/** Framed window with glass glint and mullions; optional shutters, flower box, arch. */
export function windowAt(
  x: Ctx,
  wins: Win[],
  cx: number,
  cy: number,
  w: number,
  ht: number,
  o: { shut?: string; box?: boolean; arch?: boolean; frame?: string } = {},
) {
  const frame = o.frame || WOOD;
  ink(x);
  if (o.shut) {
    for (const s of [-1, 1]) {
      const sx = s < 0 ? cx - w / 2 - 2 - w * 0.42 : cx + w / 2 + 2;
      rr(x, sx, cy - ht / 2 - 1, w * 0.42, ht + 2, 1, o.shut);
      x.save();
      x.strokeStyle = 'rgba(0,0,0,.25)';
      x.lineWidth = 1;
      for (let k = 1; k < 4; k++) {
        x.beginPath();
        x.moveTo(sx + 1.5, cy - ht / 2 + (k * ht) / 4);
        x.lineTo(sx + w * 0.42 - 1.5, cy - ht / 2 + (k * ht) / 4);
        x.stroke();
      }
      x.restore();
    }
  }
  const ar = o.arch ? [w / 2 + 2, w / 2 + 2, 1, 1] : 2,
    ai = o.arch ? [w / 2, w / 2, 0, 0] : 1;
  rr(x, cx - w / 2 - 2.5, cy - ht / 2 - 2.5, w + 5, ht + 5, ar as any, frame);
  rr(x, cx - w / 2, cy - ht / 2, w, ht, ai as any, GLASS);
  if (CUR && extra(CUR, 60 + wins.length) < 0.5) {
    // curtains drawn back to the top corners
    x.save();
    x.fillStyle = ['#e8d8f0', '#f0e0c8', '#c8e0f0', '#f0c8c8'][Math.floor(extra(CUR, 61) * 4)];
    x.globalAlpha = 0.9;
    for (const s of [-1, 1]) {
      x.beginPath();
      x.moveTo(cx + s * (w / 2), cy - ht / 2);
      x.lineTo(cx + s * (w / 2 - w * 0.34), cy - ht / 2);
      x.quadraticCurveTo(cx + s * (w / 2 - w * 0.12), cy, cx + s * (w / 2), cy + ht * 0.28);
      x.closePath();
      x.fill();
    }
    x.restore();
  }
  x.save();
  x.fillStyle = 'rgba(255,255,255,.32)';
  x.beginPath();
  x.moveTo(cx - w / 2 + 2, cy + ht / 2 - 3);
  x.lineTo(cx - w / 2 + w * 0.45, cy - ht / 2 + 2);
  x.lineTo(cx - w / 2 + w * 0.62, cy - ht / 2 + 2);
  x.lineTo(cx - w / 2 + w * 0.17, cy + ht / 2 - 3);
  x.closePath();
  x.fill();
  x.strokeStyle = frame;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(cx, cy - ht / 2);
  x.lineTo(cx, cy + ht / 2);
  x.moveTo(cx - w / 2, cy + (o.arch ? ht * 0.1 : 0));
  x.lineTo(cx + w / 2, cy + (o.arch ? ht * 0.1 : 0));
  x.stroke();
  x.restore();
  ink(x);
  rr(x, cx - w / 2 - 4, cy + ht / 2 + 1, w + 8, 3.5, 1, sh(frame, -0.1));
  if (o.box) {
    rr(x, cx - w / 2 - 2, cy + ht / 2 + 4, w + 4, 5, 1.5, '#8a5a36');
    const cols = ['#e0443c', '#ffd24a', '#ff8fb0', '#b8d8ff'];
    for (let k = 0; k < 4; k++) {
      const fx = cx - w / 2 + (k + 0.5) * (w / 4);
      x.fillStyle = '#4c9a3a';
      x.beginPath();
      x.arc(fx, cy + ht / 2 + 3.5, 3, Math.PI, 0);
      x.fill();
      x.fillStyle = cols[(k + ((cx * 7) | 0)) % 4];
      x.beginPath();
      x.arc(fx, cy + ht / 2 + 1.5, 1.8, 0, TAU);
      x.fill();
    }
  }
  wins.push([cx - w / 2, cy - ht / 2, w, ht]);
}
/** Stone courses filling a rectangle (seeded, so a house always looks the same). */
export function stoneWall(
  x: Ctx,
  rnd: () => number,
  x0: number,
  y0: number,
  w: number,
  ht: number,
  col: string,
) {
  ink(x);
  rr(x, x0, y0, w, ht, 2, col);
  x.save();
  x.beginPath();
  x.rect(x0, y0, w, ht);
  x.clip();
  for (let yy = y0 + ht, row = 0; yy > y0 - 8; yy -= 8, row++) {
    let xx = x0 - (row % 2) * 6 - rnd() * 4;
    while (xx < x0 + w) {
      const bw = 9 + rnd() * 9,
        f = (rnd() - 0.5) * 0.16;
      x.fillStyle = sh(col, f);
      x.strokeStyle = 'rgba(40,30,40,.35)';
      x.lineWidth = 1.1;
      x.beginPath();
      if (x.roundRect) x.roundRect(xx + 0.8, yy - 7.4, bw - 1.6, 6.8, 2);
      else x.rect(xx + 0.8, yy - 7.4, bw - 1.6, 6.8);
      x.fill();
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,.14)';
      x.fillRect(xx + 1.6, yy - 7, bw - 3.2, 1.4);
      xx += bw;
    }
  }
  x.restore();
  ink(x);
  x.strokeRect(x0, y0, w, ht);
}
/** Plastered wall with half-timber beams (posts, a rail and corner braces). */
export function timberWall(
  x: Ctx,
  x0: number,
  y0: number,
  w: number,
  ht: number,
  wall: string,
  jetty = 0,
) {
  ink(x);
  rr(x, x0 - jetty, y0, w + jetty * 2, ht, 2, wall);
  x.save();
  x.fillStyle = 'rgba(0,0,0,.06)';
  x.fillRect(x0 - jetty, y0 + ht * 0.65, w + jetty * 2, ht * 0.35);
  // plaster speckle and a hairline crack
  for (let k = 0; k < (w * ht) / 60; k++) {
    const px = x0 + hash2(k, w) * w,
      py = y0 + hash2(w, k) * ht;
    x.fillStyle = hash2(k, 3) < 0.5 ? 'rgba(120,90,60,.13)' : 'rgba(255,255,255,.25)';
    x.fillRect(px, py, 1.4, 1.4);
  }
  x.strokeStyle = 'rgba(110,85,60,.28)';
  x.lineWidth = 0.8;
  x.beginPath();
  x.moveTo(x0 + w * 0.55, y0 + ht * 0.5);
  x.lineTo(x0 + w * 0.58, y0 + ht * 0.62);
  x.lineTo(x0 + w * 0.56, y0 + ht * 0.72);
  x.stroke();
  // beams: outlined, with grain
  const beams = new Path2D();
  beams.moveTo(x0 - jetty + 2, y0 + ht * 0.36);
  beams.lineTo(x0 + w + jetty - 2, y0 + ht * 0.36);
  for (const k of [0, 0.33, 0.67, 1]) {
    beams.moveTo(x0 + k * w, y0 + 2);
    beams.lineTo(x0 + k * w, y0 + ht - 1);
  }
  beams.moveTo(x0 + 3, y0 + 2);
  beams.lineTo(x0 + w * 0.2, y0 + ht * 0.36);
  beams.moveTo(x0 + w - 3, y0 + 2);
  beams.lineTo(x0 + w * 0.8, y0 + ht * 0.36);
  x.strokeStyle = OUT;
  x.lineWidth = 5.2;
  x.stroke(beams);
  x.strokeStyle = WOOD;
  x.lineWidth = 3.4;
  x.stroke(beams);
  x.strokeStyle = 'rgba(30,18,10,.35)';
  x.lineWidth = 0.7;
  x.setLineDash([5, 3, 2, 4]);
  x.stroke(beams);
  x.setLineDash([]);
  x.strokeStyle = WOOD;
  x.lineWidth = 3.4;
  x.beginPath();
  x.moveTo(x0 - jetty + 2, y0 + ht * 0.36);
  x.lineTo(x0 + w + jetty - 2, y0 + ht * 0.36);
  for (const k of [0, 0.33, 0.67, 1]) {
    x.moveTo(x0 + k * w, y0 + 2);
    x.lineTo(x0 + k * w, y0 + ht - 1);
  }
  x.moveTo(x0 + 3, y0 + 2);
  x.lineTo(x0 + w * 0.2, y0 + ht * 0.36);
  x.moveTo(x0 + w - 3, y0 + 2);
  x.lineTo(x0 + w * 0.8, y0 + ht * 0.36);
  x.stroke();
  // wood grain on the beams
  x.strokeStyle = 'rgba(255,255,255,.18)';
  x.lineWidth = 0.8;
  x.beginPath();
  x.moveTo(x0 - jetty + 4, y0 + ht * 0.36 - 0.8);
  x.lineTo(x0 + w + jetty - 4, y0 + ht * 0.36 - 0.8);
  x.stroke();
  x.restore();
  ink(x);
  x.strokeRect(x0 - jetty, y0, w + jetty * 2, ht);
}
/** Low stone plinth along the bottom of a wall. */
export function foundation(x: Ctx, w: number, col = STONE_FOUND) {
  ink(x);
  rr(x, -w / 2 - 2, -6, w + 4, 6, 1.5, col);
  x.save();
  x.strokeStyle = 'rgba(40,30,40,.3)';
  x.lineWidth = 1;
  x.beginPath();
  for (let k = -w / 2 + 8; k < w / 2; k += 11) {
    x.moveTo(k, -6);
    x.lineTo(k, 0);
  }
  x.stroke();
  x.restore();
}
/** Soft shadow the roof casts on the wall just under the eave. */
export function eaveShadow(x: Ctx, w: number, y: number, depth = 7) {
  const g = x.createLinearGradient(0, y, 0, y + depth);
  g.addColorStop(0, 'rgba(20,12,24,.32)');
  g.addColorStop(1, 'rgba(20,12,24,0)');
  x.fillStyle = g;
  x.fillRect(-w / 2, y, w, depth);
}
/** Clay-tile roof: fill a polygon, then scalloped tile rows with highlights and eave shade. */
export function tileRoof(
  x: Ctx,
  poly: number[][],
  col: string[],
  top: number,
  bottom: number,
  snow: boolean,
  h?,
) {
  const path = () => {
    x.beginPath();
    x.moveTo(poly[0][0], poly[0][1]);
    for (const p of poly.slice(1)) x.lineTo(p[0], p[1]);
    x.closePath();
  };
  ink(x);
  path();
  x.fillStyle = col[0];
  x.fill();
  x.save();
  path();
  x.clip();
  for (let yy = bottom, r = 0; yy > top - 10; yy -= 8, r++)
    for (let k = -120 + (r % 2) * 5; k < 120; k += 10) {
      x.fillStyle = r % 3 === 1 ? sh(col[0], 0.06) : col[0];
      x.strokeStyle = col[1];
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(k, yy - 8);
      x.lineTo(k, yy - 3);
      x.arc(k + 5, yy - 3, 5, Math.PI, 0, true);
      x.lineTo(k + 10, yy - 8);
      x.fill();
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,.16)';
      x.fillRect(k + 2, yy - 7.5, 3, 3);
    }
  const g = x.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(255,255,255,.14)');
  g.addColorStop(1, 'rgba(0,0,0,.18)');
  x.fillStyle = g;
  x.fillRect(-150, top - 20, 300, bottom - top + 30);
  if (h && mossy(h)) moss(x, h, top, bottom);
  if (snow) snowCap(x, top, bottom);
  x.restore();
  ink(x);
  path();
  x.stroke();
  if (poly.length === 4) roofTrim(x, poly, col[0]);
}
/** Slate roof: overlapping grey-blue rectangles. */
export function slateRoof(
  x: Ctx,
  poly: number[][],
  col: string,
  top: number,
  bottom: number,
  snow: boolean,
  rnd: () => number,
  h?,
) {
  const path = () => {
    x.beginPath();
    x.moveTo(poly[0][0], poly[0][1]);
    for (const p of poly.slice(1)) x.lineTo(p[0], p[1]);
    x.closePath();
  };
  ink(x);
  path();
  x.fillStyle = col;
  x.fill();
  x.save();
  path();
  x.clip();
  for (let yy = bottom, r = 0; yy > top - 8; yy -= 7, r++)
    for (let k = -120 + (r % 2) * 4.5; k < 120; k += 9) {
      x.fillStyle = sh(col, (rnd() - 0.5) * 0.18);
      x.strokeStyle = 'rgba(20,20,35,.45)';
      x.lineWidth = 1.1;
      x.beginPath();
      if (x.roundRect) x.roundRect(k, yy - 8, 9, 8, [0, 0, 2, 2]);
      else x.rect(k, yy - 8, 9, 8);
      x.fill();
      x.stroke();
    }
  const g = x.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(255,255,255,.18)');
  g.addColorStop(1, 'rgba(0,0,0,.2)');
  x.fillStyle = g;
  x.fillRect(-150, top - 20, 300, bottom - top + 30);
  if (h && mossy(h)) moss(x, h, top, bottom);
  if (snow) snowCap(x, top, bottom);
  x.restore();
  ink(x);
  path();
  x.stroke();
  roofTrim(x, poly, col);
}
/** Ridge cap along the roof's top edge and an eave board along its bottom edge. */
export function roofTrim(x: Ctx, poly: number[][], col: string) {
  const [bl, tl, tr, br] = poly;
  ink(x);
  x.strokeStyle = OUT;
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(tl[0], tl[1]);
  x.lineTo(tr[0], tr[1]);
  x.stroke();
  x.strokeStyle = sh(col, -0.2);
  x.lineWidth = 4.4;
  x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.35)';
  x.lineWidth = 1.2;
  x.beginPath();
  x.moveTo(tl[0] + 2, tl[1] - 1);
  x.lineTo(tr[0] - 2, tr[1] - 1);
  x.stroke();
  // eave board
  x.strokeStyle = OUT;
  x.lineWidth = 6;
  x.beginPath();
  x.moveTo(bl[0], bl[1]);
  x.lineTo(br[0], br[1]);
  x.stroke();
  x.strokeStyle = WOOD;
  x.lineWidth = 3.6;
  x.stroke();
  ink(x);
}
/** Moss patches on a roof (inside the current clip). */
export function moss(x: Ctx, h, top: number, bottom: number) {
  for (let k = 0; k < 4; k++) {
    if (extra(h, 20 + k) > 0.6) continue;
    const mx = (extra(h, 30 + k) - 0.5) * h.w * 0.9,
      my = top + (bottom - top) * (0.35 + extra(h, 40 + k) * 0.55),
      r = 5 + extra(h, 50 + k) * 6;
    x.fillStyle = 'rgba(78,120,52,.85)';
    x.beginPath();
    x.ellipse(mx, my, r, r * 0.55, 0, 0, TAU);
    x.ellipse(mx + r * 0.7, my + 1, r * 0.6, r * 0.4, 0, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(140,190,90,.7)';
    x.beginPath();
    x.ellipse(mx - r * 0.2, my - r * 0.15, r * 0.5, r * 0.25, 0, 0, TAU);
    x.fill();
  }
}
export const mossy = (h) => (h.b === 1 || h.b === 5 || h.b === 0) && !h.snow && extra(h, 1) < 0.55;
export function snowCap(x: Ctx, top: number, bottom: number) {
  const d = Math.min(18, (bottom - top) * 0.45);
  x.fillStyle = '#f4f8ff';
  x.beginPath();
  x.moveTo(-150, top - 20);
  x.lineTo(150, top - 20);
  x.lineTo(150, top + d);
  for (let k = 150; k > -150; k -= 12) x.quadraticCurveTo(k - 6, top + d + 7, k - 12, top + d);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(150,175,210,.35)';
  x.fillRect(-150, top + d - 2, 300, 2);
}
/** Brick chimney with a cap; returns the smoke origin. */
export function chimney(x: Ctx, cx: number, base: number, ht: number) {
  ink(x);
  rr(x, cx - 6, base - ht, 12, ht, 1, '#a0685a');
  x.save();
  x.strokeStyle = 'rgba(60,30,30,.4)';
  x.lineWidth = 1;
  x.beginPath();
  for (let yy = base - ht + 5, r = 0; yy < base; yy += 5, r++) {
    x.moveTo(cx - 6, yy);
    x.lineTo(cx + 6, yy);
    x.moveTo(cx + (r % 2 ? -1 : 2), yy);
    x.lineTo(cx + (r % 2 ? -1 : 2), yy + 5);
  }
  x.stroke();
  x.restore();
  ink(x);
  rr(x, cx - 8, base - ht - 4, 16, 5, 1.5, '#6e5a52');
  return { x: cx, y: base - ht - 6 };
}
/** Hanging sign on an iron bracket, with a little painted symbol. */
export function sign(x: Ctx, sx: number, sy: number, dir: number, sym: number) {
  ink(x, 1.8);
  x.beginPath();
  x.moveTo(sx, sy);
  x.lineTo(sx + dir * 16, sy);
  x.stroke();
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(sx + dir * 5, sy);
  x.lineTo(sx + dir * 5, sy + 4);
  x.moveTo(sx + dir * 14, sy);
  x.lineTo(sx + dir * 14, sy + 4);
  x.stroke();
  ink(x);
  const bx = sx + dir * 9.5;
  rr(x, bx - 7, sy + 4, 14, 11, 2, '#b8844a');
  x.fillStyle = ['#e0443c', '#62b24a', '#4f6fb3', '#f5c451'][sym % 4];
  x.beginPath();
  if (sym % 2) x.arc(bx, sy + 9.5, 3, 0, TAU);
  else {
    x.moveTo(bx, sy + 6);
    x.lineTo(bx + 3.5, sy + 12.5);
    x.lineTo(bx - 3.5, sy + 12.5);
    x.closePath();
  }
  x.fill();
}
/* ---------- props next to houses ---------- */
export function prop(x: Ctx, kind: string, px: number, rnd: () => number) {
  ink(x);
  shadow(x, px, 1, 11, 3.5, 0.22);
  if (kind === 'barrel') {
    rr(x, px - 7, -17, 14, 17, 4, '#9a6a3a');
    x.save();
    x.strokeStyle = '#5a5a60';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(px - 7, -12);
    x.lineTo(px + 7, -12);
    x.moveTo(px - 7, -5);
    x.lineTo(px + 7, -5);
    x.stroke();
    x.restore();
    ell(x, px, -17, 7, 2.5, '#7a4f2a');
  } else if (kind === 'crate') {
    rr(x, px - 8, -15, 16, 15, 1.5, '#c8964e');
    x.save();
    x.strokeStyle = '#8a5a2a';
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(px - 7, -14);
    x.lineTo(px + 7, -1);
    x.moveTo(px - 8, -8);
    x.lineTo(px + 8, -8);
    x.stroke();
    x.restore();
  } else if (kind === 'wood') {
    for (const [dx, dy] of [
      [-6, -4],
      [0, -4],
      [6, -4],
      [-3, -10],
      [3, -10],
      [0, -16],
    ]) {
      ink(x, 1.6);
      circ(x, px + dx, dy, 3.4, '#b07a44');
      circ(x, px + dx, dy, 1.4, '#e0b27a', false);
    }
  } else if (kind === 'pot') {
    rr(x, px - 6, -10, 12, 10, [2, 2, 4, 4] as any, '#c0643a');
    x.fillStyle = '#4c9a3a';
    x.beginPath();
    x.arc(px - 3, -11, 4, Math.PI, 0);
    x.arc(px + 3, -12, 4, Math.PI, 0);
    x.fill();
    x.fillStyle = rnd() < 0.5 ? '#ff8fb0' : '#ffd24a';
    for (const [dx, dy] of [
      [-3, -14],
      [3, -15],
      [0, -12],
    ]) {
      x.beginPath();
      x.arc(px + dx, dy, 1.8, 0, TAU);
      x.fill();
    }
  } else if (kind === 'bench') {
    rr(x, px - 12, -9, 24, 4, 1.5, '#9a6a3a');
    rr(x, px - 10, -5, 3, 5, 1, '#7a4f2a');
    rr(x, px + 7, -5, 3, 5, 1, '#7a4f2a');
  } else {
    for (let k = -1; k <= 1; k++) rr(x, px + k * 8 - 2, -16, 4, 16, [2, 2, 0, 0] as any, '#d8c8a8');
    rr(x, px - 12, -12, 24, 3, 1, '#c8b898');
    rr(x, px - 12, -6, 24, 3, 1, '#c8b898');
  }
}
