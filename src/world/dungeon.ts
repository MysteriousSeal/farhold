import type { Dungeon } from '../game/types';
import { mkCanvas } from '../core/dom';
import { TAU, hs, mulberry, pick, sh, strSeed } from '../core/math';
import { game } from '../game/state';
import { CH } from './terrain';
/* ---------- Dungeons ---------- */
export function genDungeon(key, lvl, b) {
  const rnd = mulberry((strSeed(key + 'dg') ^ game.SEED) >>> 0),
    GW = 58,
    GH = 58,
    T = 40,
    gr = new Uint8Array(GW * GH),
    rooms = [];
  for (let tries = 0; tries < 300 && rooms.length < 11; tries++) {
    const w = 6 + ((rnd() * 7) | 0),
      h = 6 + ((rnd() * 6) | 0),
      x = 2 + ((rnd() * (GW - w - 4)) | 0),
      y = 2 + ((rnd() * (GH - h - 4)) | 0);
    if (
      rooms.some(
        (r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y,
      )
    )
      continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  const carve = (x, y) => {
    if (x > 0 && y > 0 && x < GW - 1 && y < GH - 1) gr[y * GW + x] = 1;
  };
  for (const r of rooms)
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
  const order = [rooms[0]],
    left = rooms.slice(1);
  while (left.length) {
    const a = order[order.length - 1];
    let bi = 0,
      bd = 1e9;
    left.forEach((r, i) => {
      const d = Math.hypot(r.cx - a.cx, r.cy - a.cy);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    order.push(left.splice(bi, 1)[0]);
  }
  const tunnel = (a, b) => {
    let x = a.cx,
      y = a.cy;
    const hf = rnd() < 0.5;
    const stepX = () => {
        while (x !== b.cx) {
          carve(x, y);
          carve(x, y + 1);
          x += Math.sign(b.cx - x);
        }
      },
      stepY = () => {
        while (y !== b.cy) {
          carve(x, y);
          carve(x + 1, y);
          y += Math.sign(b.cy - y);
        }
      };
    if (hf) {
      stepX();
      stepY();
    } else {
      stepY();
      stepX();
    }
    carve(x, y);
    carve(x + 1, y + 1);
  };
  for (let i = 1; i < order.length; i++) tunnel(order[i - 1], order[i]);
  if (order.length > 4) tunnel(order[1], order[order.length - 2]);
  const start = order[0],
    end = order[order.length - 1];
  const D: Dungeon = {
    key,
    lvl,
    b,
    GW,
    GH,
    T,
    g: gr,
    rooms: order,
    start,
    end,
    ch: new Map(),
    props: [],
    torches: [],
    pillars: [],
    enemiesPlaced: false,
  };
  const isF = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && gr[y * GW + x] === 1;
  D.isF = isF;
  for (let y = 1; y < GH - 1; y++)
    for (let x = 1; x < GW - 1; x++)
      if (
        !isF(x, y) &&
        isF(x, y + 1) &&
        rnd() < 0.12 &&
        !D.torches.some((t) => Math.abs(t.tx - x) < 3 && Math.abs(t.ty - y) < 2)
      )
        D.torches.push({ tx: x, ty: y, x: x * T + T / 2, y: (y + 1) * T + 2, ph: rnd() * 9 });
  for (const r of order) {
    if (r.w >= 9 && r.h >= 8 && r !== start) {
      for (const [px, py] of [
        [r.x + 2, r.y + 2],
        [r.x + r.w - 3, r.y + 2],
        [r.x + 2, r.y + r.h - 3],
        [r.x + r.w - 3, r.y + r.h - 3],
      ])
        D.pillars.push({ x: px * T + T / 2, y: py * T + T / 2 + 14 });
    }
    const n = 2 + ((rnd() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const px = (r.x + 1 + rnd() * (r.w - 2)) * T,
        py = (r.y + 1 + rnd() * (r.h - 2)) * T;
      D.props.push({
        k: pick(['bones', 'barrel', 'crate', 'bones', 'web', 'rubble']),
        x: px,
        y: py,
      });
    }
  }
  D.exit = { x: start.cx * T + T / 2, y: start.cy * T + T / 2 };
  D.chest = { x: end.cx * T + T / 2, y: end.cy * T + T / 2 - 30, open: false };
  D.mini = mkCanvas(GW, GH);
  const mc = D.mini.getContext('2d'),
    im = mc.createImageData(GW, GH);
  for (let i = 0; i < GW * GH; i++) {
    const f = gr[i];
    im.data[i * 4] = f ? 140 : 30;
    im.data[i * 4 + 1] = f ? 128 : 24;
    im.data[i * 4 + 2] = f ? 150 : 40;
    im.data[i * 4 + 3] = 255;
  }
  mc.putImageData(im, 0, 0);
  return D;
}
export function genDungeonChunk(D, cx, cy) {
  const cvs = mkCanvas(CH, CH),
    x = cvs.getContext('2d'),
    T = D.T,
    ox = cx * CH,
    oy = cy * CH;
  const pal =
    D.b === 3
      ? ['#6e5a44', '#7a6650', '#a58a66', '#d0b48a']
      : D.b === 4
        ? ['#4a5a70', '#56687e', '#7a90aa', '#b8cce0']
        : D.b === 6
          ? ['#3a2c48', '#443454', '#6a5480', '#9a82b0']
          : ['#3d3648', '#463f52', '#6a6078', '#9a90a8'];
  x.fillStyle = '#120e1a';
  x.fillRect(0, 0, CH, CH);
  x.save();
  x.translate(-ox, -oy);
  x.lineJoin = 'round';
  const i0 = Math.floor(ox / T) - 1,
    i1 = Math.floor((ox + CH) / T) + 1,
    j0 = Math.floor(oy / T) - 1,
    j1 = Math.floor((oy + CH) / T) + 1,
    isF = D.isF;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const X = i * T,
        Y = j * T;
      if (isF(i, j)) {
        const v = hs(i, j, 55);
        x.fillStyle = v < 0.5 ? pal[0] : pal[1];
        x.fillRect(X, Y, T, T);
        x.strokeStyle = 'rgba(0,0,0,.25)';
        x.lineWidth = 2;
        x.strokeRect(X + 1, Y + 1, T / 2 - 1, T / 2 - 1);
        x.strokeRect(X + T / 2, Y + T / 2, T / 2 - 1, T / 2 - 1);
        x.strokeRect(X + T / 2, Y + 1, T / 2 - 1, T / 2 - 1);
        x.strokeRect(X + 1, Y + T / 2, T / 2 - 1, T / 2 - 1);
        if (v > 0.85) {
          x.strokeStyle = 'rgba(0,0,0,.4)';
          x.lineWidth = 1.5;
          x.beginPath();
          x.moveTo(X + 8, Y + 10);
          x.lineTo(X + 18, Y + 18);
          x.lineTo(X + 15, Y + 28);
          x.stroke();
        }
        if (v < 0.08) {
          x.fillStyle = D.b === 6 ? 'rgba(160,80,200,.25)' : 'rgba(90,140,70,.35)';
          x.beginPath();
          x.ellipse(X + 20, Y + 20, 12, 8, 0, 0, TAU);
          x.fill();
        }
        if (!isF(i, j - 1)) {
          const gr = x.createLinearGradient(0, Y, 0, Y + 20);
          gr.addColorStop(0, 'rgba(0,0,0,.5)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = gr;
          x.fillRect(X, Y, T, 20);
        }
      } else {
        const nb =
          isF(i, j + 1) ||
          isF(i, j - 1) ||
          isF(i + 1, j) ||
          isF(i - 1, j) ||
          isF(i + 1, j + 1) ||
          isF(i - 1, j + 1) ||
          isF(i + 1, j - 1) ||
          isF(i - 1, j - 1);
        if (!nb) continue;
        if (isF(i, j + 1)) {
          x.fillStyle = pal[1];
          x.fillRect(X, Y, T, T);
          x.fillStyle = pal[0];
          for (let r = 0; r < 3; r++) {
            const off = r % 2 ? T / 4 : 0;
            for (let c = -1; c < 3; c++) {
              x.fillStyle = hs(i * 3 + c, j * 3 + r, 9) < 0.5 ? pal[1] : sh(pal[1], -0.12);
              x.fillRect(X + off + (c * T) / 2 + 1, Y + 10 + r * 10 + 1, T / 2 - 2, 8);
            }
          }
          x.fillStyle = pal[2];
          x.fillRect(X, Y, T, 10);
          x.fillStyle = pal[3];
          x.fillRect(X, Y, T, 2);
        } else {
          x.fillStyle = pal[2];
          x.fillRect(X, Y, T, T);
          x.fillStyle = 'rgba(0,0,0,.12)';
          x.fillRect(X + 4, Y + 4, T - 8, T - 8);
        }
      }
    }
  x.restore();
  return { cvs, decor: [], waves: [], last: 0 };
}
