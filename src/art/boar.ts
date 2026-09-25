import { shadow } from '../core/dom';
import { OUT, TAU, sh } from '../core/math';
/* ================= ART: boars ================= */
// A heavy, low boar in three facings (side, front, back): barrel body with a shoulder hump,
// a dark bristle mane along the spine, a wedge head with a pink snout disc and curved tusks,
// stubby legs with dark hooves and a curly tail. It lowers its head to charge.
type Ctx = CanvasRenderingContext2D;
type Pal = { hide: string; back: string; belly: string; mane: string; snout: string };
const HOOF = '#2e2226',
  TUSK = '#f6efd8';

/** Stubby leg from (x, y), rotated by `a`, ending in a split hoof. */
function leg(c: Ctx, x: number, y: number, len: number, a: number, col: string, w = 6.5) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.beginPath();
  c.moveTo(-w / 2, 0);
  c.lineTo(-w * 0.4, len - 2.5);
  c.lineTo(w * 0.4, len - 2.5);
  c.lineTo(w / 2, 0);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  c.beginPath();
  c.roundRect(-w * 0.45, len - 3, w * 0.9, 3.4, 1.2);
  c.fillStyle = HOOF;
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.25)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(0, len - 2.6);
  c.lineTo(0, len + 0.2);
  c.stroke();
  c.restore();
}
/** Row of bristle spikes along a curve given as points [x, y, height]. */
function bristles(c: Ctx, pts: number[][], col: string) {
  c.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y, h] = pts[i];
    c.lineTo(x - 2.2, y);
    c.lineTo(x - 0.8, y - h);
    c.lineTo(x + 0.4, y - h * 0.4);
    c.lineTo(x + 1.8, y - h * 0.95);
    c.lineTo(x + 2.4, y);
  }
  c.fillStyle = col;
  c.fill();
  c.lineWidth = 1.4;
  c.stroke();
}
/** Curved tusk from its root, curling up toward `dir` (1 right, -1 left). */
function tusk(c: Ctx, x: number, y: number, dir: number, s = 1) {
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + dir * 4.5 * s, y + 0.5 * s, x + dir * 5.2 * s, y - 5.5 * s);
  c.quadraticCurveTo(x + dir * 2.6 * s, y - 1.6 * s, x - dir * 0.6 * s, y - 1.8 * s);
  c.closePath();
  c.fillStyle = TUSK;
  c.fill();
  c.lineWidth = 1.3;
  c.stroke();
}
function eye(c: Ctx, x: number, y: number, angry: boolean, dir = 1) {
  c.fillStyle = angry ? '#ff4030' : OUT;
  c.beginPath();
  c.arc(x, y, 1.5, 0, TAU);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x - dir * 2.4, y - (angry ? 3.2 : 2.4));
  c.lineTo(x + dir * 2.2, y - 1.8);
  c.stroke();
}
function ear(c: Ctx, x: number, y: number, a: number, p: Pal) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.beginPath();
  c.moveTo(-2.6, 0);
  c.quadraticCurveTo(-1, -6, 0.5, -7.5);
  c.quadraticCurveTo(2.6, -3, 2.6, 0);
  c.closePath();
  c.fillStyle = p.hide;
  c.fill();
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = sh(p.snout, -0.15);
  c.beginPath();
  c.ellipse(0.3, -2.6, 1, 2.4, 0.1, 0, TAU);
  c.fill();
  c.restore();
}
function snoutDisc(c: Ctx, x: number, y: number, rx: number, ry: number, p: Pal) {
  c.fillStyle = p.snout;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = OUT;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.ellipse(x + k * rx * 0.36, y, rx * 0.16, ry * 0.3, 0, 0, TAU);
    c.fill();
  }
}

/* ---------- side view (facing +x) ---------- */
function side(c: Ctx, e, t: number, p: Pal, sw: number, bob: number) {
  const lw = c.lineWidth,
    charging = !!e.charge,
    gait = charging ? Math.sin(t * 30) * 0.7 : sw * 0.45,
    // winding up a charge: rock back and paw the ground with a front hoof
    paw = e.wind > 0 ? Math.max(0, Math.sin(t * 16)) * -0.9 : 0;
  leg(c, -9, -11 + bob, 11, -gait, sh(p.hide, -0.3));
  leg(c, 8, -11 + bob, 11, gait, sh(p.hide, -0.3));
  c.save();
  c.translate(0, bob);
  // curly tail with a tuft
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(-17, -17);
  c.bezierCurveTo(-23, -19, -22, -13, -19.5, -14 + Math.sin(t * 7) * 1.2);
  c.stroke();
  c.fillStyle = p.mane;
  c.beginPath();
  c.ellipse(-19.5, -13 + Math.sin(t * 7) * 1.2, 1.6, 2.4, 0.4, 0, TAU);
  c.fill();
  c.lineWidth = lw;
  // barrel body with a shoulder hump
  const body = new Path2D();
  body.moveTo(-17, -12);
  body.quadraticCurveTo(-20, -23, -10, -24);
  body.quadraticCurveTo(0, -30, 8, -27);
  body.quadraticCurveTo(15, -24, 15, -15);
  body.quadraticCurveTo(13, -8, 4, -8.5);
  body.lineTo(-9, -8.5);
  body.quadraticCurveTo(-17, -8, -17, -12);
  body.closePath();
  c.fillStyle = p.hide;
  c.fill(body);
  c.save();
  c.clip(body);
  c.fillStyle = p.belly;
  c.beginPath();
  c.ellipse(-1, -6, 17, 5, 0, 0, TAU);
  c.fill();
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, -29, 18, 7, 0.05, 0, TAU);
  c.fill();
  // coarse hair strokes
  c.strokeStyle = 'rgba(0,0,0,.2)';
  c.lineWidth = 1.1;
  for (const [x, y] of [
    [-11, -17],
    [-6, -15],
    [-1, -18],
    [5, -16],
  ]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y + 3);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = lw;
  c.stroke(body);
  bristles(
    c,
    [
      [-8, -24.5, 3],
      [-3, -26.5, 4],
      [2, -28, 4.5],
      [7, -27.5, 4],
    ],
    p.mane,
  );
  c.restore();
  // near legs (one front hoof paws while winding up)
  leg(c, -9, -11 + bob, 11, gait, p.hide);
  leg(c, 8, -11 + bob, 11, -gait + paw, p.hide);
  c.save();
  c.translate(0, bob);
  // haunch
  c.fillStyle = p.hide;
  c.lineWidth = lw;
  c.beginPath();
  c.ellipse(-10, -13, 5.5, 5, 0.2, -0.3, Math.PI + 0.9);
  c.fill();
  c.stroke();
  // head: a wedge sloping down to the snout disc; lowered while charging
  c.save();
  c.translate(12, charging ? -15 : -18);
  c.rotate(charging ? 0.22 : 0);
  ear(c, 1, -7, -0.7, p);
  c.beginPath();
  c.moveTo(-3, -8);
  c.quadraticCurveTo(6, -9.5, 12, -3);
  c.lineTo(13, 4);
  c.quadraticCurveTo(6, 7.5, -2, 6);
  c.quadraticCurveTo(-5, 0, -3, -8);
  c.closePath();
  c.fillStyle = p.hide;
  c.fill();
  c.lineWidth = lw;
  c.stroke();
  // cheek shading and jaw line
  c.fillStyle = 'rgba(0,0,0,.14)';
  c.beginPath();
  c.ellipse(2, 3.5, 5, 2.4, 0.1, 0, TAU);
  c.fill();
  snoutDisc(c, 12.8, 0.5, 2, 3.6, p);
  tusk(c, 8.5, 4.2, 1);
  eye(c, 4.5, -3.2, !!e.aggro);
  c.restore();
  c.restore();
}

/* ---------- front view (charging at the camera) ---------- */
function front(c: Ctx, e, t: number, p: Pal, sw: number, bob: number) {
  const lw = c.lineWidth;
  leg(c, -7, -9, 9, 0, sh(p.hide, -0.3), 6);
  leg(c, 7, -9, 9, 0, sh(p.hide, -0.3), 6);
  c.save();
  c.translate(0, bob);
  c.fillStyle = p.hide;
  c.beginPath();
  c.ellipse(0, -15, 13, 9.5, 0, 0, TAU);
  c.fill();
  c.stroke();
  bristles(
    c,
    [
      [-5, -23, 3.5],
      [0, -24.5, 4.5],
      [5, -23, 3.5],
    ],
    p.mane,
  );
  c.restore();
  leg(c, -6, -10 + bob, 11 - Math.max(0, sw) * 2, 0, p.hide);
  leg(c, 6, -10 + bob, 11 - Math.max(0, -sw) * 2, 0, p.hide);
  c.save();
  c.translate(0, bob + (e.charge ? 2 : 0));
  ear(c, -7, -24, -0.9, p);
  ear(c, 7, -24, 0.9, p);
  // broad head
  c.beginPath();
  c.moveTo(-8.5, -24);
  c.quadraticCurveTo(0, -28, 8.5, -24);
  c.quadraticCurveTo(10, -16, 6, -11);
  c.lineTo(-6, -11);
  c.quadraticCurveTo(-10, -16, -8.5, -24);
  c.closePath();
  c.fillStyle = p.hide;
  c.fill();
  c.lineWidth = lw;
  c.stroke();
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, -25, 5, 2, 0, 0, TAU);
  c.fill();
  tusk(c, -4.6, -12, -1, 0.9);
  tusk(c, 4.6, -12, 1, 0.9);
  snoutDisc(c, 0, -13, 4.6, 3.6, p);
  eye(c, -4, -20, !!e.aggro, -1);
  eye(c, 4, -20, !!e.aggro, 1);
  c.restore();
}

/* ---------- back view (running away) ---------- */
function back(c: Ctx, e, t: number, p: Pal, sw: number, bob: number) {
  const lw = c.lineWidth;
  leg(c, -6, -10, 9, 0, sh(p.hide, -0.3), 6);
  leg(c, 6, -10, 9, 0, sh(p.hide, -0.3), 6);
  c.save();
  c.translate(0, bob);
  ear(c, -6, -24, -0.8, p);
  ear(c, 6, -24, 0.8, p);
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, -22, 7.5, 5, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = p.hide;
  c.beginPath();
  c.ellipse(0, -14.5, 13, 9.5, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, -18, 5, 5.5, 0, 0, TAU);
  c.fill();
  bristles(
    c,
    [
      [-2.5, -21.5, 3.5],
      [2.5, -21.5, 3.5],
    ],
    p.mane,
  );
  c.restore();
  leg(c, -7, -10 + bob, 11 - Math.max(0, sw) * 2, 0, p.hide);
  leg(c, 7, -10 + bob, 11 - Math.max(0, -sw) * 2, 0, p.hide);
  c.save();
  c.translate(0, bob);
  c.fillStyle = p.hide;
  c.lineWidth = lw;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.ellipse(k * 6.5, -11, 5.5, 5.5, 0, Math.PI * 0.9, Math.PI * 2.1);
    c.fill();
    c.stroke();
  }
  // curly tail
  const wag = Math.sin(t * 7) * 1.5;
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(0, -16);
  c.bezierCurveTo(3 + wag, -20, -3 + wag, -22, 0 + wag, -19);
  c.stroke();
  c.fillStyle = p.mane;
  c.beginPath();
  c.ellipse(wag, -19, 1.6, 2.2, 0, 0, TAU);
  c.fill();
  c.restore();
}

/** Draw a boar with hide colour `col` (already flashed/frozen). */
export function drawBoar(c: Ctx, e, t: number, col: string) {
  const s = e.sc,
    p: Pal = {
      hide: col,
      back: sh(col, -0.2),
      belly: sh(col, 0.22),
      mane: sh(col, -0.5),
      snout: '#e0a08c',
    },
    moving = e.moving || !!e.charge,
    sw = Math.sin(e.walk) * (moving ? 1 : 0),
    bob = moving ? -Math.abs(Math.cos(e.walk)) * 1 : Math.sin(t * 2 + e.x) * 0.35,
    ax = Math.abs(e.dx || 0),
    ay = Math.abs(e.dy || 0),
    view = ax >= ay * 0.8 ? 'side' : e.dy > 0 ? 'front' : 'back';
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, (view === 'side' ? 18 : 14) * s, 5 * s);
  c.scale(s * (view === 'side' && e.dx < 0 ? -1 : 1), s);
  c.lineWidth = 2.2 / Math.sqrt(s);
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (e.wind > 0 && view === 'side') c.translate(-2, 0);
  if (view === 'side') side(c, e, t, p, sw, bob);
  else if (view === 'front') front(c, e, t, p, sw, bob);
  else back(c, e, t, p, sw, bob);
  c.restore();
}
