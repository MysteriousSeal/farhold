import { OUT, TAU, clamp } from '../../core/math';
import { ET } from '../../data/enemies';
import { game } from '../../game/state';
/* ================= ART: enemy health bars, labels and elite visuals ================= */
/** Level colour by difficulty relative to the player (WoW-style). */
export function levelColor(diff: number) {
  return diff <= -6
    ? '#a0a0a0'
    : diff <= -3
      ? '#62d86a'
      : diff <= 2
        ? '#ffe14a'
        : diff <= 5
          ? '#ffa63a'
          : '#ff5a4a';
}
/** Overhead health bar with "level name" label, always shown for living enemies. */
export function enemyPlate(c, e) {
  const boss = !!e.boss,
    w = boss ? 70 : Math.round(38 * Math.min(e.sc, 1.4)),
    h = boss ? 8 : 6,
    y = e.y - (e.hbY || 40) * e.sc - (boss ? 6 : 2),
    x0 = e.x - w / 2,
    k = clamp(e.hp / e.max, 0, 1),
    ks = clamp(e.hpShow / e.max, 0, 1);
  c.save();
  c.lineJoin = 'round';
  // bar: dark back, trailing damage flash, health fill with a highlight, outline
  c.beginPath();
  if (c.roundRect) c.roundRect(x0, y, w, h, h / 2);
  else c.rect(x0, y, w, h);
  c.fillStyle = 'rgba(20,15,30,.9)';
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = '#ffe0b0';
  c.fillRect(x0, y, w * ks, h);
  c.fillStyle = boss ? '#c8304a' : e.elite ? '#ff9a2a' : '#e8453a';
  c.fillRect(x0, y, w * k, h);
  c.fillStyle = 'rgba(255,255,255,.28)';
  c.fillRect(x0, y, w * k, h * 0.4);
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 1.6;
  c.stroke();
  if (e.elite && !boss) {
    // gold rim, winged emblem on the left and the affix symbol on the right
    c.strokeStyle = '#f5c451';
    c.lineWidth = 1;
    c.stroke();
    eliteEmblem(c, x0 - 7, y + h / 2);
    affixIcon(c, e.elite, x0 + w + 8, y + h / 2);
  }
  // label: coloured level (skull when far above you) + name
  const diff = e.lvl - (game.P ? game.P.lvl : e.lvl),
    lvl = diff >= 10 ? '☠' : String(e.lvl),
    name = ' ' + (e.elite ? e.elite + ' ' : '') + (e.name || ET[e.type].n);
  c.font = (boss ? '700 12px' : '600 10px') + ' Fredoka,sans-serif';
  c.textBaseline = 'alphabetic';
  const lw = c.measureText(lvl).width,
    nw = c.measureText(name).width,
    tx = e.x - (lw + nw) / 2,
    ty = y - 3;
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(0,0,0,.85)';
  c.textAlign = 'left';
  c.strokeText(lvl, tx, ty);
  c.strokeText(name, tx + lw, ty);
  c.fillStyle = levelColor(diff);
  c.fillText(lvl, tx, ty);
  c.fillStyle = boss ? '#ffd0c0' : e.elite ? '#ffd27a' : '#ffffff';
  c.fillText(name, tx + lw, ty);
  c.restore();
}

/** Soft pulsing gold ring on the ground under an elite. */
export function eliteAura(c, e, t) {
  const r = (e.r || 14) * 1.35 + 6,
    a = 0.35 + Math.sin(t * 3 + e.x * 0.01) * 0.15;
  c.save();
  c.strokeStyle = 'rgba(245,196,81,' + a.toFixed(3) + ')';
  c.lineWidth = 2.5;
  c.beginPath();
  c.ellipse(e.x, e.y + 1, r, r * 0.42, 0, 0, TAU);
  c.stroke();
  c.fillStyle = 'rgba(245,196,81,' + (a * 0.18).toFixed(3) + ')';
  c.fill();
  c.restore();
}
/** Gold winged star: the elite emblem at the left of the health bar. */
function eliteEmblem(c, x: number, y: number) {
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 2, -1);
    c.quadraticCurveTo(s * 9, -7, s * 11, -2);
    c.quadraticCurveTo(s * 8, -1, s * 9, 2);
    c.quadraticCurveTo(s * 6, 1, s * 2, 3);
    c.closePath();
    c.fillStyle = '#c9912c';
    c.fill();
    c.stroke();
  }
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5,
      r = k % 2 ? 2.6 : 6;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#f5c451';
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)';
  c.beginPath();
  c.arc(-1.2, -1.6, 1.1, 0, TAU);
  c.fill();
  c.restore();
}
/** Small symbol for an elite affix: Swift, Vampiric, Frenzied, Armored, Giant. */
function affixIcon(c, kind: string, x: number, y: number) {
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 1.4;
  c.beginPath();
  if (kind === 'Swift') {
    // double chevron (speed)
    for (const dx of [-3, 2]) {
      c.moveTo(dx - 2, -4);
      c.lineTo(dx + 2, 0);
      c.lineTo(dx - 2, 4);
    }
    c.lineWidth = 4;
    c.stroke();
    c.strokeStyle = '#8fd8ff';
    c.lineWidth = 2;
    c.stroke();
  } else if (kind === 'Vampiric') {
    // blood drop
    c.moveTo(0, -6);
    c.quadraticCurveTo(5, 0, 3.6, 3);
    c.arc(0, 2.4, 3.8, 0.2, Math.PI - 0.2);
    c.quadraticCurveTo(-5, 0, 0, -6);
    c.fillStyle = '#d8304a';
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.fillRect(-1.8, 0, 1.2, 2);
  } else if (kind === 'Frenzied') {
    // flame
    c.moveTo(0, -6.5);
    c.quadraticCurveTo(5, -1, 3.5, 3);
    c.quadraticCurveTo(2, 6, 0, 6);
    c.quadraticCurveTo(-4.5, 5.5, -4, 1);
    c.quadraticCurveTo(-3, -1, -1.5, -2);
    c.quadraticCurveTo(-0.5, -4, 0, -6.5);
    c.fillStyle = '#ff8a2a';
    c.fill();
    c.stroke();
    c.fillStyle = '#ffe14a';
    c.beginPath();
    c.ellipse(0.3, 2.4, 1.6, 2.4, 0, 0, TAU);
    c.fill();
  } else if (kind === 'Armored') {
    // shield
    c.moveTo(-4.5, -5);
    c.lineTo(4.5, -5);
    c.lineTo(4.5, 0);
    c.quadraticCurveTo(4, 4.5, 0, 6.5);
    c.quadraticCurveTo(-4, 4.5, -4.5, 0);
    c.closePath();
    c.fillStyle = '#9aa8c0';
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillRect(-3, -3.6, 1.6, 5);
  } else {
    // Giant: up arrow
    c.moveTo(0, -6.5);
    c.lineTo(5, -1);
    c.lineTo(2, -1);
    c.lineTo(2, 5.5);
    c.lineTo(-2, 5.5);
    c.lineTo(-2, -1);
    c.lineTo(-5, -1);
    c.closePath();
    c.fillStyle = '#62d86a';
    c.fill();
    c.stroke();
  }
  c.restore();
}
