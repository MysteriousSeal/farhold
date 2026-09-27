import { clamp } from '../core/math';
/* ================= Humanoid skeleton (model) ================= */
// The small skeleton every human-shaped figure stands on: hips, knees and ankles, shoulders,
// elbows and wrists, the neck and the head, from the shared build, the facing, the walk phase,
// a raised weapon arm (carry) and the sitting pose. Pure geometry: coordinates are local, feet
// at y = 0, facing +x for side and 3/4 views. Drawn by art/body.ts and art/humanoid.ts; the
// game uses it for head heights (floating text, bubbles) and hand positions.
export type P = [number, number];

export type Body = { h: number; w: number; m: number; s: number; p: number };
/** The head is drawn at this scale of the classic head (radius 10.5): about half the figure. */
export const HEAD_K = 1.22,
  HEAD_R = 10.5 * HEAD_K;
/**
 * Everyone shares one overworld build: a huge head on a short rounded body, about two
 * heads tall, with simple arms and legs. Women and men are the same small shape.
 * Skeletons are thinner. Dwarves are a little shorter and wider.
 */
const LEAN: Body = { h: 0.3, w: -0.8, m: 0.1, s: -0.2, p: -0.3 };
export function bodyOf(L): Body {
  return L.bones ? { ...LEAN, w: -1, m: -1 } : LEAN;
}

/**
 * Facing in 8 directions: side (right/left), down, up, and the four diagonals, which are drawn
 * as 3/4 views of the front ('down') or back ('up') pose. Left-facing poses are mirrored.
 */
/**
 * Index in `Rig.arms` of the figure's own right arm (the weapon arm), in local unflipped
 * coordinates: facing us it is on our left (-x), from behind on our right (+x), from the side
 * the near arm when facing +x and the far one when facing -x (mirrored).
 */
export const rightArm = (f: string, flip: boolean) => ((f === 'down') !== flip ? 0 : 1);
export function faceOf(dx, dy) {
  if (!dx && !dy) return { f: 'down', flip: false, diag: false };
  const o = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  // 0 right, 1 down-right, 2 down, 3 down-left, 4 left, 5 up-left, 6 up, 7 up-right
  return [
    { f: 'side', flip: false, diag: false },
    { f: 'down', flip: false, diag: true },
    { f: 'down', flip: false, diag: false },
    { f: 'down', flip: true, diag: true },
    { f: 'side', flip: true, diag: false },
    { f: 'up', flip: true, diag: true },
    { f: 'up', flip: false, diag: false },
    { f: 'up', flip: false, diag: true },
  ][o];
}

export type Limb = { a: P; b: P; c: P; far: boolean; k: number };
export type Rig = {
  B: Body;
  up: boolean;
  side: boolean;
  diag: boolean;
  fd: boolean;
  /** far side in 3/4 views: +1 (front 3/4) or -1 (back 3/4), 0 otherwise */
  farS: number;
  /** torso shift toward the facing side in 3/4 views, and its squeeze */
  ts: number;
  sq: number;
  bulk: number;
  hk: number;
  fem: boolean;
  ankY: number;
  hipY: number;
  waistY: number;
  shY: number;
  neckY: number;
  hy: number;
  hx: number;
  W: Record<string, number>;
  /** legs and arms: [the -x one, the +x one]; in side views [far, near] */
  legs: Limb[];
  arms: Limb[];
};

/** Two-bone reach from `a` toward `t` (lengths l1, l2); `bend` picks the elbow/knee side. */
function ik(a: P, t: P, l1: number, l2: number, bend: number): [P, P] {
  let dx = t[0] - a[0],
    dy = t[1] - a[1];
  const d0 = Math.hypot(dx, dy) || 1e-3,
    d = clamp(d0, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  dx = (dx / d0) * d;
  dy = (dy / d0) * d;
  const ang = Math.atan2(dy, dx),
    cs = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1),
    a1 = ang + bend * Math.acos(cs);
  return [
    [a[0] + Math.cos(a1) * l1, a[1] + Math.sin(a1) * l1],
    [a[0] + dx, a[1] + dy],
  ];
}
/** A point `len` along angle `ang` from straight down (+ = toward +x). */
const along = (p: P, ang: number, len: number): P => [
  p[0] + Math.sin(ang) * len,
  p[1] + Math.cos(ang) * len,
];

/**
 * The skeleton for look `L` facing (f, diag), walking with phase `walk` (or idle at time t).
 * `carry` (local hand target {x, y}) raises the weapon arm to it.
 */
export function makeRig(
  L,
  f: string,
  diag: boolean,
  moving: boolean,
  walk: number,
  t: number,
  carry?,
  sit = false,
) {
  const B = bodyOf(L),
    bulk = (L.race === 'dwarf' ? 1.15 : 1) * (L.bulk || 1),
    bl = Math.sqrt(bulk),
    hk = (L.race === 'dwarf' ? 0.84 : 1) * (1 + 0.14 * B.h),
    up = f === 'up',
    side = f === 'side',
    fd = diag && !up,
    farS = diag ? (up ? -1 : 1) : 0,
    ph = walk || 0,
    mv = moving ? 1 : 0,
    // short stubby limbs: the head is about half the whole figure
    thigh = 6.6 * hk,
    shin = 5.6 * hk,
    ua = 4.6 * hk,
    fa = 4.0 * hk,
    ankY = -2.2,
    // the hips dip as the legs part, and rise with the breath when standing
    drop = mv ? Math.abs(Math.sin(ph)) * 0.6 : 0,
    breath = mv ? 0 : Math.sin(t * 2.4) * 0.2,
    // seated: where the knee sits from the hip (thighs point the way the body faces: toward
    // us from the front, forward from the side, away from behind), shins hanging to the floor
    sitK: P = !sit
      ? [0, 0]
      : side
        ? [thigh, thigh * 0.05]
        : diag
          ? [thigh * 0.75, (up ? -0.3 : 0.3) * thigh]
          : [0, (up ? -0.3 : 0.5) * thigh],
    hipY = sit ? ankY - shin - sitK[1] : ankY - (thigh + shin) * 0.96 + drop,
    waistY = hipY - 4.2 * hk,
    shY = waistY - 8.0 * hk - breath,
    neckY = shY - 0.25,
    hy = neckY - HEAD_R * 0.62,
    W = {
      sh: (8.1 + 0.45 * B.s + 0.3 * B.m + 0.2 * B.w) * bulk,
      chest: 0,
      waist: (7.5 + 0.7 * B.w + 0.12 * B.m) * bulk,
      hips: (7.15 + 0.4 * B.w + 0.28 * B.p) * bulk,
      belly: Math.max(0, B.w) * 1.6,
      ua: 4.3 + (0.35 * B.m + 0.25 * B.w) * bl,
      fa: 3.5 + (0.22 * B.m + 0.16 * B.w) * bl,
      hand: 1.75 + 0.06 * B.m,
      th: 3.15 + (0.16 * B.m + 0.16 * B.w) * bl,
      kn: 2.45 + 0.1 * B.m,
      calf: 2.7 + (0.12 * B.m + 0.1 * B.w) * bl,
      ank: 1.9 * bl,
      // side-view depths (half): one soft thickness, no bust and no pinched waist
      chD: 4.7 + 0.22 * B.m + 0.18 * B.w,
      waD: 4.55 + 0.35 * B.w,
      hpD: 4.6 + 0.2 * B.w + 0.12 * B.p,
      legX: 0,
    };
  W.chest = W.sh;
  // feet under the body, far enough apart that the outline leaves a gap
  W.legX = Math.max(3.7, W.hips - 2.55);
  const ts = diag ? (up ? -2 : 2) : 0,
    sq = diag ? 0.78 : 1;
  const legs: Limb[] = [],
    arms: Limb[] = [];
  // legs: feet planted or swinging; knees from the reach (forward in side and 3/4 views)
  for (const k of [-1, 1]) {
    // side views: k = -1 far, +1 near; front views: -x and +x
    const p = ph + (k > 0 ? 0 : Math.PI),
      swing = mv * Math.sin(p),
      lift = mv * Math.max(0, Math.cos(p)) * 1.45 * hk;
    let hip: P, ank: P;
    if (side) {
      hip = [k * 0.28, hipY];
      // both feet under the body; a walking foot still swings forward and back
      ank = [swing * 4.0 * hk + (mv ? 0 : 0.65), ankY - lift];
    } else if (diag) {
      const far = k === farS;
      hip = [ts * 0.5 + (far ? W.legX * 0.5 : -W.legX * 0.7) * (farS || 1), hipY - (far ? 0.8 : 0)];
      ank = [hip[0] + swing * 2.6 * hk, ankY - lift - (far ? 0.8 : 0)];
    } else {
      hip = [k * W.legX, hipY];
      // toward (or away from) the viewer, the stepping foot rises and tucks under the body
      ank = [k * (W.legX + 0.4) - k * lift * 0.2, ankY - lift * 0.9 + swing * 0.8];
    }
    let knee: P;
    if (sit) {
      // knees apart a little from the front and back
      knee = [hip[0] + sitK[0] + (side || diag ? 0 : k * 0.7), hip[1] + sitK[1]];
      ank = [knee[0] + (side ? 0.4 : 0), knee[1] + shin];
    } else if (side) {
      // the knee bends toward the front (+x), never back into the seat
      const fore = ik(hip, ank, thigh, shin, -1)[0],
        aft = ik(hip, ank, thigh, shin, 1)[0];
      knee = fore[0] >= aft[0] ? fore : aft;
    } else if (diag) knee = ik(hip, ank, thigh, shin, -1)[0];
    else {
      const f0 = thigh / (thigh + shin);
      knee = [hip[0] + (ank[0] - hip[0]) * f0 + k * 0.4, hip[1] + (ank[1] - hip[1]) * f0];
    }
    legs.push({ a: hip, b: knee, c: ank, far: side ? k < 0 : diag ? k === farS : false, k });
  }
  // arms: hanging and swinging against the legs; the carry arm reaches for its target
  for (const k of [-1, 1]) {
    const p = ph + (k > 0 ? Math.PI : 0),
      swing = mv * Math.sin(p);
    let shd: P, el: P, wr: P;
    if (side) {
      shd = [k * 0.35, shY + 1.4];
      // a short arm hanging just in front of the hip
      const a1 = 0.08 - 0.42 * swing,
        a2 = a1 + 0.16 + 0.28 * Math.max(0, -swing);
      el = along(shd, a1, ua);
      wr = along(el, a2, fa);
    } else if (diag) {
      const far = k === farS;
      shd = [
        ts * 0.8 + (far ? W.sh * 0.52 : -W.sh * 0.72) * (farS || 1),
        shY + 1.5 + (far ? -0.3 : 0),
      ];
      const out = (far ? 0.02 : -0.16) * (farS || 1),
        a1 = out - (far ? 0.14 : 0.22) * swing,
        a2 = a1 + 0.1 + 0.2 * Math.max(0, -swing);
      el = along(shd, a1, ua);
      wr = along(el, a2, fa);
    } else {
      // outside the body, just under the big head, so the little arms stay visible
      shd = [k * (W.sh + 1.15), shY + 2.6];
      el = along(shd, k * 0.06, ua);
      // swinging toward the viewer shortens the forearm and brings the hand in
      wr = along(el, k * 0.02 - k * 0.1 * Math.max(0, swing), fa * (1 - 0.12 * Math.max(0, swing)));
    }
    arms.push({ a: shd, b: el, c: wr, far: side ? k < 0 : diag ? k === farS : false, k });
  }
  if (carry) {
    // the weapon arm (`carry.i`, see rightArm) on guard: the upper arm hangs at the side and
    // the forearm comes up and forward to the hand, which sits at the carry target (the
    // forearm is foreshortened when it points at the viewer)
    const i = carry.i ?? (side ? 1 : carry.x >= 0 ? 1 : 0),
      A = arms[i],
      out = side ? -0.18 : (carry.x >= A.a[0] ? 1 : -1) * 0.1;
    A.b = along(A.a, out, ua * 0.92);
    const dx = carry.x - A.b[0],
      dy = carry.y - A.b[1],
      d = Math.hypot(dx, dy) || 1,
      back = Math.min(d * 0.6, W.hand * 0.55);
    A.c = [carry.x - (dx / d) * back, carry.y - (dy / d) * back];
  }
  return {
    B,
    up,
    side,
    diag,
    fd,
    farS,
    ts,
    sq,
    bulk,
    hk,
    fem: !!L.fem,
    ankY,
    hipY,
    waistY,
    shY,
    neckY,
    hy,
    hx: diag ? (fd ? 1.5 : 1) : side ? 1 : 0,
    W,
    legs,
    arms,
  } as Rig;
}
/** Where the hand holds things: a little past the wrist along the forearm. */
export function handAt(A: Limb, W): P {
  const dx = A.c[0] - A.b[0],
    dy = A.c[1] - A.b[1],
    d = Math.hypot(dx, dy) || 1;
  return [A.c[0] + (dx / d) * W.hand * 0.55, A.c[1] + (dy / d) * W.hand * 0.55];
}

/** Height of the head centre above the feet for this look, standing (portraits frame on it). */
export const headY = (L, sit = false) => makeRig(L, 'down', false, false, 0, 0, null, sit).hy;
/** A point just above the hair, for bars and floating text. */
export const crownY = (L) => headY(L) - HEAD_R - 10;
