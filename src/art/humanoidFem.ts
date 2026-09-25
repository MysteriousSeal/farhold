import { rr } from '../core/dom';
import { OUT, TAU, sh } from '../core/math';
/* ================= ART: humanoid details by gender and hair style ================= */
// Called from drawHumanoid (art/humanoid.ts). Hair style codes (look.hair):
//   0 short · 1 long · 2 ponytail · 3 bald          (male list)
//   4 bob · 1 long · 2 ponytail · 5 braid · 6 bun   (female list)
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
  if (L.hair === 4 && !L.helm) {
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
  } else if (L.hair === 6 && !L.helm && !L.hat) {
    // bun on the crown of the head
    c.beginPath();
    c.arc(side ? -4 : 0, hy - 9.5, 5.2, 0, TAU);
    c.fill();
    c.stroke();
    c.strokeStyle = sh(col, -0.25);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(side ? -4 : 0, hy - 9.5, 2.6, 0.4, 2.6);
    c.stroke();
    c.strokeStyle = OUT;
  }
}
/** Hair in front of the body: the braid over the shoulder (front view) or down the back (rear views). */
export function hairFront(c: Ctx, L, hy: number, v: View, col: string, lw: number) {
  if (L.hair !== 5 || L.hood || L.cowl) return;
  c.lineWidth = lw;
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
export function femTorso(c: Ctx, by: number, col: string) {
  c.beginPath();
  c.moveTo(-7.5, by + 1);
  c.quadraticCurveTo(-8.5, by, -8, by + 4);
  c.quadraticCurveTo(-6.4, by + 9, -8.6, by + 13);
  c.quadraticCurveTo(-9.4, by + 16, -6, by + 16);
  c.lineTo(6, by + 16);
  c.quadraticCurveTo(9.4, by + 16, 8.6, by + 13);
  c.quadraticCurveTo(6.4, by + 9, 8, by + 4);
  c.quadraticCurveTo(8.5, by, 7.5, by + 1);
  c.quadraticCurveTo(0, by - 1.5, -7.5, by + 1);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
}
/** Linen top worn when bare-chested (inside the torso transform). */
export function femTop(c: Ctx, by: number, col: string, v: View) {
  if (v.side) rr(c, -4.5, by + 3, 10, 6, 2.5, col);
  else rr(c, -7.2, by + 3, 14.4, 6, 2.5, col);
  if (!v.up && !v.side) {
    c.strokeStyle = sh(col, -0.25);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, by + 3.5);
    c.lineTo(0, by + 8.5);
    c.stroke();
    c.strokeStyle = OUT;
  }
}
/** Subtle chest shaping on armor (inside the torso transform, front views only). */
export function femArmor(c: Ctx, by: number, v: View) {
  if (v.up || v.side) return;
  c.strokeStyle = 'rgba(20,12,24,.35)';
  c.lineWidth = 1.2;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.arc(k * 3.6, by + 5.2, 3.3, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,.3)';
  c.beginPath();
  c.arc(-3.8, by + 4.4, 2.2, Math.PI * 1.1, Math.PI * 1.5);
  c.stroke();
  c.strokeStyle = OUT;
}
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
