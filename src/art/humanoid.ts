import { circ, ell, rr, shadow } from '../core/dom';
import { OUT, TAU, clamp, mixCol, sh } from '../core/math';
/* ================= ART: humanoid ================= */
function faceOf(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy) * 1.1) return { f: 'side', flip: dx < 0 };
  return { f: dy < 0 ? 'up' : 'down', flip: false };
}
export function drawHumanoid(c, x, y, o) {
  const L = o.look,
    s = o.scale || 1,
    t = o.time || 0,
    { f, flip } = faceOf(o.dx, o.dy),
    side = f === 'side',
    up = f === 'up';
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
  const mv = o.moving,
    ph = o.walk || 0,
    bob = mv ? Math.abs(Math.sin(ph)) * 2.2 : Math.sin(t * 2.4) * 0.6,
    sw = mv ? Math.sin(ph) : 0;
  if (o.float) c.translate(0, Math.sin(t * 3) * 3 - 8);
  if (o.squash) c.scale(1 + o.squash, 1 - o.squash);
  const dw = (L.race === 'dwarf' ? 1.15 : 1) * (L.bulk || 1),
    fl = o.flash,
    frz = o.frozen;
  const tint = (col) => (fl ? '#ffffff' : frz ? mixCol(col, '#9fe0ff', 0.55) : col);
  const skin = tint(L.skin),
    cloth = tint(L.cloth),
    cloth2 = tint(L.cloth2 || sh(L.cloth, -0.3));
  const A = L.armor,
    sleeve = A && A.k >= 1 ? tint(A.col) : cloth;
  const by = -27 - bob,
    hy = by - 8,
    armY = by + 4;
  // cape behind
  if (L.cape && !up) {
    c.fillStyle = tint(L.cape);
    c.beginPath();
    if (side) {
      c.moveTo(-3, by + 2);
      c.quadraticCurveTo(-14 - sw * 2, by + 12, -12 - Math.abs(sw) * 3, by + 22);
      c.lineTo(-2, by + 18);
      c.closePath();
    } else {
      c.moveTo(-9 * dw, by + 3);
      c.lineTo(-11 * dw, by + 19);
      c.lineTo(11 * dw, by + 19);
      c.lineTo(9 * dw, by + 3);
      c.closePath();
    }
    c.fill();
    c.stroke();
  }
  // legs / robe
  if (L.robe) {
    const sway = sw * 2;
    c.beginPath();
    c.moveTo(-9 * dw, by + 8);
    c.lineTo(-11 * dw + sway, -1);
    c.quadraticCurveTo(0, 2, 11 * dw + sway, -1);
    c.lineTo(9 * dw, by + 8);
    c.closePath();
    c.fillStyle = cloth2;
    c.fill();
    c.stroke();
    if (!up) {
      c.fillStyle = tint(L.trim || '#f5c451');
      c.fillRect(-10 * dw + sway, -4, 20 * dw, 2.5);
    }
  } else if (L.noLegs) {
    c.beginPath();
    c.moveTo(-9, by + 10);
    c.quadraticCurveTo(-12, -2, -5, -2);
    c.quadraticCurveTo(-2, -8, 0, -1);
    c.quadraticCurveTo(3, -8, 5, -2);
    c.quadraticCurveTo(12, -2, 9, by + 10);
    c.closePath();
    c.fillStyle = sh(cloth, -0.25);
    c.fill();
    c.stroke();
  } else {
    const pc = tint(L.pants || '#4d3a2e'),
      bc = tint(L.boots || '#5a3a22');
    if (side) {
      for (const k of [-1, 1]) {
        c.save();
        c.translate(sw * 5 * k, -13);
        c.rotate(-sw * 0.35 * k);
        rr(c, -3, 0, 6, 11, 3, k < 0 ? sh(pc, -0.25) : pc);
        rr(c, -3, 8, 7, 5, 2, bc);
        c.restore();
      }
    } else {
      const l1 = 13 - Math.max(0, sw) * 3,
        l2 = 13 - Math.max(0, -sw) * 3;
      rr(c, -7 * dw, -13, 6, l1, 3, pc);
      rr(c, -7.5 * dw, -13 + l1 - 4, 7, 5, 2, bc);
      rr(c, dw * 7 - 6, -13, 6, l2, 3, pc);
      rr(c, dw * 7 - 6.5, -13 + l2 - 4, 7, 5, 2, bc);
    }
  }
  // long hair behind
  if (L.hair === 1 && !L.hood && !L.helm && !L.cowl) {
    rr(c, side ? -12 : -11, hy - 4, side ? 12 : 22, up ? 20 : 17, 7, tint(L.hairC));
  }
  if (L.hair === 2 && (up || side) && !L.hood && !L.cowl) {
    c.fillStyle = tint(L.hairC);
    c.beginPath();
    c.ellipse(side ? -10 : 0, hy + 6, 3.5, 7, side ? 0.5 : 0, 0, TAU);
    c.fill();
    c.stroke();
  }
  if (L.cowl) {
    circ(c, 0, hy + 1, 12.5, tint(L.cowl));
  }
  if (side) rr(c, -3 + sw * -5, armY, 6, 11, 3, sh(sleeve, -0.25));
  // body
  c.save();
  c.scale(dw, 1);
  rr(c, -9, by, 18, 16, 6, cloth);
  if (L.bones) {
    c.strokeStyle = '#8a8272';
    c.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-6, by + 4 + i * 4);
      c.lineTo(6, by + 4 + i * 4);
      c.stroke();
    }
  } else if (L.wraps) {
    c.strokeStyle = 'rgba(120,100,70,.7)';
    c.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-8, by + 3 + i * 3.5);
      c.lineTo(8, by + 1 + i * 3.5);
      c.stroke();
    }
  } else if (L.fur) {
    c.fillStyle = sh(cloth, -0.12);
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.arc(i * 3.6, by + 15, 2.4, 0, Math.PI);
      c.fill();
    }
  } else {
    if (A) armorBody(c, A, by, up, side, tint, lw);
    c.fillStyle = A && A.trim ? tint(A.trim) : cloth2;
    c.fillRect(-8.5, by + 10, 17, 3);
    if (!up && !side) {
      c.fillStyle = '#f5c451';
      c.fillRect(-2, by + 10, 4, 3);
    }
    if (L.apron && !up) {
      c.lineWidth = lw;
      rr(c, -6, by + 4, 12, 13, 2, '#7a5a3a');
    }
    if (L.amulet && !up && !side) {
      c.strokeStyle = '#f5c451';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-4, by + 1);
      c.lineTo(0, by + 5);
      c.lineTo(4, by + 1);
      c.stroke();
      c.lineWidth = lw;
      c.strokeStyle = OUT;
      circ(c, 0, by + 6, 2.2, tint(L.amulet));
    }
  }
  c.restore();
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  if (L.cape && up) {
    c.fillStyle = tint(L.cape);
    c.beginPath();
    c.moveTo(-9 * dw, by + 1);
    c.quadraticCurveTo(0, by - 1, 9 * dw, by + 1);
    c.lineTo(11 * dw + sw, by + 21);
    c.quadraticCurveTo(0, by + 23, -11 * dw + sw, by + 21);
    c.closePath();
    c.fill();
    c.stroke();
  }
  // arms
  const hand = tint(L.gloves || L.skin);
  if (side) {
    rr(c, -3 + sw * 5, armY, 6, 11, 3, sleeve);
    circ(c, sw * 5, armY + 12, 3, hand);
  } else {
    const a1 = sw * 2;
    rr(c, -13 * dw, armY - 1 + a1, 6, 11, 3, sleeve);
    rr(c, 7 * dw, armY - 1 - a1, 6, 11, 3, sleeve);
    circ(c, -10 * dw, armY + 11 + a1, 3, hand);
    circ(c, 10 * dw, armY + 11 - a1, 3, hand);
  }
  if (A && A.k >= 1) {
    const pr = A.k === 2 ? 5 : 3.8,
      pc2 = tint(A.col),
      pads = side
        ? [[sw * 5 - 0.5, armY + 1]]
        : [
            [-10 * dw, armY + 1],
            [10 * dw, armY + 1],
          ];
    for (const [px, py] of pads) {
      c.beginPath();
      c.ellipse(px, py, pr + 1, pr, 0, Math.PI, 0);
      c.lineTo(px + pr + 1, py + 2);
      c.lineTo(px - pr - 1, py + 2);
      c.closePath();
      c.fillStyle = pc2;
      c.fill();
      c.stroke();
      if (A.k === 2) {
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath();
        c.ellipse(px - 1.5, py - 1.5, 2, 1.1, -0.4, 0, TAU);
        c.fill();
      }
      if (A.trim) {
        c.fillStyle = tint(A.trim);
        c.fillRect(px - pr, py + 0.5, pr * 2, 1.5);
      }
    }
  }
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
      ear(-1);
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
      ear(-1);
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
      c.ellipse(side ? 3 : 0, hy + 1, 6.5, 7, 0, 0, TAU);
      c.fill();
      c.fillStyle = L.eyes || '#7ef0ff';
      c.beginPath();
      if (side) c.arc(5, hy, 1.8, 0, TAU);
      else {
        c.arc(-2.6, hy, 1.7, 0, TAU);
        c.arc(2.6, hy, 1.7, 0, TAU);
      }
      c.fill();
    }
  } else {
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
      c.fillStyle = tint(L.hairC);
      c.beginPath();
      if (up) c.rect(-HR, hy - HR, HR * 2, HR * 2);
      else if (side) {
        c.moveTo(-HR, hy + HR);
        c.lineTo(-HR, hy - HR);
        c.lineTo(HR, hy - HR);
        c.lineTo(HR, hy - 3);
        c.quadraticCurveTo(4, hy - 5, 1, hy - 2);
        c.quadraticCurveTo(-1, hy + 3, -2, hy + HR);
      } else {
        c.moveTo(-HR, hy + 2);
        c.lineTo(-HR, hy - HR);
        c.lineTo(HR, hy - HR);
        c.lineTo(HR, hy + 2);
        c.quadraticCurveTo(HR - 2, hy - 4, 5, hy - 4);
        c.quadraticCurveTo(2, hy - 2, 0, hy - 5);
        c.quadraticCurveTo(-3, hy - 2, -6, hy - 4);
        c.quadraticCurveTo(-HR + 2, hy - 4, -HR, hy + 2);
      }
      c.fill();
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
    c.beginPath();
    c.arc(0, hy, HR, 0, TAU);
    c.stroke();
    if (!up) {
      const ec = L.eyes || OUT;
      c.fillStyle = ec;
      if (side) {
        c.beginPath();
        c.ellipse(5.5, hy + 1.5, 1.5, 2.1, 0, 0, TAU);
        c.fill();
      } else {
        c.beginPath();
        c.ellipse(-3.6, hy + 1.5, 1.5, 2.1, 0, 0, TAU);
        c.ellipse(3.6, hy + 1.5, 1.5, 2.1, 0, 0, TAU);
        c.fill();
        if (!L.eyes) {
          c.fillStyle = '#fff';
          c.beginPath();
          c.arc(-3.1, hy + 0.8, 0.6, 0, TAU);
          c.arc(4.1, hy + 0.8, 0.6, 0, TAU);
          c.fill();
        }
      }
      if (L.angry && !side) {
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(-6, hy - 2.5);
        c.lineTo(-1.5, hy - 0.8);
        c.moveTo(6, hy - 2.5);
        c.lineTo(1.5, hy - 0.8);
        c.stroke();
        c.lineWidth = lw;
      }
      if (!L.bones && !L.wraps && !side && !L.eyes) {
        c.fillStyle = 'rgba(255,110,110,.35)';
        c.beginPath();
        c.arc(-6, hy + 5, 1.8, 0, TAU);
        c.arc(6, hy + 5, 1.8, 0, TAU);
        c.fill();
      }
      if (L.bones) {
        c.fillStyle = OUT;
        c.fillRect(side ? 3 : -3, hy + 5, side ? 4 : 6, 1.5);
      }
      if (L.tusks) {
        c.fillStyle = '#fffbe8';
        c.lineWidth = 1;
        for (const k of side ? [1] : [-1, 1]) {
          const bx = side ? 4 : 0;
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
        c.moveTo(-8, hy + 3);
        c.quadraticCurveTo(-7, hy + 15, 0, hy + 16);
        c.quadraticCurveTo(7, hy + 15, 8, hy + 3);
        c.quadraticCurveTo(0, hy + 8, -8, hy + 3);
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
      if (!up && !side) rr(c, -1.2, hy - 1, 2.4, 5, 1, tint(L.helm));
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
  c.restore();
}
function armorBody(c, A, by, up, side, tint, lw) {
  const ac = tint(A.col),
    dk = sh(A.col, -0.35);
  c.lineWidth = lw;
  c.strokeStyle = OUT;
  if (A.k === 0) {
    const lc = tint(mixCol(A.col, '#8a5a36', 0.55));
    rr(c, -8, by + 0.5, 16, 12, 5, lc);
    c.strokeStyle = sh(mixCol(A.col, '#8a5a36', 0.55), -0.35);
    c.lineWidth = 1;
    c.setLineDash([1.5, 1.5]);
    c.beginPath();
    c.moveTo(-5.5, by + 3);
    c.lineTo(-5.5, by + 10);
    c.moveTo(5.5, by + 3);
    c.lineTo(5.5, by + 10);
    if (!up && !side) {
      c.moveTo(-3, by + 2);
      c.lineTo(0, by + 6);
      c.lineTo(3, by + 2);
    }
    c.stroke();
    c.setLineDash([]);
  } else if (A.k === 1) {
    rr(c, -9, by, 18, 14, 6, ac);
    c.save();
    c.beginPath();
    c.rect(-8, by + 1, 16, 12);
    c.clip();
    c.strokeStyle = dk;
    c.lineWidth = 0.9;
    for (let r = 0; r < 5; r++)
      for (let k = -5; k <= 5; k++) {
        c.beginPath();
        c.arc(k * 3 + (r % 2) * 1.5, by + 2 + r * 2.6, 1.6, 0, Math.PI);
        c.stroke();
      }
    c.restore();
  } else {
    rr(c, -9, by, 18, 13, 6, ac);
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.ellipse(side ? 2 : -3.5, by + 4, side ? 3 : 3.5, 2.2, -0.3, 0, TAU);
    c.fill();
    c.strokeStyle = dk;
    c.lineWidth = 1.1;
    c.beginPath();
    if (!side) {
      c.moveTo(0, by + 1.5);
      c.lineTo(0, by + 9);
    }
    c.moveTo(-8, by + 8.5);
    c.quadraticCurveTo(0, by + 11, 8, by + 8.5);
    c.stroke();
  }
  if (A.trim) {
    c.strokeStyle = tint(A.trim);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-8, by + 1.2);
    c.quadraticCurveTo(0, by + (up ? 1.2 : 4), 8, by + 1.2);
    c.stroke();
  }
  c.lineWidth = lw;
  c.strokeStyle = OUT;
}
export function handPos(dx, dy, moving, walk, t, race, scale = 1) {
  const { f, flip } = faceOf(dx, dy),
    bob = moving ? Math.abs(Math.sin(walk)) * 2.2 : Math.sin(t * 2.4) * 0.6,
    sw = moving ? Math.sin(walk) : 0,
    dw = race === 'dwarf' ? 1.15 : 1,
    by = -27 - bob,
    armY = by + 4;
  if (f === 'side')
    return { x: (flip ? -1 : 1) * sw * 5 * scale, y: (armY + 12) * scale, f, flip, behind: false };
  if (f === 'down')
    return { x: 10 * dw * scale, y: (armY + 11 - sw * 2) * scale, f, flip, behind: false };
  return { x: -10 * dw * scale, y: (armY + 11 + sw * 2) * scale, f, flip, behind: true };
}
export function restAng(h, cls) {
  if (cls === 'ranger' || cls === 'bow')
    return h.f === 'side' ? (h.flip ? Math.PI : 0) : h.f === 'down' ? Math.PI / 2 : -Math.PI / 2;
  if (cls === 'mage' || cls === 'staff')
    return h.f === 'side' ? (h.flip ? -0.25 : 0.25) : h.f === 'down' ? 0.15 : -0.15;
  if (h.f === 'side') return h.flip ? Math.PI - 0.5 : 0.5;
  return h.f === 'down' ? Math.PI / 2 - 0.6 : -Math.PI / 2 - 0.6;
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
    c.scale(0.78, 0.78);
    c.translate(-4, 0);
    const bl = col || '#dfe6ee';
    if (kind === 'club') {
      rr(c, 0, -3, 22, 6, 3, '#7a5230');
      circ(c, 22, 0, 6.5, '#8a5f38');
      c.fillStyle = '#ccc';
      c.fillRect(20, -8, 2, 4);
    } else if (kind === 'axe' || style === 1) {
      rr(c, 0, -2.5, 30, 5, 2, '#7a5230');
      c.beginPath();
      c.moveTo(20, -2);
      c.quadraticCurveTo(32, -16, 30, -2);
      c.lineTo(30, 3);
      c.quadraticCurveTo(32, 15, 20, 3);
      c.closePath();
      c.fillStyle = bl;
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.7)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(29, -9);
      c.quadraticCurveTo(31, 0, 29, 9);
      c.stroke();
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
