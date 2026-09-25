import { circ, ell, mkCanvas, rr, shadow } from '../core/dom';
import { OUT, TAU, mulberry } from '../core/math';
/* ================= ART: decor sprites ================= */
export type Sprite = ReturnType<typeof makeSpr>;
export const SPR: Record<string, Sprite> = {};
export function makeSpr(w, h, ax, ay, fn) {
  const c = mkCanvas(w * 2, h * 2),
    x = c.getContext('2d');
  x.scale(2, 2);
  x.translate(ax, ay);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.lineWidth = 2.2;
  x.strokeStyle = OUT;
  fn(x);
  return { c, w, h, ax, ay };
}
function blob(x, cs, base, hi, dk, hiY = -40) {
  x.fillStyle = OUT;
  for (const [a, b, r] of cs) {
    x.beginPath();
    x.arc(a, b, r + 2.4, 0, TAU);
    x.fill();
  }
  x.fillStyle = dk;
  for (const [a, b, r] of cs) {
    x.beginPath();
    x.arc(a, b, r, 0, TAU);
    x.fill();
  }
  x.fillStyle = base;
  for (const [a, b, r] of cs) {
    x.beginPath();
    x.arc(a - 1.5, b - 2.5, r * 0.86, 0, TAU);
    x.fill();
  }
  x.fillStyle = hi;
  for (const [a, b, r] of cs) {
    if (b > hiY) continue;
    x.beginPath();
    x.arc(a - r * 0.35, b - r * 0.4, r * 0.36, 0, TAU);
    x.fill();
  }
}
export function buildSprites() {
  const oak = (p) =>
    makeSpr(84, 100, 42, 94, (x) => {
      shadow(x, 0, 0, 24, 8, 0.25);
      rr(x, -5, -26, 10, 26, 3, p[3]);
      x.fillStyle = 'rgba(0,0,0,.2)';
      x.fillRect(-5, -26, 4, 26);
      blob(
        x,
        [
          [0, -56, 21],
          [-18, -42, 16],
          [18, -42, 16],
          [-8, -31, 14],
          [9, -31, 14],
          [0, -45, 18],
        ],
        p[0],
        p[1],
        p[2],
      );
    });
  SPR.oak = oak(['#5cb848', '#8fdc6a', '#3d8c3a', '#7a4f2e']);
  SPR.oakA = oak(['#e08a2e', '#ffc15a', '#b0561f', '#6b4423']);
  SPR.oakR = oak(['#c8452f', '#f07a5a', '#8e2a1f', '#6b4423']);
  const pine = (dk, bs, hi, snow?) =>
    makeSpr(80, 100, 40, 90, (x) => {
      shadow(x, 0, 1, 27, 9, 0.3);
      shadow(x, 0, 0, 11, 4, 0.3);
      rr(x, -4.5, -11, 9, 11, 2, '#6b4423');
      x.fillStyle = 'rgba(0,0,0,.25)';
      x.fillRect(-4.5, -11, 4, 11);
      for (const [y, w, top] of [
        [-9, 28, -8],
        [-30, 23, -32],
        [-50, 17, -54],
      ]) {
        x.beginPath();
        x.moveTo(-w, y);
        x.quadraticCurveTo(0, y + 6, w, y);
        x.lineTo(0, top - 18);
        x.closePath();
        x.fillStyle = dk;
        x.fill();
        x.stroke();
        x.beginPath();
        x.moveTo(-w + 4, y - 3);
        x.lineTo(0, top - 15);
        x.lineTo(-2, y - 2);
        x.closePath();
        x.fillStyle = bs;
        x.fill();
        if (snow) {
          x.fillStyle = '#f4f8ff';
          x.beginPath();
          x.moveTo(-w * 0.55, y - (y - top + 18) * 0.45);
          x.lineTo(0, top - 18);
          x.lineTo(w * 0.55, y - (y - top + 18) * 0.45);
          x.quadraticCurveTo(w * 0.2, y - (y - top + 18) * 0.35, 0, y - (y - top + 18) * 0.42);
          x.quadraticCurveTo(
            -w * 0.2,
            y - (y - top + 18) * 0.33,
            -w * 0.55,
            y - (y - top + 18) * 0.45,
          );
          x.fill();
        } else {
          x.beginPath();
          x.moveTo(-w * 0.5, y - 6);
          x.lineTo(0, top - 13);
          x.lineTo(-w * 0.2, y - 8);
          x.fillStyle = hi;
          x.fill();
        }
      }
    });
  SPR.pine = pine('#2f7a45', '#3f9a55', '#63bd72');
  SPR.snowpine = pine('#2a5e4a', '#3a7a5e', '#fff', true);
  const bush = (p, berry?) =>
    makeSpr(46, 36, 23, 32, (x) => {
      shadow(x, 0, 0, 17, 5, 0.22);
      blob(
        x,
        [
          [-8, -9, 9],
          [8, -9, 9],
          [0, -15, 10],
        ],
        p[0],
        p[1],
        p[2],
        -5,
      );
      if (berry) {
        x.lineWidth = 1.2;
        for (const [a, b] of [
          [-7, -11],
          [5, -15],
          [8, -7],
        ])
          circ(x, a, b, 2.2, berry);
      }
    });
  SPR.bush = bush(['#5cb848', '#8fdc6a', '#3d8c3a'], '#e0443c');
  SPR.bushA = bush(['#d8742a', '#f5a64a', '#9e4a1c']);
  SPR.snowbush = bush(['#e8eef6', '#ffffff', '#b8c6d8']);
  SPR.drybush = makeSpr(40, 30, 20, 28, (x) => {
    shadow(x, 0, 0, 12, 4, 0.2);
    x.strokeStyle = '#8a6a3a';
    x.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.3;
      x.beginPath();
      x.moveTo(0, 0);
      x.quadraticCurveTo(
        Math.cos(a) * 8,
        Math.sin(a) * 8 - 4,
        Math.cos(a) * 15,
        Math.sin(a) * 14 - 2,
      );
      x.stroke();
    }
  });
  const rock = (c1, c2) =>
    makeSpr(52, 42, 26, 36, (x) => {
      shadow(x, 0, 0, 20, 6, 0.25);
      x.beginPath();
      x.moveTo(-18, 0);
      x.lineTo(-17, -14);
      x.lineTo(-6, -25);
      x.lineTo(8, -23);
      x.lineTo(18, -10);
      x.lineTo(18, 0);
      x.closePath();
      x.fillStyle = c1;
      x.fill();
      x.stroke();
      x.beginPath();
      x.moveTo(-12, -13);
      x.lineTo(-5, -22);
      x.lineTo(6, -20);
      x.lineTo(1, -12);
      x.closePath();
      x.fillStyle = c2;
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,.2)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(4, -4);
      x.lineTo(9, -12);
      x.stroke();
    });
  SPR.rock = rock('#9a9c96', '#c4c6bf');
  SPR.sandrock = rock('#c49060', '#e6b88a');
  SPR.icerock = rock('#a8c8e0', '#e6f4ff');
  SPR.blightrock = rock('#6d6080', '#9a8cb0');
  SPR.cactus = makeSpr(44, 60, 22, 56, (x) => {
    shadow(x, 0, 0, 12, 4, 0.25);
    const cc = '#5aa04a';
    rr(x, -6, -44, 12, 44, 6, cc);
    rr(x, -18, -30, 8, 16, 4, cc);
    rr(x, -18, -22, 14, 7, 3, cc);
    rr(x, 10, -38, 8, 18, 4, cc);
    rr(x, 4, -26, 14, 7, 3, cc);
    x.strokeStyle = '#8ad07a';
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(-2, -40);
    x.lineTo(-2, -4);
    x.stroke();
    x.fillStyle = '#ff6fa0';
    x.beginPath();
    x.arc(0, -46, 3.5, 0, TAU);
    x.fill();
  });
  SPR.palm = makeSpr(80, 96, 40, 92, (x) => {
    shadow(x, 0, 0, 16, 5, 0.25);
    x.fillStyle = '#8a6038';
    x.beginPath();
    x.moveTo(-4, 0);
    x.quadraticCurveTo(-2, -40, 8, -64);
    x.lineTo(14, -62);
    x.quadraticCurveTo(6, -40, 5, 0);
    x.closePath();
    x.fill();
    x.stroke();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      x.save();
      x.translate(11, -64);
      x.rotate(a + Math.PI / 2);
      x.beginPath();
      x.moveTo(0, 0);
      x.quadraticCurveTo(10, -8, 26, 4);
      x.quadraticCurveTo(12, 2, 0, 0);
      x.fillStyle = i % 2 ? '#4f9a3a' : '#62b24a';
      x.fill();
      x.stroke();
      x.restore();
    }
    circ(x, 8, -62, 3, '#6b4423');
    circ(x, 14, -61, 3, '#6b4423');
  });
  SPR.deadtree = makeSpr(60, 80, 30, 76, (x) => {
    shadow(x, 0, 0, 14, 5, 0.25);
    x.lineWidth = 5;
    x.strokeStyle = OUT;
    const br = () => {
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(0, -40);
      x.moveTo(0, -26);
      x.lineTo(-14, -44);
      x.lineTo(-18, -58);
      x.moveTo(0, -38);
      x.lineTo(12, -54);
      x.lineTo(20, -60);
      x.moveTo(0, -40);
      x.lineTo(2, -64);
      x.moveTo(-14, -44);
      x.lineTo(-6, -52);
      x.stroke();
    };
    br();
    x.lineWidth = 2.6;
    x.strokeStyle = '#7a6250';
    br();
  });
  SPR.blighttree = makeSpr(64, 90, 32, 86, (x) => {
    shadow(x, 0, 0, 15, 5, 0.3);
    x.lineWidth = 6;
    x.strokeStyle = OUT;
    const br = () => {
      x.beginPath();
      x.moveTo(0, 0);
      x.quadraticCurveTo(-6, -30, 4, -50);
      x.quadraticCurveTo(10, -66, -2, -76);
      x.moveTo(1, -34);
      x.quadraticCurveTo(-16, -40, -22, -60);
      x.moveTo(3, -48);
      x.quadraticCurveTo(18, -52, 22, -70);
      x.stroke();
    };
    br();
    x.lineWidth = 3;
    x.strokeStyle = '#4a3656';
    br();
    x.fillStyle = '#c060ff';
    for (const [a, b] of [
      [-22, -60],
      [22, -70],
      [-2, -76],
    ]) {
      x.beginPath();
      x.arc(a, b, 3, 0, TAU);
      x.fill();
    }
  });
  SPR.swamptree = makeSpr(90, 100, 45, 94, (x) => {
    shadow(x, 0, 0, 22, 7, 0.28);
    x.fillStyle = '#5a4a36';
    x.beginPath();
    x.moveTo(-12, 0);
    x.lineTo(-5, -30);
    x.lineTo(5, -30);
    x.lineTo(12, 0);
    x.lineTo(4, -6);
    x.lineTo(0, 2);
    x.lineTo(-4, -6);
    x.closePath();
    x.fill();
    x.stroke();
    blob(
      x,
      [
        [0, -54, 22],
        [-22, -44, 15],
        [22, -44, 15],
        [0, -40, 18],
      ],
      '#5a7a3a',
      '#7e9a4a',
      '#3e5a2a',
    );
    x.strokeStyle = '#6a8a4a';
    x.lineWidth = 2;
    for (const [a, b, l] of [
      [-22, -36, 22],
      [-6, -34, 26],
      [16, -36, 20],
      [26, -40, 14],
    ]) {
      x.beginPath();
      x.moveTo(a, b);
      x.quadraticCurveTo(a + 3, b + l / 2, a, b + l);
      x.stroke();
    }
  });
  SPR.reeds = makeSpr(36, 40, 18, 38, (x) => {
    x.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      const X = (i - 2.5) * 4;
      x.strokeStyle = '#4e6a30';
      x.beginPath();
      x.moveTo(X, 0);
      x.quadraticCurveTo(X + 2, -14, X + (i % 2 ? 3 : -3), -26 - (i % 3) * 4);
      x.stroke();
      if (i % 2) {
        x.fillStyle = '#7a4a2a';
        rr(x, X + 1, -28 - (i % 3) * 4, 4, 9, 2, '#7a4a2a', false);
      }
    }
  });
  SPR.mushroom = makeSpr(36, 30, 18, 26, (x) => {
    shadow(x, 0, 0, 11, 4, 0.22);
    for (const [a, s, c] of [
      [-6, 1, '#d8443a'],
      [6, 0.7, '#e8a040'],
    ] as [number, number, string][]) {
      rr(x, a - 2.5 * s, -10 * s, 5 * s, 10 * s, 2, '#f0e6d0');
      x.beginPath();
      x.arc(a, -10 * s, 8 * s, Math.PI, 0);
      x.closePath();
      x.fillStyle = c;
      x.fill();
      x.stroke();
      x.fillStyle = '#fff';
      x.beginPath();
      x.arc(a - 3 * s, -14 * s, 1.6 * s, 0, TAU);
      x.arc(a + 2 * s, -13 * s, 1.3 * s, 0, TAU);
      x.fill();
    }
  });
  SPR.crystal = makeSpr(44, 56, 22, 52, (x) => {
    shadow(x, 0, 0, 13, 4, 0.3);
    const cr = (ox, h, w, a) => {
      x.save();
      x.translate(ox, 0);
      x.rotate(a);
      x.beginPath();
      x.moveTo(-w, 0);
      x.lineTo(-w, -h * 0.7);
      x.lineTo(0, -h);
      x.lineTo(w, -h * 0.7);
      x.lineTo(w, 0);
      x.closePath();
      x.fillStyle = '#9a5ad0';
      x.fill();
      x.stroke();
      x.fillStyle = '#d8a8ff';
      x.beginPath();
      x.moveTo(-w + 2, -2);
      x.lineTo(-w + 2, -h * 0.68);
      x.lineTo(0, -h + 3);
      x.lineTo(0, -2);
      x.fill();
      x.restore();
    };
    cr(-9, 26, 5, -0.3);
    cr(9, 22, 5, 0.35);
    cr(0, 40, 7, 0);
  });
  // bones & skull: each part is one silhouette with a single outline (outline pass, then fill)
  const BONE = '#ece4d0',
    BSH = '#cfc4aa',
    OW = 1.7;
  const bone = (x, cx: number, cy: number, len: number, rot: number, w = 3.4) => {
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    const shape = (g: number) => {
      x.beginPath();
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          x.moveTo((sx * len) / 2 + w * 0.78 + g, sy * w * 0.5);
          x.arc((sx * len) / 2, sy * w * 0.5, w * 0.78 + g, 0, TAU);
        }
      x.rect(-len / 2, -w / 2 - g, len, w + g * 2);
      x.fill();
    };
    x.fillStyle = OUT;
    shape(OW);
    x.fillStyle = BONE;
    shape(0);
    x.fillStyle = BSH;
    x.fillRect(-len / 2 + w * 0.4, w * 0.08, len - w * 0.8, w * 0.36);
    x.fillStyle = 'rgba(255,255,255,.65)';
    x.fillRect(-len / 2 + w * 0.5, -w / 2 + 0.6, len - w, 0.9);
    x.restore();
  };
  const skull = (x, cx: number, cy: number, s: number, rot: number) => {
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    x.scale(s, s);
    const head = (g: number) => {
      x.beginPath();
      x.ellipse(0, -3, 7 + g, 6.4 + g, 0, 0, TAU);
      x.rect(-5 - g, -1.5 - g, 10 + g * 2, 5 + g * 2);
      x.fill();
    };
    // jaw with teeth
    x.fillStyle = OUT;
    x.beginPath();
    x.rect(-4.4 - OW, 2.6 - OW, 8.8 + OW * 2, 3.6 + OW * 2);
    x.fill();
    x.fillStyle = BSH;
    x.fillRect(-4.4, 2.6, 8.8, 3.6);
    x.fillStyle = 'rgba(42,29,44,.75)';
    for (const k of [-2.2, 0, 2.2]) x.fillRect(k - 0.35, 2.8, 0.7, 3.2);
    // cranium
    x.fillStyle = OUT;
    head(OW);
    x.fillStyle = BONE;
    head(0);
    x.save();
    x.beginPath();
    x.ellipse(0, -3, 7, 6.4, 0, 0, TAU);
    x.rect(-5, -1.5, 10, 5);
    x.clip();
    x.fillStyle = BSH;
    x.fillRect(-8, 0.4, 16, 5);
    x.fillStyle = 'rgba(255,255,255,.55)';
    x.beginPath();
    x.ellipse(-3, -6.4, 2.4, 1.2, -0.5, 0, TAU);
    x.fill();
    x.restore();
    // eye sockets and nose
    x.fillStyle = '#2a1d2c';
    for (const sx of [-1, 1]) {
      x.beginPath();
      x.ellipse(sx * 3, -2.6, 1.7, 2, sx * -0.15, 0, TAU);
      x.fill();
    }
    x.beginPath();
    x.moveTo(0, -0.3);
    x.lineTo(0.9, 1.4);
    x.lineTo(-0.9, 1.4);
    x.closePath();
    x.fill();
    x.restore();
  };
  SPR.skull = makeSpr(30, 22, 15, 17, (x) => {
    shadow(x, 0, 0, 9, 3, 0.25);
    skull(x, 0, -6, 1.1, 0.12);
  });
  SPR.bones = makeSpr(56, 34, 28, 27, (x) => {
    shadow(x, 0, 0, 21, 6, 0.28);
    bone(x, -6, -3, 22, 0.28);
    bone(x, -2, -5, 18, -0.55);
    skull(x, 12, -8, 1.3, -0.15);
  });
  SPR.log = makeSpr(56, 26, 28, 22, (x) => {
    shadow(x, 0, 0, 22, 5, 0.22);
    rr(x, -22, -14, 40, 12, 6, '#8a5a36');
    ell(x, 18, -8, 5, 6.5, '#c89a6a');
    x.strokeStyle = '#6b4423';
    x.lineWidth = 1;
    ell(x, 18, -8, 2.5, 3.2, null);
    x.beginPath();
    x.moveTo(-18, -8);
    x.lineTo(10, -8);
    x.stroke();
    x.lineWidth = 2.2;
    x.strokeStyle = OUT;
    x.fillStyle = '#62b24a';
    x.beginPath();
    x.arc(-8, -14, 4, Math.PI, 0);
    x.fill();
  });
  SPR.stump = makeSpr(36, 28, 18, 24, (x) => {
    shadow(x, 0, 0, 14, 5, 0.22);
    rr(x, -10, -14, 20, 14, 4, '#8a5a36');
    ell(x, 0, -14, 10, 4, '#c89a6a');
    x.strokeStyle = '#6b4423';
    x.lineWidth = 1;
    ell(x, 0, -14, 5, 2, null);
  });
  SPR.tallgrass = makeSpr(36, 30, 18, 28, (x) => {
    x.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const X = (i - 3) * 3.5;
      x.strokeStyle = i % 2 ? '#4c9a3a' : '#6cbf4b';
      x.beginPath();
      x.moveTo(X, 0);
      x.quadraticCurveTo(X + 2, -10, X + (i - 3) * 1.6, -18 - (i % 3) * 3);
      x.stroke();
    }
  });
}
export const TREESET = new Set([
  'oak',
  'oakA',
  'oakR',
  'pine',
  'snowpine',
  'palm',
  'swamptree',
  'blighttree',
  'deadtree',
]);

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
