import { circ, ell, mkCanvas, rr, shadow } from '../dom';
import { OUT, TAU } from '../../core/math';
/* ================= ART: decor sprites ================= */
export type Sprite = ReturnType<typeof makeSpr>;
export const SPR: Record<string, Sprite> = {};
export function makeSpr(w, h, ax, ay, fn, res = 2) {
  const c = mkCanvas(w * res, h * res),
    x = c.getContext('2d');
  x.scale(res, res);
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
  // 0 the low stone, 1 a taller peak, 2 a round double hump. Same colours in every biome.
  const rock = (c1, c2, shape) =>
    makeSpr(58, 52, 29, 46, (x) => {
      shadow(x, 0, 0, shape === 2 ? 22 : shape === 1 ? 18 : 20, 6, 0.25);
      x.beginPath();
      if (shape === 1) {
        x.moveTo(-16, 0);
        x.lineTo(-15, -10);
        x.lineTo(-6, -18);
        x.lineTo(1, -32);
        x.lineTo(10, -16);
        x.lineTo(17, -7);
        x.lineTo(16, 0);
      } else if (shape === 2) {
        x.moveTo(-22, 0);
        x.lineTo(-20, -5);
        x.lineTo(-14, -14);
        x.lineTo(-6, -11);
        x.lineTo(-1, -5);
        x.lineTo(5, -9);
        x.lineTo(11, -16);
        x.lineTo(18, -11);
        x.lineTo(22, -4);
        x.lineTo(20, 0);
      } else {
        x.moveTo(-18, 0);
        x.lineTo(-17, -14);
        x.lineTo(-6, -25);
        x.lineTo(8, -23);
        x.lineTo(18, -10);
        x.lineTo(18, 0);
      }
      x.closePath();
      x.fillStyle = c1;
      x.fill();
      x.stroke();
      x.fillStyle = c2;
      x.beginPath();
      if (shape === 1) {
        x.moveTo(2, -14);
        x.lineTo(6, -24);
        x.lineTo(11, -15);
        x.lineTo(6, -11);
      } else if (shape === 2) {
        x.moveTo(-16, -5);
        x.lineTo(-13, -12);
        x.lineTo(-8, -10);
        x.lineTo(-10, -5);
        x.closePath();
        x.moveTo(7, -7);
        x.lineTo(12, -14);
        x.lineTo(16, -10);
        x.lineTo(13, -6);
      } else {
        x.moveTo(-12, -13);
        x.lineTo(-5, -22);
        x.lineTo(6, -20);
        x.lineTo(1, -12);
      }
      x.closePath();
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,.2)';
      x.lineWidth = 1.5;
      x.beginPath();
      if (shape === 1) {
        x.moveTo(-8, -3);
        x.lineTo(-11, -12);
      } else if (shape === 2) {
        x.moveTo(-2, -2);
        x.lineTo(1, -8);
      } else {
        x.moveTo(4, -4);
        x.lineTo(9, -12);
      }
      x.stroke();
    });
  for (const [name, body, facet] of [
    ['rock', '#9a9c96', '#c4c6bf'],
    ['sandrock', '#c49060', '#e6b88a'],
    ['icerock', '#a8c8e0', '#e6f4ff'],
    ['blightrock', '#6d6080', '#9a8cb0'],
  ]) {
    SPR[name] = rock(body, facet, 0);
    SPR[name + 'B'] = rock(body, facet, 1);
    SPR[name + 'C'] = rock(body, facet, 2);
  }
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
  // Same fork as the blight tree, with soft sickly-green spore puffs instead of orbs.
  SPR.sporetree = makeSpr(80, 104, 40, 98, (x) => {
    shadow(x, 0, 0, 16, 5, 0.3);
    x.lineWidth = 6;
    x.strokeStyle = OUT;
    const br = () => {
      x.beginPath();
      x.moveTo(0, 0);
      x.quadraticCurveTo(-6, -28, 4, -46);
      x.quadraticCurveTo(10, -60, -2, -70);
      x.moveTo(1, -32);
      x.quadraticCurveTo(-16, -38, -24, -54);
      x.moveTo(3, -44);
      x.quadraticCurveTo(18, -48, 24, -64);
      x.stroke();
    };
    br();
    x.lineWidth = 3;
    x.strokeStyle = '#4a3656';
    br();
    const puff = (px, py) => {
      const dots: [number, number, number, string][] = [
        [0, 0.6, 3.6, '#62781e'],
        [-3.8, 1.6, 2.8, '#7a9a28'],
        [3.4, 1.8, 2.6, '#8aaa34'],
        [-1.1, -3.2, 2.9, '#c6d85a'],
      ];
      x.fillStyle = OUT;
      for (const [dx, dy, r] of dots) {
        x.beginPath();
        x.arc(px + dx, py + dy, r + 1.45, 0, TAU);
        x.fill();
      }
      for (const [dx, dy, r, col] of dots) {
        x.fillStyle = col;
        x.beginPath();
        x.arc(px + dx, py + dy, r, 0, TAU);
        x.fill();
      }
    };
    puff(-24, -54);
    puff(24, -64);
    puff(-2, -70);
  });
  // Jagged blight trunk ending in black glass spikes.
  SPR.glasstree = makeSpr(80, 108, 40, 102, (x) => {
    shadow(x, 0, 0, 14, 5, 0.3);
    x.lineJoin = 'miter';
    x.miterLimit = 2;
    x.lineWidth = 5;
    x.strokeStyle = OUT;
    const br = () => {
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(-2, -22);
      x.lineTo(-8, -40);
      x.lineTo(-18, -56);
      x.moveTo(-8, -40);
      x.lineTo(2, -54);
      x.lineTo(3, -74);
      x.moveTo(-2, -22);
      x.lineTo(12, -42);
      x.lineTo(22, -62);
      x.stroke();
    };
    br();
    x.lineWidth = 2.6;
    x.strokeStyle = '#4a3656';
    br();
    const spike = (tx, ty, ang) => {
      x.save();
      x.translate(tx, ty);
      x.rotate(ang);
      x.lineJoin = 'miter';
      x.beginPath();
      x.moveTo(0, 4);
      x.lineTo(2.3, -7);
      x.lineTo(0, -20);
      x.lineTo(-2.3, -7);
      x.closePath();
      x.fillStyle = '#1a1820';
      x.fill();
      x.stroke();
      x.fillStyle = '#a8b0bc';
      x.beginPath();
      x.moveTo(-1.15, 1.5);
      x.lineTo(-1.35, -8);
      x.lineTo(-0.35, -13);
      x.lineTo(-0.15, 1.5);
      x.closePath();
      x.fill();
      x.restore();
    };
    spike(-18, -56, -0.55);
    spike(3, -74, 0.06);
    spike(22, -62, 0.62);
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
  // Blightlands minerals: one cluster shape. `edge` draws a thin facet instead of a broad face.
  const crystalSpr = (body: string, facet: string, edge = false) =>
    makeSpr(44, 56, 22, 52, (x) => {
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
        x.fillStyle = body;
        x.fill();
        x.stroke();
        x.fillStyle = facet;
        x.beginPath();
        if (edge) {
          x.moveTo(-w + 1.3, -2);
          x.lineTo(-w + 1.3, -h * 0.66);
          x.lineTo(-w + 3.1, -h * 0.6);
          x.lineTo(-w + 3.1, -2);
        } else {
          x.moveTo(-w + 2, -2);
          x.lineTo(-w + 2, -h * 0.68);
          x.lineTo(0, -h + 3);
          x.lineTo(0, -2);
        }
        x.fill();
        x.restore();
      };
      cr(-9, 26, 5, -0.3);
      cr(9, 22, 5, 0.35);
      cr(0, 40, 7, 0);
    });
  SPR.crystal = crystalSpr('#9a5ad0', '#d8a8ff');
  SPR.shard = crystalSpr('#7a9a28', '#e4f59a');
  SPR.glass = crystalSpr('#1a1820', '#a8b0bc', true);
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
    x.lineJoin = 'round';
    // silhouettes: round cranium narrowing through the cheekbones into the upper jaw
    const head = new Path2D();
    head.ellipse(0, -4, 7.6, 6.9, 0, 0, TAU);
    const face = new Path2D();
    face.moveTo(-6.4, -2);
    face.quadraticCurveTo(-6.6, 1.6, -4.4, 2.2);
    face.lineTo(-4, 3.6);
    face.lineTo(4, 3.6);
    face.lineTo(4.4, 2.2);
    face.quadraticCurveTo(6.6, 1.6, 6.4, -2);
    face.closePath();
    const jaw = new Path2D();
    jaw.moveTo(-4.6, 3.4);
    jaw.quadraticCurveTo(-4.9, 6.4, -2.6, 7.3);
    jaw.quadraticCurveTo(0, 8, 2.6, 7.3);
    jaw.quadraticCurveTo(4.9, 6.4, 4.6, 3.4);
    jaw.closePath();
    // outline pass (one silhouette), then the bone fill
    x.strokeStyle = OUT;
    x.lineWidth = OW * 2;
    for (const p of [jaw, head, face]) x.stroke(p);
    x.fillStyle = BSH;
    x.fill(jaw);
    x.fillStyle = BONE;
    x.fill(head);
    x.fill(face);
    // shading: a darker crescent on the lower right, a highlight on the upper left
    x.save();
    x.clip(head);
    x.fillStyle = BSH;
    x.beginPath();
    x.ellipse(2.4, 0.6, 8, 6.5, 0, 0, TAU);
    x.fill();
    x.fillStyle = BONE;
    x.beginPath();
    x.ellipse(-0.6, -4.8, 7.4, 6.2, 0, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.7)';
    x.beginPath();
    x.ellipse(-3.4, -7.6, 2.6, 1.3, -0.5, 0, TAU);
    x.fill();
    x.restore();
    x.fillStyle = 'rgba(120,100,70,.28)';
    x.beginPath();
    x.moveTo(-6.4, -2);
    x.quadraticCurveTo(-6.6, 1.6, -4.4, 2.2);
    x.lineTo(-4, 3.6);
    x.lineTo(4, 3.6);
    x.lineTo(4.4, 2.2);
    x.quadraticCurveTo(0, 1.4, -6.4, -2);
    x.fill();
    // teeth: upper and lower rows of small rounded tiles
    x.lineWidth = 0.6;
    for (const [ty, n] of [
      [2.1, 5],
      [3.9, 4],
    ]) {
      const tw = 1.45,
        x0 = (-n * tw) / 2;
      for (let i = 0; i < n; i++) {
        x.beginPath();
        x.roundRect(x0 + i * tw, ty, tw, 1.8, 0.45);
        x.fillStyle = '#f7f1e2';
        x.fill();
        x.stroke();
      }
    }
    // eye sockets with a faint inner glow, and the nasal opening
    for (const sx of [-1, 1]) {
      x.fillStyle = '#2a1d2c';
      x.beginPath();
      x.ellipse(sx * 3.1, -2.6, 2.2, 2.5, sx * -0.2, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(120,90,140,.45)';
      x.beginPath();
      x.ellipse(sx * 3.1 - 0.5, -2, 0.9, 1, 0, 0, TAU);
      x.fill();
      // brow ridge
      x.strokeStyle = 'rgba(80,60,40,.35)';
      x.lineWidth = 0.8;
      x.beginPath();
      x.ellipse(sx * 3.1, -2.8, 3, 3.3, 0, Math.PI * 1.15, Math.PI * 1.85);
      x.stroke();
    }
    x.fillStyle = '#2a1d2c';
    for (const sx of [-1, 1]) {
      x.beginPath();
      x.moveTo(0, 1.5);
      x.quadraticCurveTo(sx * 1.4, 0.8, sx * 0.9, -0.2);
      x.quadraticCurveTo(sx * 0.3, -0.4, 0, 0.3);
      x.fill();
    }
    // hairline crack
    x.strokeStyle = OUT;
    x.lineWidth = 0.75;
    x.beginPath();
    x.moveTo(1.2, -10.8);
    x.lineTo(2.4, -8.6);
    x.lineTo(1.5, -7.4);
    x.lineTo(2.8, -5.9);
    x.stroke();
    x.restore();
  };
  SPR.skull = makeSpr(
    30,
    30,
    15,
    24,
    (x) => {
      shadow(x, 0, 0, 10, 3, 0.25);
      // a little sand drift against the jaw
      x.fillStyle = 'rgba(160,120,70,.35)';
      x.beginPath();
      x.ellipse(-3, -0.5, 8, 2, 0, 0, TAU);
      x.fill();
      skull(x, 0, -7, 1.1, 0.12);
    },
    5,
  );
  SPR.bones = makeSpr(
    56,
    38,
    28,
    31,
    (x) => {
      shadow(x, 0, 0, 21, 6, 0.28);
      bone(x, -6, -3, 22, 0.28);
      bone(x, -2, -5, 18, -0.55);
      skull(x, 12, -9, 1.3, -0.15);
    },
    4,
  );
  // scattered remains: a ribcage on its side, a thigh bone and small bones, no skull
  const ribcage = (x, cx: number, cy: number) => {
    x.save();
    x.translate(cx, cy);
    const ribs = new Path2D(),
      spine = new Path2D();
    // curved ribs hanging from the spine, shortening toward both ends
    // each rib arcs up from the spine and bends back over it, like a cage lying on its side
    for (let i = 0; i < 5; i++) {
      const sx = -10 + i * 4.8,
        len = [8, 11, 12.5, 12, 9.5][i];
      ribs.moveTo(sx, -1);
      ribs.bezierCurveTo(sx + 6, -1 - len * 0.15, sx + 7, -1 - len * 0.9, sx + 1, -1 - len);
    }
    spine.moveTo(-13, 0.4);
    spine.quadraticCurveTo(0, 1.8, 14, -0.4);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    // one outline pass for the whole silhouette, then the bone colour
    x.strokeStyle = OUT;
    x.lineWidth = 2.4 + OW * 2;
    x.stroke(ribs);
    x.lineWidth = 3.4 + OW * 2;
    x.stroke(spine);
    x.strokeStyle = BONE;
    x.lineWidth = 2.4;
    x.stroke(ribs);
    x.strokeStyle = BSH;
    x.lineWidth = 3.4;
    x.stroke(spine);
    // vertebra notches along the spine
    x.strokeStyle = 'rgba(90,70,50,.45)';
    x.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      const vx = -9 + i * 4;
      x.beginPath();
      x.moveTo(vx, -1.2);
      x.lineTo(vx, 1.6);
      x.stroke();
    }
    // highlight on the ribs' outer curves
    x.strokeStyle = 'rgba(255,255,255,.55)';
    x.lineWidth = 0.8;
    for (let i = 1; i < 4; i++) {
      const sx = -10 + i * 4.8;
      x.beginPath();
      x.moveTo(sx + 3, -2.6);
      x.quadraticCurveTo(sx + 5.2, -5, sx + 4.8, -8);
      x.stroke();
    }
    x.restore();
  };
  const vertebra = (x, cx: number, cy: number) => {
    x.fillStyle = OUT;
    x.beginPath();
    x.ellipse(cx, cy, 2.6 + OW, 1.8 + OW, 0, 0, TAU);
    x.fill();
    x.fillStyle = BONE;
    x.beginPath();
    x.ellipse(cx, cy, 2.6, 1.8, 0, 0, TAU);
    x.fill();
    x.fillStyle = BSH;
    x.beginPath();
    x.ellipse(cx + 0.3, cy + 0.5, 1, 0.7, 0, 0, TAU);
    x.fill();
  };
  SPR.remains = makeSpr(
    76,
    40,
    38,
    32,
    (x) => {
      shadow(x, 0, 0, 30, 6, 0.26);
      ribcage(x, -12, -3);
      bone(x, 20, -6, 22, -0.3, 3.8); // thigh bone
      bone(x, 10, 2, 10, 0.4, 2.6); // small arm bones
      bone(x, 30, 1, 8, 1.3, 2.3);
      vertebra(x, -29, 1);
      vertebra(x, 4, 2.5);
    },
    4,
  );
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
  'sporetree',
  'glasstree',
  'deadtree',
]);
