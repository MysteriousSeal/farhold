import { makeSpr } from './decor';
import { DOOR_F, HOUSE_HEIGHT } from '../world/poi';
import { circ, ell, rr, shadow } from '../core/dom';
import { OUT, TAU, clamp, mulberry, rand, sh } from '../core/math';
import { addLight } from '../game/fx';
import { game } from '../game/state';
/* ================= ART: houses ================= */
// Village houses come in five models (h.kind): the half-timbered cottage, a two-storey
// townhouse, a stone cottage, a thatched hut and a stone tower. Each is drawn once into a
// sprite whose origin is the middle of the house front at ground level (y grows downward).
// While drawing, a model records its windows (lit at night) and chimney top (smoke).

type Ctx = CanvasRenderingContext2D;
type Win = [number, number, number, number];
const LW = 2.2,
  WOOD = '#6b4a32',
  GLASS = '#3a4466',
  STONE_FOUND = '#9a948a';

/* ---------- building blocks ---------- */
function ink(x: Ctx, w = LW) {
  x.strokeStyle = OUT;
  x.lineWidth = w;
  x.lineJoin = 'round';
  x.lineCap = 'round';
}
/** Plank door with frame, iron bands, knob and a stone step; `arch` rounds the top. */
function door(x: Ctx, cx: number, w: number, ht: number, col: string, arch = false) {
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
}
/** Framed window with glass glint and mullions; optional shutters, flower box, arch. */
function windowAt(
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
function stoneWall(
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
function timberWall(
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
function foundation(x: Ctx, w: number, col = STONE_FOUND) {
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
function eaveShadow(x: Ctx, w: number, y: number, depth = 7) {
  const g = x.createLinearGradient(0, y, 0, y + depth);
  g.addColorStop(0, 'rgba(20,12,24,.32)');
  g.addColorStop(1, 'rgba(20,12,24,0)');
  x.fillStyle = g;
  x.fillRect(-w / 2, y, w, depth);
}
/** Clay-tile roof: fill a polygon, then scalloped tile rows with highlights and eave shade. */
function tileRoof(
  x: Ctx,
  poly: number[][],
  col: string[],
  top: number,
  bottom: number,
  snow: boolean,
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
  if (snow) snowCap(x, top, bottom);
  x.restore();
  ink(x);
  path();
  x.stroke();
}
/** Slate roof: overlapping grey-blue rectangles. */
function slateRoof(
  x: Ctx,
  poly: number[][],
  col: string,
  top: number,
  bottom: number,
  snow: boolean,
  rnd: () => number,
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
  if (snow) snowCap(x, top, bottom);
  x.restore();
  ink(x);
  path();
  x.stroke();
}
function snowCap(x: Ctx, top: number, bottom: number) {
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
function chimney(x: Ctx, cx: number, base: number, ht: number) {
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
function sign(x: Ctx, sx: number, sy: number, dir: number, sym: number) {
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
function prop(x: Ctx, kind: string, px: number, rnd: () => number) {
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

/* ---------- models ---------- */
type Built = { wins: Win[]; smoke: { x: number; y: number } | null };
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
const MODELS = { cottage, townhouse, stone: stoneCottage, hut, tower, hall };
function houseSprite(h) {
  const kind = h.kind || 'cottage',
    H = HOUSE_HEIGHT[kind] + 24,
    W2 = h.w + 110,
    B: Built = { wins: [], smoke: null },
    rnd = mulberry(((h.seed || 0.5) * 1e9) | 0);
  const S = makeSpr(W2, H, W2 / 2, H - 8, (x) => {
    shadow(x, 0, 3, h.w / 2 + 16, 11, 0.3);
    MODELS[kind](x, h, rnd, B);
    // props on the ground beside the house
    (h.props || []).forEach((pk, i) => {
      const side = i === 0 ? -h.door : h.door,
        px = side * (h.w / 2 + (i === 0 ? 16 : 22));
      prop(x, pk, px, rnd);
    });
  });
  h.wins = B.wins;
  h.smokeAt = B.smoke;
  return S;
}
export function drawHouse(c, h, t, dark) {
  if (!h.spr) h.spr = houseSprite(h);
  const s = h.spr;
  c.drawImage(s.c, h.x - s.ax, h.y - s.ay, s.w, s.h);
  if (dark > 0.15 && h.wins) {
    c.save();
    c.globalAlpha = clamp(dark * 1.4, 0, 1) * (0.85 + Math.sin(t * 3 + h.seed * 9) * 0.08);
    c.fillStyle = '#ffc25a';
    for (const [wx, wy, ww, wh] of h.wins) c.fillRect(h.x + wx + 1, h.y + wy + 1, ww - 2, wh - 2);
    c.restore();
    const w0 = h.wins[0];
    if (w0) addLight(h.x + w0[0] + w0[2] / 2, h.y + w0[1] + 6, 90, 0.6 * dark, '#ffb050');
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
