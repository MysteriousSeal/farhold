import { OUT, TAU, clamp, mixCol, sh } from '../core/math';
/* ================= ART: humanoid body (skeleton, limbs, torso, clothes) ================= */
// Every human-shaped figure (hero, townsfolk, humanoid enemies) stands on a small skeleton:
// hips, knees and ankles, shoulders, elbows and wrists, the neck and the head. The skeleton
// comes from the shared lean build (bodyOf), the facing and the walk phase; shaped polygon parts are drawn on it in one bold
// outline with one shadow tone. Coordinates are local, feet at y = 0, facing +x for side and
// 3/4 views (drawHumanoid mirrors left-facing poses). The head is drawn by art/humanoid.ts.
type Ctx = CanvasRenderingContext2D;
type P = [number, number];

export type Body = { h: number; w: number; m: number; s: number; p: number };
/** The head is drawn at this scale of the classic head (radius 10.5), on a taller body. */
export const HEAD_K = 0.9,
  HEAD_R = 10.5 * HEAD_K;
/**
 * Everyone shares one lean build (a little tall, slim, lightly muscled); only skeletons are
 * thinner still. The skeleton's proportions below are written in terms of these values.
 */
const LEAN: Body = { h: 0.3, w: -0.8, m: 0.1, s: -0.2, p: -0.3 };
export function bodyOf(L): Body {
  return L.bones ? { ...LEAN, w: -1, m: -1 } : LEAN;
}

/**
 * Facing in 8 directions: side (right/left), down, up, and the four diagonals, which are drawn
 * as 3/4 views of the front ('down') or back ('up') pose. Left-facing poses are mirrored.
 */
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
) {
  const B = bodyOf(L),
    fem = !!L.fem,
    bulk = (L.race === 'dwarf' ? 1.15 : 1) * (L.bulk || 1),
    bl = Math.sqrt(bulk),
    hk = (L.race === 'dwarf' ? 0.84 : 1) * (1 + 0.14 * B.h),
    up = f === 'up',
    side = f === 'side',
    fd = diag && !up,
    farS = diag ? (up ? -1 : 1) : 0,
    ph = walk || 0,
    mv = moving ? 1 : 0,
    thigh = 10.5 * hk,
    shin = 10 * hk,
    ua = 9 * hk,
    fa = 8.4 * hk,
    ankY = -2.6,
    // the hips dip as the legs part, and rise with the breath when standing
    drop = mv ? Math.abs(Math.sin(ph)) * 1.5 : 0,
    breath = mv ? 0 : Math.sin(t * 2.4) * 0.35,
    hipY = ankY - (thigh + shin) * 0.975 + drop,
    waistY = hipY - 5.2 * hk,
    shY = waistY - 11.4 * hk - breath,
    neckY = shY - 2,
    hy = neckY - HEAD_R * 0.9,
    W = {
      sh: (10.2 + 1.3 * B.s + 1 * B.m + 0.6 * B.w) * (fem ? 0.9 : 1) * bulk,
      chest: 0,
      waist: (7.6 + 2.8 * B.w - 0.2 * B.m - (fem ? 1 : 0)) * bulk,
      hips: (7.8 + 1.8 * B.w + 1.3 * B.p + (fem ? 1.3 : 0)) * bulk,
      belly: Math.max(0, B.w) * 3.4,
      ua: (5.4 + 1.4 * B.m + 1.4 * B.w) * bl,
      fa: (4.6 + 1 * B.m + 0.9 * B.w) * bl,
      hand: (2.9 + 0.25 * B.m + 0.15 * B.w) * bl,
      th: (6.8 + 1.1 * B.m + 2 * B.w + (fem ? 0.4 : 0)) * bl,
      kn: (5.2 + 0.5 * B.m + 0.9 * B.w) * bl,
      calf: (5.6 + 1 * B.m + 1.2 * B.w) * bl,
      ank: 3.9 * bl,
      // side-view depths (half): chest, waist, hips
      chD: 6.2 + 0.9 * B.m + 1 * B.w,
      waD: 5.4 + 2 * B.w,
      hpD: 5.8 + 1 * B.w + 0.7 * B.p + (fem ? 0.6 : 0),
      legX: 0,
    };
  W.chest = W.sh - 0.4 + (fem ? 0.2 : 0);
  W.legX = Math.max(3, W.hips - 3.5);
  const ts = diag ? (up ? -2 : 2) : 0,
    sq = diag ? 0.78 : 1;
  const legs: Limb[] = [],
    arms: Limb[] = [];
  // legs: feet planted or swinging; knees from the reach (forward in side and 3/4 views)
  for (const k of [-1, 1]) {
    // side views: k = -1 far, +1 near; front views: -x and +x
    const p = ph + (k > 0 ? 0 : Math.PI),
      swing = mv * Math.sin(p),
      lift = mv * Math.max(0, Math.cos(p)) * 3.2 * hk;
    let hip: P, ank: P;
    if (side) {
      hip = [k * 0.8, hipY];
      ank = [swing * 7 * hk + (mv ? 0 : k * 1.6), ankY - lift];
    } else if (diag) {
      const far = k === farS;
      hip = [ts * 0.5 + (far ? W.legX * 0.5 : -W.legX * 0.7) * (farS || 1), hipY - (far ? 0.8 : 0)];
      ank = [hip[0] + swing * 4.2 * hk, ankY - lift - (far ? 0.8 : 0)];
    } else {
      hip = [k * W.legX, hipY];
      // toward (or away from) the viewer, the stepping foot rises and tucks under the body
      ank = [k * (W.legX + 0.4) - k * lift * 0.2, ankY - lift * 0.9 + swing * 0.8];
    }
    let knee: P;
    if (side || diag) knee = ik(hip, ank, thigh, shin, -1)[0];
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
      shd = [k * 0.6, shY + 2.4];
      const a1 = -0.5 * swing,
        a2 = a1 + 0.2 + 0.35 * Math.max(0, -swing);
      el = along(shd, a1, ua);
      wr = along(el, a2, fa);
    } else if (diag) {
      const far = k === farS;
      shd = [
        ts * 0.8 + (far ? W.sh * 0.52 : -W.sh * 0.72) * (farS || 1),
        shY + 2.4 + (far ? -0.4 : 0),
      ];
      const out = (far ? 0.06 : -0.1) * (farS || 1),
        a1 = out - (far ? 0.18 : 0.3) * swing,
        a2 = a1 + 0.12 + 0.25 * Math.max(0, -swing);
      el = along(shd, a1, ua);
      wr = along(el, a2, fa);
    } else {
      // women's arms hang a little wider, clear of the bust
      shd = [k * (W.sh - (fem ? 0.6 : 1.3)), shY + 2.6];
      el = along(shd, k * (fem ? 0.2 : 0.15), ua);
      // swinging toward the viewer shortens the forearm and brings the hand in
      wr = along(
        el,
        k * 0.04 - k * 0.12 * Math.max(0, swing),
        fa * (1 - 0.18 * Math.max(0, swing)),
      );
    }
    arms.push({ a: shd, b: el, c: wr, far: side ? k < 0 : diag ? k === farS : false, k });
  }
  if (carry) {
    // the weapon arm (+x in front views, -x from behind, the near arm from the side) on guard:
    // the upper arm hangs at the side and the forearm comes up and forward to the hand, which
    // sits at the carry target (the forearm is foreshortened when it points at the viewer)
    const i = side ? 1 : carry.x >= 0 ? 1 : 0,
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

/* ---------- drawing ---------- */
/** A tapered capsule from a (radius r0) to b (radius r1). */
function capsule(a: P, b: P, r0: number, r1: number) {
  const p = new Path2D(),
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]),
    d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-3,
    phi = Math.asin(clamp((r0 - r1) / d, -0.95, 0.95));
  p.arc(a[0], a[1], r0, ang + Math.PI / 2 + phi, ang - Math.PI / 2 - phi);
  p.arc(b[0], b[1], r1, ang - Math.PI / 2 - phi, ang + Math.PI / 2 + phi);
  p.closePath();
  return p;
}
type Part = { p: Path2D; col: string; shade?: number; noLine?: boolean };
/**
 * Draw parts as one silhouette: every outline first (so seams between parts vanish), then the
 * fills in order, each with a shadow crescent on its +x side.
 */
function drawParts(c: Ctx, parts: Part[], lw: number) {
  c.lineWidth = lw * 2;
  c.strokeStyle = OUT;
  for (const q of parts) if (!q.noLine) c.stroke(q.p);
  for (const q of parts) {
    if (!q.shade) {
      c.fillStyle = q.col;
      c.fill(q.p);
      continue;
    }
    // shadow tone, then the lit colour shifted left: a crescent of shade stays on the right
    c.save();
    c.clip(q.p);
    c.fillStyle = sh(q.col, -0.2);
    c.fill(q.p);
    c.translate(-q.shade, 0);
    c.fillStyle = q.col;
    c.fill(q.p);
    c.restore();
  }
  c.lineWidth = lw;
}

/** Colours of the body for this look (tinted for hit flashes and frost). */
export type Paint = {
  skin: string;
  cloth: string;
  cloth2: string;
  sleeve: string;
  pants: string;
  boots: string;
  hand: string;
  bareTop: boolean;
  bareLegs: boolean;
  bareFeet: boolean;
};
export function paintOf(L, tint: (c: string) => string): Paint {
  const A = L.armor,
    skin = tint(L.skin),
    cloth = tint(L.cloth),
    bareTop = L.cloth === L.skin;
  return {
    skin,
    cloth,
    cloth2: tint(L.cloth2 || sh(L.cloth, -0.3)),
    sleeve: A && A.k >= 1 ? tint(A.col) : cloth,
    pants: tint(L.pants || '#4d3a2e'),
    boots: tint(L.boots || '#5a3a22'),
    hand: tint(L.gloves || L.skin),
    bareTop,
    bareLegs: L.pants === L.skin,
    bareFeet: !!L.bareFeet,
  };
}

/** One leg: thigh and shin in trouser colour (or skin), boot shaft and foot. */
export function drawLeg(c: Ctx, R: Rig, g: Limb, K: Paint, lw: number, L) {
  const W = R.W,
    dk = g.far ? -0.16 : 0,
    col = (x: string) => (dk ? sh(x, dk) : x),
    pc = col(K.pants),
    bc = col(K.bareFeet ? K.skin : K.boots),
    parts: Part[] = [
      { p: capsule(g.a, g.b, W.th / 2, W.kn / 2), col: pc, shade: 1.2 },
      { p: capsule(g.b, g.c, W.calf / 2, W.ank / 2), col: pc, shade: 1 },
    ];
  // boot shaft over the lower shin, and the foot pointing where the body faces
  if (!K.bareFeet) {
    const f = 0.5,
      top: P = [g.c[0] + (g.b[0] - g.c[0]) * f, g.c[1] + (g.b[1] - g.c[1]) * f];
    parts.push({ p: capsule(top, g.c, W.calf / 2 + 0.3, W.ank / 2 + 0.5), col: bc, shade: 1 });
  }
  const foot = new Path2D(),
    fx = g.c[0],
    fy = g.c[1] + 1.4;
  if (R.side || R.diag) {
    const len = R.side ? 6.6 : 5,
      back = R.side ? 2.4 : 2.2;
    foot.roundRect(fx - back, fy - 2.2, back + len, 3.8, [2, 2.4, 1.6, 1.4]);
  } else foot.ellipse(fx + g.k * 0.4, fy, 3.2, R.up ? 2 : 2.4, 0, 0, TAU);
  parts.push({ p: foot, col: bc });
  drawParts(c, parts, lw);
  if (K.bareLegs && !L.robe && R.B.m > 0.25 && !g.far) {
    // a knee line and a calf curve on bare, muscular legs
    c.strokeStyle = 'rgba(80,40,30,.28)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.arc(g.b[0], g.b[1] + 0.6, 1.6, 0.2, Math.PI - 0.2);
    c.stroke();
    c.lineWidth = lw;
    c.strokeStyle = OUT;
  }
}
/** One arm: upper arm and forearm (sleeve or skin) and the hand. */
export function drawArm(c: Ctx, R: Rig, A: Limb, K: Paint, lw: number, L) {
  const W = R.W,
    dk = A.far ? -0.2 : 0,
    col = (x: string) => (dk ? sh(x, dk) : x),
    sl = col(K.sleeve),
    // bare arms: skin to the shoulder; short tunic sleeves stop above the elbow
    bare = K.bareTop && !(L.armor && L.armor.k >= 1),
    hd = handAt(A, W),
    parts: Part[] = [
      { p: capsule(A.a, A.b, W.ua / 2, W.fa / 2 + 0.2), col: bare ? col(K.skin) : sl, shade: 1 },
      {
        p: capsule(A.b, A.c, W.fa / 2 + 0.2, W.fa / 2 - 0.5),
        col: bare || !(L.armor && L.armor.k >= 1) ? col(K.skin) : sl,
        shade: 0.8,
      },
    ];
  if (!bare && !(L.armor && L.armor.k >= 1)) {
    // a sleeve cuff over the forearm top
    const m: P = [A.b[0] + (A.c[0] - A.b[0]) * 0.35, A.b[1] + (A.c[1] - A.b[1]) * 0.35];
    parts.push({ p: capsule(A.b, m, W.fa / 2 + 0.5, W.fa / 2 + 0.3), col: sl });
  }
  const hand = new Path2D();
  hand.arc(hd[0], hd[1], W.hand, 0, TAU);
  parts.push({ p: hand, col: col(K.hand) });
  drawParts(c, parts, lw);
  if (bare && R.B.m > 0.2 && !A.far) {
    // biceps curve on bare, muscular arms
    const mx = (A.a[0] + A.b[0]) / 2,
      my = (A.a[1] + A.b[1]) / 2;
    c.strokeStyle = 'rgba(80,40,30,' + (0.18 + R.B.m * 0.2).toFixed(3) + ')';
    c.lineWidth = 0.9;
    c.beginPath();
    c.arc(mx - 0.4, my, W.ua * 0.32, -0.9, 0.9);
    c.stroke();
    c.lineWidth = lw;
    c.strokeStyle = OUT;
  }
}

/** The torso outline (front, back or side), including the hips down to the crotch. */
function torsoPath(R: Rig, fem: boolean, bottom?: number) {
  const W = R.W,
    p = new Path2D(),
    { shY, waistY, hipY } = R,
    by = bottom ?? hipY + 4.5;
  if (R.side) {
    const ch = W.chD,
      wa = W.waD,
      hp = W.hpD,
      bel = W.belly;
    p.moveTo(1.8, shY - 1.6);
    p.quadraticCurveTo(ch - 1, shY - 0.4, ch, shY + 4.5);
    // the bust in profile
    if (fem) p.bezierCurveTo(ch + 3.4, shY + 5, ch + 4, shY + 10.2, ch - 0.4, shY + 10.8);
    p.quadraticCurveTo(wa + bel + 0.6, waistY - 2, wa + bel * 0.8, waistY + 1);
    p.quadraticCurveTo(hp * 0.95, hipY, hp * 0.8, Math.min(by, hipY + 2));
    p.lineTo(hp * 0.7, by);
    p.lineTo(-hp * 0.9, by);
    p.quadraticCurveTo(-hp - 0.4, hipY, -wa + 0.4, waistY);
    p.quadraticCurveTo(-ch - 0.6, shY + 5, -ch + 1.2, shY + 0.6);
    p.quadraticCurveTo(-2.4, shY - 1.8, -1.6, shY - 1.8);
    p.closePath();
    return p;
  }
  const s = W.sh,
    ch = W.chest,
    wa = W.waist + W.belly * 0.45,
    hp = W.hips;
  p.moveTo(-3, shY - 1.8);
  p.quadraticCurveTo(-s + 1.4, shY - 1.2, -s, shY + 2.4);
  p.quadraticCurveTo(-ch - 0.2, shY + 6, fem ? -wa - 0.2 : -ch + 0.4, shY + 8.5);
  p.quadraticCurveTo(-wa - 0.3, waistY - 1, -wa, waistY);
  p.quadraticCurveTo(-hp - 0.3, hipY - 1.5, -hp, Math.min(by, hipY + 1.5));
  p.lineTo(-hp + 0.6, by);
  p.lineTo(hp - 0.6, by);
  p.lineTo(hp, Math.min(by, hipY + 1.5));
  p.quadraticCurveTo(hp + 0.3, hipY - 1.5, wa, waistY);
  p.quadraticCurveTo(wa + 0.3, waistY - 1, fem ? wa + 0.2 : ch - 0.4, shY + 8.5);
  p.quadraticCurveTo(ch + 0.2, shY + 6, s, shY + 2.4);
  p.quadraticCurveTo(s - 1.4, shY - 1.2, 3, shY - 1.8);
  p.quadraticCurveTo(0, shY - 0.8, -3, shY - 1.8);
  p.closePath();
  return p;
}
/** In 3/4 views the torso turns: draw `fn` squeezed toward the facing side. */
function turned(c: Ctx, R: Rig, fn: () => void) {
  c.save();
  if (R.diag) {
    c.translate(R.ts, 0);
    c.scale(R.sq, 1);
  }
  fn();
  c.restore();
}
/** Neck from the shoulders up under the chin. */
export function drawNeck(c: Ctx, R: Rig, K: Paint, lw: number) {
  const w = (2.5 + 0.45 * R.B.m + 0.2 * R.B.w) * Math.sqrt(R.bulk);
  drawParts(
    c,
    [{ p: capsule([R.hx * 0.6, R.shY + 1], [R.hx, R.hy + 4], w, w - 0.3), col: sh(K.skin, -0.08) }],
    lw,
  );
}
/**
 * The torso with its clothes: tunic or bare chest (muscles, a linen top for women), shorts,
 * belt, armour (leather, mail, plate), apron and amulet; skeleton ribs, mummy wraps and fur.
 */
export function drawTorso(c: Ctx, R: Rig, K: Paint, L, lw: number, tint: (c: string) => string) {
  const fem = !!L.fem,
    A = L.armor,
    { shY, waistY, hipY } = R,
    W = R.W;
  turned(c, R, () => {
    const body = torsoPath(R, fem),
      top = K.bareTop ? K.skin : K.cloth,
      side = R.side;
    // the side panel of a turned torso shows on the near side
    if (R.diag) {
      const sp = torsoPath(R, fem);
      c.save();
      c.translate(-R.farS * 3.2, 0);
      c.scale(0.7, 1);
      drawParts(c, [{ p: sp, col: sh(A ? tint(A.col) : top, -0.3) }], lw);
      c.restore();
    }
    drawParts(c, [{ p: body, col: top, shade: side ? 1.6 : 2.2 }], lw);
    c.save();
    c.clip(body);
    // shorts over the hips when bare-legged or bare-chested
    if (L.shorts) {
      c.fillStyle = tint(L.shorts);
      c.fillRect(-20, waistY + 1.5, 40, 20);
      c.strokeStyle = sh(tint(L.shorts), -0.3);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-20, waistY + 1.5);
      c.lineTo(20, waistY + 1.5);
      c.stroke();
    } else if (!K.bareTop && !L.robe) {
      // trousers show under the tunic hem
      c.fillStyle = K.pants;
      c.fillRect(-20, hipY + 2.6, 40, 10);
    }
    if (K.bareTop && !L.bones && !L.wraps && !L.fur) bareChest(c, R, L, fem, tint);
    if (A) armour(c, R, A, tint, lw);
    if (fem && !R.up && !L.bones && !L.wraps)
      bust(
        c,
        R,
        A
          ? A.k === 0
            ? tint(mixCol(A.col, '#8a5a36', 0.55))
            : tint(A.col)
          : K.bareTop
            ? L.top
              ? tint(L.top)
              : K.skin
            : K.cloth,
        A ? A.k : -1,
      );
    if (L.bones) {
      c.strokeStyle = '#8a8272';
      c.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-W.chest * 0.7, shY + 4 + i * 3);
        c.quadraticCurveTo(0, shY + 5.5 + i * 3, W.chest * 0.7, shY + 4 + i * 3);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(0, shY + 2);
      c.lineTo(0, hipY);
      c.stroke();
    } else if (L.wraps) {
      c.strokeStyle = 'rgba(120,100,70,.7)';
      c.lineWidth = 1.3;
      for (let y = shY; y < hipY + 5; y += 3.4) {
        c.beginPath();
        c.moveTo(-12, y + 1.5);
        c.lineTo(12, y - 1);
        c.stroke();
      }
    } else if (L.fur) {
      c.fillStyle = sh(top, -0.12);
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.arc(i * 3.2, hipY + 3.6, 2.4, 0, Math.PI);
        c.fill();
      }
    }
    // belt at the waist over a tunic
    if (!L.shorts && !L.bones && !L.fur && !(A && A.k === 2)) {
      c.fillStyle = A && A.trim ? tint(A.trim) : K.cloth2;
      c.fillRect(-20, waistY + 0.6, 40, 2.8);
      if (!R.up && !side) {
        c.fillStyle = '#f5c451';
        c.fillRect(-1.8, waistY + 0.4, 3.6, 3.2);
      }
    }
    c.restore();
    c.lineWidth = lw;
    c.strokeStyle = OUT;
    if (L.apron && !R.up) {
      const ap = new Path2D();
      ap.roundRect(-5.5, shY + 5, 11, hipY - shY + 4, 2);
      drawParts(c, [{ p: ap, col: tint('#7a5a3a') }], lw);
    }
    if (L.amulet && !R.up && !side) {
      c.strokeStyle = '#f5c451';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-3.6, shY - 0.6);
      c.lineTo(0, shY + 4);
      c.lineTo(3.6, shY - 0.6);
      c.stroke();
      c.lineWidth = lw;
      c.strokeStyle = OUT;
      const am = new Path2D();
      am.arc(0, shY + 5, 2, 0, TAU);
      drawParts(c, [{ p: am, col: tint(L.amulet) }], lw * 0.8);
    }
  });
}
/**
 * A woman's bust in whatever covers it (linen top, tunic, leather, mail or plate): two rounded
 * shapes with a shadow beneath and a soft highlight; in profile, a shadow under the curve of
 * the torso outline. `armour` is the armour kind (-1 none) for mail rings and plate shine.
 */
function bust(c: Ctx, R: Rig, col: string, armour: number) {
  const y = R.shY + 7,
    gap = 3,
    rx = 3.4,
    ry = 3.4;
  c.save();
  if (R.side) {
    c.strokeStyle = 'rgba(40,20,30,.3)';
    c.lineWidth = 1.1;
    c.beginPath();
    c.arc(R.W.chD - 0.5, y + 1.2, 3.2, 0.1, Math.PI * 0.62);
    c.stroke();
    c.restore();
    return;
  }
  const shape = new Path2D();
  for (const k of [-1, 1]) {
    shape.moveTo(k * gap + rx, y);
    shape.ellipse(k * gap, y, rx, ry, 0, 0, TAU);
  }
  c.fillStyle = col;
  c.fill(shape);
  // the shadow on the lower right of each, then the fabric texture over it
  c.save();
  c.clip(shape);
  c.fillStyle = sh(col, -0.2);
  for (const k of [-1, 1]) {
    c.beginPath();
    c.ellipse(k * gap + 1.2, y + 1.6, rx, ry * 0.8, 0, 0, TAU);
    c.fill();
  }
  c.fillStyle = col;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.ellipse(k * gap - 0.4, y - 0.6, rx * 0.9, ry * 0.85, 0, 0, TAU);
    c.fill();
  }
  if (armour === 1) {
    c.strokeStyle = sh(col, -0.35);
    c.lineWidth = 0.9;
    for (let yy = y - ry; yy < y + ry + 2; yy += 2.6)
      for (let xx = -gap - rx; xx < gap + rx; xx += 3) {
        c.beginPath();
        c.arc(xx + (Math.round(yy) % 2 ? 1.5 : 0), yy, 1.6, 0, Math.PI);
        c.stroke();
      }
  }
  c.fillStyle = armour === 2 ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.22)';
  for (const k of [-1, 1]) {
    c.beginPath();
    c.ellipse(k * gap - 1.4, y - 1.6, 1.5, 0.9, -0.4, 0, TAU);
    c.fill();
  }
  c.restore();
  // outline the lower curves and the cleft between them
  c.strokeStyle = OUT;
  c.lineWidth = 1.4;
  c.beginPath();
  for (const k of [-1, 1]) {
    c.moveTo(k * gap + Math.cos(0.15) * rx, y + Math.sin(0.15) * ry);
    c.ellipse(k * gap, y, rx, ry, 0, 0.15, Math.PI - 0.15);
  }
  c.stroke();
  c.strokeStyle = 'rgba(40,20,30,.35)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, y - ry * 0.6);
  c.lineTo(0, y + ry * 0.55);
  c.stroke();
  c.restore();
}
/** Muscle and body lines on a bare chest; women wear a linen top. */
function bareChest(c: Ctx, R: Rig, L, fem: boolean, tint: (c: string) => string) {
  const { shY, waistY } = R,
    W = R.W,
    m = R.B.m,
    ink = (a: number) => 'rgba(80,40,30,' + a.toFixed(3) + ')';
  c.lineWidth = 0.9;
  if (R.up) {
    // back: spine and shoulder blades
    c.strokeStyle = ink(0.22 + Math.max(0, m) * 0.2);
    c.beginPath();
    c.moveTo(0, shY + 3);
    c.lineTo(0, waistY);
    for (const k of [-1, 1]) {
      c.moveTo(k * 1.5, shY + 3.5);
      c.quadraticCurveTo(k * (W.chest * 0.7), shY + 4, k * (W.chest * 0.5), shY + 8);
    }
    c.stroke();
  } else if (R.side) {
    c.strokeStyle = ink(0.22 + Math.max(0, m) * 0.2);
    c.beginPath();
    c.moveTo(W.chD - 3.5, shY + 7.5);
    c.quadraticCurveTo(W.chD - 0.8, shY + 7.6, W.chD - 0.2, shY + 5.5);
    c.stroke();
  } else if (!fem) {
    // collarbones, pecs and, when fit, the abs
    c.strokeStyle = ink(0.2 + Math.max(0, m) * 0.28);
    c.beginPath();
    for (const k of [-1, 1]) {
      c.moveTo(k * 1.2, shY + 0.4);
      c.quadraticCurveTo(k * 3.5, shY + 0.2, k * (W.sh - 3), shY + 0.8);
      c.moveTo(k * 0.6, shY + 7.2 + m * 0.6);
      c.quadraticCurveTo(k * (W.chest * 0.55), shY + 8.4 + m, k * (W.chest - 1.8), shY + 5.2);
    }
    c.stroke();
    if (m > -0.3 && R.B.w < 0.5) {
      c.strokeStyle = ink(0.12 + Math.max(0, m) * 0.28);
      c.beginPath();
      c.moveTo(0, shY + 8.5);
      c.lineTo(0, waistY + 1);
      for (const yy of [shY + 11, waistY - 1.5])
        for (const k of [-1, 1]) {
          c.moveTo(k * 0.7, yy);
          c.lineTo(k * 2.6, yy - 0.3);
        }
      c.stroke();
    }
  }
  if (R.B.w > 0.3 && !R.up) {
    // a round belly
    c.strokeStyle = ink(0.25);
    c.beginPath();
    if (R.side) c.arc(W.waD, waistY - 1, 3, -0.4, 1.2);
    else c.arc(0, waistY - 2.4, W.waist * 0.55, 0.35, Math.PI - 0.35);
    c.stroke();
  }
  if (fem && L.top) {
    // the linen top across the bust
    c.fillStyle = tint(L.top);
    c.strokeStyle = OUT;
    c.lineWidth = 1.4;
    if (R.side) {
      // in profile the top wraps the curve of the bust: a band of the torso itself (this is
      // drawn inside the torso's clip), with its seams
      const y0 = shY + 2.8,
        y1 = shY + 11.6;
      c.fillRect(-20, y0, 40, y1 - y0);
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-20, y0);
      c.lineTo(20, y0);
      c.moveTo(-20, y1);
      c.lineTo(20, y1);
      c.stroke();
    } else {
      const tp = new Path2D();
      tp.roundRect(-W.chest - 1, shY + 3, (W.chest + 1) * 2, 6.6, 2.8);
      c.fill(tp);
      c.stroke(tp);
    }
    if (!R.up && !R.side) {
      c.strokeStyle = sh(tint(L.top), -0.25);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, shY + 3.6);
      c.lineTo(0, shY + 9);
      c.stroke();
    }
  }
  c.strokeStyle = OUT;
}
/** Armour over the torso: 0 leather vest, 1 mail hauberk, 2 plate cuirass (with trim). */
function armour(c: Ctx, R: Rig, A, tint: (c: string) => string, lw: number) {
  const { shY, waistY, hipY } = R,
    W = R.W,
    ac = tint(A.col),
    dk = sh(A.col, -0.35);
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  if (A.k === 0) {
    const lc = tint(mixCol(A.col, '#8a5a36', 0.55)),
      v = new Path2D();
    v.roundRect(-W.chest + 0.6, shY + 0.6, (W.chest - 0.6) * 2, waistY - shY + 1.5, 4);
    c.fillStyle = lc;
    c.fill(v);
    c.stroke(v);
    c.strokeStyle = sh(mixCol(A.col, '#8a5a36', 0.55), -0.35);
    c.lineWidth = 1;
    c.setLineDash([1.5, 1.5]);
    c.beginPath();
    for (const k of [-1, 1]) {
      c.moveTo(k * (W.chest - 3), shY + 3);
      c.lineTo(k * (W.chest - 3), waistY);
    }
    if (!R.up && !R.side) {
      c.moveTo(-3, shY + 1.5);
      c.lineTo(0, shY + 6);
      c.lineTo(3, shY + 1.5);
    }
    c.stroke();
    c.setLineDash([]);
  } else if (A.k === 1) {
    // mail down to the hips
    c.fillStyle = ac;
    c.fillRect(-20, shY - 3, 40, hipY - shY + 6);
    c.strokeStyle = dk;
    c.lineWidth = 0.9;
    for (let r = 0, y = shY; y < hipY + 4; r++, y += 2.6)
      for (let k = -6; k <= 6; k++) {
        c.beginPath();
        c.arc(k * 3 + (r % 2) * 1.5, y, 1.6, 0, Math.PI);
        c.stroke();
      }
  } else {
    // plate: a breastplate with a centre ridge and a shine, faulds over the hips
    c.fillStyle = ac;
    c.fillRect(-20, shY - 3, 40, waistY - shY + 5);
    c.fillStyle = sh(ac, -0.1);
    c.fillRect(-20, waistY + 2, 40, 3.2);
    c.fillRect(-20, waistY + 5.4, 40, 3.2);
    c.strokeStyle = OUT;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-20, waistY + 2);
    c.lineTo(20, waistY + 2);
    c.moveTo(-20, waistY + 5.4);
    c.lineTo(20, waistY + 5.4);
    c.moveTo(-20, waistY + 8.6);
    c.lineTo(20, waistY + 8.6);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.ellipse(R.side ? 2 : -W.chest * 0.4, shY + 5, 3.4, 2.2, -0.3, 0, TAU);
    c.fill();
    c.strokeStyle = dk;
    c.lineWidth = 1.1;
    c.beginPath();
    if (!R.side) {
      c.moveTo(0, shY + 1.5);
      c.lineTo(0, waistY - 1);
    }
    c.moveTo(-W.chest, waistY - 1.5);
    c.quadraticCurveTo(0, waistY + 1, W.chest, waistY - 1.5);
    c.stroke();
  }
  if (A.trim) {
    c.strokeStyle = tint(A.trim);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-W.chest, shY + 1.2);
    c.quadraticCurveTo(0, shY + (R.up ? 1.2 : 4), W.chest, shY + 1.2);
    c.stroke();
  }
  c.lineWidth = lw;
  c.strokeStyle = OUT;
}
/** Shoulder guards over the arms (mail and plate). */
export function drawPauldrons(c: Ctx, R: Rig, A, tint: (c: string) => string, lw: number) {
  if (!A || A.k < 1) return;
  const pr = (A.k === 2 ? 4.8 : 3.8) * (1 + 0.12 * R.B.m),
    col = tint(A.col);
  for (const arm of R.arms) {
    if (R.side && arm.far) continue;
    const k = arm.far ? 0.82 : 1,
      r2 = pr * k,
      [px, py] = arm.a,
      p = new Path2D();
    p.ellipse(px, py - 0.4, r2 + 1, r2, 0, Math.PI, 0);
    p.lineTo(px + r2 + 1, py + 2);
    p.lineTo(px - r2 - 1, py + 2);
    p.closePath();
    drawParts(c, [{ p, col: arm.far ? sh(col, -0.2) : col }], lw);
    if (A.k === 2) {
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.beginPath();
      c.ellipse(px - 1.5, py - 1.8, 2, 1.1, -0.4, 0, TAU);
      c.fill();
    }
    if (A.trim) {
      c.fillStyle = tint(A.trim);
      c.fillRect(px - r2, py + 0.5, r2 * 2, 1.5);
    }
  }
}
/** A robe from the chest down to the ankles (casters, cultists): covers the legs. */
export function drawRobe(
  c: Ctx,
  R: Rig,
  K: Paint,
  L,
  lw: number,
  tint: (c: string) => string,
  sway: number,
) {
  const W = R.W,
    p = new Path2D(),
    hem = R.ankY + 0.5,
    hp = W.hips + 0.6,
    wide = hp + 3.5;
  if (R.side) {
    p.moveTo(-W.hpD, R.waistY);
    p.lineTo(W.hpD, R.waistY);
    p.lineTo(W.hpD + 3 + sway * 2, hem);
    p.quadraticCurveTo(0, hem + 2, -W.hpD - 2 + sway * 2, hem);
  } else {
    p.moveTo(-hp, R.waistY);
    p.lineTo(hp, R.waistY);
    p.lineTo(wide + sway, hem);
    p.quadraticCurveTo(0, hem + 2.5, -wide + sway, hem);
  }
  p.closePath();
  turned(c, R, () => {
    drawParts(c, [{ p, col: K.cloth2, shade: 2 }], lw);
    if (!R.up) {
      c.fillStyle = tint(L.trim || '#f5c451');
      c.fillRect(-wide + sway, hem - 3, wide * 2, 2.4);
    }
  });
}
/** A wraith's tattered lower body instead of legs. */
export function drawTatters(c: Ctx, R: Rig, K: Paint, lw: number) {
  const W = R.W,
    y0 = R.waistY,
    y1 = -2,
    p = new Path2D();
  p.moveTo(-W.hips, y0);
  p.quadraticCurveTo(-W.hips - 3, y1 - 2, -5, y1);
  p.quadraticCurveTo(-2, y1 - 6, 0, y1 + 1);
  p.quadraticCurveTo(3, y1 - 6, 5, y1);
  p.quadraticCurveTo(W.hips + 3, y1 - 2, W.hips, y0);
  p.closePath();
  drawParts(c, [{ p, col: sh(K.cloth, -0.25) }], lw);
}
/** A cape behind the body (or over the back when facing away). */
export function drawCape(c: Ctx, R: Rig, col: string, lw: number, sw: number, over: boolean) {
  const W = R.W,
    top = R.shY + 1,
    bot = R.legs[0].b[1] + 3,
    p = new Path2D();
  if (R.side) {
    p.moveTo(-2, top);
    p.quadraticCurveTo(-W.chD - 6 - sw * 2, (top + bot) / 2, -W.chD - 4 - Math.abs(sw) * 3, bot);
    p.lineTo(-W.chD + 1, bot - 3);
    p.quadraticCurveTo(-W.chD, (top + bot) / 2, -1, top + 3);
  } else if (over) {
    p.moveTo(-W.sh + 0.5, top);
    p.quadraticCurveTo(0, top - 2, W.sh - 0.5, top);
    p.lineTo(W.sh + 2 + sw, bot);
    p.quadraticCurveTo(0, bot + 2, -W.sh - 2 + sw, bot);
  } else {
    p.moveTo(-W.sh + 1, top + 1);
    p.lineTo(-W.sh - 1.5, bot);
    p.lineTo(W.sh + 1.5, bot);
    p.lineTo(W.sh - 1, top + 1);
  }
  p.closePath();
  turned(c, R, () => drawParts(c, [{ p, col, shade: over ? 2 : 0 }], lw));
}
/** Height of the head centre above the feet for this look, standing (portraits frame on it). */
export const headY = (L) => makeRig(L, 'down', false, false, 0, 0).hy;
