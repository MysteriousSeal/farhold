import { circ, ell, rr, shadow } from '../core/dom';
import { OUT, TAU, clamp, mixCol, sh } from '../core/math';
import {
  hairBack,
  hairBlend,
  hairFront,
  hairLocks,
  hairTop,
  lashes,
  shaved,
  stubble,
} from './humanoidFem';
import {
  HEAD_K,
  drawArm,
  drawCape,
  drawLeg,
  drawNeck,
  drawPauldrons,
  drawRobe,
  drawTatters,
  drawTorso,
  faceOf,
  handAt,
  makeRig,
  paintOf,
} from './body';
/* ================= ART: humanoid ================= */
export function drawHumanoid(c, x, y, o) {
  const L = o.look,
    s = o.scale || 1,
    t = o.time || 0,
    { f, flip, diag } = faceOf(o.dx, o.dy),
    side = f === 'side',
    up = f === 'up',
    fd = diag && !up, // front 3/4 view (turned toward +x)
    E = fd ? 3 : 0, // how far facial features shift toward the facing side
    V = { up, side, diag, fd };
  c.save();
  c.translate(x, y);
  if (!o.noShadow) {
    shadow(c, 0, 0, 12 * s * (L.big ? 1.2 : 1), 4.5 * s, o.float ? 0.18 : 0.28);
  }
  c.scale(s * (flip ? -1 : 1), s);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  const lw = 2.2 / Math.sqrt(s);
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const sw = o.moving ? Math.sin(o.walk || 0) : 0;
  if (o.float) c.translate(0, Math.sin(t * 3) * 3 - 8);
  if (o.squash) c.scale(1 + o.squash, 1 - o.squash);
  const fl = o.flash,
    frz = o.frozen;
  const tint = (col) => (fl ? '#ffffff' : frz ? mixCol(col, '#9fe0ff', 0.55) : col);
  const R = makeRig(L, f, diag, !!o.moving, o.walk || 0, t, o.carry),
    K = paintOf(L, tint),
    A = L.armor,
    // the head and hair are drawn at the classic head size, scaled onto the neck
    head = (fn: () => void) => {
      c.save();
      c.translate(R.hx, R.hy);
      c.scale(HEAD_K, HEAD_K);
      c.lineWidth = lw / HEAD_K;
      fn();
      c.restore();
      c.lineWidth = lw;
      c.strokeStyle = OUT;
    };
  // behind the body: the cape, long hair falling down the back, the cowl
  if (L.cape && !up) drawCape(c, R, tint(L.cape), lw, sw, false);
  head(() => hairBehind(c, L, V, tint));
  // the far arm (side and 3/4 views) is behind the body
  for (const a of R.arms) if (a.far) drawArm(c, R, a, K, lw, L);
  if (L.robe) drawRobe(c, R, K, L, lw, tint, sw * 2);
  else if (L.noLegs) drawTatters(c, R, K, lw);
  else {
    for (const g of R.legs) if (g.far) drawLeg(c, R, g, K, lw, L);
    for (const g of R.legs) if (!g.far) drawLeg(c, R, g, K, lw, L);
  }
  drawNeck(c, R, K, lw);
  drawTorso(c, R, K, L, lw, tint);
  if (L.cape && up) drawCape(c, R, tint(L.cape), lw, sw, true);
  for (const a of R.arms) if (!a.far) drawArm(c, R, a, K, lw, L);
  drawPauldrons(c, R, A, tint, lw);
  head(() => drawHead(c, L, V, E, tint, c.lineWidth));
  c.restore();
}
/** Long hair, a ponytail and the back of the styled hair, and a cowl: behind the body. */
function hairBehind(c, L, V, tint) {
  const { up, side, diag } = V,
    hy = 0;
  if (L.hair === 1 && !up && !side && !L.hood && !L.cowl) {
    // (from behind and from the side it falls over the back instead: see hairFront)
    rr(c, diag ? -12 : -11, hy - 4, diag ? 19 : 22, 17, 7, tint(L.hairC));
  }
  if (L.hair === 2 && !up && (side || diag) && !L.hood && !L.cowl) {
    c.fillStyle = tint(L.hairC);
    c.beginPath();
    c.ellipse(side ? -10 : -8, hy + 6, 3.5, 7, 0.5, 0, TAU);
    c.fill();
    c.stroke();
  }
  if (L.hairC && L.hair >= 4) hairBack(c, L, hy, V, tint(L.hairC));
  if (L.cowl) circ(c, 0, hy + 1, 12.5, tint(L.cowl));
}
/* ---------- face details: ears, eye colour, brows, nose and mouth ---------- */
// hair styles that leave the ears showing (the others cover them)
const EAR_HAIR = new Set([0, 2, 3, 6, 7, 8, 10, 12]);
const showEars = (L) =>
  (!L.race || L.race === 'human') &&
  EAR_HAIR.has(L.hair) &&
  !L.helm &&
  !L.hood &&
  !L.cowl &&
  !L.hat &&
  !L.bones &&
  !L.wraps;
function earsBehind(c, hy: number, HR: number, skin: string, up: boolean) {
  for (const k of [-1, 1]) {
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(k * (HR - 0.6), hy + 1.8, 2.4, 3.3, k * 0.15, 0, TAU);
    c.fill();
    c.stroke();
    if (!up) {
      c.fillStyle = sh(skin, -0.2);
      c.beginPath();
      c.ellipse(k * (HR - 0.2), hy + 2, 0.9, 1.7, 0, 0, TAU);
      c.fill();
    }
  }
}
/** A coloured iris with a dark pupil and a glint inside an eye. */
function iris(c, x: number, y: number, rx: number, ry: number, col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.6, rx - 0.45), Math.max(0.8, ry - 0.55), 0, 0, TAU);
  c.fill();
  c.fillStyle = OUT;
  c.beginPath();
  c.ellipse(x, y + 0.1, Math.max(0.35, rx - 1), Math.max(0.5, ry - 1.2), 0, 0, TAU);
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(x + 0.5, y - 0.7, 0.5, 0, TAU);
  c.fill();
}
/**
 * Brows (look.brow 0 soft, 1 arched, 2 straight, 3 bold), the nose (look.nose 0 small,
 * 1 button, 2 long, 3 broad) and a small mouth.
 */
function faceDetails(c, L, V, E: number, hy: number, HR: number, skin: string, tint) {
  const { side, fd } = V,
    browC = sh(tint(L.hairC || '#3a2a20'), -0.3),
    b = L.brow || 0,
    n = L.nose || 0;
  c.save();
  c.lineCap = 'round';
  // brows (the angry look draws its own; a helmet hides them)
  if (!L.angry && !L.helm) {
    c.strokeStyle = browC;
    c.lineWidth = b === 3 ? 1.7 : 1.05;
    const brow = (x: number, w: number, dir: number) => {
      const y = hy - 2.2;
      c.beginPath();
      if (b === 1) {
        c.moveTo(x - w, y + 0.6);
        c.quadraticCurveTo(x, y - 1.4, x + w, y + 0.5);
      } else if (b === 2) {
        c.moveTo(x - w, y);
        c.lineTo(x + w, y - 0.1);
      } else if (b === 3) {
        c.moveTo(x - w * dir, y + 0.2);
        c.lineTo(x + w * dir, y - 0.6);
      } else {
        c.moveTo(x - w, y + 0.3);
        c.quadraticCurveTo(x, y - 0.6, x + w, y + 0.3);
      }
      c.stroke();
    };
    if (side) brow(5.5, 1.6, 1);
    else {
      brow(fd ? -1 : -3.6, fd ? 1.2 : 1.7, -1);
      brow(fd ? 5.6 : 3.6, 1.7, 1);
    }
  }
  // nose
  const nx = side ? HR - 0.6 : E * 0.85,
    ny = hy + 3.6;
  c.strokeStyle = 'rgba(90,50,40,.55)';
  c.fillStyle = sh(skin, -0.14);
  c.lineWidth = 0.9;
  if (side) {
    // a bump on the profile
    c.fillStyle = skin;
    c.strokeStyle = OUT;
    c.lineWidth = 1.3;
    c.beginPath();
    const len = n === 2 ? 2.6 : n === 3 ? 2 : 1.5;
    c.moveTo(nx - 0.8, ny - 2.2);
    c.quadraticCurveTo(nx + len, ny - 0.4, nx + len * 0.4, ny + 0.9);
    c.quadraticCurveTo(nx - 0.2, ny + 1, nx - 0.8, ny + 0.8);
    c.fill();
    c.stroke();
  } else if (n === 1) {
    c.beginPath();
    c.ellipse(nx, ny, 1.3, 1, 0, 0, TAU);
    c.fill();
  } else if (n === 2) {
    c.beginPath();
    c.moveTo(nx + 0.3, ny - 2.2);
    c.quadraticCurveTo(nx + 0.8, ny + 0.2, nx - 0.6, ny + 0.6);
    c.stroke();
  } else {
    const w = n === 3 ? 1.8 : 1.1;
    c.beginPath();
    c.moveTo(nx - w, ny + 0.2);
    c.quadraticCurveTo(nx, ny + 1.2, nx + w, ny + 0.2);
    c.stroke();
  }
  // mouth (a beard covers it)
  if (!L.beard && L.race !== 'dwarf') {
    c.strokeStyle = 'rgba(70,30,30,.6)';
    c.lineWidth = 0.95;
    c.beginPath();
    if (side) {
      c.moveTo(HR - 3.2, hy + 6.4);
      c.lineTo(HR - 1.4, hy + 6.1);
    } else {
      const mx = E * 0.8;
      c.moveTo(mx - 1.4, hy + 6.1);
      c.quadraticCurveTo(mx, hy + 7, mx + 1.4, hy + 6.1);
    }
    c.stroke();
  }
  c.restore();
}
/** Hair that falls over the back, the head, the face and headgear (head centre at 0, 0). */
function drawHead(c, L, V, E, tint, lw) {
  const { up, side, diag, fd } = V,
    hy = 0,
    skin = tint(L.skin);
  if (L.hairC) hairFront(c, L, hy, V, tint(L.hairC), lw);
  // ears
  if (L.race === 'elf' && !L.helm && !L.cowl) {
    c.fillStyle = skin;
    const ear = (k) => {
      c.beginPath();
      c.moveTo(k * 7, hy - 1);
      c.lineTo(k * 16, hy - 7);
      c.lineTo(k * 8, hy + 3);
      c.closePath();
      c.fill();
      c.stroke();
    };
    if (side) ear(-1);
    else {
      if (!diag) ear(-1);
      ear(1);
    }
  }
  if (L.race === 'goblin') {
    c.fillStyle = skin;
    const ear = (k) => {
      c.beginPath();
      c.moveTo(k * 6, hy - 2);
      c.lineTo(k * 18, hy - 4);
      c.lineTo(k * 7, hy + 4);
      c.closePath();
      c.fill();
      c.stroke();
    };
    if (side) ear(-1);
    else {
      if (!diag) ear(-1);
      ear(1);
    }
  }
  // head
  const HR = 10.5;
  if (L.hood) {
    c.beginPath();
    c.moveTo(-11, hy + 8);
    c.quadraticCurveTo(-12, hy - 12, 0, hy - 14);
    c.quadraticCurveTo(12, hy - 12, 11, hy + 8);
    c.closePath();
    c.fillStyle = tint(L.hood);
    c.fill();
    c.stroke();
    if (!up) {
      c.fillStyle = '#120c1c';
      c.beginPath();
      c.ellipse(side ? 3 : E, hy + 1, 6.5, 7, 0, 0, TAU);
      c.fill();
      c.fillStyle = L.eyes || '#7ef0ff';
      c.beginPath();
      if (side) c.arc(5, hy, 1.8, 0, TAU);
      else {
        c.arc(-2.6 + E, hy, 1.7, 0, TAU);
        c.arc(2.6 + E, hy, 1.7, 0, TAU);
      }
      c.fill();
    }
  } else {
    // ears on both sides, tucked behind the head (front and back views, short hair)
    if (!side && !diag && showEars(L)) earsBehind(c, hy, HR, skin, up);
    c.beginPath();
    c.arc(0, hy, HR, 0, TAU);
    c.fillStyle = skin;
    c.fill();
    const hasHair = !L.helm && L.hair !== 3 && L.hairC && !L.cowl && !L.hat;
    if (hasHair) {
      c.save();
      c.beginPath();
      c.arc(0, hy, HR, 0, TAU);
      c.clip();
      // buzz cut and mohawk: the shaved hair is a faint shadow over the skin
      c.fillStyle = shaved(L) ? mixCol(tint(L.hairC), skin, 0.6) : tint(L.hairC);
      c.beginPath();
      if (up) c.rect(-HR, hy - HR, HR * 2, HR * 2);
      else if (shaved(L) && !side) {
        // buzz cut / mohawk: a straight hairline, no fringe
        c.rect(-HR, hy - HR, HR * 2, HR - 4.5);
        if (fd) c.rect(-HR, hy - 5, HR - 4.5, HR + 5);
      } else if (side) {
        c.moveTo(-HR, hy + HR);
        c.lineTo(-HR, hy - HR);
        c.lineTo(HR, hy - HR);
        c.lineTo(HR, hy - 3);
        c.quadraticCurveTo(4, hy - 5, 1, hy - 2);
        c.quadraticCurveTo(-1, hy + 3, -2, hy + HR);
      } else if (fd) {
        // front 3/4: the hair wraps the back of the head (-x); the fringe sweeps toward the face
        c.moveTo(-HR, hy + HR);
        c.lineTo(-HR, hy - HR);
        c.lineTo(HR, hy - HR);
        c.lineTo(HR, hy - 1);
        c.quadraticCurveTo(HR - 3, hy - 5, 4, hy - 4);
        c.quadraticCurveTo(0, hy - 3, -2, hy - 5);
        c.quadraticCurveTo(-4, hy - 1, -4.5, hy + 7);
        c.lineTo(-4.5, hy + HR);
      } else {
        c.moveTo(-HR, hy + 2);
        c.lineTo(-HR, hy - HR);
        c.lineTo(HR, hy - HR);
        c.lineTo(HR, hy + 2);
        // in a 3/4 view the parting turns toward the facing side
        c.quadraticCurveTo(HR - 2, hy - 4, 5 + E, hy - 4);
        c.quadraticCurveTo(2 + E, hy - 2, E, hy - 5);
        c.quadraticCurveTo(-3 + E, hy - 2, -6 + E * 0.5, hy - 4);
        c.quadraticCurveTo(-HR + 2, hy - 4, -HR, hy + (fd ? 5 : 2));
      }
      c.fill();
      hairLocks(c, L, hy, V, HR);
      if (up && diag) {
        // back 3/4: a sliver of cheek shows on the near side
        c.fillStyle = skin;
        c.beginPath();
        c.ellipse(HR - 1, hy + 2.5, 3.4, 6, 0, 0, TAU);
        c.fill();
      }
      if (diag && L.race !== 'elf' && L.race !== 'goblin') {
        // 3/4: the ear sits between the hair and the face
        const ex = fd ? -6.2 : 6.2;
        c.fillStyle = skin;
        c.beginPath();
        c.ellipse(ex, hy + 2, 2.2, 3.2, 0, 0, TAU);
        c.fill();
        c.lineWidth = 1.4;
        c.stroke();
        c.fillStyle = sh(skin, -0.2);
        c.beginPath();
        c.ellipse(ex + (fd ? 0.4 : -0.4), hy + 2.2, 0.9, 1.7, 0, 0, TAU);
        c.fill();
        c.lineWidth = lw;
      }
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.beginPath();
      c.ellipse(-3, hy - 7, 4, 1.6, -0.3, 0, TAU);
      c.fill();
      c.restore();
    }
    if (L.wraps) {
      c.save();
      c.beginPath();
      c.arc(0, hy, HR, 0, TAU);
      c.clip();
      c.strokeStyle = 'rgba(120,100,70,.7)';
      c.lineWidth = 1.3;
      for (let i = -3; i < 4; i++) {
        c.beginPath();
        c.moveTo(-HR, hy + i * 3.2);
        c.lineTo(HR, hy + i * 3.2 - 2);
        c.stroke();
      }
      c.restore();
      c.lineWidth = lw;
      c.strokeStyle = OUT;
    }
    if (L.stubble && !up && L.hairC) {
      c.save();
      c.beginPath();
      c.arc(0, hy, HR, 0, TAU);
      c.clip();
      stubble(c, hy, tint(L.hairC), side, E);
      c.restore();
    }
    c.beginPath();
    c.arc(0, hy, HR, 0, TAU);
    c.stroke();
    if (L.hairC) hairBlend(c, L, hy, V, tint(L.hairC)); // (the helmet is drawn over it)
    if (L.hairC) hairTop(c, L, hy, V, tint(L.hairC), lw);
    if (!up) {
      const ec = L.eyes || OUT;
      c.fillStyle = ec;
      if (side) {
        c.beginPath();
        c.ellipse(5.5, hy + 1.5, 1.5, L.fem ? 2.4 : 2.1, 0, 0, TAU);
        c.fill();
        if (L.eyeC && !L.eyes) iris(c, 5.6, hy + 1.6, 1.5, L.fem ? 2.4 : 2.1, L.eyeC);
        if (L.fem && !L.eyes) lashes(c, hy, 0, 0, true);
      } else {
        // 3/4: the far eye moves in and narrows, the near eye moves toward the edge
        const ex1 = fd ? -1 : -3.6,
          ex2 = fd ? 5.6 : 3.6,
          er1 = fd ? 1.1 : 1.5;
        const ery = L.fem ? 2.4 : 2.1;
        c.beginPath();
        c.ellipse(ex1, hy + 1.5, er1, ery, 0, 0, TAU);
        c.ellipse(ex2, hy + 1.5, 1.5, ery, 0, 0, TAU);
        c.fill();
        if (L.eyeC && !L.eyes) {
          iris(c, ex1, hy + 1.6, er1, ery, L.eyeC);
          iris(c, ex2, hy + 1.6, 1.5, ery, L.eyeC);
        }
        if (L.fem && !L.eyes) lashes(c, hy, ex1, ex2, false);
        if (!L.eyes) {
          c.fillStyle = '#fff';
          c.beginPath();
          c.arc(ex1 + 0.5, hy + 0.8, 0.5, 0, TAU);
          c.arc(ex2 + 0.5, hy + 0.8, 0.6, 0, TAU);
          c.fill();
        }
      }
      if (L.angry && !side) {
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(-6 + E * 1.3, hy - 2.5);
        c.lineTo(-1.5 + E, hy - 0.8);
        c.moveTo(6 + E * 0.6, hy - 2.5);
        c.lineTo(1.5 + E, hy - 0.8);
        c.stroke();
        c.lineWidth = lw;
      }
      if (!L.bones && !L.wraps && !L.eyes && !L.hood) faceDetails(c, L, V, E, hy, HR, skin, tint);
      if (!L.bones && !L.wraps && !side && !L.eyes) {
        c.fillStyle = 'rgba(255,110,110,.35)';
        c.beginPath();
        if (!fd) c.arc(-6, hy + 5, 1.8, 0, TAU);
        else c.moveTo(7.3 + E * 0.5, hy + 5);
        c.arc(6 + E * 0.5, hy + 5, 1.8, 0, TAU);
        c.fill();
      }
      if (L.bones) {
        c.fillStyle = OUT;
        c.fillRect(side ? 3 : -3 + E, hy + 5, side ? 4 : 6, 1.5);
      }
      if (L.tusks) {
        c.fillStyle = '#fffbe8';
        c.lineWidth = 1;
        for (const k of side ? [1] : [-1, 1]) {
          const bx = side ? 4 : E;
          c.beginPath();
          c.moveTo(k * 2.5 + bx, hy + 7);
          c.lineTo(k * 3.4 + bx, hy + 3.5);
          c.lineTo(k * 4.4 + bx, hy + 7.2);
          c.closePath();
          c.fill();
          c.stroke();
        }
        c.lineWidth = lw;
      }
    }
    if ((L.race === 'dwarf' || L.beard) && !up && L.hairC) {
      c.fillStyle = tint(L.beardC || L.hairC);
      c.beginPath();
      if (side) {
        c.moveTo(1, hy + 3);
        c.quadraticCurveTo(11, hy + 3, 8, hy + 13);
        c.quadraticCurveTo(3, hy + 11, 1, hy + 3);
      } else {
        c.moveTo(-8 + E, hy + 3);
        c.quadraticCurveTo(-7 + E, hy + 15, E, hy + 16);
        c.quadraticCurveTo(7 + E * 0.6, hy + 15, 8, hy + 3);
        c.quadraticCurveTo(E, hy + 8, -8 + E, hy + 3);
      }
      c.fill();
      c.stroke();
    }
    if (L.cowl) {
      c.fillStyle = tint(L.cowl);
      c.beginPath();
      if (up) {
        c.arc(0, hy, HR + 1.5, 0, TAU);
      } else {
        c.arc(0, hy - 0.5, HR + 2, Math.PI * 0.92, Math.PI * 2.08);
        c.quadraticCurveTo(side ? 8 : 0, hy - 7, side ? -4 : -HR - 1, hy + 3);
      }
      c.fill();
      c.stroke();
      if (!up && !side) {
        c.beginPath();
        c.moveTo(-3, hy - HR - 1);
        c.quadraticCurveTo(0, hy - HR - 8, 5, hy - HR - 9);
        c.stroke();
      }
    }
    if (L.hat) {
      c.fillStyle = tint(L.hat);
      ell(c, 0, hy - 6, 14, 4.5, tint(L.hat));
      c.beginPath();
      c.moveTo(-8, hy - 7);
      c.quadraticCurveTo(-6, hy - 18, 0, hy - 19);
      c.quadraticCurveTo(6, hy - 18, 8, hy - 7);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#f5c451';
      c.fillRect(-7.5, hy - 10, 15, 2.5);
    }
    if (L.horns) {
      c.fillStyle = tint('#f0e0c8');
      for (const k of side ? [-1, 1] : [-1, 1]) {
        c.beginPath();
        c.moveTo(k * 5, hy - 7);
        c.quadraticCurveTo(k * 14, hy - 12, k * 13, hy - 22);
        c.quadraticCurveTo(k * 9, hy - 13, k * 1.5, hy - 9);
        c.closePath();
        c.fill();
        c.stroke();
      }
    }
    if (L.crown) {
      c.fillStyle = '#f5c451';
      c.beginPath();
      c.moveTo(-8, hy - 6);
      c.lineTo(-9, hy - 16);
      c.lineTo(-4, hy - 11);
      c.lineTo(0, hy - 18);
      c.lineTo(4, hy - 11);
      c.lineTo(9, hy - 16);
      c.lineTo(8, hy - 6);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#e0483e';
      c.beginPath();
      c.arc(0, hy - 9, 1.8, 0, TAU);
      c.fill();
    }
    if (L.helm) {
      c.fillStyle = tint(L.helm);
      c.beginPath();
      c.arc(0, hy - 0.5, 11.5, Math.PI, 0);
      c.lineTo(11.5, hy + 0.5);
      c.lineTo(-11.5, hy + 0.5);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.45)';
      c.beginPath();
      c.ellipse(-4, hy - 6, 3, 1.8, -0.5, 0, TAU);
      c.fill();
      if (!up && !side) rr(c, -1.2 + (fd ? 3.3 : 0), hy - 1, 2.4, 5, 1, tint(L.helm));
      if (L.plume) {
        c.fillStyle = tint(L.plume);
        c.beginPath();
        c.moveTo(-1, hy - 11);
        c.quadraticCurveTo(side ? -14 : 0, hy - 24, side ? -18 : 2, hy - 15);
        c.quadraticCurveTo(side ? -8 : 3, hy - 16, 2, hy - 11);
        c.fill();
        c.stroke();
      }
    }
  }
}
/** Stand-in look for callers that only know the race (average body). */
const lookFor = (race, look?) => look || { race };
/**
 * Where the weapon hand is (relative to the feet, scaled), from the body's skeleton: the +x
 * hand facing the viewer (and in front 3/4, where it is the far arm), the -x hand from behind,
 * the near hand from the side.
 */
export function handPos(dx, dy, moving, walk, t, race, scale = 1, look?) {
  const { f, flip, diag } = faceOf(dx, dy),
    R = makeRig(lookFor(race, look), f, diag, moving, walk, t),
    arm = R.arms[f === 'up' ? 0 : 1],
    [hx, hy] = handAt(arm, R.W),
    m = flip ? -1 : 1;
  return { x: m * hx * scale, y: hy * scale, f, flip, behind: f === 'up' };
}
const MELEE = ['warrior', 'sword', 'axe', 'club'];
/**
 * Whether a held weapon is drawn behind the body. Bows and melee weapons at rest stay visible in
 * the hand (a resting blade hangs beside the body); while attacking they follow the facing.
 */
export function weaponBehind(h, kind, aiming = false) {
  return h.behind && (aiming || (kind !== 'ranger' && kind !== 'bow' && !MELEE.includes(kind)));
}
export function restAng(h, cls) {
  const a = restAng0(h, cls);
  // mirrored 3/4 views mirror the angle too
  return h.flip && h.f !== 'side' ? Math.PI - a : a;
}
function restAng0(h, cls) {
  // Bows are carried upright at the side, belly facing away from the body.
  if (cls === 'ranger' || cls === 'bow')
    return h.f === 'side' ? (h.flip ? Math.PI : 0) : h.f === 'down' ? 0 : Math.PI;
  if (cls === 'mage' || cls === 'staff')
    return h.f === 'side' ? (h.flip ? -0.25 : 0.25) : h.f === 'down' ? 0.15 : -0.15;
  if (h.f === 'side') return h.flip ? Math.PI - 0.5 : 0.5;
  // held low, angled ~45° outward so the tip ends around the knee
  return h.f === 'down' ? Math.PI / 2 - 0.75 : Math.PI / 2 + 0.75;
}
/**
 * Axe head on a haft lying along +x, with its top end at `x`. The cutting edge faces -y:
 * a narrow cheek on the haft flares into a curved, bearded blade; a small poll sits behind it.
 */
export function drawAxeHead(c, x, col) {
  rr(c, x - 7, 1, 6, 4.5, 1.5, sh(col, -0.25));
  c.beginPath();
  c.moveTo(x - 6, -2);
  c.quadraticCurveTo(x - 8, -5, x - 14, -6);
  c.quadraticCurveTo(x - 7, -20, x + 6, -15);
  c.quadraticCurveTo(x + 1, -8, x, -2);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.stroke();
  c.save();
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x - 11, -7.5);
  c.quadraticCurveTo(x - 6, -17, x + 3.5, -14.5);
  c.stroke();
  c.restore();
}
export function drawWeapon(c, x, y, ang, kind, sw, col?, glow?, style = 0, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 'warrior' || kind === 'sword' || kind === 'axe' || kind === 'club') {
    c.rotate(ang + sw);
    // swords and axes at ~70% of their old size (blade ≈ 2/3 of the hero); clubs unchanged
    const ws = kind === 'club' ? 0.78 : 0.78 * 0.7;
    c.scale(ws, ws);
    c.translate(-4, 0);
    const bl = col || '#dfe6ee';
    if (kind === 'club') {
      rr(c, 0, -3, 22, 6, 3, '#7a5230');
      circ(c, 22, 0, 6.5, '#8a5f38');
      c.fillStyle = '#ccc';
      c.fillRect(20, -8, 2, 4);
    } else if (kind === 'axe' || style === 1) {
      // cutting edge faces down whichever way the axe points
      if (Math.cos(ang + sw) >= 0) c.scale(1, -1);
      rr(c, 0, -2.5, 34, 5, 2, '#7a5230');
      drawAxeHead(c, 31, bl);
    } else {
      const L2 = style === 2 ? 44 : 36,
        w2 = style === 2 ? 4 : 3;
      rr(c, 0, -2.5, 9, 5, 2, '#6b4423');
      circ(c, -1, 0, 3, '#f5c451');
      rr(c, 8, -7, 4, 14, 2, '#f5c451');
      c.beginPath();
      c.moveTo(12, -w2);
      c.lineTo(L2, -w2 + 0.5);
      c.lineTo(L2 + 5, 0);
      c.lineTo(L2, w2 - 0.5);
      c.lineTo(12, w2);
      c.closePath();
      c.fillStyle = bl;
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.75)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(14, -1);
      c.lineTo(L2 - 1, -1);
      c.stroke();
    }
    if (glow) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.45 + Math.sin(performance.now() / 180) * 0.15;
      c.strokeStyle = glow;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(14, 0);
      c.lineTo(style === 2 ? 46 : 38, 0);
      c.stroke();
    }
  } else if (kind === 'ranger' || kind === 'bow') {
    c.rotate(ang);
    c.translate(-8, 0);
    const R = style === 1 ? 17 : style === 2 ? 15 : 13,
      A = style === 1 ? 1.2 : 1.15;
    c.beginPath();
    c.arc(-6, 0, R, -A, A);
    c.lineWidth = 4.8;
    c.stroke();
    c.lineWidth = 2.8;
    c.strokeStyle = col || '#9b6a3a';
    c.stroke();
    if (style === 2) {
      c.lineWidth = 2;
      c.strokeStyle = OUT;
      for (const k of [-1, 1]) {
        c.beginPath();
        c.moveTo(-6 + R * Math.cos(A), k * R * Math.sin(A));
        c.lineTo(-10 + R * Math.cos(A), k * (R * Math.sin(A) + 4));
        c.stroke();
      }
    }
    const pull = clamp(sw, 0, 1) * 7;
    c.strokeStyle = '#f3ead0';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-6 + R * Math.cos(-A), R * Math.sin(-A));
    c.lineTo(-pull - 2, 0);
    c.lineTo(-6 + R * Math.cos(A), R * Math.sin(A));
    c.stroke();
    if (glow) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.4;
      c.strokeStyle = glow;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(-6, 0, R, -A, A);
      c.stroke();
    }
  } else {
    c.rotate(ang);
    c.translate(0, -4);
    const oc = col || '#9fd8ff';
    rr(c, -2, -12, 4, 34, 2, '#7a5230');
    if (style === 1) {
      c.beginPath();
      c.moveTo(0, -26);
      c.lineTo(5, -16);
      c.lineTo(0, -10);
      c.lineTo(-5, -16);
      c.closePath();
      c.fillStyle = oc;
      c.fill();
      c.stroke();
    } else if (style === 2) {
      c.beginPath();
      c.arc(0, -16, 7, Math.PI * 0.1, Math.PI * 0.9, true);
      c.lineWidth = 4.5;
      c.stroke();
      c.lineWidth = 2.5;
      c.strokeStyle = '#f5c451';
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = OUT;
      circ(c, 0, -17, 3.5, oc);
    } else {
      circ(c, 0, -15, 6.5, oc);
      c.fillStyle = 'rgba(255,255,255,.8)';
      c.beginPath();
      c.arc(-2, -17, 2, 0, TAU);
      c.fill();
    }
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.3 + Math.sin(performance.now() / 200) * 0.12;
    circ(c, 0, -15, 12, glow || oc, false);
  }
  c.restore();
}
/** Redraw the hand over a held weapon's grip so the hilt sits inside the fist. */
export function handOver(c, x: number, y: number, look, s = 1) {
  c.save();
  c.lineWidth = 2.2 / Math.sqrt(s);
  c.strokeStyle = OUT;
  circ(c, x, y, 3 * s, look.gloves || look.skin);
  c.restore();
}

/**
 * Guard stance for a sword/axe at rest: the weapon hand is raised to chest height just outside
 * the body and the blade points up beside the head. Returns the hand position (relative to the
 * feet), blade angle, whether the blade is drawn behind the body, and `arm`: the hand offset for
 * drawHumanoid's o.carry (local, unflipped coordinates).
 */
export function carryPos(dx, dy, moving, walk, t, race, scale = 1, look?) {
  const { f, flip, diag } = faceOf(dx, dy),
    R = makeRig(lookFor(race, look), f, diag, moving, walk, t),
    m = flip ? -1 : 1,
    // mirrored poses mirror the blade angle
    mir = (ang: number) => (flip ? Math.PI - ang : ang),
    // the hand target in local (unflipped) coordinates: chest height, just outside the body
    arm =
      f === 'side'
        ? { x: 6.5, y: R.shY + 7 }
        : { x: (f === 'down' ? 1 : -1) * (R.W.sh + 3.4), y: R.shY + 8 };
  return {
    x: m * arm.x * scale,
    y: arm.y * scale,
    ang: f === 'side' ? -Math.PI / 2 + m * 0.3 : mir(-Math.PI / 2 + (f === 'down' ? 0.12 : -0.12)),
    behind: f === 'up',
    arm,
  };
}
