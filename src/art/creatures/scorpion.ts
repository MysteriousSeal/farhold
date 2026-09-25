import { shadow } from '../../core/dom';
import { OUT, TAU, sh } from '../../core/math';
/* ================= ART: scorpions ================= */
// An armoured scorpion in three facings (side, front, back): a carapace with eye clusters,
// a segmented abdomen of overlapping plates, jointed legs that scuttle, big pincers that snap
// on attack, and a segmented tail arching over the back with a glossy stinger that strikes.
type Ctx = CanvasRenderingContext2D;
type Pal = { shell: string; plate: string; rim: string; hi: string; dark: string };
const STING = '#3a2430';

/** Jointed leg: hip → raised knee → foot, drawn as an outlined stroke. */
function leg(c: Ctx, x: number, y: number, kx: number, ky: number, fx: number, col: string) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(kx, ky);
  c.lineTo(fx, 0);
  c.strokeStyle = OUT;
  c.lineWidth = 4.4;
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = 2.2;
  c.stroke();
  c.strokeStyle = OUT;
}
/** Shell plate: filled ellipse with a dark outline, a lighter top rim and a darker lower rim. */
function plate(c: Ctx, x: number, y: number, rx: number, ry: number, p: Pal, col = p.shell) {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = p.rim;
  c.beginPath();
  c.ellipse(x, y + ry * 1.05, rx * 1.05, ry * 0.5, 0, 0, TAU);
  c.fill();
  c.fillStyle = p.hi;
  c.beginPath();
  c.ellipse(x - rx * 0.25, y - ry * 0.5, rx * 0.5, ry * 0.22, -0.2, 0, TAU);
  c.fill();
  c.restore();
  c.lineWidth = 1.8;
  c.stroke();
}
/** Pincer at (0, 0) pointing +x; `open` 0..1 spreads the movable finger. */
function pincer(c: Ctx, p: Pal, open: number, col = p.shell) {
  const lw = c.lineWidth;
  // movable (lower) finger
  c.save();
  c.translate(3.5, 1.2);
  c.rotate(0.15 + open * 0.55);
  c.beginPath();
  c.moveTo(0, -1);
  c.quadraticCurveTo(4, 0.5, 6.5, -0.6);
  c.quadraticCurveTo(4, 2.6, 0, 1.6);
  c.closePath();
  c.fillStyle = sh(col, -0.12);
  c.fill();
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();
  // hand (chela) with the fixed upper finger
  c.beginPath();
  c.moveTo(-4.5, 0);
  c.quadraticCurveTo(-4.5, -4.2, 0, -4.2);
  c.quadraticCurveTo(5, -4.4, 10, -1.8);
  c.quadraticCurveTo(6, -0.9, 3.5, 0.2);
  c.quadraticCurveTo(3, 3.6, 0, 3.6);
  c.quadraticCurveTo(-4.5, 3.6, -4.5, 0);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = p.hi;
  c.beginPath();
  c.ellipse(-1, -2.4, 3, 1, -0.1, 0, TAU);
  c.fill();
  c.restore();
  c.lineWidth = 1.8;
  c.stroke();
  // teeth along the fixed finger
  c.fillStyle = OUT;
  for (const x of [5, 7]) {
    c.beginPath();
    c.moveTo(x, -1.5);
    c.lineTo(x + 0.6, -0.5);
    c.lineTo(x + 1.2, -1.2);
    c.fill();
  }
  c.lineWidth = lw;
}
/** Tail as chained segments from (x, y) along angles `angs`; returns the tip and last angle. */
function tail(c: Ctx, x: number, y: number, angs: number[], p: Pal, seg = 5.4) {
  const pts: number[][] = [];
  let px = x,
    py = y;
  for (const a of angs) {
    px += Math.cos(a) * seg;
    py += Math.sin(a) * seg;
    pts.push([px, py]);
  }
  pts.forEach(([sx, sy], i) =>
    plate(c, sx, sy, 4.2 - i * 0.3, 3.6 - i * 0.2, p, sh(p.shell, -0.04 * i)),
  );
  return { x: px, y: py, a: angs[angs.length - 1] };
}
/** Venom bulb and curved stinger at (x, y), pointing along angle `a`. */
function stinger(c: Ctx, x: number, y: number, a: number, p: Pal, aggro: boolean) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  plate(c, 3, 0, 4.2, 3.4, p, sh(p.shell, -0.12));
  c.beginPath();
  c.moveTo(5.5, -2);
  c.quadraticCurveTo(12, -1.5, 12.5, 5);
  c.quadraticCurveTo(9, 1.8, 5.5, 2);
  c.closePath();
  c.fillStyle = STING;
  c.fill();
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath();
  c.ellipse(8.5, -0.6, 2, 0.6, 0.3, 0, TAU);
  c.fill();
  if (aggro) {
    c.fillStyle = '#b8ff6a';
    c.beginPath();
    c.arc(12.4, 6.2, 1.1, 0, TAU);
    c.fill();
  }
  c.restore();
}
function eyes(c: Ctx, x: number, y: number, aggro: boolean) {
  c.fillStyle = aggro ? '#ff4030' : OUT;
  for (const [ex, ey, r] of [
    [x, y, 1.3],
    [x - 2.6, y + 0.4, 1],
    [x + 2.1, y + 0.8, 0.8],
  ]) {
    c.beginPath();
    c.arc(ex, ey, r, 0, TAU);
    c.fill();
  }
}

/* ---------- side view (facing +x) ---------- */
function side(c: Ctx, e, t: number, p: Pal, w: number, strike: number, open: number) {
  const lw = c.lineWidth,
    step = (i: number, k: number) => Math.sin(w * 1.6 + i * 1.3 + k * Math.PI) * 2.2;
  // far legs
  for (let i = 0; i < 4; i++) {
    // legs fan out: the front pair reaches forward, the back pair backward
    const x = -3 + i * 3.6,
      f = (i - 1.5) * 1,
      s = step(i, 1);
    leg(c, x, -8, x + f * 3.5 + s * 0.4, -14, x + f * 8.5 + s, p.dark);
  }
  // far pincer
  c.save();
  c.translate(13, -10.5);
  c.rotate(-0.12 + Math.sin(t * 3) * 0.06);
  c.fillStyle = sh(p.shell, -0.25);
  c.beginPath();
  c.ellipse(3, 0, 4, 2, 0, 0, TAU);
  c.fill();
  c.lineWidth = 1.6;
  c.stroke();
  c.translate(10, -0.5);
  pincer(c, p, open, sh(p.shell, -0.25));
  c.restore();
  // tail arching over the back; a strike curls it forward
  const k = strike * 0.42,
    tip = tail(c, -12, -8, [-2.55 + k, -2.05 + k, -1.5 + k, -0.95 + k * 1.2, -0.4 + k * 1.4], p);
  // abdomen: overlapping plates, rear to front
  for (let i = 0; i < 4; i++)
    plate(c, -10 + i * 4.6, -8.5 - i * 0.3, 5.6, 4.8, p, i % 2 ? p.plate : p.shell);
  // carapace (head)
  plate(c, 10, -9.5, 7.5, 5.2, p);
  eyes(c, 13, -12.6, !!e.aggro);
  stinger(c, tip.x, tip.y, tip.a + 0.2 + strike * 0.5, p, !!e.aggro);
  // near legs
  for (let i = 0; i < 4; i++) {
    const x = -2 + i * 3.6,
      f = (i - 1.5) * 1,
      s = step(i, 0);
    leg(c, x, -6, x + f * 4 + s * 0.4, -11.5, x + f * 9.5 + 1 + s, p.shell);
  }
  // near pincer
  c.save();
  c.translate(14, -7);
  c.rotate(0.08 + Math.sin(t * 3 + 1) * 0.06);
  c.fillStyle = p.shell;
  c.beginPath();
  c.ellipse(3.5, 0, 4.5, 2.4, 0, 0, TAU);
  c.fill();
  c.lineWidth = 1.8;
  c.stroke();
  c.translate(11.5, 0);
  pincer(c, p, open);
  c.restore();
  c.lineWidth = lw;
}

/* ---------- front view (facing the camera) ---------- */
function front(c: Ctx, e, t: number, p: Pal, w: number, strike: number, open: number) {
  const lw = c.lineWidth;
  // legs splayed to both sides
  for (let i = 0; i < 4; i++)
    for (const s of [-1, 1]) {
      const st = Math.sin(w * 1.6 + i * 1.3 + (s > 0 ? Math.PI : 0)) * 1.8,
        y = -7 - i * 1.3;
      leg(c, s * 6, y, s * (13 + i), y - 5, s * (16 + i * 1.5) + st, i < 2 ? p.shell : p.dark);
    }
  // tail rising behind the body and curling over it toward the camera
  const k = strike * 0.5,
    tip = tail(c, 0, -11, [-1.62, -1.57, -1.5 - k * 0.3, -1.2 + k, -0.4 + k * 1.6], p, 4.8);
  // abdomen and carapace
  plate(c, 0, -10.5, 9, 6, p, p.plate);
  plate(c, 0, -8, 8, 5.5, p);
  eyes(c, 0, -10, !!e.aggro);
  stinger(c, tip.x, tip.y, tip.a + 0.6 + strike * 0.4, p, !!e.aggro);
  // pincers reaching forward and out
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * 6, -5);
    c.scale(s, 1);
    c.rotate(0.5 + Math.sin(t * 3 + s) * 0.06);
    c.fillStyle = p.shell;
    c.beginPath();
    c.ellipse(3, 0, 4, 2.3, 0, 0, TAU);
    c.fill();
    c.lineWidth = 1.8;
    c.stroke();
    c.translate(10, 0);
    pincer(c, p, open);
    c.restore();
  }
  c.lineWidth = lw;
}

/* ---------- back view (scuttling away) ---------- */
function back(c: Ctx, e, t: number, p: Pal, w: number, strike: number, open: number) {
  const lw = c.lineWidth;
  // pincers ahead of it, far away
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * 7, -13);
    c.scale(s, 1);
    c.rotate(-0.5);
    c.translate(8, 0);
    pincer(c, p, open, sh(p.shell, -0.25));
    c.restore();
  }
  for (let i = 0; i < 4; i++)
    for (const s of [-1, 1]) {
      const st = Math.sin(w * 1.6 + i * 1.3 + (s > 0 ? Math.PI : 0)) * 1.8,
        y = -10 + i * 1.2;
      leg(c, s * 6, y, s * (13 + i), y - 5, s * (16 + i * 1.5) + st, i > 1 ? p.shell : p.dark);
    }
  plate(c, 0, -13, 7.5, 5, p);
  // abdomen plates toward the camera
  for (let i = 0; i < 4; i++)
    plate(c, 0, -11 + i * 2.2, 8.5 - i * 0.5, 4.6, p, i % 2 ? p.plate : p.shell);
  // tail rising from the rear and arching away over the back
  const k = strike * 0.35,
    tip = tail(c, 0, -3, [-1.57, -1.6, -1.72 - k, -1.95 - k, -2.3 - k], p, 5);
  stinger(c, tip.x, tip.y, tip.a - 0.3, p, !!e.aggro);
  c.lineWidth = lw;
}

/** Draw a scorpion with shell colour `col` (already flashed/frozen). */
export function drawScorpion(c: Ctx, e, t: number, col: string) {
  const s = e.sc,
    p: Pal = {
      shell: col,
      plate: sh(col, -0.1),
      rim: sh(col, -0.16),
      hi: 'rgba(255,255,255,.35)',
      dark: sh(col, -0.35),
    },
    w = e.moving ? e.walk : 0,
    strike = e.wind > 0 ? 1 - e.wind / 0.35 : e.swing > 0 ? 1 : 0,
    open = Math.max(strike, Math.sin(t * 3 + e.x) * 0.5 + 0.5) * (e.aggro ? 1 : 0.4),
    ax = Math.abs(e.dx || 0),
    ay = Math.abs(e.dy || 0),
    view = ax >= ay * 0.8 ? 'side' : e.dy > 0 ? 'front' : 'back';
  c.save();
  c.translate(e.x, e.y);
  shadow(c, 0, 0, (view === 'side' ? 20 : 17) * s, 5.5 * s);
  c.scale(s * (view === 'side' && e.dx < 0 ? -1 : 1), s);
  c.lineWidth = 2.2 / Math.sqrt(s);
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (view === 'side') side(c, e, t, p, w, strike, open);
  else if (view === 'front') front(c, e, t, p, w, strike, open);
  else back(c, e, t, p, w, strike, open);
  c.restore();
}
