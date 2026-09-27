import { OUT, TAU, clamp, mixCol, sh } from '../core/math';
/* ================= ART: humanoid body (skeleton, limbs, torso, clothes) ================= */
// Every human-shaped figure (hero, townsfolk, humanoid enemies) stands on a small skeleton:
// hips, knees and ankles, shoulders, elbows and wrists, the neck and the head. The skeleton
// comes from the shared lean build (bodyOf), the facing and the walk phase; shaped polygon parts are drawn on it in one bold
// outline with one shadow tone. Coordinates are local, feet at y = 0, facing +x for side and
// 3/4 views (drawHumanoid mirrors left-facing poses). The head is drawn by art/humanoid.ts.
type Ctx = CanvasRenderingContext2D;
import {
  HEAD_K,
  HEAD_R,
  type Limb,
  type Rig,
  bodyOf,
  crownY,
  faceOf,
  handAt,
  headY,
  makeRig,
  rightArm,
} from '../game/rig';
type P = [number, number];
// the skeleton is model code (game/rig.ts); drawing code keeps importing it from here
export { HEAD_K, HEAD_R, bodyOf, crownY, faceOf, handAt, headY, makeRig, rightArm };
export type { Limb, Rig };
/* ---------- drawing ---------- */
/**
 * A tapered limb. `pushX` adds flesh on the side facing that way (outward, or backward
 * in a side view) without moving the knee. `exp` below 1 puts the fullness nearer the top.
 */
function shapedLimb(a: P, b: P, r0: number, r1: number, pushX: number, exp = 0.6) {
  const p = new Path2D(),
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = Math.hypot(dx, dy) || 1,
    px = -dy / d,
    py = dx / d,
    n = 10;
  const pt = (u: number, sign: number): P => {
    const r = r0 + (r1 - r0) * u,
      bow = Math.sin(Math.PI * Math.pow(u, exp)),
      facing = px * sign * pushX,
      extra = facing > 0 ? Math.abs(pushX) * bow : Math.abs(pushX) * bow * 0.12;
    return [a[0] + dx * u + px * sign * (r + extra), a[1] + dy * u + py * sign * (r + extra)];
  };
  const first = pt(0, 1);
  p.moveTo(first[0], first[1]);
  for (let i = 1; i <= n; i++) {
    const q = pt(i / n, 1);
    p.lineTo(q[0], q[1]);
  }
  for (let i = n; i >= 0; i--) {
    const q = pt(i / n, -1);
    p.lineTo(q[0], q[1]);
  }
  p.closePath();
  return p;
}
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
    // a little thickness only, so the legs stay simple stubs
    thighPush = R.side ? -0.25 : g.k * 0.3,
    calfPush = R.side ? -0.18 : g.k * 0.16,
    parts: Part[] = [
      { p: shapedLimb(g.a, g.b, W.th / 2, W.kn / 2, thighPush, 0.7), col: pc, shade: 1 },
      {
        p: shapedLimb(g.b, g.c, W.kn / 2 + 0.15, W.ank / 2, calfPush, 0.85),
        col: pc,
        shade: 0.8,
      },
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
    const len = R.side ? 4.2 : 3.3,
      back = R.side ? 1.5 : 1.4;
    foot.roundRect(fx - back, fy - 1.5, back + len, 2.7, [1.3, 1.5, 1, 0.9]);
  } else foot.ellipse(fx + g.k * 0.25, fy, 2.2, R.up ? 1.45 : 1.7, 0, 0, TAU);
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

/**
 * The torso outline (front, back or side): one small rounded body. `notch` opens the hips
 * when the legs are bare so the two short legs read separately. A tunic keeps a flat hem.
 */
function torsoPath(R: Rig, notch = false) {
  const W = R.W,
    p = new Path2D(),
    { shY, waistY, hipY } = R;
  if (R.side) {
    const ch = W.chD,
      wa = W.waD,
      hp = W.hpD;
    // chest, belly and seat are one soft shape
    p.moveTo(1.1, shY - 0.3);
    p.quadraticCurveTo(ch * 0.72, shY + 0.7, ch * 0.9, shY + 2.4);
    p.quadraticCurveTo(wa * 0.98, (shY + hipY) * 0.5, hp * 0.7, hipY + 0.5);
    p.quadraticCurveTo(hp * 0.18, hipY + 2.15, -0.15, hipY + 2.3);
    p.quadraticCurveTo(-hp * 0.52, hipY + 1.9, -hp * 0.8, hipY + 0.25);
    p.quadraticCurveTo(-wa * 0.92, waistY + 0.35, -wa * 0.86, waistY - 0.15);
    p.quadraticCurveTo(-ch * 0.88, shY + 2.2, -ch * 0.42, shY + 0.25);
    p.quadraticCurveTo(-1.15, shY - 0.6, -0.85, shY - 0.4);
    p.closePath();
    return p;
  }
  const s = W.sh,
    wa = W.waist + W.belly * 0.35,
    hp = W.hips,
    sideW = Math.max(s, wa);
  p.moveTo(-1.8, shY - 0.45);
  p.quadraticCurveTo(-s * 0.5, shY - 1.05, -s, shY + 1.35);
  p.quadraticCurveTo(-sideW * 0.98, (shY + waistY) / 2, -wa, waistY);
  if (notch) {
    p.quadraticCurveTo(-hp * 0.98, hipY - 0.1, -hp * 0.68, hipY + 1.05);
    p.quadraticCurveTo(-hp * 0.24, hipY + 2.2, -0.9, hipY + 2.85);
    p.lineTo(0.9, hipY + 2.85);
    p.quadraticCurveTo(hp * 0.24, hipY + 2.2, hp * 0.68, hipY + 1.05);
    p.quadraticCurveTo(hp * 0.98, hipY - 0.1, wa, waistY);
  } else {
    const hem = hipY + 1.55;
    p.quadraticCurveTo(-hp, hipY - 0.15, -hp * 0.9, hem);
    p.lineTo(hp * 0.9, hem);
    p.quadraticCurveTo(hp, hipY - 0.15, wa, waistY);
  }
  p.quadraticCurveTo(sideW * 0.98, (shY + waistY) / 2, s, shY + 1.35);
  p.quadraticCurveTo(s * 0.5, shY - 1.05, 1.8, shY - 0.45);
  p.quadraticCurveTo(0, shY + 0.2, -1.8, shY - 0.45);
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
  const w = (2.05 + 0.22 * R.B.m) * Math.sqrt(R.bulk);
  drawParts(
    c,
    [
      {
        p: capsule([R.hx * 0.35, R.shY + 0.35], [R.hx, R.hy + HEAD_R * 0.32], w, w * 0.82),
        col: sh(K.skin, -0.08),
      },
    ],
    lw,
  );
}
/**
 * The torso with its clothes: skin or a tunic, linen shorts, belt, armour (leather, mail,
 * plate), apron and amulet; skeleton ribs, mummy wraps and fur.
 */
export function drawTorso(c: Ctx, R: Rig, K: Paint, L, lw: number, tint: (c: string) => string) {
  const A = L.armor,
    { shY, waistY, hipY } = R,
    W = R.W;
  turned(c, R, () => {
    const notch = K.bareLegs && !L.robe && !L.bones,
      body = torsoPath(R, notch),
      top = K.bareTop ? K.skin : K.cloth,
      side = R.side;
    // the side panel of a turned torso shows on the near side
    if (R.diag) {
      const sp = torsoPath(R, notch);
      c.save();
      c.translate(-R.farS * 2.2, 0);
      c.scale(0.7, 1);
      drawParts(c, [{ p: sp, col: sh(A ? tint(A.col) : top, -0.3) }], lw);
      c.restore();
    }
    drawParts(c, [{ p: body, col: top, shade: side ? 1.3 : 1.6 }], lw);
    c.save();
    c.clip(body);
    // linen shorts over the hips when the legs are bare
    if (L.shorts) {
      c.fillStyle = tint(L.shorts);
      c.fillRect(-16, waistY + 0.3, 32, 6.4);
      c.strokeStyle = sh(tint(L.shorts), -0.28);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-16, waistY + 0.3);
      c.lineTo(16, waistY + 0.3);
      c.stroke();
    } else if (!K.bareTop && !L.robe) {
      // trousers show under the tunic hem
      c.fillStyle = K.pants;
      c.fillRect(-16, hipY - 0.2, 32, 4.2);
    }
    if (A) armour(c, R, A, tint, lw);
    if (L.bones) {
      c.strokeStyle = '#8a8272';
      c.lineWidth = 1.4;
      const span = hipY - shY;
      for (let i = 0; i < 3; i++) {
        const y = shY + span * (0.28 + i * 0.22);
        c.beginPath();
        c.moveTo(-W.chest * 0.62, y);
        c.quadraticCurveTo(0, y + 1.1, W.chest * 0.62, y);
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
