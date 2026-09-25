import { shadow } from '../core/dom';
import { OUT, TAU, sh } from '../core/math';
/* ================= ART: wolves ================= */
// A lean wolf in three facings (side, front, back): two-tone fur (darker back, pale belly and
// muzzle), a fur ruff around the neck, a bushy light-tipped tail and a trotting leg cycle.
// Frost wolves add ice spikes along the back and icy eyes.
type Ctx = CanvasRenderingContext2D;
type Pal = { fur: string; back: string; pale: string; dark: string; eye: string; ice: boolean };

/** One leg hanging from a hip/shoulder at (x, y): rotated by `a`, with a paw at the end. */
function leg(c: Ctx, x: number, y: number, len: number, a: number, col: string, w = 5.6) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.beginPath();
  c.moveTo(-w / 2, 0);
  c.lineTo(-w * 0.35, len - 1);
  c.lineTo(w * 0.35, len - 1);
  c.lineTo(w / 2, 0);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(0.8, len, w * 0.62, 2.3, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.restore();
}
/** Jagged fur edge: a closed zig-zag between an inner and an outer ellipse. */
function furRing(c: Ctx, x: number, y: number, rx: number, ry: number, n: number, k = 0.72) {
  c.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * TAU,
      r = i % 2 ? k : 1;
    c.lineTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r);
  }
  c.closePath();
}
/** Bushy tail from its root (0, 0), curling back and up; `wag` swings the tip. */
function tail(c: Ctx, p: Pal, wag: number) {
  const tp = new Path2D();
  tp.moveTo(0, -2);
  tp.quadraticCurveTo(-8, -6 + wag * 0.3, -15, -4 + wag);
  tp.quadraticCurveTo(-19, -1 + wag, -17, 3 + wag);
  tp.quadraticCurveTo(-13, 5 + wag * 0.6, -9, 3 + wag * 0.4);
  tp.quadraticCurveTo(-4, 2, 0, 3);
  tp.closePath();
  c.fillStyle = p.fur;
  c.fill(tp);
  // light tip
  c.save();
  c.clip(tp);
  c.fillStyle = p.pale;
  c.beginPath();
  c.ellipse(-17, wag, 4.5, 6, 0, 0, TAU);
  c.fill();
  c.restore();
  c.stroke(tp);
}
function eye(c: Ctx, x: number, y: number, p: Pal, angry: boolean, dir = 1) {
  c.fillStyle = p.eye;
  c.beginPath();
  c.ellipse(x, y, 2, 1.5, dir * -0.25, 0, TAU);
  c.fill();
  c.lineWidth = 1.2;
  c.stroke();
  c.fillStyle = OUT;
  c.beginPath();
  c.ellipse(x + dir * 0.3, y, 0.6, 1.3, 0, 0, TAU);
  c.fill();
  if (angry) {
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - dir * 2.6, y - 3.2);
    c.lineTo(x + dir * 2.4, y - 1.6);
    c.stroke();
  }
}
function ear(c: Ctx, x: number, y: number, p: Pal, lean: number, col = p.fur) {
  c.beginPath();
  c.moveTo(x - 3, y);
  c.lineTo(x + lean, y - 8.5);
  c.lineTo(x + 3, y);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  c.fillStyle = sh(p.dark, 0.15);
  c.beginPath();
  c.moveTo(x - 1.4, y - 0.8);
  c.lineTo(x + lean * 0.8, y - 6.4);
  c.lineTo(x + 1.4, y - 0.8);
  c.closePath();
  c.fill();
}
function iceSpikes(c: Ctx, pts: number[][]) {
  c.fillStyle = '#e8fbff';
  for (const [x, y, h] of pts) {
    c.beginPath();
    c.moveTo(x - 2.2, y);
    c.lineTo(x + 0.6, y - h);
    c.lineTo(x + 2.2, y);
    c.closePath();
    c.fill();
    c.lineWidth = 1.4;
    c.stroke();
  }
}

/* ---------- side view (facing +x) ---------- */
function side(c: Ctx, e, t: number, p: Pal, sw: number, bob: number) {
  const lw = c.lineWidth,
    wind = e.wind > 0,
    gait = sw * 0.55;
  // far legs, darker
  leg(c, -11, -14 + bob, 13, -gait, sh(p.fur, -0.3), 4.5);
  leg(c, 8, -14 + bob, 13, gait, sh(p.fur, -0.3), 4.5);
  c.save();
  c.translate(0, bob);
  // tail
  c.save();
  c.translate(-15, -19);
  c.rotate(-0.25);
  tail(c, p, Math.sin(t * 5 + e.x * 0.01) * 1.5 + sw * 1.5);
  c.restore();
  // body: deep chest, tucked waist, rounded rump
  const body = new Path2D();
  body.moveTo(-17, -14);
  body.quadraticCurveTo(-19, -22, -12, -23);
  body.quadraticCurveTo(-3, -22, 4, -25);
  body.quadraticCurveTo(12, -27, 14, -18);
  body.quadraticCurveTo(14, -10, 7, -10);
  body.quadraticCurveTo(0, -12, -6, -12);
  body.quadraticCurveTo(-14, -9, -17, -14);
  body.closePath();
  c.fillStyle = p.fur;
  c.fill(body);
  c.save();
  c.clip(body);
  // pale belly and chest
  c.fillStyle = p.pale;
  c.beginPath();
  c.ellipse(4, -9, 13, 5, -0.15, 0, TAU);
  c.fill();
  // darker saddle along the back
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(-4, -27, 17, 6.5, 0.08, 0, TAU);
  c.fill();
  // fur strokes
  c.strokeStyle = 'rgba(0,0,0,.18)';
  c.lineWidth = 1.2;
  for (const [x, y] of [
    [-9, -18],
    [-3, -17],
    [3, -19],
  ]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2.5, y + 2.5);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = lw;
  c.stroke(body);
  if (p.ice)
    iceSpikes(c, [
      [-10, -22.5, 4],
      [-4, -22.5, 5],
      [2, -24, 5],
    ]);
  c.restore();
  // near legs, with the hind thigh
  leg(c, -11, -14 + bob, 13, gait, p.fur);
  leg(c, 8, -14 + bob, 13, -gait, p.fur);
  c.save();
  c.translate(0, bob);
  c.fillStyle = p.fur;
  c.beginPath();
  c.ellipse(-11, -16, 5.5, 5, 0.3, -0.2, Math.PI + 0.9);
  c.fill();
  c.stroke();
  // head, lowered and pushed forward while winding up a bite
  c.save();
  c.translate(wind ? 18 : 17, wind ? -21 : -24);
  c.rotate(wind ? 0.15 : 0);
  // neck ruff
  c.fillStyle = p.pale;
  furRing(c, -5, 3, 7.5, 8, 7);
  c.fill();
  c.stroke();
  ear(c, -4.5, -4, p, -1.5, sh(p.fur, -0.3)); // far ear
  c.fillStyle = p.fur;
  c.beginPath();
  c.ellipse(0, 0, 7.5, 6.5, 0, 0, TAU);
  c.fill();
  c.stroke();
  // snout
  c.beginPath();
  c.moveTo(3, -3.2);
  c.quadraticCurveTo(10, -3, 13.5, -1);
  c.quadraticCurveTo(14.5, 1.5, 12, 2.5);
  c.lineTo(wind ? 9 : 5, wind ? 5 : 4);
  c.quadraticCurveTo(3, 4.5, 3, 2);
  c.closePath();
  c.fillStyle = p.pale;
  c.fill();
  c.stroke();
  if (wind) {
    // open jaw with fangs
    c.fillStyle = '#7a2a34';
    c.beginPath();
    c.moveTo(12, 2.5);
    c.lineTo(5, 3.6);
    c.lineTo(9, 5);
    c.closePath();
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(10.5, 2.6);
    c.lineTo(10, 5);
    c.lineTo(9, 2.8);
    c.fill();
  }
  // nose
  c.fillStyle = OUT;
  c.beginPath();
  c.ellipse(13.2, -1.1, 1.9, 1.5, 0, 0, TAU);
  c.fill();
  // mouth line
  if (!wind) {
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(12, 1.8);
    c.quadraticCurveTo(8, 2.6, 5.5, 1.6);
    c.stroke();
    c.lineWidth = lw;
  }
  ear(c, -1.5, -4.5, p, 0.5);
  eye(c, 3.2, -1.8, p, !!e.aggro);
  c.restore();
  c.restore();
}

/* ---------- front view (facing the camera) ---------- */
function front(c: Ctx, e, t: number, p: Pal, sw: number, bob: number) {
  const lw = c.lineWidth,
    wind = e.wind > 0;
  // hind legs behind
  leg(c, -6, -10, 10, 0, sh(p.fur, -0.3), 4.5);
  leg(c, 6, -10, 10, 0, sh(p.fur, -0.3), 4.5);
  c.save();
  c.translate(0, bob);
  // tail swishing out to one side
  c.save();
  c.translate(8, -18);
  c.scale(-1, 1);
  c.rotate(-0.6);
  tail(c, p, Math.sin(t * 5 + e.x * 0.01) * 2);
  c.restore();
  // body
  c.fillStyle = p.fur;
  c.beginPath();
  c.ellipse(0, -16, 10, 8.5, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, -21, 8, 3.4, 0, Math.PI, 0);
  c.fill();
  c.restore();
  // front legs, stepping alternately
  leg(c, -4.5, -13 + bob, 13 - Math.max(0, sw) * 2.5, 0, p.fur);
  leg(c, 4.5, -13 + bob, 13 - Math.max(0, -sw) * 2.5, 0, p.fur);
  c.save();
  c.translate(0, bob);
  // ruff and chest
  c.fillStyle = p.pale;
  furRing(c, 0, -21, 9.5, 7, 8);
  c.fill();
  c.stroke();
  // head
  c.save();
  c.translate(0, wind ? -25 : -28);
  ear(c, -5.5, -4.5, p, -2);
  ear(c, 5.5, -4.5, p, 2);
  c.fillStyle = p.fur;
  c.beginPath();
  c.moveTo(-8.5, -3);
  c.quadraticCurveTo(-8, -8, 0, -8);
  c.quadraticCurveTo(8, -8, 8.5, -3);
  c.quadraticCurveTo(9, 3, 4, 6);
  c.lineTo(-4, 6);
  c.quadraticCurveTo(-9, 3, -8.5, -3);
  c.closePath();
  c.fill();
  c.stroke();
  // cheek fur tufts
  c.fillStyle = p.pale;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.moveTo(k * 8.6, -1);
    c.lineTo(k * 10.5, 2);
    c.lineTo(k * 7.5, 3);
    c.lineTo(k * 9, 5);
    c.lineTo(k * 5, 5.5);
    c.closePath();
    c.fill();
    c.stroke();
  }
  // muzzle
  c.beginPath();
  c.ellipse(0, 2.5, 4.4, 4, 0, 0, TAU);
  c.fillStyle = p.pale;
  c.fill();
  c.stroke();
  c.fillStyle = OUT;
  c.beginPath();
  c.ellipse(0, 0.6, 2.1, 1.5, 0, 0, TAU);
  c.fill();
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, 2);
  c.lineTo(0, 3.6);
  c.moveTo(-2.4, 4.4);
  c.quadraticCurveTo(0, 3.2, 2.4, 4.4);
  c.stroke();
  if (wind) {
    c.fillStyle = '#fff';
    for (const k of [-1, 1]) {
      c.beginPath();
      c.moveTo(k * 1.8, 4.2);
      c.lineTo(k * 1.4, 6.4);
      c.lineTo(k * 0.8, 4.2);
      c.fill();
    }
  }
  c.lineWidth = lw;
  eye(c, -3.6, -2.4, p, !!e.aggro, -1);
  eye(c, 3.6, -2.4, p, !!e.aggro, 1);
  c.restore();
  if (p.ice)
    iceSpikes(c, [
      [-4, -32, 4],
      [0, -33.5, 5],
      [4, -32, 4],
    ]);
  c.restore();
}

/* ---------- back view (running away) ---------- */
function back(c: Ctx, e, t: number, p: Pal, sw: number, bob: number) {
  // front legs, far away
  leg(c, -4.5, -12, 11, 0, sh(p.fur, -0.3), 4.5);
  leg(c, 4.5, -12, 11, 0, sh(p.fur, -0.3), 4.5);
  c.save();
  c.translate(0, bob);
  // head seen from behind
  c.save();
  c.translate(0, -27);
  ear(c, -5, -4, p, -1.5, p.back);
  ear(c, 5, -4, p, 1.5, p.back);
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, 0, 8, 7, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.restore();
  // body with the dark saddle and ruff edge
  c.fillStyle = p.pale;
  furRing(c, 0, -21, 9.5, 5.5, 8);
  c.fill();
  c.stroke();
  c.fillStyle = p.fur;
  c.beginPath();
  c.ellipse(0, -15.5, 10.5, 8.5, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = p.back;
  c.beginPath();
  c.ellipse(0, -19, 7, 4.5, 0, 0, TAU);
  c.fill();
  if (p.ice)
    iceSpikes(c, [
      [-3.5, -21, 4],
      [3.5, -21, 4],
    ]);
  c.restore();
  // hind legs toward the camera, with thighs
  leg(c, -5.5, -12 + bob, 12 - Math.max(0, sw) * 2.5, 0, p.fur);
  leg(c, 5.5, -12 + bob, 12 - Math.max(0, -sw) * 2.5, 0, p.fur);
  c.save();
  c.translate(0, bob);
  c.fillStyle = p.fur;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.ellipse(k * 6, -12, 4.5, 5, 0, Math.PI * 0.9, Math.PI * 2.1);
    c.fill();
    c.stroke();
  }
  // tail, raised and wagging
  c.save();
  c.translate(2, -16);
  c.rotate(2.1 + Math.sin(t * 6 + e.x * 0.01) * 0.3);
  tail(c, p, 0);
  c.restore();
  c.restore();
}

/** Draw a wolf or frost wolf (`v`) with fur colour `col` (already flashed/frozen). */
export function drawWolf(c: Ctx, e, t: number, v: string, col: string) {
  const s = e.sc,
    ice = v === 'icewolf',
    p: Pal = {
      fur: col,
      back: sh(col, -0.22),
      pale: sh(col, ice ? 0.3 : 0.42),
      dark: sh(col, -0.45),
      eye: ice ? '#7ef0ff' : '#ffd23a',
      ice,
    },
    moving = e.moving,
    sw = Math.sin(e.walk) * (moving ? 1 : 0),
    bob = moving ? -Math.abs(Math.cos(e.walk)) * 1.3 : Math.sin(t * 2 + e.x) * 0.4,
    ax = Math.abs(e.dx || 0),
    ay = Math.abs(e.dy || 0),
    view = ax >= ay * 0.8 ? 'side' : e.dy > 0 ? 'front' : 'back';
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, (view === 'side' ? 18 : 12) * s, 5 * s);
  c.scale(s * (view === 'side' && e.dx < 0 ? -1 : 1), s);
  c.lineWidth = 2.2 / Math.sqrt(s);
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (e.wind > 0 && view === 'side') c.translate(-3, 0);
  if (view === 'side') side(c, e, t, p, sw, bob);
  else if (view === 'front') front(c, e, t, p, sw, bob);
  else back(c, e, t, p, sw, bob);
  c.restore();
}
