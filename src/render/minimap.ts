import { $, mkCanvas } from '../core/dom';
import { OUT, TAU, clamp, lerp } from '../core/math';
import { game, hero } from '../game/state';
import { CITY, STREETS } from '../world/city';
import { isoShape } from '../world/contour';
import { IT } from '../world/interior';
import { poisNear } from '../world/poi';
import { COL, terr } from '../world/terrain';
/* ================= MINIMAP ================= */
// The overworld map is an illustrated snapshot of the terrain around the hero: smooth biome
// colours with hill shading, water and peaks cut along crisp outlined contours, and the town
// drawn in. It is baked a few rows per frame and redrawn once the hero nears its border.
export const mini = $('#mini'),
  mc = mini.getContext('2d');
const MINI_R = 950, // world radius shown
  SNAP_R = 1300, // world radius of a snapshot (lets the hero roam before a rebake)
  SNAP_N = 160, // terrain samples across a snapshot
  MINI_ROWS = 8, // sample rows computed per frame (spreads the work)
  FRAME = 9; // width of the ring frame, canvas px
const LEVEL = { deep: 0.36, shore: 0.4, rock: 0.675, peak: 0.745, snow: 0.8 };
type Snap = { c: HTMLCanvasElement; x: number; y: number };
let snap: Snap | null = null,
  gen = null,
  seed = null;

/** Sample a few terrain rows of the snapshot in progress; bake it once complete. */
function stepGen() {
  const g = gen,
    n = SNAP_N,
    w = n + 1,
    st = (2 * SNAP_R) / n,
    end = Math.min(w, g.row + MINI_ROWS);
  for (let j = g.row; j < end; j++)
    for (let i = 0; i < w; i++) {
      const T = terr(g.x - SNAP_R + i * st, g.y - SNAP_R + j * st),
        k = j * w + i;
      g.h[k] = T.h;
      g.b[k] = T.b;
      g.t[k] = T.t;
    }
  g.row = end;
  if (g.row >= w) {
    snap = bake(g);
    gen = null;
  }
}
const put = (d: Uint8ClampedArray, k: number, c: number[], f = 1) => {
  d[k * 4] = c[0] * f;
  d[k * 4 + 1] = c[1] * f;
  d[k * 4 + 2] = c[2] * f;
  d[k * 4 + 3] = 255;
};
/** Paint a sampled snapshot into an image at minimap scale. */
function bake(g): Snap {
  const n = SNAP_N,
    w = n + 1,
    M = mini.width,
    sc = M / (2 * MINI_R), // canvas px per world unit
    S = Math.ceil(2 * SNAP_R * sc),
    st = (2 * SNAP_R) / n, // world units per sample
    land = new ImageData(w, w),
    water = new ImageData(w, w),
    neg = new Float32Array(w * w);
  for (let j = 0; j < w; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i,
        h = g.h[k],
        b = g.b[k],
        t = g.t[k];
      // hill shading, lit from the north-west
      const hl = g.h[j * w + Math.max(0, i - 1)] - g.h[j * w + Math.min(n, i + 1)],
        hu = g.h[Math.max(0, j - 1) * w + i] - g.h[Math.min(n, j + 1) * w + i],
        shade = 0.97 + clamp((hl + hu) * 3.2, -0.16, 0.12);
      // land colours; under water the sand shows, so the smoothed shore reads as a beach
      put(land.data, k, t <= 1 && !(t === 1 && h >= 0.425) ? COL[2][b] : COL[t][b], shade);
      // water colours darken with depth
      const dp = clamp((0.4 - h) / 0.07, 0, 1),
        s0 = COL[1][b],
        s1 = COL[0][b];
      water.data[k * 4] = lerp(s0[0], s1[0], dp) * 0.92;
      water.data[k * 4 + 1] = lerp(s0[1], s1[1], dp) * 0.94;
      water.data[k * 4 + 2] = lerp(s0[2], s1[2], dp);
      water.data[k * 4 + 3] = 255;
      neg[k] = -h;
    }
  // soften biome borders: blend colours with the neighbouring samples (no staircases)
  softenImg(land, w);
  softenImg(water, w);
  const c = mkCanvas(S, S),
    x = c.getContext('2d'),
    img = (d: ImageData) => {
      const t = mkCanvas(w, w);
      t.getContext('2d').putImageData(d, 0, 0);
      return t;
    },
    stepPx = st * sc,
    // sample (i, j) sits at pixel centre i; stretch so it lands on world point i*st
    drawSmooth = (t: HTMLCanvasElement) =>
      x.drawImage(t, -stepPx / 2, -stepPx / 2, w * stepPx, w * stepPx);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.lineCap = x.lineJoin = 'round';
  drawSmooth(img(land));
  x.save();
  x.scale(stepPx, stepPx); // shapes in sample units
  const shape = (v: ArrayLike<number>, lv: number) => isoShape(v, n, n, 0, 0, 1, lv),
    px = 1 / stepPx; // one canvas pixel in sample units
  // rocky highlands: a soft rim
  const rock = shape(g.h, LEVEL.rock);
  x.strokeStyle = 'rgba(52,40,48,.35)';
  x.lineWidth = 1.4 * px;
  x.stroke(rock.edge);
  // impassable peaks: drop shadow, outline and snow caps
  const peak = shape(g.h, LEVEL.peak),
    snow = shape(g.h, LEVEL.snow);
  x.save();
  x.translate(1.5 * px, 2.5 * px);
  x.fillStyle = 'rgba(20,12,24,.35)';
  x.fill(peak.fill);
  x.restore();
  x.fillStyle = '#8f8a92';
  x.fill(peak.fill);
  x.save();
  x.clip(peak.fill);
  drawSmoothIn(x, img(land), stepPx, w, 0.55);
  x.restore();
  x.fillStyle = '#eef2f8';
  x.fill(snow.fill);
  x.strokeStyle = OUT;
  x.lineWidth = 2 * px;
  x.stroke(peak.edge);
  x.strokeStyle = 'rgba(160,175,200,.9)';
  x.lineWidth = 1 * px;
  x.stroke(snow.edge);
  // water, cut along the shoreline, with a lighter shallows band and a foam line
  const sea = shape(neg, -LEVEL.shore),
    deep = shape(neg, -LEVEL.deep);
  x.save();
  x.clip(sea.fill);
  x.scale(1 / stepPx, 1 / stepPx);
  drawSmooth(img(water));
  x.restore();
  x.strokeStyle = 'rgba(255,255,255,.22)';
  x.lineWidth = 1.2 * px;
  x.stroke(deep.edge);
  x.strokeStyle = 'rgba(28,48,80,.8)';
  x.lineWidth = 3.4 * px;
  x.stroke(sea.edge);
  x.strokeStyle = 'rgba(250,253,255,.9)';
  x.lineWidth = 1.5 * px;
  x.stroke(sea.edge);
  x.restore();
  // Hearthfire: paved town inside its wall, with the streets
  const ox = g.x - SNAP_R,
    oy = g.y - SNAP_R;
  if (Math.abs(ox + SNAP_R) < SNAP_R + CITY.rx && Math.abs(oy + SNAP_R) < SNAP_R + CITY.ry) {
    x.save();
    x.scale(sc, sc);
    x.translate(-ox, -oy);
    x.beginPath();
    x.ellipse(0, CITY.cy, CITY.rx, CITY.ry, 0, 0, TAU);
    x.fillStyle = '#b9ab90';
    x.fill();
    x.strokeStyle = '#8a7a62';
    x.lineWidth = CITY.sw;
    for (const [ax, ay, bx, by] of STREETS) {
      x.beginPath();
      x.moveTo(ax, ay);
      x.lineTo(bx, by);
      x.stroke();
    }
    x.beginPath();
    x.ellipse(0, CITY.py, CITY.prx, CITY.pry, 0, 0, TAU);
    x.fillStyle = '#d6c8aa';
    x.fill();
    x.strokeStyle = '#8a7a62';
    x.lineWidth = 2 / sc;
    x.stroke();
    // wall: dark outline and grey stone
    x.beginPath();
    x.ellipse(0, CITY.cy, CITY.rx, CITY.ry, 0, 0, TAU);
    x.strokeStyle = OUT;
    x.lineWidth = 5 / sc;
    x.stroke();
    x.strokeStyle = '#a49c94';
    x.lineWidth = 2.5 / sc;
    x.stroke();
    x.restore();
  }
  return { c, x: g.x, y: g.y };
}
/** Two passes of a 3×3 box blur over an RGBA image (w×w), in place. */
function softenImg(img: ImageData, w: number) {
  const d = img.data,
    tmp = new Uint8ClampedArray(d.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < w; j++)
      for (let i = 0; i < w; i++) {
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const x = i + di,
              y = j + dj;
            if (x < 0 || y < 0 || x >= w || y >= w) continue;
            const k = (y * w + x) * 4;
            r += d[k];
            g += d[k + 1];
            b += d[k + 2];
            n++;
          }
        const k = (j * w + i) * 4;
        tmp[k] = r / n;
        tmp[k + 1] = g / n;
        tmp[k + 2] = b / n;
        tmp[k + 3] = 255;
      }
    d.set(tmp);
  }
}
/** Draw the smoothed image again inside the current clip at `alpha` (sample-unit transform). */
function drawSmoothIn(x, t, stepPx, w, alpha) {
  x.save();
  x.globalAlpha = alpha;
  x.scale(1 / stepPx, 1 / stepPx);
  x.drawImage(t, -stepPx / 2, -stepPx / 2, w * stepPx, w * stepPx);
  x.restore();
}

/* ---------- Caves: smooth floor plan baked once per cave ---------- */
const CAVE_PAL = { 3: '#a58a66', 4: '#7a90aa', 6: '#6a5480' };
function bakeCave(D, sc) {
  const { GW, GH, T, grid } = D,
    c = mkCanvas(Math.ceil(GW * T * sc), Math.ceil(GH * T * sc)),
    x = c.getContext('2d'),
    // cell centres are the samples: the outline runs along the cell borders, corners rounded
    { fill, edge } = isoShape(grid, GW - 1, GH - 1, 0.5, 0.5, 1, 0.5),
    k = T * sc;
  x.fillStyle = '#16111f';
  x.fillRect(0, 0, c.width, c.height);
  x.scale(k, k);
  x.lineCap = x.lineJoin = 'round';
  x.save();
  x.translate(0.12, 0.2);
  x.fillStyle = 'rgba(0,0,0,.55)';
  x.fill(fill);
  x.restore();
  x.fillStyle = D.miniCol || CAVE_PAL[D.b] || '#7a7088';
  x.fill(fill);
  // faint flagstones
  x.save();
  x.clip(fill);
  x.strokeStyle = 'rgba(0,0,0,.12)';
  x.lineWidth = 1 / k;
  x.beginPath();
  for (let i = 0; i <= GW; i++) {
    x.moveTo(i, 0);
    x.lineTo(i, GH);
  }
  for (let j = 0; j <= GH; j++) {
    x.moveTo(0, j);
    x.lineTo(GW, j);
  }
  x.stroke();
  x.restore();
  x.strokeStyle = OUT;
  x.lineWidth = 3 / k;
  x.stroke(edge);
  x.strokeStyle = 'rgba(255,255,255,.22)';
  x.lineWidth = 1 / k;
  x.save();
  x.translate(0.08, 0.08);
  x.stroke(edge);
  x.restore();
  return c;
}

export function drawMini(dt) {
  void dt;
  const M = mini.width,
    C = M / 2;
  mc.save();
  mc.clearRect(0, 0, M, M);
  mc.beginPath();
  mc.arc(C, C, C - FRAME + 1, 0, TAU);
  mc.clip();
  mc.imageSmoothingEnabled = true;
  mc.imageSmoothingQuality = 'high';
  mc.lineJoin = 'round';
  let R: number;
  if (game.mode === 'dungeon') {
    const D = game.DG;
    R = 600;
    const sc = M / (2 * R);
    if (!D.miniImg) D.miniImg = bakeCave(D, sc);
    mc.fillStyle = '#16111f';
    mc.fillRect(0, 0, M, M);
    mc.drawImage(D.miniImg, C - game.P.x * sc, C - game.P.y * sc);
    const at = (px: number, py: number) => [C + (px - game.P.x) * sc, C + (py - game.P.y) * sc];
    const [ex, ey] = at(D.exit.x, D.exit.y);
    exitIcon(ex, ey);
    if (!D.chest.open && !D.chest.hidden) {
      const [cx, cy] = at(D.chest.x, D.chest.y);
      chestIcon(cx, cy);
    }
    remainingEnemies(M, sc);
  } else if (game.mode === 'house') {
    // the house's floor plan, its door and the residents
    const I = game.HS;
    R = 320;
    const sc = M / (2 * R);
    if (!I.miniImg)
      I.miniImg = bakeCave(
        { GW: I.GW, GH: I.GH, T: IT, grid: I.grid, b: -1, miniCol: I.pal.floor },
        sc,
      );
    mc.fillStyle = '#16111f';
    mc.fillRect(0, 0, M, M);
    mc.drawImage(I.miniImg, C - game.P.x * sc, C - game.P.y * sc);
    const at = (px: number, py: number) => [C + (px - game.P.x) * sc, C + (py - game.P.y) * sc];
    const [dx, dy] = at(I.door.x, I.door.y);
    exitIcon(dx, dy);
    for (const n of I.npcs) {
      const [nx, ny] = at(n.x, n.y);
      mc.fillStyle = '#8fe08a';
      mc.strokeStyle = OUT;
      mc.lineWidth = 2;
      mc.beginPath();
      mc.arc(nx, ny, 4.5, 0, TAU);
      mc.fill();
      mc.stroke();
    }
  } else {
    R = MINI_R;
    if (seed !== game.SEED) {
      seed = game.SEED;
      snap = null;
      gen = null;
    }
    const far = snap && Math.hypot(snap.x - game.P.x, snap.y - game.P.y) > SNAP_R - R - 60;
    if (!gen && (!snap || far)) {
      const w = (SNAP_N + 1) * (SNAP_N + 1);
      gen = {
        h: new Float32Array(w),
        b: new Uint8Array(w),
        t: new Uint8Array(w),
        row: 0,
        x: game.P.x,
        y: game.P.y,
      };
    }
    if (gen) {
      stepGen();
      // the very first snapshot is built in one go so the map is never empty
      while (!snap && gen) stepGen();
    }
    const sc = M / (2 * R);
    mc.drawImage(
      snap.c,
      C + (snap.x - SNAP_R - game.P.x) * sc,
      C + (snap.y - SNAP_R - game.P.y) * sc,
    );
    for (const p of poisNear(game.P.x, game.P.y, R)) {
      const x = C + (p.x - game.P.x) * sc,
        y = C + (p.y - game.P.y) * sc;
      if (p.kind === 'village') villageIcon(x, y, game.P.wps.includes(p.key), p.key === 'v0,0');
      else if (p.kind === 'lair') lairIcon(x, y, !!game.P.cleared[p.key]);
      else caveIcon(x, y, !!game.P.cleared[p.key]);
    }
    for (const q of game.P.quests) {
      if (q.x == null || q.done || !q.tracked) continue;
      const [x, y] = clampRim(q.x, q.y, sc, C - FRAME - 12);
      star(mc, x, y, 9, '#ffd23a');
    }
    if (Math.hypot(game.P.x, game.P.y) > R && game.mode === 'world') {
      const w = game.P.wpInfo[game.P.home];
      if (w && Math.hypot(w.x - game.P.x, w.y - game.P.y) * sc > C - FRAME - 10) {
        const [x, y] = clampRim(w.x, w.y, sc, C - FRAME - 10);
        mc.fillStyle = '#6ae4ff';
        mc.strokeStyle = OUT;
        mc.lineWidth = 2;
        diamond(x, y, 6);
      }
    }
  }
  // enemies
  const sc2 = M / (2 * R);
  for (const e of game.enemies) {
    if (e.dying > 0 || e.dead) continue;
    const x = C + (e.x - game.P.x) * sc2,
      y = C + (e.y - game.P.y) * sc2;
    if (Math.hypot(x - C, y - C) > C) continue;
    mc.strokeStyle = OUT;
    mc.lineWidth = 2;
    if (e.boss) {
      mc.fillStyle = '#ff2a4a';
      diamond(x, y, 7);
    } else {
      mc.fillStyle = e.elite ? '#ffb13a' : '#ff5a4a';
      mc.beginPath();
      mc.arc(x, y, e.elite ? 4.5 : 3.5, 0, TAU);
      mc.fill();
      mc.stroke();
    }
  }
  heroArrow(C);
  // soft vignette toward the rim
  const vg = mc.createRadialGradient(C, C, C * 0.62, C, C, C);
  vg.addColorStop(0, 'rgba(10,8,20,0)');
  vg.addColorStop(1, 'rgba(10,8,20,.42)');
  mc.fillStyle = vg;
  mc.fillRect(0, 0, M, M);
  mc.restore();
  drawFrame(M);
}

/** Clamp a world point onto the map, or onto a rim of radius `rim` when it lies beyond. */
function clampRim(wx: number, wy: number, sc: number, rim: number) {
  const C = mini.width / 2,
    dx = (wx - game.P.x) * sc,
    dy = (wy - game.P.y) * sc,
    d = Math.hypot(dx, dy) || 1,
    k = d > rim ? rim / d : 1;
  return [C + dx * k, C + dy * k];
}

/* ---------- markers ---------- */
function heroArrow(C: number) {
  mc.save();
  mc.translate(C, C);
  mc.rotate(hero.aim);
  // view cone
  const cone = mc.createRadialGradient(0, 0, 4, 0, 0, 58);
  cone.addColorStop(0, 'rgba(255,248,220,.34)');
  cone.addColorStop(1, 'rgba(255,248,220,0)');
  mc.fillStyle = cone;
  mc.beginPath();
  mc.moveTo(0, 0);
  mc.arc(0, 0, 58, -0.55, 0.55);
  mc.closePath();
  mc.fill();
  mc.fillStyle = 'rgba(0,0,0,.35)';
  arrowPath(1.5, 2);
  mc.fill();
  mc.fillStyle = '#fff';
  mc.strokeStyle = OUT;
  mc.lineWidth = 2.5;
  arrowPath(0, 0);
  mc.fill();
  mc.stroke();
  mc.fillStyle = '#ffd86a';
  mc.beginPath();
  mc.moveTo(10, 0);
  mc.lineTo(-2, -4.5);
  mc.lineTo(-2, 0);
  mc.closePath();
  mc.fill();
  mc.restore();
}
function arrowPath(ox: number, oy: number) {
  mc.beginPath();
  mc.moveTo(12 + ox, oy);
  mc.lineTo(-7 + ox, -8 + oy);
  mc.lineTo(-3 + ox, oy);
  mc.lineTo(-7 + ox, 8 + oy);
  mc.closePath();
}
const shadowDot = (x: number, y: number, rx: number) => {
  mc.fillStyle = 'rgba(0,0,0,.3)';
  mc.beginPath();
  mc.ellipse(x + 1, y + rx * 0.9, rx, rx * 0.4, 0, 0, TAU);
  mc.fill();
};
function villageIcon(x: number, y: number, known: boolean, city: boolean) {
  const s = city ? 1.25 : 1;
  shadowDot(x, y + 1, 9 * s);
  mc.strokeStyle = OUT;
  mc.lineWidth = 2.2;
  // walls
  mc.fillStyle = '#f4e6c8';
  mc.fillRect(x - 7 * s, y - 2 * s, 14 * s, 9 * s);
  mc.strokeRect(x - 7 * s, y - 2 * s, 14 * s, 9 * s);
  // roof
  mc.fillStyle = known ? '#4ec8f0' : '#c4543a';
  mc.beginPath();
  mc.moveTo(x - 10 * s, y - 1 * s);
  mc.lineTo(x, y - 11 * s);
  mc.lineTo(x + 10 * s, y - 1 * s);
  mc.closePath();
  mc.fill();
  mc.stroke();
  mc.fillStyle = OUT;
  mc.fillRect(x - 1.8 * s, y + 1.5 * s, 3.6 * s, 5.5 * s);
}
function lairIcon(x: number, y: number, cleared: boolean) {
  shadowDot(x, y + 2, 8);
  mc.fillStyle = cleared ? '#8a8a8a' : '#d8374a';
  mc.strokeStyle = OUT;
  mc.lineWidth = 2.2;
  mc.beginPath();
  mc.arc(x, y, 8.5, 0, TAU);
  mc.fill();
  mc.stroke();
  mc.lineWidth = 1.4;
  skull(x, y, 4.2);
}
function caveIcon(x: number, y: number, cleared: boolean) {
  shadowDot(x, y + 3, 9);
  mc.strokeStyle = OUT;
  mc.lineWidth = 2.2;
  mc.fillStyle = cleared ? '#8a8a8a' : '#b89468';
  mc.beginPath();
  mc.moveTo(x - 10, y + 6);
  mc.quadraticCurveTo(x - 9, y - 9, x, y - 9);
  mc.quadraticCurveTo(x + 9, y - 9, x + 10, y + 6);
  mc.closePath();
  mc.fill();
  mc.stroke();
  mc.fillStyle = OUT;
  mc.beginPath();
  mc.moveTo(x - 4.5, y + 6);
  mc.quadraticCurveTo(x - 4.5, y - 3, x, y - 3);
  mc.quadraticCurveTo(x + 4.5, y - 3, x + 4.5, y + 6);
  mc.closePath();
  mc.fill();
}
function exitIcon(x: number, y: number) {
  const pulse = 0.5 + Math.sin(game.time * 3) * 0.5;
  mc.fillStyle = 'rgba(140,220,255,' + (0.2 + pulse * 0.2).toFixed(3) + ')';
  mc.beginPath();
  mc.arc(x, y, 12, 0, TAU);
  mc.fill();
  caveIcon(x, y, false);
  mc.fillStyle = '#bfe6ff';
  mc.beginPath();
  mc.moveTo(x, y - 1);
  mc.lineTo(x - 3.5, y + 3);
  mc.lineTo(x + 3.5, y + 3);
  mc.closePath();
  mc.fill();
}
function chestIcon(x: number, y: number) {
  shadowDot(x, y + 3, 8);
  mc.strokeStyle = OUT;
  mc.lineWidth = 2;
  mc.fillStyle = '#9a5a2a';
  mc.fillRect(x - 7, y - 3, 14, 9);
  mc.strokeRect(x - 7, y - 3, 14, 9);
  mc.fillStyle = '#c07a3a';
  mc.beginPath();
  mc.moveTo(x - 7, y - 3);
  mc.quadraticCurveTo(x, y - 10, x + 7, y - 3);
  mc.closePath();
  mc.fill();
  mc.stroke();
  mc.fillStyle = '#ffd27a';
  mc.fillRect(x - 1.5, y - 4, 3, 4);
}
function diamond(x: number, y: number, r: number) {
  mc.beginPath();
  mc.moveTo(x, y - r);
  mc.lineTo(x + r, y);
  mc.lineTo(x, y + r);
  mc.lineTo(x - r, y);
  mc.closePath();
  mc.fill();
  mc.stroke();
}
function star(c, x, y, r, col) {
  c.fillStyle = col;
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2,
      rr2 = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  c.closePath();
  c.fill();
  c.stroke();
}

/** Gilded ring frame with compass marks and a north plaque. */
function drawFrame(M: number) {
  const C = M / 2,
    r = C - FRAME / 2 - 1;
  mc.save();
  mc.lineWidth = FRAME;
  const g = mc.createLinearGradient(0, 0, M, M);
  g.addColorStop(0, '#f6d98a');
  g.addColorStop(0.5, '#b8862e');
  g.addColorStop(1, '#6e4a18');
  mc.strokeStyle = g;
  mc.beginPath();
  mc.arc(C, C, r, 0, TAU);
  mc.stroke();
  mc.lineWidth = 2;
  mc.strokeStyle = OUT;
  for (const rr of [C - 1, C - FRAME - 0.5]) {
    mc.beginPath();
    mc.arc(C, C, rr, 0, TAU);
    mc.stroke();
  }
  // studs at the compass points and between them
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU,
      x = C + Math.cos(a) * r,
      y = C + Math.sin(a) * r;
    mc.fillStyle = i % 2 ? '#e8c26a' : '#fff0c0';
    mc.beginPath();
    mc.arc(x, y, i % 2 ? 2.4 : 3.4, 0, TAU);
    mc.fill();
    mc.lineWidth = 1.4;
    mc.stroke();
  }
  // north plaque
  const nx = C,
    ny = FRAME + 4;
  mc.fillStyle = '#7a1e22';
  mc.strokeStyle = OUT;
  mc.lineWidth = 2;
  mc.beginPath();
  mc.arc(nx, ny + 2, 11, 0, TAU);
  mc.fill();
  mc.stroke();
  mc.fillStyle = '#ffe7a8';
  mc.font = '800 14px system-ui, sans-serif';
  mc.textAlign = 'center';
  mc.textBaseline = 'middle';
  mc.fillText('N', nx, ny + 2.5);
  mc.restore();
}

/** From 65% cleared on, mark the cave's remaining enemies: dots in range, arrows on the rim. */
export const HINT_AT = 0.65;
function remainingEnemies(M: number, sc: number) {
  const D = game.DG;
  if (!D || !D.total || D.bonus || D.killed / D.total < HINT_AT) return;
  const pulse = 0.75 + Math.sin(game.time * 5) * 0.25,
    rim = M / 2 - FRAME - 14;
  mc.lineJoin = 'round';
  for (const e of game.enemies) {
    if (!e.dg || e.dead || e.dying > 0) continue;
    const dx = (e.x - game.P.x) * sc,
      dy = (e.y - game.P.y) * sc,
      d = Math.hypot(dx, dy) || 1,
      guard = e.dgi === -1;
    mc.strokeStyle = OUT;
    mc.lineWidth = 2.5;
    if (d < rim - 6) {
      const x = M / 2 + dx,
        y = M / 2 + dy;
      if (guard) skull(x, y, 9 * (0.9 + pulse * 0.15));
      else {
        mc.fillStyle = 'rgba(255,80,70,' + pulse.toFixed(3) + ')';
        mc.beginPath();
        mc.arc(x, y, 5.5, 0, TAU);
        mc.fill();
        mc.stroke();
      }
    } else {
      // arrow on the rim pointing toward the enemy
      const a = Math.atan2(dy, dx),
        x = M / 2 + Math.cos(a) * rim,
        y = M / 2 + Math.sin(a) * rim,
        s = (guard ? 13 : 10) * (0.9 + pulse * 0.15);
      mc.save();
      mc.translate(x, y);
      mc.rotate(a);
      mc.beginPath();
      mc.moveTo(s, 0);
      mc.lineTo(-s * 0.7, -s * 0.75);
      mc.lineTo(-s * 0.35, 0);
      mc.lineTo(-s * 0.7, s * 0.75);
      mc.closePath();
      mc.fillStyle = guard ? '#f5e6c8' : 'rgba(255,80,70,' + pulse.toFixed(3) + ')';
      mc.fill();
      mc.stroke();
      mc.restore();
    }
  }
}
/** Guardian marker: a small skull. */
function skull(x: number, y: number, r: number) {
  mc.fillStyle = '#f5e6c8';
  mc.beginPath();
  mc.arc(x, y - r * 0.15, r, 0, TAU);
  mc.fill();
  mc.stroke();
  mc.beginPath();
  mc.rect(x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.55);
  mc.fill();
  mc.stroke();
  mc.fillStyle = OUT;
  mc.beginPath();
  mc.arc(x - r * 0.38, y - r * 0.15, r * 0.27, 0, TAU);
  mc.arc(x + r * 0.38, y - r * 0.15, r * 0.27, 0, TAU);
  mc.fill();
}
