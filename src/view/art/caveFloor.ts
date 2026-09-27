import { rr } from '../dom';
import { OUT, TAU, mulberry } from '../../core/math';
/* ================= ART: dungeon floor dressing ================= */
// Moss patches on crypt floors, and the earthy bits on cave floors instead (pebbles, roots,
// crystals, puddles), each tinted by biome.
/** Moss patch on a cave floor: soft clumps with highlights, sprouts and sometimes glowing caps. */
export function drawMoss(c, m, blight: boolean, t: number) {
  const rnd = mulberry(m.s),
    base = blight ? '#6a4a86' : '#4f7a3c',
    light = blight ? '#9170b4' : '#78a854',
    dark = blight ? '#3a2850' : '#2c4424';
  c.save();
  c.translate(m.x, m.y);
  c.fillStyle = 'rgba(15,20,12,.28)';
  c.beginPath();
  c.ellipse(0, 3, 18, 8, 0, 0, TAU);
  c.fill();
  const n = 5 + ((rnd() * 3) | 0),
    pts: number[][] = [];
  for (let k = 0; k < n; k++) pts.push([(rnd() - 0.5) * 24, (rnd() - 0.5) * 9, 4.2 + rnd() * 3.6]);
  pts.sort((a, b) => a[1] - b[1]);
  for (const [fill, grow] of [
    [dark, 1.7],
    [base, 0],
  ] as [string, number][]) {
    c.fillStyle = fill;
    c.beginPath();
    for (const [x, y, r] of pts) {
      c.moveTo(x + r + grow, y);
      c.ellipse(x, y, r + grow, (r + grow) * 0.66, 0, 0, TAU);
    }
    c.fill();
  }
  c.fillStyle = light;
  c.beginPath();
  for (const [x, y, r] of pts) {
    c.moveTo(x - r * 0.3 + r * 0.45, y - r * 0.3);
    c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.3, 0, 0, TAU);
  }
  c.fill();
  // tiny sprouts
  c.strokeStyle = light;
  c.lineWidth = 1.2;
  c.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const sx = (rnd() - 0.5) * 20,
      sy = (rnd() - 0.5) * 6 - 2;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx - 1.6, sy - 4);
    c.moveTo(sx, sy);
    c.lineTo(sx + 1.6, sy - 4.4);
    c.stroke();
  }
  // glowing cave mushrooms
  if (rnd() < 0.4) {
    const mx = (rnd() - 0.5) * 16,
      glow = blight ? '255,150,240' : '150,240,255';
    c.fillStyle = 'rgba(' + glow + ',' + (0.18 + Math.sin(t * 2 + m.s) * 0.06).toFixed(3) + ')';
    c.beginPath();
    c.arc(mx, -5, 9, 0, TAU);
    c.fill();
    for (const [dx, s] of [
      [0, 1],
      [4.5, 0.7],
    ]) {
      c.strokeStyle = OUT;
      c.lineWidth = 1.3;
      rr(c, mx + dx - 1 * s, -5 * s, 2 * s, 5 * s, 0.8, '#e8e0d0');
      c.beginPath();
      c.arc(mx + dx, -5 * s, 3.4 * s, Math.PI, 0);
      c.closePath();
      c.fillStyle = 'rgb(' + glow + ')';
      c.fill();
      c.stroke();
    }
  }
  c.restore();
}
/** Glow per biome for cave crystals and puddle sheen (Meadow…Blightlands). */
export const CAVE_GLOW = [
  '150,220,255',
  '150,220,255',
  '150,220,255',
  '255,196,110',
  '205,240,255',
  '120,230,190',
  '150,245,110',
];
/** Cavern floor detail instead of dungeon moss: pebbles, roots, crystals or a still puddle. */
export function drawCaveBit(c, m, b: number, t: number) {
  const rnd = mulberry(m.s),
    glow = CAVE_GLOW[b] || CAVE_GLOW[0];
  c.save();
  c.translate(m.x, m.y);
  c.strokeStyle = OUT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (m.k === 'pebbles') {
    const n = 3 + ((rnd() * 3) | 0),
      pts: number[][] = [];
    for (let k = 0; k < n; k++)
      pts.push([(rnd() - 0.5) * 26, (rnd() - 0.5) * 12, 2.4 + rnd() * 3.2, rnd()]);
    pts.sort((a, b) => a[1] - b[1]);
    for (const [x, y, r, v] of pts) {
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath();
      c.ellipse(x + 1, y + r * 0.5, r * 1.1, r * 0.5, 0, 0, TAU);
      c.fill();
      c.lineWidth = 1.4;
      c.fillStyle = v < 0.5 ? '#8a6448' : '#a07a58';
      c.beginPath();
      c.ellipse(x, y, r, r * 0.72, 0, 0, TAU);
      c.fill();
      c.stroke();
      c.fillStyle = '#c4926a';
      c.beginPath();
      c.ellipse(x - r * 0.3, y - r * 0.28, r * 0.42, r * 0.26, 0, 0, TAU);
      c.fill();
    }
  } else if (m.k === 'roots') {
    // gnarled roots pushing out of the rock face and burrowing back into the dirt
    const n = 2 + ((rnd() * 2) | 0);
    for (let k = 0; k < n; k++) {
      const x0 = (rnd() - 0.5) * 26,
        len = 10 + rnd() * 12,
        bend = (rnd() - 0.5) * 14,
        w = 3.6 + rnd() * 1.8;
      const path = () => {
        c.beginPath();
        c.moveTo(x0, -8);
        c.quadraticCurveTo(x0 + bend, len * 0.5, x0 + bend * 0.6, len);
      };
      path();
      c.lineWidth = w + 2.6;
      c.stroke();
      path();
      c.lineWidth = w;
      c.strokeStyle = '#9a6c46';
      c.stroke();
      c.strokeStyle = OUT;
      if (rnd() < 0.7) {
        const sx = x0 + bend * 0.45,
          sy = len * 0.45,
          d = rnd() < 0.5 ? -1 : 1;
        c.beginPath();
        c.moveTo(sx, sy);
        c.quadraticCurveTo(sx + d * 6, sy + 2, sx + d * 8, sy + 7);
        c.lineWidth = 4;
        c.stroke();
        c.strokeStyle = '#9a6c46';
        c.lineWidth = 2;
        c.stroke();
        c.strokeStyle = OUT;
      }
    }
  } else if (m.k === 'crystal') {
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath();
    c.ellipse(0, 2, 12, 4, 0, 0, TAU);
    c.fill();
    const n = 3 + ((rnd() * 2) | 0),
      shards: number[][] = [];
    for (let k = 0; k < n; k++)
      shards.push([
        (k / (n - 1) - 0.5) * 16 + (rnd() - 0.5) * 3,
        7 + rnd() * 9,
        (rnd() - 0.5) * 0.7,
      ]);
    shards.sort((a, b) => a[1] - b[1]);
    for (const [x, h, lean] of shards) {
      c.save();
      c.translate(x, 2);
      c.rotate(lean);
      c.beginPath();
      c.moveTo(-3, 0);
      c.lineTo(-3, -h * 0.7);
      c.lineTo(0, -h);
      c.lineTo(3, -h * 0.7);
      c.lineTo(3, 0);
      c.closePath();
      c.fillStyle = 'rgb(' + glow + ')';
      c.lineWidth = 1.5;
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.beginPath();
      c.moveTo(-1.6, -1);
      c.lineTo(-1.6, -h * 0.66);
      c.lineTo(0, -h * 0.9);
      c.lineTo(0, -1);
      c.closePath();
      c.fill();
      c.restore();
    }
  } else {
    // a still puddle; now and then a drip from the ceiling rings it
    const rx = 12 + rnd() * 6,
      ry = rx * 0.5;
    c.fillStyle = '#4a3020';
    c.beginPath();
    c.ellipse(0, 0, rx + 2.5, ry + 2, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#23303a';
    c.beginPath();
    c.ellipse(0, 0.6, rx, ry, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(' + glow + ',.22)';
    c.beginPath();
    c.ellipse(-rx * 0.3, -ry * 0.3, rx * 0.45, ry * 0.3, 0, 0, TAU);
    c.fill();
    const ph = (t * 0.45 + rnd()) % 1;
    if (ph < 0.5) {
      const k = ph / 0.5;
      c.strokeStyle = 'rgba(' + glow + ',' + (0.55 * (1 - k)).toFixed(3) + ')';
      c.lineWidth = 1.3;
      c.beginPath();
      c.ellipse(rx * 0.15, 0.5, 2 + k * rx * 0.6, (2 + k * rx * 0.6) * 0.5, 0, 0, TAU);
      c.stroke();
    }
  }
  c.restore();
}
