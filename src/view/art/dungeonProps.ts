import { SPR } from './decor';
import { circ, ell, rr, shadow } from '../dom';
import { OUT, TAU, mulberry, rand, sh } from '../../core/math';
import { addLight } from '../../model/game/fx';
import { game } from '../../model/game/state';
/* ================= ART: dungeon pieces ================= */
// Wall torches (rustic in caves, iron sconces in crypts) and the torch in the hero's hand,
// floor props (bones, webs, stalagmites, crates...), the treasure chest, the ways out (the
// daylit cave mouth, crypt stairs), crypt pillars and the warp portal.
/** Which way a wall torch cants so it faces into the room: toward the side with more open
 * floor in front of it (-1 left … 1 right, as an angle), straight out when both are even. */
export function roomSide(tr) {
  const D = game.DG;
  if (!D || tr.tx === undefined) return 0;
  let l = 0,
    r = 0;
  for (let j = tr.ty + 1; j <= tr.ty + 4; j++)
    for (let k = 1; k <= 4; k++) {
      if (D.isF(tr.tx - k, j)) l++;
      if (D.isF(tr.tx + k, j)) r++;
    }
  const d = (r - l) / 16;
  return Math.abs(d) < 0.2 ? 0 : Math.sign(d) * 0.28;
}
/** A wall torch on the rock face above the floor at (tr.x, tr.y), leaning out into the room:
 * lashed to a wooden peg in caves (`rustic`), in an iron sconce in crypts. */
export function drawTorch(c, tr, t, rustic = false) {
  const x = tr.x,
    y = tr.y - 20;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  if (rustic) {
    // two wedge stones jammed into a crack hold the foot of the torch
    c.lineWidth = 1.6;
    for (const [sx, r] of [
      [-4.2, 3.4],
      [4, 3],
    ]) {
      c.beginPath();
      c.ellipse(x + sx, y + 9, r, r * 0.8, 0, 0, TAU);
      c.fillStyle = '#9a7454';
      c.fill();
      c.stroke();
    }
  } else {
    // an iron plate bolted to the wall, with an arm out to a ring
    c.lineWidth = 1.8;
    rr(c, x - 6.5, y - 1, 13, 14, 2, '#3e3848');
    c.fillStyle = '#9a92a8';
    for (const [rx, ry] of [
      [-4.6, 1],
      [3.2, 1],
      [-4.6, 9.6],
      [3.2, 9.6],
    ])
      c.fillRect(x + rx, y + ry, 1.5, 1.5);
  }
  if (tr.taken) {
    c.restore();
    return;
  }
  // the torch leans out toward the room: foreshortened, its foot in the holder, its head
  // forward (lower on the wall than an upright one) with a small sideways cant
  if (tr.lean === undefined) tr.lean = roomSide(tr);
  const lean = tr.lean,
    fx = x,
    fy = y + 11,
    hx = x + Math.sin(lean) * 18,
    hy = fy - Math.cos(lean) * 18;
  // soot on the rock above the flame
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.beginPath();
  c.ellipse(hx + 2, hy - 12, 5, 9, 0, 0, TAU);
  c.fill();
  c.lineWidth = 5.2;
  c.beginPath();
  c.moveTo(fx, fy);
  c.lineTo(hx, hy);
  c.stroke();
  c.strokeStyle = '#7a5434';
  c.lineWidth = 2.8;
  c.stroke();
  c.strokeStyle = OUT;
  if (rustic) {
    // rope lashing it to the peg
    c.strokeStyle = '#d8c090';
    c.lineWidth = 1.2;
    for (const k of [4, 6.4]) {
      const rx = fx + Math.sin(lean) * k,
        ry = fy - Math.cos(lean) * k;
      c.beginPath();
      c.moveTo(rx - 3.2, ry - 0.8);
      c.lineTo(rx + 3.2, ry + 0.8);
      c.stroke();
    }
    c.strokeStyle = OUT;
  } else {
    // the ring round the haft
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(fx + Math.sin(lean) * 5, fy - Math.cos(lean) * 5, 4, 1.8, 0, 0, TAU);
    c.strokeStyle = '#8a8298';
    c.stroke();
    c.strokeStyle = OUT;
  }
  // wrapped head and flame
  c.save();
  c.translate(hx, hy);
  c.rotate(lean);
  c.lineWidth = 1.6;
  rr(c, -3, -3, 6, 5, 1.2, '#4a3426');
  c.restore();
  const f = 1 + Math.sin(t * 12 + tr.ph) * 0.15,
    top = hy - 2;
  c.fillStyle = '#ff7a2e';
  c.beginPath();
  c.moveTo(hx - 4.5, top);
  c.quadraticCurveTo(hx - 5.5, top - 9 * f, hx + Math.sin(t * 9 + tr.ph) * 2, top - 15 * f);
  c.quadraticCurveTo(hx + 5.5, top - 9 * f, hx + 4.5, top);
  c.fill();
  c.fillStyle = '#ffe27a';
  c.beginPath();
  c.arc(hx, top - 3.5, 2.3, 0, TAU);
  c.fill();
  c.restore();
  addLight(x, y - 16, 150 + Math.sin(t * 14 + tr.ph) * 8, 1, '#ff9a3a');
  if (Math.random() < 0.04)
    game.parts.push({
      x: x + rand(-3, 3),
      y: y - 26,
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
/** A torch held in the hand at (x, y): wooden haft, wrapped head and a live flame. */
export function drawHeldTorch(c, x, y, t) {
  c.save();
  c.lineWidth = 1.8;
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - 1.6, y + 6);
  c.lineTo(x - 1.6, y - 8);
  c.lineTo(x + 1.6, y - 8);
  c.lineTo(x + 1.6, y + 6);
  c.closePath();
  c.fillStyle = '#7a5434';
  c.fill();
  c.stroke();
  rr(c, x - 2.8, y - 12, 5.6, 5, 1.2, '#4a3426');
  const f = 1 + Math.sin(t * 13) * 0.12;
  c.fillStyle = '#ff7a2e';
  c.beginPath();
  c.moveTo(x - 4, y - 11);
  c.quadraticCurveTo(x - 5, y - 18 * f, x + Math.sin(t * 9) * 1.6, y - 24 * f);
  c.quadraticCurveTo(x + 5, y - 18 * f, x + 4, y - 11);
  c.fill();
  c.fillStyle = '#ffe27a';
  c.beginPath();
  c.arc(x, y - 14, 2, 0, TAU);
  c.fill();
  c.restore();
  if (Math.random() < 0.05)
    game.parts.push({
      x: x + rand(-2, 2),
      y: y - 22,
      vx: rand(-6, 6),
      vy: rand(-40, -20),
      life: 0.7,
      max: 0.7,
      col: '#ffb13a',
      sz: 1.6,
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
  } else if (k === 'bones' || k === 'remains') {
    const s = SPR[k];
    c.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
  } else if (k === 'web') {
    // cobweb: irregular spokes, sagging spiral threads, a torn strand, dewdrops, maybe a spider
    // `corner` [sx, sy]: a quarter web strung between two rock faces, hub in the corner
    const rnd = mulberry(((p.x * 73 + p.y * 151) | 0) ^ 0x5bd1),
      cor = p.corner,
      n = cor ? 5 + ((rnd() * 2) | 0) : 9 + ((rnd() * 3) | 0),
      spokes: number[][] = [];
    for (let i = 0; i < n; i++) {
      const a = cor
          ? Math.atan2(-cor[1], -cor[0]) +
            (i / (n - 1) - 0.5) * (Math.PI / 2) +
            (i && i < n - 1 ? (rnd() - 0.5) * 0.2 : 0)
          : (i / n) * TAU + (rnd() - 0.5) * 0.35,
        r = (cor ? 30 : 22) * (0.72 + rnd() * 0.4);
      spokes.push([Math.cos(a) * r, Math.sin(a) * r * (cor ? 1 : 0.72)]);
    }
    if (!cor) shadow(c, 0, 5, 18, 5, 0.1);
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
      for (let i = 0; i < (cor ? n - 1 : n); i++) {
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
      // a small spider on the hub (out on the threads for a corner web, off the rock)
      if (cor) c.translate(-cor[0] * 11, -cor[1] * 11);
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
  } else if (k === 'stalagmite') {
    const col = p.col || '#8a8a84',
      fac = p.facet || '#d4d0c6';
    shadow(c, 0, 0, 14, 5, 0.3);
    c.lineJoin = 'miter';
    c.miterLimit = 2;
    for (const [sx, h] of [
      [-11, 20],
      [10, 16],
      [0, 38],
    ]) {
      c.beginPath();
      c.moveTo(sx - 6, 0);
      c.lineTo(sx, -h);
      c.lineTo(sx + 6, 0);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
    }
    c.fillStyle = fac;
    c.beginPath();
    c.moveTo(-2, -10);
    c.lineTo(0.5, -34);
    c.lineTo(3.5, -12);
    c.closePath();
    c.fill();
  } else if (k === 'rubble') {
    const cols = [p.col || '#6a6278', p.facet || '#7a7288'];
    for (const [a, b, r, ci] of [
      [-6, -2, 5, 0],
      [5, -1, 4, 1],
      [0, -6, 3.5, 0],
    ])
      circ(c, a, b, r, cols[ci]);
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
/** A cave's way out: a rough opening in the north rock face with daylight at its far end,
 * spilling onto the floor in front. `s` is the floor point at the foot of the face. */
export function drawCaveMouth(c, s, t) {
  const rnd = mulberry(((s.x * 31 + s.y * 17) | 0) ^ 0x2c1f),
    base = -6,
    n = 9,
    pts: number[][] = [];
  // an uneven arch: wide at the floor, lumpy along the top
  for (let k = 0; k <= n; k++) {
    const a = Math.PI + (k / n) * Math.PI,
      w = 23 + (k && k < n ? (rnd() - 0.5) * 5 : 0),
      h = 31 + (k && k < n ? (rnd() - 0.5) * 6 : 0);
    pts.push([Math.cos(a) * w, base + Math.sin(a) * h]);
  }
  const arch = (grow: number) => {
    c.beginPath();
    c.moveTo(pts[0][0] - grow, base);
    for (const [x, y] of pts) c.lineTo(x + Math.sign(x) * grow, y - grow);
    c.lineTo(pts[n][0] + grow, base);
    c.closePath();
  };
  c.save();
  c.translate(s.x, s.y);
  c.lineJoin = 'round';
  // daylight on the floor in front
  const pulse = 1 + Math.sin(t * 0.9) * 0.06,
    spill = c.createRadialGradient(0, base + 4, 2, 0, base + 10, 46 * pulse);
  spill.addColorStop(0, 'rgba(255,236,184,.42)');
  spill.addColorStop(1, 'rgba(255,236,184,0)');
  c.fillStyle = spill;
  c.beginPath();
  c.ellipse(0, base + 10, 46 * pulse, 24 * pulse, 0, 0, TAU);
  c.fill();
  // rim of paler rock, then the tunnel glowing toward the outside
  arch(4);
  c.fillStyle = '#8a5c3c';
  c.strokeStyle = OUT;
  c.lineWidth = 2.5;
  c.fill();
  c.stroke();
  const glow = c.createLinearGradient(0, base, 0, base - 30);
  glow.addColorStop(0, '#3a2418');
  glow.addColorStop(0.55, '#b88a56');
  glow.addColorStop(1, '#fff0c4');
  arch(0);
  c.fillStyle = glow;
  c.fill();
  c.lineWidth = 2;
  c.stroke();
  // a couple of fallen stones at the foot
  for (const sx of [-1, 1]) {
    const r = 3.5 + rnd() * 2;
    c.beginPath();
    c.ellipse(sx * (22 + rnd() * 3), base + 1, r, r * 0.72, 0, 0, TAU);
    c.fillStyle = '#a07a58';
    c.fill();
    c.lineWidth = 1.6;
    c.stroke();
  }
  c.restore();
  addLight(s.x, s.y - 10, 130, 0.7, '#ffe2a0');
}
export function drawStairs(c, s, t, col = '#9a90a8') {
  c.save();
  c.translate(s.x, s.y);
  c.lineWidth = 2.2;
  c.strokeStyle = OUT;
  for (let i = 0; i < 4; i++) {
    rr(c, -22 + i * 2, -12 + i * 7 - 14, 44 - i * 4, 8, 2, sh(col, -i * 0.12));
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
