import { rr } from '../core/dom';
import { OUT, TAU, sh } from '../core/math';
/* ================= ART: humanoid details by gender and hair style ================= */
// Called from drawHumanoid (art/humanoid.ts). Hair style codes (look.hair):
//   0 short · 1 long · 2 ponytail · 3 bald · 7 buzz cut · 8 mohawk · 9 curly · 10 topknot  (male)
//   4 bob · 1 long · 2 ponytail · 5 braid · 6 bun · 11 pigtails · 9 curly · 12 pixie        (female)
// look.fem marks a female figure: a softer torso (narrower shoulders, fuller hips, same size),
// lashes, a linen top when bare-chested, and subtly shaped armor. look.stubble / look.beard give
// male facial hair.
type Ctx = CanvasRenderingContext2D;
type View = { up: boolean; side: boolean; diag: boolean; fd: boolean };

/** Hair behind the head and body: bob, braid and bun (long hair and ponytail are in humanoid.ts). */
export function hairBack(c: Ctx, L, hy: number, v: View, col: string) {
  if (L.hood || L.cowl) return;
  const { up, side, diag } = v;
  c.fillStyle = col;
  if (L.hair === 4) {
    // (also below a helmet)
    // bob: a rounded cut ending at the jaw
    const x0 = side ? -12 : diag ? (up ? -11 : -12.5) : -12.5,
      w = side ? 14 : diag ? 22 : 25;
    rr(c, x0, hy - 6, w, 16, 7, col);
  } else if (L.hair === 5 && !up && (side || diag)) {
    // braid hanging down the back: a tapering chain of plaits with a tie
    const bx = side ? -9 : diag ? (up ? -1 : -8) : 0;
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      c.ellipse(bx - (side ? k * 0.6 : 0), hy + 6 + k * 4.2, 3.4 - k * 0.3, 2.8, 0, 0, TAU);
      c.fillStyle = k % 2 ? sh(col, -0.12) : col;
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#c8423a';
    c.fillRect(bx - 2.2 - (side ? 3 : 0), hy + 25, 4.4, 2);
  } else if (L.hair === 9) {
    // curly: a halo of curls around the head (longer for women); under a helmet only the
    // curls below its rim show
    const n = L.fem ? 11 : 8,
      reach = L.fem ? 1.25 : 0.72; // how far round the sides the curls go (× π)
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 - Math.PI * reach + (k / (n - 1)) * Math.PI * reach * 2;
      if (L.helm && Math.sin(a) < -0.05) continue;
      c.beginPath();
      c.arc(Math.cos(a) * 9.8, hy + Math.sin(a) * 9.8 + (L.fem ? 1 : 0), 4.2, 0, TAU);
      c.fillStyle = k % 2 ? sh(col, -0.1) : col;
      c.fill();
      c.stroke();
    }
  } else if (L.hair === 11 && !L.hood) {
    // pigtails: two tails tied at the sides of the head
    for (const k of side ? [-1] : [-1, 1]) {
      const px = k * (side ? 9 : 12),
        tie = hy - 1;
      c.beginPath();
      c.ellipse(px + k * 1.5, tie + 7, 3.6, 7.5, k * -0.25, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.fillStyle = '#e0708a';
      c.beginPath();
      c.arc(px, tie, 2, 0, TAU);
      c.fill();
      c.stroke();
    }
  } else if ((L.hair === 6 || L.hair === 10) && !L.helm && !L.hat) {
    // bun (women) or topknot (men) on the crown of the head
    const r = L.hair === 10 ? 3.8 : 5.2,
      ky = L.hair === 10 ? hy - 11 : hy - 9.5;
    c.beginPath();
    c.arc(side ? -4 : 0, ky, r, 0, TAU);
    c.fill();
    c.stroke();
    c.strokeStyle = sh(col, -0.25);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(side ? -4 : 0, ky, r / 2, 0.4, 2.6);
    c.stroke();
    c.strokeStyle = OUT;
    if (L.hair === 10) {
      c.fillStyle = '#5a3a22';
      c.fillRect((side ? -4 : 0) - 2.5, ky + r - 1.5, 5, 1.8);
    }
  }
}
/**
 * Outline of long hair falling over the back, from the side or from behind. Its outer edges
 * leave the head exactly at the widest point of the head (where the head's edge is vertical),
 * so the head and the hair form one smooth silhouette; its top edge runs inside the head.
 * `dx` shifts it to line up with the head (the head is nudged in 3/4 views).
 */
function longPath(L, hy: number, v: View, dx = 0) {
  const p = new Path2D(),
    R = 10.5,
    bot = hy + (L.fem ? (v.side ? 23 : 24) : v.side ? 19 : 20),
    x = (n: number) => n + dx;
  if (v.side) {
    // from the back of the head over the shoulder; the inner edge tucks in toward the neck
    p.moveTo(x(-R), hy);
    p.quadraticCurveTo(x(-R), hy + 10, x(-11), bot - 3);
    p.quadraticCurveTo(x(-9), bot + 1, x(-6), bot - 1);
    p.quadraticCurveTo(x(-4), bot + 1, x(-2.5), bot - 3);
    p.quadraticCurveTo(x(-3), hy + 13, x(-2), hy + 9);
    p.lineTo(x(-4), hy - 4);
  } else {
    // a curtain whose sides flare very slightly toward an uneven tip
    const m = x(0);
    p.moveTo(x(-R), hy);
    p.lineTo(x(-6), hy - 6);
    p.lineTo(x(6), hy - 6);
    p.lineTo(x(R), hy);
    p.quadraticCurveTo(x(R), hy + 10, x(R + 0.8), bot - 4);
    p.quadraticCurveTo(x(R - 1.5), bot + 1, m + 3, bot - 1);
    p.quadraticCurveTo(m, bot + 2, m - 3, bot - 1);
    p.quadraticCurveTo(x(-R + 1.5), bot + 1, x(-R - 0.8), bot - 4);
    p.quadraticCurveTo(x(-R), hy + 10, x(-R), hy);
  }
  p.closePath();
  return p;
}
/**
 * After the head is drawn: long hair flows out of the head with no seam. The part of the head
 * inside the hanging hair (and its outline) is repainted in the hair colour, then the strands
 * are drawn over both.
 */
export function hairBlend(c: Ctx, L, hy: number, v: View, col: string) {
  if (L.hair !== 1 || L.hood || L.cowl || !(v.side || v.up)) return;
  const p = longPath(L, hy, v),
    bot = hy + (L.fem ? 23 : 19);
  c.save();
  c.clip(p);
  c.fillStyle = col;
  c.beginPath();
  c.arc(0, hy, 12, 0, TAU);
  c.fill();
  c.restore();
  // the hair's own outline only outside the head: no seam anywhere inside it
  c.save();
  c.beginPath();
  c.rect(-40, hy - 40, 80, 90);
  c.arc(0, hy, 10.5, 0, TAU);
  c.clip('evenodd');
  c.stroke(p);
  c.restore();
  c.strokeStyle = sh(col, -0.3);
  c.lineWidth = 1;
  const xs = v.side ? [-8.5, -5.5] : [-5.8, 0, 5.8];
  for (const [i, sx] of xs.entries()) {
    const k = v.side ? 0 : i - (xs.length - 1) / 2;
    c.beginPath();
    c.moveTo(sx, hy + 8);
    c.quadraticCurveTo(sx + k * 1.5 - (v.side ? 1 : 0), hy + 14, sx + k * 0.8, bot - 3);
    c.stroke();
  }
  c.strokeStyle = OUT;
}
/** Shaved sides for the buzz cut and mohawk: the hair is a faint shadow over the skin. */
export const shaved = (L) => L.hair === 7 || L.hair === 8;
/**
 * Curly hair over the head: from behind the whole head is curls, from the side and in 3/4 the
 * back and top of the head, from the front a curly fringe along the hairline.
 */
function curlsOver(c: Ctx, L, hy: number, v: View, col: string) {
  const R = 10.5,
    pts: number[][] = [];
  for (let row = -3; row <= 3; row++)
    for (let q = -3; q <= 3; q++) {
      const x = q * 4.6 + (row % 2 ? 2.3 : 0),
        y = row * 4;
      if (x * x + y * y > (R + 0.5) * (R + 0.5)) continue;
      let keep: boolean;
      if (v.up && !v.diag) keep = true;
      else if (v.up)
        keep = x < 5 || y < -4; // back 3/4: most of the head
      else if (v.side)
        keep = (x < 0 && y < 6) || y < -6; // back half and the crown
      else if (v.diag)
        keep = (x < -4 && y < 3) || y < -6.5; // front 3/4: behind the ear, the crown
      else keep = y < -5.5; // front: fringe along the hairline
      if (keep) pts.push([x, y]);
    }
  pts.sort((a, b) => a[1] - b[1]);
  // edged in a darker hair tone: black edges on every curl read as a bunch of grapes
  c.lineWidth = 1;
  c.strokeStyle = sh(col, -0.4);
  for (const [x, y] of pts) {
    c.beginPath();
    c.arc(x, hy + y, 3.3, 0, TAU);
    c.fillStyle = (x + y) % 3 < 1.5 ? sh(col, -0.08) : col;
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.beginPath();
    c.arc(x - 1, hy + y - 1, 1.1, 0, TAU);
    c.fill();
  }
  c.strokeStyle = OUT;
}
/** On top of the finished head: the mohawk crest, curls and the pixie's swept fringe. */
export function hairTop(c: Ctx, L, hy: number, v: View, col: string, lw: number) {
  if (L.helm || L.hood || L.cowl || L.hat) return;
  c.lineWidth = lw;
  if (L.hair === 8) {
    // a crest of spikes along the top of the head
    c.beginPath();
    if (v.side) {
      // seen from the side: spikes rising from a strip along the top of the skull
      const A0 = Math.PI * 1.2,
        A1 = Math.PI * 1.72,
        n = 4;
      c.moveTo(Math.cos(A0) * 8, hy + Math.sin(A0) * 8);
      for (let k = 0; k < n; k++) {
        const a = A0 + ((k + 0.5) / n) * (A1 - A0),
          h = 15 + (k === 1 ? 1.5 : 0);
        c.lineTo(Math.cos(a - 0.12) * 10, hy + Math.sin(a - 0.12) * 10);
        // tips sweep back a little (toward -x)
        c.lineTo(Math.cos(a - 0.18) * h, hy + Math.sin(a - 0.18) * h);
        c.lineTo(Math.cos(a + 0.12) * 10, hy + Math.sin(a + 0.12) * 10);
      }
      c.lineTo(Math.cos(A1) * 8, hy + Math.sin(A1) * 8);
      for (let a = A1; a >= A0; a -= 0.15) c.lineTo(Math.cos(a) * 7, hy + Math.sin(a) * 7);
    } else {
      const hw = v.diag ? 2.4 : 3.2;
      c.moveTo(-hw, hy - 7);
      c.lineTo(-hw - 0.5, hy - 14);
      c.lineTo(-hw * 0.3, hy - 11.5);
      c.lineTo(0, hy - 17);
      c.lineTo(hw * 0.3, hy - 11.5);
      c.lineTo(hw + 0.5, hy - 14);
      c.lineTo(hw, hy - 7);
      c.quadraticCurveTo(0, hy - 9.5, -hw, hy - 7);
    }
    c.closePath();
    c.fillStyle = col;
    c.fill();
    c.stroke();
  } else if (L.hair === 9) {
    curlsOver(c, L, hy, v, col);
  } else if (L.hair === 12 && !v.up) {
    // pixie: a short swept fringe over the forehead
    const E = v.fd ? 3 : 0;
    c.beginPath();
    if (v.side) {
      c.moveTo(-2, hy - 10);
      c.quadraticCurveTo(7, hy - 11, 9.5, hy - 3);
      c.quadraticCurveTo(5, hy - 6, 1, hy - 5);
    } else {
      c.moveTo(-8 + E, hy - 6);
      c.quadraticCurveTo(-2 + E, hy - 12, 7 + E, hy - 7);
      c.quadraticCurveTo(4 + E, hy - 2.5, -1 + E, hy - 3.5);
      c.quadraticCurveTo(-5 + E, hy - 4, -8 + E, hy - 6);
    }
    c.closePath();
    c.fillStyle = col;
    c.fill();
    // a soft darker edge like the other hair inside the head (a black line reads as a band)
    c.strokeStyle = sh(col, -0.3);
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = OUT;
  }
}
/** Hair in front of the body: the braid over the shoulder (front view) or down the back (rear views). */
export function hairFront(c: Ctx, L, hy: number, v: View, col: string, lw: number) {
  if (L.hood || L.cowl) return;
  c.lineWidth = lw;
  if (L.hair === 1 && (v.side || v.up)) {
    // long hair falling over the back (side and rear views); strands are added by hairBlend
    // drawn before the head, which is nudged by +1 in 3/4 views: line up with it
    const p = longPath(L, hy, v, v.diag ? 1 : 0);
    c.fillStyle = col;
    c.fill(p);
    c.stroke(p);
    return;
  }
  if (L.hair === 2 && v.up) {
    // ponytail seen from behind: tied at the nape, hanging over the back
    const bx = v.diag ? -1 : 0;
    c.beginPath();
    c.ellipse(bx, hy + 13, 3.6, 7.5, 0, 0, TAU);
    c.fillStyle = col;
    c.fill();
    c.stroke();
    c.fillStyle = sh(col, -0.25);
    c.fillRect(bx - 2.4, hy + 6.5, 4.8, 2);
    return;
  }
  if (L.hair !== 5) return;
  if (v.up) {
    // seen from behind: the braid hangs down the middle of the back
    const bx = v.diag ? -1 : 0;
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      c.ellipse(bx, hy + 9 + k * 4.2, 3.4 - k * 0.3, 2.8, 0, 0, TAU);
      c.fillStyle = k % 2 ? sh(col, -0.12) : col;
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#c8423a';
    c.fillRect(bx - 2.2, hy + 28, 4.4, 2);
    return;
  }
  if (v.side || v.diag) return;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    c.ellipse(7.5 + k * 0.3, hy + 8 + k * 4, 2.9 - k * 0.25, 2.5, 0.2, 0, TAU);
    c.fillStyle = k % 2 ? sh(col, -0.12) : col;
    c.fill();
    c.stroke();
  }
  c.fillStyle = '#c8423a';
  c.fillRect(6.2, hy + 22, 3.8, 1.8);
}
/** Side locks framing the face (bob and long hair, front and 3/4 views), inside the head clip. */
export function hairLocks(c: Ctx, L, hy: number, v: View, HR: number) {
  if (!L.fem || !(L.hair === 4 || L.hair === 1) || v.up || v.side) return;
  const E = v.fd ? 3 : 0;
  for (const k of v.fd ? [-1] : [-1, 1]) {
    c.beginPath();
    c.moveTo(k * HR, hy - 4);
    c.quadraticCurveTo(k * (HR - 3.5) + E * 0.3, hy + 2, k * (HR - 1.5), hy + HR);
    c.lineTo(k * HR, hy + HR);
    c.closePath();
    c.fill();
  }
}

/** Female torso: narrower shoulders, a waist and fuller hips (inside the torso transform). */
/** Linen top worn when bare-chested (inside the torso transform). */
/** Subtle chest shaping on armor (inside the torso transform, front views only). */
/** Eyelashes: a small flick at the outer top corner of each eye (front and 3/4 views). */
export function lashes(c: Ctx, hy: number, ex1: number, ex2: number, side: boolean) {
  c.strokeStyle = OUT;
  c.lineWidth = 1;
  c.beginPath();
  if (side) {
    c.moveTo(6.4, hy + 0.2);
    c.lineTo(7.6, hy - 0.5);
  } else {
    c.moveTo(ex1 - 1.1, hy + 0.3);
    c.lineTo(ex1 - 2.2, hy - 0.4);
    c.moveTo(ex2 + 1.1, hy + 0.3);
    c.lineTo(ex2 + 2.2, hy - 0.4);
  }
  c.stroke();
}
/** A light shadow of stubble along the jawline and chin (inside the head clip). */
export function stubble(c: Ctx, hy: number, col: string, side: boolean, E: number) {
  c.save();
  c.fillStyle = col;
  c.globalAlpha *= 0.22;
  c.beginPath();
  if (side) {
    c.moveTo(-1, hy + 5);
    c.quadraticCurveTo(7, hy + 6, 10, hy + 3);
    c.lineTo(11, hy + 12);
    c.lineTo(-1, hy + 12);
  } else {
    // a crescent under the mouth: the jaw below a curve through the cheeks
    c.moveTo(-11 + E, hy + 3);
    c.quadraticCurveTo(E, hy + 12, 11 + E, hy + 3);
    c.lineTo(11 + E, hy + 12);
    c.lineTo(-11 + E, hy + 12);
  }
  c.closePath();
  c.fill();
  c.restore();
}
