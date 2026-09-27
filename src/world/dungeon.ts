import type { Dungeon } from '../game/types';
import { hs, mulberry, pick, sh, strSeed } from '../core/math';
import { game } from '../game/state';
/* ---------- Dungeons ---------- */
/** `cave` is a natural cavern. Anything else (the stone gates) keeps the built rooms. */
export function genDungeon(key, lvl, b, style = 'crypt') {
  return style === 'cave' ? genCavern(key, lvl, b) : genCrypt(key, lvl, b);
}
export function dungeonPal(b) {
  return b === 3
    ? ['#6e5a44', '#7a6650', '#a58a66', '#d0b48a']
    : b === 4
      ? ['#4a5a70', '#56687e', '#7a90aa', '#b8cce0']
      : b === 6
        ? ['#3a2c48', '#443454', '#6a5480', '#9a82b0']
        : ['#3d3648', '#463f52', '#6a6078', '#9a90a8'];
}
/** Dirt floor, umber rock, tan facets, pale clay. The same in every biome. */
export const CAVE_FLOOR = '#7a4e32';
/** The dark around a cavern's walkable ground. */
export const CAVE_VOID = '#1a120c';
export function cavePal() {
  return [CAVE_FLOOR, '#5c3a28', '#c4926a', '#e2c4a0'];
}
function genCrypt(key, lvl, b) {
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
    style: 'crypt',
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
        k: pick(['bones', 'barrel', 'crate', 'remains', 'web', 'rubble']),
        x: px,
        y: py,
      });
    }
  }
  D.exit = { x: start.cx * T + T / 2, y: start.cy * T + T / 2 };
  D.chest = { x: end.cx * T + T / 2, y: end.cy * T + T / 2 - 30, open: false };
  D.grid = gr; // floor cells, for the minimap
  return D;
}
/** Irregular chambers and wobbling passages. The built dungeon stays in genCrypt. */
function genCavern(key, lvl, b) {
  const rnd = mulberry((strSeed(key + 'dg') ^ game.SEED) >>> 0),
    GW = 58,
    GH = 58,
    T = 40,
    gr = new Uint8Array(GW * GH),
    seeds = [];
  for (let tries = 0; tries < 400 && seeds.length < 9; tries++) {
    const rx = 5 + rnd() * 3,
      ry = 4 + rnd() * 2.6,
      cx = 8 + ((rnd() * (GW - 16)) | 0),
      cy = 8 + ((rnd() * (GH - 16)) | 0);
    if (seeds.some((s) => Math.hypot(s.cx - cx, s.cy - cy) < (s.rx + rx) * 0.82 + 1.5)) continue;
    seeds.push({ cx, cy, rx, ry });
  }
  if (seeds.length < 2) {
    seeds.push({ cx: 16, cy: 16, rx: 6, ry: 5 });
    seeds.push({ cx: 40, cy: 40, rx: 6, ry: 5 });
  }
  const carve = (x, y) => {
    if (x > 0 && y > 0 && x < GW - 1 && y < GH - 1) gr[y * GW + x] = 1;
  };
  const rooms = [];
  for (const s of seeds) {
    let x0 = s.cx,
      y0 = s.cy,
      x1 = s.cx,
      y1 = s.cy;
    const mark = (i, j) => {
      carve(i, j);
      if (i < x0) x0 = i;
      if (j < y0) y0 = j;
      if (i > x1) x1 = i;
      if (j > y1) y1 = j;
    };
    const i0 = Math.max(1, Math.floor(s.cx - s.rx - 2)),
      i1 = Math.min(GW - 2, Math.ceil(s.cx + s.rx + 2)),
      j0 = Math.max(1, Math.floor(s.cy - s.ry - 2)),
      j1 = Math.min(GH - 2, Math.ceil(s.cy + s.ry + 2));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const dx = i + 0.5 - s.cx,
          dy = j + 0.5 - s.cy,
          erx = s.rx * (0.78 + hs(i, j, 41) * 0.4),
          ery = s.ry * (0.78 + hs(i, j, 42) * 0.4);
        if ((dx * dx) / (erx * erx) + (dy * dy) / (ery * ery) <= 1) mark(i, j);
      }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(s.cx + dx, s.cy + dy);
    rooms.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: s.cx, cy: s.cy });
  }
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
    const tx = b.cx,
      ty = b.cy;
    let guard = 0;
    const stamp = (sx, sy) => {
      carve(sx, sy);
      const q = rnd();
      if (q < 0.5) carve(sx + 1, sy);
      else if (q < 0.72) carve(sx, sy + 1);
      else if (q < 0.88) {
        carve(sx + 1, sy);
        carve(sx, sy + 1);
      }
    };
    while ((x !== tx || y !== ty) && guard++ < 600) {
      stamp(x, y);
      const dx = Math.sign(tx - x),
        dy = Math.sign(ty - y);
      if (dx && dy && rnd() < 0.2) {
        if (rnd() < 0.5) x = Math.max(2, Math.min(GW - 3, x + (rnd() < 0.5 ? 1 : -1)));
        else y = Math.max(2, Math.min(GH - 3, y + (rnd() < 0.5 ? 1 : -1)));
      } else if (dx && (!dy || rnd() < 0.5)) x += dx;
      else y += dy;
    }
    stamp(tx, ty);
  };
  for (let i = 1; i < order.length; i++) tunnel(order[i - 1], order[i]);
  if (order.length > 4) tunnel(order[1], order[order.length - 2]);
  const start = order[0],
    end = order[order.length - 1];
  const isF = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && gr[y * GW + x] === 1;
  // a wobbling passage can miss: cut a plain corridor so the end is always reachable
  if (!reaches(gr, GW, GH, start, end)) {
    let x = start.cx,
      y = start.cy;
    while (x !== end.cx) {
      carve(x, y);
      carve(x, y + 1);
      x += Math.sign(end.cx - x);
    }
    while (y !== end.cy) {
      carve(x, y);
      carve(x + 1, y);
      y += Math.sign(end.cy - y);
    }
    carve(x, y);
  }
  smoothCave(gr, GW, GH);
  const pal = cavePal(),
    D: Dungeon = {
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
      style: 'cave',
      stair: pal[2],
    };
  D.isF = isF;
  // the way out is a daylit mouth in a north rock face of the first chamber
  const [ei, ej] = caveMouth(isF, start);
  D.exit = { x: ei * T + T / 2, y: ej * T + 6 };
  // wall torches hang on rock faces above floor, spaced out and clear of the mouth
  const torchOk = (x, y) =>
      !isF(x, y) &&
      isF(x, y + 1) &&
      !(y === ej - 1 && Math.abs(x - ei) < 3) &&
      !D.torches.some((t) => Math.abs(t.tx - x) < 4 && Math.abs(t.ty - y) < 3),
    torch = (x, y) =>
      D.torches.push({ tx: x, ty: y, x: x * T + T / 2, y: (y + 1) * T + 2, ph: rnd() * 9 });
  // one in every chamber (the face nearest its middle), so no room is left black
  for (const r of order) {
    let best = null,
      bd = 1e9;
    for (let y = r.y - 1; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!torchOk(x, y)) continue;
        const d = Math.hypot(x - r.cx, y - r.cy);
        if (d < bd) {
          bd = d;
          best = [x, y];
        }
      }
    if (best) torch(best[0], best[1]);
  }
  for (let y = 1; y < GH - 1; y++)
    for (let x = 1; x < GW - 1; x++) if (rnd() < 0.05 && torchOk(x, y)) torch(x, y);
  const dress = ['bones', 'remains', 'web', 'stalagmite', 'stalagmite'];
  for (const r of order) {
    const n = 2 + ((rnd() * 3) | 0);
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < 8; t++) {
        const gx = r.x + ((rnd() * r.w) | 0),
          gy = r.y + ((rnd() * r.h) | 0);
        if (!isF(gx, gy)) continue;
        if (Math.abs(gx - start.cx) + Math.abs(gy - start.cy) < 3) continue;
        if (Math.abs(gx - end.cx) + Math.abs(gy - end.cy) < 3) continue;
        if (Math.abs(gx - ei) + Math.abs(gy - ej) < 3) continue;
        const k = r === start ? pick(['bones', 'remains', 'web']) : pick(dress),
          open = isF(gx - 1, gy) && isF(gx + 1, gy) && isF(gx, gy - 1) && isF(gx, gy + 1);
        // bones and stalagmites are wider than a tile: only on open floor, clear of the rock
        if (k !== 'web' && !open) continue;
        const prop: Record<string, any> = {
          k,
          x: gx * T + T / 2,
          y: gy * T + T * 0.72,
        };
        if (k === 'web') {
          // webs only where two rock faces meet, strung across the corner
          const corners = [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].filter(([sx, sy]) => !isF(gx + sx, gy) && !isF(gx, gy + sy));
          if (!corners.length) continue;
          const [sx, sy] = corners[(rnd() * corners.length) | 0];
          prop.corner = [sx, sy];
          prop.x = gx * T + T / 2 + (sx * T) / 2;
          prop.y = gy * T + T / 2 + (sy * T) / 2;
        }
        if (k === 'stalagmite') {
          prop.r = 10;
          prop.col = pal[3];
          prop.facet = sh(pal[3], 0.28);
        }
        D.props.push(prop);
        break;
      }
    }
  }
  D.chest = { x: end.cx * T + T / 2, y: end.cy * T + T / 2 - 30, open: false };
  D.grid = gr;
  return D;
}
/** Floor cell under the cave mouth: rock above it (ideally also to both upper sides), floor
 * below it (the hero arrives just below), nearest the first chamber's centre. Falls back
 * to the rock face straight north of the centre. */
function caveMouth(isF, start): [number, number] {
  // first a wide face (rock on three cells above, floor beside), then any rock face above
  // floor with room below, both within the first chamber
  for (const wide of [true, false]) {
    let best: [number, number] | null = null,
      bd = 1e9;
    for (let j = start.y - 3; j <= start.y + start.h + 3; j++)
      for (let i = start.x - 3; i <= start.x + start.w + 3; i++) {
        if (!isF(i, j) || !isF(i, j + 1) || !isF(i, j + 2) || isF(i, j - 1)) continue;
        if (wide && (!isF(i - 1, j) || !isF(i + 1, j) || isF(i - 1, j - 1) || isF(i + 1, j - 1)))
          continue;
        const d = Math.hypot(i - start.cx, j - start.cy);
        if (d < bd) {
          bd = d;
          best = [i, j];
        }
      }
    if (best) return best;
  }
  let j = start.cy;
  while (isF(start.cx, j - 1)) j--;
  return [start.cx, j];
}
/** Opens lone rock tiles, one-tile rock ribs and corner-only pinches, which draw as square
 * blocks. It only ever adds floor, so nothing that was reachable stops being so. */
function smoothCave(gr, GW, GH) {
  const f = (x, y) => gr[y * GW + x] === 1;
  for (let pass = 0; pass < 60; pass++) {
    let changed = false;
    for (let y = 1; y < GH - 1; y++)
      for (let x = 1; x < GW - 1; x++) {
        if (f(x, y)) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && f(x + dx, y + dy)) n++;
        const rib = (f(x - 1, y) && f(x + 1, y)) || (f(x, y - 1) && f(x, y + 1)),
          // floor on both sides of a corner with rock beyond it: two floors touching diagonally
          pinch = [-1, 1].some((sx) =>
            [-1, 1].some((sy) => f(x + sx, y) && f(x, y + sy) && !f(x + sx, y + sy)),
          );
        if (n >= 5 || rib || pinch) {
          gr[y * GW + x] = 1;
          changed = true;
        }
      }
    if (!changed) break;
  }
}
function reaches(gr, GW, GH, start, end) {
  const seen = new Uint8Array(gr.length),
    q = [start.cx, start.cy];
  seen[start.cy * GW + start.cx] = 1;
  for (let qi = 0; qi < q.length; qi += 2) {
    const x = q[qi],
      y = q[qi + 1];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        ni = ny * GW + nx;
      if (nx < 1 || ny < 1 || nx >= GW - 1 || ny >= GH - 1 || !gr[ni] || seen[ni]) continue;
      seen[ni] = 1;
      q.push(nx, ny);
    }
  }
  return seen[end.cy * GW + end.cx] === 1;
}
