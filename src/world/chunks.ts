import { mkCanvas } from '../core/dom';
import { OUT, TAU, clamp, fbm, hs, lerp, mulberry, pick, rand, strSeed, vn } from '../core/math';
import { game } from '../game/state';
import { genDungeonChunk } from './dungeon';
import { poiSolid, poisNear } from './poi';
import { CH, classify, corr, groundF, hField, terr, walkT } from './terrain';
/* ---------- World chunks ---------- */
export const WCH = new Map();
export function chunkRng(cx, cy) {
  return mulberry((game.SEED ^ Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0);
}
const GS = 8,
  GN = CH / GS + 1,
  FR = 2,
  FN = CH / FR,
  NF = 10,
  AE = 0.0014,
  HT = [
    0.352, 0.36, 0.384, 0.3915, 0.3965, 0.4, 0.4032, 0.407, 0.425, 0.431, 0.675, 0.68, 0.745, 0.752,
  ];
function startGen(cx, cy) {
  return {
    cx,
    cy,
    row: 0,
    phase: 0,
    F: new Float32Array(GN * GN * NF),
    img: new ImageData(FN, FN),
    types: new Uint8Array(FN * FN),
    bio: new Uint8Array(FN * FN),
  };
}
function stepGen(G, steps) {
  const ox = G.cx * CH,
    oy = G.cy * CH,
    F = G.F;
  while (steps-- > 0 && G.phase < 2) {
    if (G.phase === 0) {
      const end = Math.min(GN, G.row + 14);
      for (let j = G.row; j < end; j++)
        for (let i = 0; i < GN; i++) {
          const x = ox + i * GS,
            y = oy + j * GS,
            d = Math.hypot(x, y),
            k = clamp((d - 350) / 1300, 0, 1),
            c = corr(d),
            o = (j * GN + i) * NF;
          F[o] = hField(x, y, d);
          F[o + 1] = lerp(0.47, fbm(x * 0.0015 + 40, y * 0.0015, 3, 9), k);
          F[o + 2] = lerp(0.5, fbm(x * 0.00052 - 90, y * 0.00052 + 30, 3, 17), k);
          F[o + 3] = c > 0.3 ? fbm(x * 0.0009, y * 0.0009, 2, 41) : 0;
          F[o + 4] = vn(x * 0.009, y * 0.009, 23);
          F[o + 5] = vn(x * 0.017, y * 0.017, 5);
          F[o + 6] = vn(x * 0.02, y * 0.02, 8);
          F[o + 7] = vn(x * 0.012, y * 0.012, 6);
          F[o + 8] = vn(x * 0.01, y * 0.01, 7);
          F[o + 9] = vn(x * 0.03, y * 0.03, 6);
        }
      G.row = end;
      if (G.row >= GN) {
        G.phase = 1;
        G.row = 0;
      }
    } else {
      const D = G.img.data,
        end = Math.min(FN, G.row + 32),
        v = new Float32Array(NF);
      for (let j = G.row; j < end; j++) {
        const gy = ((j + 0.5) * FR) / GS,
          j0 = gy | 0,
          fy = gy - j0,
          wy = oy + (j + 0.5) * FR;
        for (let i = 0; i < FN; i++) {
          const gx = ((i + 0.5) * FR) / GS,
            i0 = gx | 0,
            fx = gx - i0,
            wx = ox + (i + 0.5) * FR,
            a = (j0 * GN + i0) * NF,
            b2 = a + NF,
            c2 = a + GN * NF,
            d2 = c2 + NF,
            w00 = (1 - fx) * (1 - fy),
            w10 = fx * (1 - fy),
            w01 = (1 - fx) * fy,
            w11 = fx * fy;
          for (let k = 0; k < NF; k++)
            v[k] = F[a + k] * w00 + F[b2 + k] * w10 + F[c2 + k] * w01 + F[d2 + k] * w11;
          const c = corr(Math.hypot(wx, wy)),
            h = v[0],
            q = classify(h, v[1], v[2], c, v[3], v[4]),
            t = q >> 3,
            b = q & 7,
            col = groundF(t, b, h, c, v[5], v[6], v[7], v[8], v[9], v[4]),
            p = j * FN + i,
            o = p * 4;
          let r = col[0],
            gg = col[1],
            bb = col[2];
          for (let n = 0; n < HT.length; n++) {
            const dd = h - HT[n];
            if (dd > -AE && dd < AE) {
              const h2 = dd < 0 ? HT[n] + AE : HT[n] - AE,
                q2 = classify(h2, v[1], v[2], c, v[3], v[4]),
                c2 = groundF(q2 >> 3, q2 & 7, h2, c, v[5], v[6], v[7], v[8], v[9], v[4]),
                f = 0.5 - (Math.abs(dd) / AE) * 0.5;
              r += (c2[0] - r) * f;
              gg += (c2[1] - gg) * f;
              bb += (c2[2] - bb) * f;
              break;
            }
          }
          D[o] = r;
          D[o + 1] = gg;
          D[o + 2] = bb;
          D[o + 3] = 255;
          G.types[p] = t;
          G.bio[p] = b;
        }
      }
      G.row = end;
      if (G.row >= FN) G.phase = 2;
    }
  }
  return G.phase === 2;
}
function genWorldChunk(cx, cy, G) {
  if (!G || G.cx !== cx || G.cy !== cy) G = startGen(cx, cy);
  stepGen(G, 99);
  return finishGen(G);
}
function finishGen(G) {
  const cx = G.cx,
    cy = G.cy,
    img = G.img,
    ox = cx * CH,
    oy = cy * CH,
    types = G.types,
    bio = G.bio;
  const sm = mkCanvas(FN, FN);
  sm.getContext('2d').putImageData(img, 0, 0);
  const cvs = mkCanvas(CH, CH),
    x = cvs.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.drawImage(sm, 0, 0, CH, CH);
  const rnd = chunkRng(cx, cy),
    at = (lx, ly) => {
      const q = clamp((ly / FR) | 0, 0, FN - 1) * FN + clamp((lx / FR) | 0, 0, FN - 1);
      return [types[q], bio[q]];
    };
  const pois = poisNear(ox + CH / 2, oy + CH / 2, CH * 0.75);
  x.save();
  x.translate(-ox, -oy);
  for (const p of pois) paintPoiGround(x, p);
  x.restore();
  const inPoi = (wx, wy, pad = 0) =>
    pois.some((p) => Math.hypot(wx - p.x, (wy - p.y) * 1.15) < p.r + pad);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  const waves = [];
  for (let k = 0; k < 1000; k++) {
    const lx = rnd() * CH,
      ly = rnd() * CH,
      [t, b] = at(lx, ly),
      q = rnd(),
      wx = ox + lx,
      wy = oy + ly;
    if (t === 3) {
      if (inPoi(wx, wy, -20)) continue;
      if (b === 0 || b === 1 || b === 2 || b === 5) {
        x.strokeStyle =
          b === 2
            ? 'rgba(120,90,30,.45)'
            : b === 5
              ? 'rgba(40,60,30,.5)'
              : b === 1
                ? 'rgba(30,90,40,.5)'
                : 'rgba(50,120,40,.5)';
        x.lineWidth = 1.6;
        x.beginPath();
        x.moveTo(lx - 3, ly - 5);
        x.lineTo(lx, ly);
        x.lineTo(lx + 1, ly - 7);
        x.moveTo(lx, ly);
        x.lineTo(lx + 4, ly - 4);
        x.stroke();
        if (b === 0 && q < 0.12) {
          const col = pick(['#fff4d6', '#ffd24a', '#ff8fb0', '#b8d8ff', '#ffffff']);
          x.fillStyle = col;
          for (let p = 0; p < 5; p++) {
            x.beginPath();
            x.arc(lx + Math.cos(p * 1.256) * 2.6, ly - 6 + Math.sin(p * 1.256) * 2.6, 1.9, 0, TAU);
            x.fill();
          }
          x.fillStyle = '#f0a020';
          x.beginPath();
          x.arc(lx, ly - 6, 1.4, 0, TAU);
          x.fill();
        }
        if (b === 2 && q < 0.35) {
          x.fillStyle = pick(['#e07a2e', '#c8452f', '#f0b43a', '#a8542a']);
          x.beginPath();
          x.ellipse(lx, ly, 2.6, 1.5, q * 6, 0, TAU);
          x.fill();
        }
        if (b === 1 && q < 0.03) {
          x.lineWidth = 1.4;
          x.strokeStyle = OUT;
          x.fillStyle = '#e8dcc0';
          x.fillRect(lx - 1, ly - 4, 2, 4);
          x.fillStyle = q < 0.015 ? '#d8443a' : '#b8844a';
          x.beginPath();
          x.arc(lx, ly - 5, 3.5, Math.PI, 0);
          x.fill();
          x.fillStyle = '#fff';
          x.fillRect(lx - 1.5, ly - 7, 1.2, 1.2);
        }
      } else if (b === 3) {
        if (q < 0.35) {
          x.strokeStyle = 'rgba(180,130,70,.45)';
          x.lineWidth = 2;
          x.beginPath();
          x.arc(lx, ly + 8, 10, 3.6, 5.8);
          x.stroke();
        } else if (q < 0.4) {
          x.fillStyle = 'rgba(140,100,60,.6)';
          x.beginPath();
          x.ellipse(lx, ly, 2.5, 1.6, 0, 0, TAU);
          x.fill();
        }
      } else if (b === 4) {
        if (q < 0.25) {
          x.strokeStyle = 'rgba(170,195,225,.6)';
          x.lineWidth = 2;
          x.beginPath();
          x.arc(lx, ly + 8, 9, 3.7, 5.7);
          x.stroke();
        } else if (q < 0.3) {
          x.fillStyle = '#fff';
          x.fillRect(lx, ly, 1.5, 1.5);
        }
      } else if (b === 6) {
        if (q < 0.12) {
          x.strokeStyle = 'rgba(40,20,50,.5)';
          x.lineWidth = 1.5;
          x.beginPath();
          x.moveTo(lx, ly);
          x.lineTo(lx + rand(-8, 8), ly + rand(-5, 5));
          x.lineTo(lx + rand(-12, 12), ly + rand(-8, 8));
          x.stroke();
        } else if (q < 0.2) {
          x.strokeStyle = 'rgba(70,40,80,.5)';
          x.lineWidth = 1.6;
          x.beginPath();
          x.moveTo(lx - 2, ly - 5);
          x.lineTo(lx, ly);
          x.lineTo(lx + 2, ly - 6);
          x.stroke();
        }
      }
    } else if (t === 2 && q < 0.2) {
      x.fillStyle = 'rgba(150,120,80,.45)';
      x.beginPath();
      x.ellipse(lx, ly, 2.5, 1.6, 0, 0, TAU);
      x.fill();
    } else if (t === 4 && q < 0.2) {
      x.strokeStyle = 'rgba(60,55,60,.35)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(lx, ly);
      x.lineTo(lx + rand(-7, 7), ly + rand(-4, 4));
      x.stroke();
    } else if (t === 1) {
      if (b === 5 && q < 0.08) {
        x.lineWidth = 1.6;
        x.strokeStyle = '#2e4a24';
        x.fillStyle = '#5f9a44';
        x.beginPath();
        x.arc(lx, ly, 5, 0.4, TAU - 0.2);
        x.lineTo(lx, ly);
        x.closePath();
        x.fill();
        x.stroke();
      } else if (b === 4 && q < 0.05) {
        x.strokeStyle = 'rgba(255,255,255,.6)';
        x.lineWidth = 1.2;
        x.beginPath();
        x.moveTo(lx, ly);
        x.lineTo(lx + rand(-10, 10), ly + rand(-6, 6));
        x.stroke();
      } else if (q < 0.03 && b !== 4) waves.push([lx + ox, ly + oy, q * 200]);
    } else if (t === 0 && q < 0.02) waves.push([lx + ox, ly + oy, q * 300]);
  }
  const decor = [];
  const dcount = 70;
  for (let k = 0; k < dcount; k++) {
    const lx = rnd() * CH,
      ly = rnd() * CH,
      [t, b] = at(lx, ly),
      q = rnd(),
      wx = ox + lx,
      wy = oy + ly;
    if (inPoi(wx, wy, 30)) continue;
    let d = null;
    if (t === 3) {
      switch (b) {
        case 0:
          if (q < 0.07) d = 'oak';
          else if (q < 0.1) d = 'pine';
          else if (q < 0.2) d = 'bush';
          else if (q < 0.23) d = 'rock';
          else if (q < 0.26) d = 'tallgrass';
          break;
        case 1:
          if (q < 0.4) d = 'oak';
          else if (q < 0.68) d = 'pine';
          else if (q < 0.76) d = 'bush';
          else if (q < 0.79) d = 'log';
          else if (q < 0.82) d = 'stump';
          break;
        case 2:
          if (q < 0.3) d = 'oakA';
          else if (q < 0.5) d = 'oakR';
          else if (q < 0.62) d = 'pine';
          else if (q < 0.7) d = 'bushA';
          else if (q < 0.73) d = 'log';
          break;
        case 3:
          if (q < 0.09) d = 'cactus';
          else if (q < 0.13) d = 'sandrock';
          else if (q < 0.17) d = 'drybush';
          else if (q < 0.19) d = 'skull';
          else if (q < 0.2) d = 'palm';
          break;
        case 4:
          if (q < 0.25) d = 'snowpine';
          else if (q < 0.3) d = 'icerock';
          else if (q < 0.34) d = 'deadtree';
          else if (q < 0.37) d = 'snowbush';
          break;
        case 5:
          if (q < 0.2) d = 'swamptree';
          else if (q < 0.35) d = 'reeds';
          else if (q < 0.42) d = 'mushroom';
          else if (q < 0.46) d = 'deadtree';
          break;
        case 6:
          if (q < 0.14) d = 'blighttree';
          else if (q < 0.24) d = 'crystal';
          else if (q < 0.3) d = 'bones';
          else if (q < 0.35) d = 'blightrock';
          break;
      }
    } else if (t === 4) {
      if (q < 0.3) d = b === 4 ? 'icerock' : b === 3 ? 'sandrock' : b === 6 ? 'blightrock' : 'rock';
      else if (q < 0.4) d = b === 4 ? 'snowpine' : 'pine';
    } else if (t === 2 && q < 0.05) d = b === 3 ? 'palm' : 'rock';
    if (d) decor.push({ k: d, x: wx, y: wy, r: DECOR_R[d] || 0, ph: rnd() * TAU });
  }
  decor.sort((a, b) => a.y - b.y);
  return { cvs, decor, waves, last: 0 };
}
const DECOR_R = {
  oak: 11,
  oakA: 11,
  oakR: 11,
  pine: 9,
  snowpine: 9,
  rock: 13,
  sandrock: 13,
  icerock: 13,
  blightrock: 13,
  cactus: 8,
  deadtree: 6,
  swamptree: 9,
  blighttree: 8,
  crystal: 9,
  palm: 7,
  log: 10,
};
function paintPoiGround(x, p) {
  x.save();
  if (p.kind === 'village') {
    const dirt = p.b === 4 ? '#c9c2b8' : p.b === 3 ? '#d9b884' : '#c9a26e';
    x.fillStyle = dirt;
    x.beginPath();
    x.ellipse(p.x, p.y + 10, 128, 96, 0, 0, TAU);
    x.fill();
    x.strokeStyle = dirt;
    x.lineCap = 'round';
    x.lineWidth = 26;
    for (const h of p.houses) {
      x.beginPath();
      x.moveTo(p.x, p.y + 10);
      x.quadraticCurveTo(
        (p.x + h.x) / 2 + 20,
        (p.y + h.y) / 2,
        h.x + h.door * h.w * 0.22,
        h.y + 10,
      );
      x.stroke();
    }
    x.lineWidth = 22;
    x.beginPath();
    x.moveTo(p.x, p.y);
    x.lineTo(p.x, p.y + 300);
    x.stroke();
    const r2 = mulberry(strSeed(p.key + 'cob'));
    x.fillStyle = 'rgba(120,90,60,.3)';
    for (let i = 0; i < 120; i++) {
      const a = r2() * TAU,
        d = Math.sqrt(r2()) * 110;
      x.beginPath();
      x.ellipse(p.x + Math.cos(a) * d, p.y + 10 + Math.sin(a) * d * 0.75, 4, 2.6, 0, 0, TAU);
      x.fill();
    }
    x.strokeStyle = 'rgba(255,255,255,.18)';
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(p.x, p.y + 10, 128, 96, 0, 0, TAU);
    x.stroke();
  } else if (p.kind === 'lair') {
    const gr = x.createRadialGradient(p.x, p.y, 20, p.x, p.y, 200);
    gr.addColorStop(0, 'rgba(40,20,30,.65)');
    gr.addColorStop(0.7, 'rgba(50,30,40,.4)');
    gr.addColorStop(1, 'rgba(50,30,40,0)');
    x.fillStyle = gr;
    x.beginPath();
    x.ellipse(p.x, p.y, 200, 160, 0, 0, TAU);
    x.fill();
    x.strokeStyle = 'rgba(20,10,20,.45)';
    x.lineWidth = 4;
    x.beginPath();
    x.ellipse(p.x, p.y, 110, 80, 0, 0, TAU);
    x.stroke();
    x.beginPath();
    x.ellipse(p.x, p.y, 90, 64, 0, 0, TAU);
    x.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2,
        b2 = ((i + 2) / 5) * TAU - Math.PI / 2;
      x.beginPath();
      x.moveTo(p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 64);
      x.lineTo(p.x + Math.cos(b2) * 90, p.y + Math.sin(b2) * 64);
      x.stroke();
    }
  } else if (p.kind === 'cave') {
    x.fillStyle = 'rgba(90,70,60,.45)';
    x.beginPath();
    x.ellipse(p.x, p.y + 14, 70, 34, 0, 0, TAU);
    x.fill();
  }
  x.restore();
}

export function bgStep(cx, cy) {
  if (game.mode !== 'world') return;
  if (!game.bgGen) {
    const ci = Math.floor(cx / CH),
      cj = Math.floor(cy / CH);
    outer: for (let r = 1; r <= 2; r++)
      for (let i = ci - r; i <= ci + r; i++)
        for (let j = cj - r; j <= cj + r; j++)
          if (!WCH.has(i + ',' + j)) {
            game.bgGen = startGen(i, j);
            break outer;
          }
  }
  if (game.bgGen) {
    if (WCH.has(game.bgGen.cx + ',' + game.bgGen.cy)) {
      game.bgGen = null;
      return;
    }
    if (stepGen(game.bgGen, 1)) {
      WCH.set(game.bgGen.cx + ',' + game.bgGen.cy, finishGen(game.bgGen));
      game.bgGen = null;
    }
  }
}
export function getChunk(i, j, gen) {
  const map = game.mode === 'dungeon' ? game.DG.ch : WCH,
    k = i + ',' + j;
  let c = map.get(k);
  if (!c && gen && game.genBudget > 0) {
    game.genBudget--;
    c =
      game.mode === 'dungeon'
        ? genDungeonChunk(game.DG, i, j)
        : genWorldChunk(
            i,
            j,
            game.bgGen && game.bgGen.cx === i && game.bgGen.cy === j ? game.bgGen : null,
          );
    if (game.bgGen && game.bgGen.cx === i && game.bgGen.cy === j) game.bgGen = null;
    map.set(k, c);
    if (map.size > 44) {
      const a = [...map.entries()].sort((p, q) => p[1].last - q[1].last);
      for (let n = 0; n < 10; n++) map.delete(a[n][0]);
    }
  }
  if (c) c.last = performance.now();
  return c;
}
export function solidAt(x, y, r) {
  if (game.mode === 'dungeon') {
    const T = game.DG.T;
    for (const [ax, ay] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r * 0.6],
      [0, -r * 0.6],
    ])
      if (!game.DG.isF(Math.floor((x + ax) / T), Math.floor((y + ay) / T))) return true;
    for (const p of game.DG.pillars) {
      const dx = x - p.x,
        dy = (y - p.y + 8) * 1.4;
      if (dx * dx + dy * dy < (14 + r) * (14 + r)) return true;
    }
    return false;
  }
  if (!walkT(terr(x, y))) return true;
  const i = Math.floor(x / CH),
    j = Math.floor(y / CH);
  for (let a = i - 1; a <= i + 1; a++)
    for (let b = j - 1; b <= j + 1; b++) {
      const c = WCH.get(a + ',' + b);
      if (!c) continue;
      for (const d of c.decor) {
        if (!d.r) continue;
        const dx = d.x - x;
        if (dx > 40 || dx < -40) continue;
        const dy = (d.y - 3 - y) * 1.4;
        if (dx * dx + dy * dy < (d.r + r) * (d.r + r)) return true;
      }
    }
  for (const p of poisNear(x, y, 10)) if (poiSolid(p, x, y, r)) return true;
  return false;
}
export function regionName(x, y) {
  if (game.mode === 'dungeon') return game.DG.name;
  const v = poisNear(x, y, 0).find((p) => Math.hypot(x - p.x, y - p.y) < p.r);
  if (v) return v.name;
  const T = terr(x, y);
  const i = Math.floor(x / 1400),
    j = Math.floor(y / 1400);
  const ADJ = [
    'Whispering',
    'Amber',
    'Hollow',
    'Sunken',
    'Thorned',
    'Silver',
    'Mossy',
    'Ashen',
    'Gloam',
    'Golden',
    'Weeping',
    'Howling',
    'Ember',
    'Quiet',
  ];
  const NOUN = [
    ['Fields', 'Downs', 'Meadows', 'Heath'],
    ['Wood', 'Thicket', 'Weald', 'Grove'],
    ['Wood', 'Glade', 'Copse', 'Vale'],
    ['Dunes', 'Wastes', 'Sands', 'Flats'],
    ['Tundra', 'Peaks', 'Frostlands', 'Snows'],
    ['Bog', 'Fen', 'Mire', 'Marsh'],
    ['Blight', 'Scar', 'Rot', 'Barrens'],
  ][T.b];
  return ADJ[(hs(i, j, 77) * ADJ.length) | 0] + ' ' + NOUN[(hs(i, j, 78) * NOUN.length) | 0];
}
