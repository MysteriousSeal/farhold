import { resetLeft } from '../../model/game/dungeons';
import { fmtClock } from '../../core/format';
import { circ, rr, shadow } from '../dom';
import { OUT, TAU, rand, sh } from '../../core/math';
import { addLight } from '../../model/game/fx';
import { game } from '../../model/game/state';
/* ================= ART: buildings & props ================= */
export function drawStall(c, v, t, pos = v.stall, awning = '#3f7fbf', goods = 'fruit') {
  const x0 = pos.x,
    y0 = pos.y;
  c.save();
  c.translate(x0, y0);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  shadow(c, 0, 2, 40, 8);
  rr(c, -32, -46, 4, 46, 1, '#6b4423');
  rr(c, 28, -46, 4, 46, 1, '#6b4423');
  rr(c, -36, -22, 72, 22, 3, '#9a6a3e');
  c.fillStyle = 'rgba(0,0,0,.15)';
  c.fillRect(-36, -10, 72, 10);
  if (goods === 'potion') {
    // flasks of coloured potions
    for (const [col, gx] of [
      ['#e0483e', -24],
      ['#4f8fe0', -12],
      ['#62b24a', 0],
      ['#c872ff', 12],
      ['#e0483e', 24],
    ] as [string, number][]) {
      rr(c, gx - 1.8, -36, 3.6, 6, 1, '#d8e8f0');
      circ(c, gx, -26, 5, col);
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.beginPath();
      c.arc(gx - 1.8, -27.8, 1.4, 0, TAU);
      c.fill();
    }
  } else if (goods === 'fine') {
    // gems and gold
    for (const [col, gx] of [
      ['#4fa6ff', -24],
      ['#c872ff', -8],
      ['#62d86a', 8],
      ['#ffa63a', 24],
    ] as [string, number][]) {
      c.beginPath();
      c.moveTo(gx, -34);
      c.lineTo(gx + 5, -28);
      c.lineTo(gx, -22);
      c.lineTo(gx - 5, -28);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.fillRect(gx - 2, -31, 2, 2);
    }
    circ(c, 0, -25, 3, '#f5c451');
  } else {
    const fruit = [
      ['#e0483e', -26],
      ['#f5c451', -14],
      ['#62b24a', -2],
      ['#e0483e', 10],
      ['#c872ff', 22],
    ] as [string, number][];
    for (const [col, gx] of fruit) {
      circ(c, gx, -26, 4.5, col);
      c.fillStyle = 'rgba(255,255,255,.5)';
      c.beginPath();
      c.arc(gx - 1.5, -27.5, 1.3, 0, TAU);
      c.fill();
    }
  }
  c.beginPath();
  c.moveTo(-40, -44);
  c.lineTo(40, -44);
  c.lineTo(36, -58);
  c.lineTo(-36, -58);
  c.closePath();
  c.fillStyle = '#fff6e0';
  c.fill();
  c.stroke();
  c.save();
  c.clip();
  for (let i = -40; i < 40; i += 16) {
    c.fillStyle = awning;
    c.fillRect(i, -60, 8, 18);
  }
  c.restore();
  for (let i = -40; i < 40; i += 8) {
    c.beginPath();
    c.moveTo(i, -44);
    c.quadraticCurveTo(i + 4, -38, i + 8, -44);
    c.fillStyle = (i / 8) % 2 ? '#fff6e0' : awning;
    c.fill();
    c.stroke();
  }
  c.restore();
}
export function drawBoard(c, v, t, has) {
  const x0 = v.board.x,
    y0 = v.board.y;
  c.save();
  c.translate(x0, y0);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  shadow(c, 0, 2, 26, 6);
  rr(c, -22, -44, 4, 44, 1, '#6b4423');
  rr(c, 18, -44, 4, 44, 1, '#6b4423');
  rr(c, -26, -46, 52, 30, 3, '#9a6a3e');
  const notes = [
    [-20, -42, '#fff6e0'],
    [-4, -40, '#f5e0b0'],
    [10, -43, '#fff6e0'],
    [-14, -30, '#f5e0b0'],
    [4, -29, '#fff6e0'],
  ] as [number, number, string][];
  for (const [nx, ny, col] of notes) {
    c.save();
    c.translate(nx + 6, ny + 6);
    c.rotate((nx % 5) * 0.04);
    rr(c, -6, -6, 13, 11, 1, col);
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.fillRect(-4, -3, 8, 1);
    c.fillRect(-4, 0, 6, 1);
    c.fillStyle = '#e0483e';
    c.beginPath();
    c.arc(0, -6, 1.4, 0, TAU);
    c.fill();
    c.restore();
  }
  rr(c, -30, -52, 60, 7, 2, '#6b4423');
  if (has) {
    const b = Math.sin(t * 4) * 3;
    c.font = '800 22px Fredoka,sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 4;
    c.strokeText('!', 0, -60 + b);
    c.fillStyle = '#f5c451';
    c.fillText('!', 0, -60 + b);
  }
  c.restore();
}
export function drawWaystone(c, v, t, on) {
  const x0 = v.way.x,
    y0 = v.way.y;
  c.save();
  c.translate(x0, y0);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  shadow(c, 0, 0, 22, 7, 0.3);
  c.beginPath();
  c.ellipse(0, -2, 22, 8, 0, 0, TAU);
  c.fillStyle = '#8a8898';
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-10, -4);
  c.lineTo(-8, -50);
  c.lineTo(0, -62);
  c.lineTo(8, -50);
  c.lineTo(10, -4);
  c.closePath();
  c.fillStyle = '#a8a6b8';
  c.fill();
  c.stroke();
  c.fillStyle = '#c8c6d8';
  c.beginPath();
  c.moveTo(-8, -6);
  c.lineTo(-6, -49);
  c.lineTo(0, -59);
  c.lineTo(-2, -8);
  c.fill();
  const col = on ? '#6ae4ff' : '#6a6a80',
    pulse = on ? 0.6 + Math.sin(t * 3) * 0.3 : 0.3;
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.globalAlpha = 0.4 + pulse * 0.6;
  c.beginPath();
  c.moveTo(0, -44);
  c.lineTo(-4, -36);
  c.lineTo(0, -28);
  c.lineTo(4, -36);
  c.closePath();
  c.moveTo(0, -24);
  c.lineTo(0, -14);
  c.stroke();
  if (on) {
    c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(0, -36, 2, 0, -36, 34);
    gr.addColorStop(0, 'rgba(106,228,255,.5)');
    gr.addColorStop(1, 'rgba(106,228,255,0)');
    c.fillStyle = gr;
    c.fillRect(-40, -76, 80, 80);
  }
  c.restore();
  if (on) {
    addLight(x0, y0 - 36, 120, 0.8, '#6ae4ff');
    if (Math.random() < 0.15)
      game.parts.push({
        x: x0 + rand(-14, 14),
        y: y0 - rand(0, 30),
        vx: 0,
        vy: rand(-30, -15),
        life: 1.2,
        max: 1.2,
        col: '#8ef0ff',
        sz: 2.5,
        g: 0,
        glow: 1,
      });
  }
}
/** Street lamp: always lit, with a soft halo by day that grows at night. */
export function drawLamp(c, l, t, dark) {
  const lx = l.x + 9,
    ly = l.y - 37,
    flick = 0.93 + Math.sin(t * 7 + l.x) * 0.04 + Math.sin(t * 13 + l.y) * 0.03;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const R = 24 + dark * 36,
    g = c.createRadialGradient(lx, ly, 2, lx, ly, R);
  g.addColorStop(0, 'rgba(255,205,120,' + ((0.24 + dark * 0.36) * flick).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(255,185,90,0)');
  c.fillStyle = g;
  c.fillRect(lx - R, ly - R, R * 2, R * 2);
  c.restore();
  c.save();
  c.translate(l.x, l.y);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  shadow(c, 0, 0, 8, 3);
  rr(c, -4.5, -6, 9, 6, 2, '#3a2e26');
  rr(c, -2, -47, 4, 42, 1, '#4a3a2e');
  rr(c, -2, -50, 15, 3.5, 1.5, '#4a3a2e');
  rr(c, 4, -46, 10, 3.5, 1.5, '#3a2e26');
  rr(c, 5, -43, 8, 11, 2, '#ffd27a');
  c.fillStyle = 'rgba(255,248,220,' + (0.8 * flick).toFixed(3) + ')';
  c.fillRect(7, -41, 4, 7);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(9, -43);
  c.lineTo(9, -32);
  c.stroke();
  c.lineWidth = 2.2;
  rr(c, 4, -32, 10, 3, 1.2, '#3a2e26');
  c.restore();
  if (dark > 0.15) addLight(lx, ly, 120, 0.9 * dark, '#ffc060');
}
export function drawPillar(c, p, t) {
  c.save();
  c.translate(p.x, p.y);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  shadow(c, 0, 0, 16, 6, 0.3);
  rr(c, -15, -8, 30, 8, 2, '#8a8898');
  rr(c, -11, -p.h - 8, 22, p.h, 2, '#a8a6b8');
  c.fillStyle = 'rgba(0,0,0,.12)';
  c.fillRect(-11 + 15, -p.h - 8, 7, p.h);
  c.strokeStyle = 'rgba(0,0,0,.25)';
  c.lineWidth = 1.3;
  for (let i = -6; i <= 6; i += 6) {
    c.beginPath();
    c.moveTo(i, -p.h - 6);
    c.lineTo(i, -10);
    c.stroke();
  }
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  if (p.broken) {
    c.beginPath();
    c.moveTo(-11, -p.h - 8);
    c.lineTo(-6, -p.h - 14);
    c.lineTo(0, -p.h - 9);
    c.lineTo(5, -p.h - 16);
    c.lineTo(11, -p.h - 8);
    c.fillStyle = '#a8a6b8';
    c.fill();
    c.stroke();
  } else {
    rr(c, -14, -p.h - 14, 28, 7, 2, '#8a8898');
  }
  c.restore();
}
export function drawCave(c, p, t) {
  c.save();
  c.translate(p.x, p.y);
  c.lineWidth = 2.4;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  const rc =
    p.b === 4
      ? ['#b8c8dc', '#dfeaf6']
      : p.b === 3
        ? ['#c49060', '#e6b88a']
        : p.b === 6
          ? ['#6d6080', '#9a8cb0']
          : ['#8a8a84', '#b4b4ac'];
  shadow(c, 0, 0, 80, 20, 0.3);
  c.beginPath();
  c.moveTo(-78, 0);
  c.quadraticCurveTo(-86, -50, -50, -78);
  c.quadraticCurveTo(-20, -104, 14, -96);
  c.quadraticCurveTo(60, -94, 76, -56);
  c.quadraticCurveTo(88, -24, 78, 0);
  c.closePath();
  c.fillStyle = rc[0];
  c.fill();
  c.stroke();
  c.fillStyle = rc[1];
  c.beginPath();
  c.moveTo(-60, -54);
  c.quadraticCurveTo(-40, -90, 0, -92);
  c.quadraticCurveTo(-30, -78, -44, -50);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)';
  c.lineWidth = 2;
  for (const [a, b, cc, d] of [
    [-60, -20, -40, -36],
    [40, -70, 56, -40],
    [20, -84, 36, -80],
    [-30, -70, -10, -76],
  ]) {
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(cc, d);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(-28, 0);
  c.quadraticCurveTo(-30, -52, 0, -54);
  c.quadraticCurveTo(30, -52, 28, 0);
  c.closePath();
  c.fillStyle = '#120c16';
  c.fill();
  c.stroke();
  const gr = c.createLinearGradient(0, -54, 0, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(60,40,80,.35)');
  c.fillStyle = gr;
  c.fill();
  rr(c, -26, -50, 4, 50, 1, '#6b4423');
  rr(c, 22, -50, 4, 50, 1, '#6b4423');
  rr(c, -30, -54, 60, 6, 2, '#7a5230');
  for (const k of [-1, 1]) {
    rr(c, k * 40 - 2, -30, 4, 30, 1, '#4a3a2e');
    const fx = k * 40,
      fy = -34;
    c.fillStyle = '#ff9a2e';
    c.beginPath();
    c.moveTo(fx - 4, fy + 2);
    c.quadraticCurveTo(fx - 5, fy - 6, fx + Math.sin(t * 11 + k) * 1.5, fy - 12);
    c.quadraticCurveTo(fx + 5, fy - 6, fx + 4, fy + 2);
    c.fill();
    c.fillStyle = '#ffe27a';
    c.beginPath();
    c.arc(fx, fy - 2, 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
  addLight(p.x - 40, p.y - 36, 110, 0.9, '#ff9a3a');
  addLight(p.x + 40, p.y - 36, 110, 0.9, '#ff9a3a');
  c.save();
  c.font = '600 11px Fredoka,sans-serif';
  c.textAlign = 'center';
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(20,15,30,.85)';
  const tx = p.name + '  Lv ' + p.lvl;
  c.strokeText(tx, p.x, p.y - 108);
  c.fillStyle = game.P && game.P.cleared[p.key] ? '#b8e8a0' : '#ffe0a0';
  c.fillText(tx, p.x, p.y - 108);
  const left = resetLeft(p.key);
  if (left > 0) {
    const w = 'Cleared · resets in ' + fmtClock(left);
    c.font = '700 10px Fredoka,sans-serif';
    c.strokeText(w, p.x, p.y - 94);
    c.fillStyle = '#ffb35a';
    c.fillText(w, p.x, p.y - 94);
  }
  c.restore();
}
/** Ruined stone gate: the door to the built dungeon. Stairs go down through the arch. */
export function drawStoneGate(c, p, t) {
  c.save();
  c.translate(p.x, p.y);
  c.lineWidth = 2.4;
  c.strokeStyle = OUT;
  c.lineJoin = 'miter';
  c.miterLimit = 2;
  const rc =
    p.b === 4
      ? ['#b8c8dc', '#dfeaf6']
      : p.b === 3
        ? ['#c49060', '#e6b88a']
        : p.b === 6
          ? ['#6d6080', '#9a8cb0']
          : ['#8a8a84', '#b4b4ac'];
  shadow(c, 0, 4, 78, 16, 0.32);
  c.beginPath();
  c.moveTo(-82, 0);
  c.lineTo(-82, -40);
  c.lineTo(-70, -46);
  c.lineTo(-64, -38);
  c.lineTo(-50, -52);
  c.lineTo(-38, -46);
  c.lineTo(-34, -64);
  c.lineTo(28, -64);
  c.lineTo(36, -50);
  c.lineTo(48, -56);
  c.lineTo(58, -42);
  c.lineTo(70, -48);
  c.lineTo(78, -34);
  c.lineTo(82, -30);
  c.lineTo(82, 0);
  c.closePath();
  c.fillStyle = rc[0];
  c.fill();
  c.stroke();
  c.fillStyle = rc[1];
  c.beginPath();
  c.moveTo(-76, -6);
  c.lineTo(-76, -34);
  c.lineTo(-60, -40);
  c.lineTo(-56, -26);
  c.lineTo(-44, -34);
  c.lineTo(-38, -16);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,.28)';
  c.lineWidth = 1.7;
  c.beginPath();
  for (const [x0, y, x1] of [
    [-78, -16, -40],
    [-74, -30, -38],
    [40, -16, 76],
    [44, -32, 66],
    [-26, -58, 22],
  ]) {
    c.moveTo(x0, y);
    c.lineTo(x1, y);
  }
  c.moveTo(60, -6);
  c.lineTo(66, -38);
  c.stroke();
  const arch = () => {
    c.beginPath();
    c.moveTo(-26, 0);
    c.lineTo(-26, -30);
    c.quadraticCurveTo(-26, -54, 0, -54);
    c.quadraticCurveTo(26, -54, 26, -30);
    c.lineTo(26, 0);
    c.closePath();
  };
  c.strokeStyle = OUT;
  c.lineWidth = 2.4;
  c.lineJoin = 'round';
  arch();
  c.fillStyle = '#120c16';
  c.fill();
  c.save();
  arch();
  c.clip();
  for (let i = 0; i < 4; i++) {
    const w = 46 - i * 8,
      y = -1 - i * 10;
    rr(c, -w / 2, y - 8, w, 8, 1, sh(rc[0], -0.05 - i * 0.16));
  }
  const hole = c.createLinearGradient(0, -54, 0, -8);
  hole.addColorStop(0, 'rgba(8,6,12,.72)');
  hole.addColorStop(1, 'rgba(8,6,12,0)');
  c.fillStyle = hole;
  c.fillRect(-26, -54, 52, 30);
  c.restore();
  arch();
  c.stroke();
  c.fillStyle = rc[0];
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(64, -2);
  c.lineTo(68, -13);
  c.lineTo(80, -11);
  c.lineTo(82, -1);
  c.closePath();
  c.fill();
  c.stroke();
  if (p.b !== 3) {
    c.fillStyle = p.b === 4 ? '#d7e7f4' : p.b === 6 ? '#7d6a96' : '#5f8a3e';
    c.strokeStyle = p.b === 4 ? '#9bb4c8' : p.b === 6 ? '#4a3a5c' : '#3d5a28';
    c.lineWidth = 1.6;
    for (const [mx, my, rx, ry] of [
      [-72, -4, 7, 3.4],
      [-62, -2, 5, 2.6],
      [-54, -5, 4, 2.4],
    ]) {
      c.beginPath();
      c.ellipse(mx, my, rx, ry, 0, 0, TAU);
      c.fill();
      c.stroke();
    }
  }
  for (const k of [-1, 1]) {
    rr(c, k * 50 - 2, -32, 4, 32, 1, '#4a3a2e');
    const fx = k * 50,
      fy = -36;
    c.fillStyle = '#ff9a2e';
    c.beginPath();
    c.moveTo(fx - 4, fy + 2);
    c.quadraticCurveTo(fx - 5, fy - 6, fx + Math.sin(t * 11 + k) * 1.5, fy - 12);
    c.quadraticCurveTo(fx + 5, fy - 6, fx + 4, fy + 2);
    c.fill();
    c.fillStyle = '#ffe27a';
    c.beginPath();
    c.arc(fx, fy - 2, 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
  addLight(p.x - 50, p.y - 38, 110, 0.9, '#ff9a3a');
  addLight(p.x + 50, p.y - 38, 110, 0.9, '#ff9a3a');
  c.save();
  c.font = '600 11px Fredoka,sans-serif';
  c.textAlign = 'center';
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(20,15,30,.85)';
  const tx = p.name + '  Lv ' + p.lvl;
  c.strokeText(tx, p.x, p.y - 96);
  c.fillStyle = game.P && game.P.cleared[p.key] ? '#b8e8a0' : '#ffe0a0';
  c.fillText(tx, p.x, p.y - 96);
  const left = resetLeft(p.key);
  if (left > 0) {
    const w = 'Cleared · resets in ' + fmtClock(left);
    c.font = '700 10px Fredoka,sans-serif';
    c.strokeText(w, p.x, p.y - 82);
    c.fillStyle = '#ffb35a';
    c.fillText(w, p.x, p.y - 82);
  }
  c.restore();
}
