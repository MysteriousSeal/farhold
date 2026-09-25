import { SPR } from './decor';
import { circ, ell, rr, shadow } from '../core/dom';
import { OUT, TAU, mulberry, rand, sh } from '../core/math';
import { addLight } from '../game/fx';
import { game } from '../game/state';
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
export function drawForge(c, v, t) {
  const x0 = v.forge.x,
    y0 = v.forge.y;
  c.save();
  c.translate(x0, y0);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  shadow(c, 0, 2, 40, 9);
  rr(c, -34, -50, 34, 50, 4, '#8a8278');
  c.fillStyle = 'rgba(0,0,0,.18)';
  for (let r = 0; r < 5; r++)
    for (let k = 0; k < 3; k++) c.fillRect(-32 + k * 11 + (r % 2) * 5, -48 + r * 10, 9, 1.5);
  rr(c, -28, -26, 22, 18, [10, 10, 2, 2], '#2a1a14');
  const fl = (s, col, k) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-26, -8);
    c.quadraticCurveTo(-24 - 3 * s, -18 * s, -17 + Math.sin(t * 10 + k) * 2, -24 * s);
    c.quadraticCurveTo(-10 + 3 * s, -18 * s, -8, -8);
    c.closePath();
    c.fill();
  };
  fl(1, '#e0483e', 0);
  fl(0.8, '#ff9a2e', 1);
  fl(0.55, '#ffe27a', 2);
  rr(c, -32, -56, 30, 8, 2, '#6a625a');
  rr(c, 6, -18, 24, 8, 3, '#4a4a52');
  rr(c, 12, -10, 10, 10, 1, '#3a3a42');
  c.beginPath();
  c.moveTo(30, -18);
  c.lineTo(38, -16);
  c.lineTo(30, -12);
  c.fillStyle = '#4a4a52';
  c.fill();
  c.stroke();
  rr(c, 24, -40, 14, 20, 2, '#7a5a3a');
  c.restore();
  addLight(x0 - 17, y0 - 18, 130, 0.9, '#ff8a3a');
  if (Math.random() < 0.2)
    game.parts.push({
      x: x0 - 17 + rand(-5, 5),
      y: y0 - 20,
      vx: rand(-10, 10),
      vy: rand(-50, -25),
      life: 0.7,
      max: 0.7,
      col: '#ffb13a',
      sz: 2,
      g: -10,
      glow: 1,
    });
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
  c.restore();
}
export function drawTorch(c, tr, t) {
  const x = tr.x,
    y = tr.y - 20;
  c.save();
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  rr(c, x - 3, y - 4, 6, 12, 1, '#5a4030');
  const f = 1 + Math.sin(t * 12 + tr.ph) * 0.15;
  c.fillStyle = '#ff7a2e';
  c.beginPath();
  c.moveTo(x - 5, y - 3);
  c.quadraticCurveTo(x - 6, y - 12 * f, x + Math.sin(t * 9 + tr.ph) * 2, y - 18 * f);
  c.quadraticCurveTo(x + 6, y - 12 * f, x + 5, y - 3);
  c.fill();
  c.fillStyle = '#ffe27a';
  c.beginPath();
  c.arc(x, y - 6, 2.6, 0, TAU);
  c.fill();
  c.restore();
  addLight(x, y - 8, 150 + Math.sin(t * 14 + tr.ph) * 8, 1, '#ff9a3a');
  if (Math.random() < 0.04)
    game.parts.push({
      x: x + rand(-3, 3),
      y: y - 14,
      vx: rand(-6, 6),
      vy: rand(-40, -20),
      life: 0.8,
      max: 0.8,
      col: '#ffb13a',
      sz: 1.8,
      g: -5,
      glow: 1,
    });
}
export function drawProp(c, p, t) {
  const k = p.k;
  c.save();
  c.translate(p.x, p.y);
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  if (k === 'barrel') {
    shadow(c, 0, 0, 11, 4);
    rr(c, -10, -24, 20, 24, 6, '#8a5a36');
    c.strokeStyle = '#4a3a2e';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-10, -18);
    c.lineTo(10, -18);
    c.moveTo(-10, -6);
    c.lineTo(10, -6);
    c.stroke();
    c.strokeStyle = OUT;
    c.lineWidth = 2;
    ell(c, 0, -24, 9, 3, '#a8764a');
  } else if (k === 'crate') {
    shadow(c, 0, 0, 12, 4);
    rr(c, -11, -20, 22, 20, 2, '#a8784a');
    c.strokeStyle = '#6b4a32';
    c.beginPath();
    c.moveTo(-9, -18);
    c.lineTo(9, -2);
    c.moveTo(9, -18);
    c.lineTo(-9, -2);
    c.stroke();
  } else if (k === 'bones') {
    const s = SPR.bones;
    c.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
  } else if (k === 'web') {
    // cobweb: irregular spokes, sagging spiral threads, a torn strand, dewdrops, maybe a spider
    const rnd = mulberry(((p.x * 73 + p.y * 151) | 0) ^ 0x5bd1),
      n = 9 + ((rnd() * 3) | 0),
      spokes: number[][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (rnd() - 0.5) * 0.35,
        r = 22 * (0.72 + rnd() * 0.4);
      spokes.push([Math.cos(a) * r, Math.sin(a) * r * 0.72]);
    }
    shadow(c, 0, 5, 18, 5, 0.1);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(242,242,252,.6)';
    c.lineWidth = 1.1;
    c.beginPath();
    for (const [sx, sy] of spokes) {
      c.moveTo(0, 0);
      c.lineTo(sx, sy);
    }
    c.stroke();
    const torn = (rnd() * n) | 0;
    c.strokeStyle = 'rgba(236,238,250,.5)';
    c.lineWidth = 0.9;
    c.beginPath();
    for (let f = 0.2; f < 0.98; f += 0.12)
      for (let i = 0; i < n; i++) {
        if (f > 0.85 && i === torn) continue;
        const [ax, ay] = spokes[i],
          [bx, by] = spokes[(i + 1) % n];
        c.moveTo(ax * f, ay * f);
        c.quadraticCurveTo(((ax + bx) / 2) * f * 0.84, ((ay + by) / 2) * f * 0.84, bx * f, by * f);
      }
    c.stroke();
    // loose end of the torn strand
    const [tx, ty] = spokes[torn];
    c.beginPath();
    c.moveTo(tx * 0.92, ty * 0.92);
    c.quadraticCurveTo(tx * 0.95 + 3, ty * 0.95 + 7, tx * 0.9 + 1, ty * 0.9 + 11);
    c.stroke();
    // dewdrops
    for (let d = 0; d < 5; d++) {
      const [sx, sy] = spokes[(rnd() * n) | 0],
        f = 0.3 + rnd() * 0.6;
      c.fillStyle =
        'rgba(210,240,255,' + (0.55 + 0.4 * Math.sin(t * 2.5 + d * 1.7)).toFixed(3) + ')';
      c.beginPath();
      c.arc(sx * f, sy * f, 1.1, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(245,245,255,.7)';
    c.beginPath();
    c.arc(0, 0, 1.8, 0, TAU);
    c.fill();
    if (rnd() < 0.35) {
      // a small spider on the hub
      c.strokeStyle = '#1e1624';
      c.lineWidth = 1.1;
      c.beginPath();
      for (const s of [-1, 1])
        for (let l = 0; l < 4; l++) {
          const ly = -2 + l * 1.6;
          c.moveTo(0, ly);
          c.quadraticCurveTo(s * 4, ly - 3 + l, s * (5.5 + (l % 2)), ly + 1 + l * 0.6);
        }
      c.stroke();
      c.fillStyle = '#2a1d2c';
      c.beginPath();
      c.ellipse(0, 1, 2.8, 3.2, 0, 0, TAU);
      c.ellipse(0, -2.6, 1.8, 1.6, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#ff5a4a';
      c.fillRect(-1, -3, 0.9, 0.9);
      c.fillRect(0.2, -3, 0.9, 0.9);
    }
  } else if (k === 'rubble') {
    for (const [a, b, r] of [
      [-6, -2, 5],
      [5, -1, 4],
      [0, -6, 3.5],
    ])
      circ(c, a, b, r, '#6a6278');
  }
  c.restore();
}
export function drawChest(c, ch, t) {
  c.save();
  c.translate(ch.x, ch.y);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  shadow(c, 0, 0, 20, 6);
  rr(c, -18, -20, 36, 20, 3, '#8a5a36');
  c.fillStyle = '#f5c451';
  c.fillRect(-18, -12, 36, 3);
  if (ch.open) {
    c.beginPath();
    c.moveTo(-18, -20);
    c.lineTo(-16, -34);
    c.lineTo(16, -34);
    c.lineTo(18, -20);
    c.closePath();
    c.fillStyle = '#6b4423';
    c.fill();
    c.stroke();
    c.fillStyle = '#2a1a14';
    c.fillRect(-15, -22, 30, 4);
  } else {
    c.beginPath();
    c.moveTo(-18, -20);
    c.quadraticCurveTo(0, -34, 18, -20);
    c.closePath();
    c.fillStyle = '#a8764a';
    c.fill();
    c.stroke();
    rr(c, -3, -18, 6, 7, 1, '#f5c451');
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.3 + Math.sin(t * 3) * 0.15;
    const gr = c.createRadialGradient(0, -14, 2, 0, -14, 40);
    gr.addColorStop(0, '#ffd27a');
    gr.addColorStop(1, 'rgba(255,210,122,0)');
    c.fillStyle = gr;
    c.fillRect(-40, -54, 80, 80);
  }
  c.restore();
  if (!ch.open) addLight(ch.x, ch.y - 14, 110, 0.6, '#ffd27a');
}
export function drawStairs(c, s, t) {
  c.save();
  c.translate(s.x, s.y);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  for (let i = 0; i < 4; i++) {
    rr(c, -22 + i * 2, -12 + i * 7 - 14, 44 - i * 4, 8, 2, sh('#9a90a8', -i * 0.12));
  }
  c.restore();
  addLight(s.x, s.y - 20, 140, 0.7, '#bfe6ff');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.22 + Math.sin(t * 2) * 0.08;
  const gr = c.createRadialGradient(s.x, s.y - 20, 4, s.x, s.y - 20, 60);
  gr.addColorStop(0, '#bfe6ff');
  gr.addColorStop(1, 'rgba(191,230,255,0)');
  c.fillStyle = gr;
  c.fillRect(s.x - 60, s.y - 80, 120, 120);
  c.restore();
}
export function drawDPillar(c, p) {
  c.save();
  c.translate(p.x, p.y);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  shadow(c, 0, 0, 15, 5, 0.4);
  rr(c, -13, -10, 26, 10, 2, '#5a5268');
  rr(c, -10, -66, 20, 58, 2, '#6a6278');
  c.fillStyle = 'rgba(0,0,0,.18)';
  c.fillRect(3, -66, 7, 58);
  rr(c, -13, -72, 26, 8, 2, '#5a5268');
  c.restore();
}
/** Warp portal: a stone arch around a swirling vortex (faster while channelling). */
export function drawPortal(c, p, t, channel: boolean) {
  const x = p.x,
    y = p.y,
    sp = channel ? 4 : 1.4,
    cy = y - 34;
  c.save();
  // glow on the floor
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 4, x, y, 46);
  g.addColorStop(0, 'rgba(140,190,255,' + (channel ? 0.55 : 0.35) + ')');
  g.addColorStop(1, 'rgba(140,120,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, 46, 16, 0, 0, TAU);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  // vortex
  const vortex = () => {
    c.beginPath();
    c.ellipse(x, cy, 19, 30, 0, 0, TAU);
  };
  vortex();
  const vg = c.createRadialGradient(x, cy, 2, x, cy, 30);
  vg.addColorStop(0, '#f4f0ff');
  vg.addColorStop(0.35, '#8fb8ff');
  vg.addColorStop(1, '#5a3aa8');
  c.fillStyle = vg;
  c.fill();
  c.save();
  vortex();
  c.clip();
  c.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = k === 1 ? 'rgba(255,255,255,.7)' : 'rgba(210,190,255,.6)';
    c.lineWidth = 2.2;
    c.beginPath();
    for (let a = 0; a < TAU * 1.6; a += 0.2) {
      const r = 2 + a * 5.2,
        aa = a + t * sp + (k * TAU) / 3;
      const px = x + Math.cos(aa) * r * 0.62,
        py = cy + Math.sin(aa) * r;
      if (a === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }
  c.restore();
  // stone arch
  c.lineJoin = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 9;
  vortex();
  c.stroke();
  c.strokeStyle = '#8a8298';
  c.lineWidth = 5.5;
  vortex();
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.3)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(x, cy, 19, 30, 0, Math.PI * 1.1, Math.PI * 1.6);
  c.stroke();
  // runes on the arch
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + t * 0.3;
    c.fillStyle = 'rgba(160,210,255,' + (0.6 + 0.4 * Math.sin(t * 3 + k)).toFixed(3) + ')';
    c.beginPath();
    c.arc(x + Math.cos(a) * 19, cy + Math.sin(a) * 30, 1.8, 0, TAU);
    c.fill();
  }
  // base stones
  c.lineWidth = 2;
  c.strokeStyle = OUT;
  rr(c, x - 16, y - 5, 12, 6, 2, '#6e667e');
  rr(c, x + 4, y - 5, 12, 6, 2, '#6e667e');
  c.restore();
}
