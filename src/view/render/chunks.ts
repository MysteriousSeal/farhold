import { DPR, H, W, mkCanvas } from '../dom';
import { OUT, TAU, clamp, hs, pick, rand, sh } from '../../core/math';
import { game } from '../../model/game/state';
import { CAVE_VOID, cavePal, dungeonPal } from '../../model/world/dungeon';
import {
  CHUNK_FN,
  WCH,
  bgStep,
  chunkAt,
  nextMissing,
  type ChunkModel,
} from '../../model/world/chunks';
import { CH } from '../../model/world/terrain';
/* ================= RENDER: chunk pictures ================= */
// Paints the ground of world chunks (from their model: colours, place grounds, marks, island
// fills) and of dungeon chunks, and keeps the pictures while their chunks are near.
/** What render.ts draws: a world chunk model with its picture, or a dungeon chunk (a picture,
 * its moss and cave bits). */
type Chunk = Partial<ChunkModel> & {
  cvs: HTMLCanvasElement;
  moss?: { x: number; y: number; s: number; k?: string }[];
  last: number;
};
/** Painted world chunks: the picture made for each chunk model. */
const pictures = new WeakMap<ChunkModel, HTMLCanvasElement>();

/** The picture of world chunk model M. */
function paintChunk(M: ChunkModel) {
  const FN = CHUNK_FN,
    ox = M.cx * CH,
    oy = M.cy * CH,
    sm = mkCanvas(FN, FN);
  sm.getContext('2d').putImageData(
    new ImageData(M.px as Uint8ClampedArray<ArrayBuffer>, FN, FN),
    0,
    0,
  );
  const cvs = mkCanvas(CH, CH),
    x = cvs.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.drawImage(sm, 0, 0, CH, CH);
  x.save();
  x.translate(-ox, -oy);
  for (const p of M.pois) paintPoiGround(x, p);
  x.restore();
  x.lineCap = 'round';
  x.lineJoin = 'round';
  for (const [lx, ly, t, b, q, ca, cl] of M.marks) {
    if (t === 3) {
      if (b === 0 || b === 1 || b === 2 || b === 5) {
        // grass tufts and flowers are crisp vectors drawn each frame (world/flora.ts)
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
        // desert pebbles, ripples and tufts are crisp vectors (world/flora.ts)
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
    } else if (t === 4 && q < 0.2) {
      x.strokeStyle = 'rgba(60,55,60,.35)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(lx, ly);
      x.lineTo(lx + rand(-7, 7), ly + rand(-4, 4));
      x.stroke();
    } else if (t === 5 && q < 0.3) {
      // rugged mountain top: branching cracks and loose stones
      if (q < 0.18) {
        const a = ca,
          l = cl;
        x.strokeStyle = 'rgba(28,22,34,.45)';
        x.lineWidth = 1.6;
        x.beginPath();
        x.moveTo(lx, ly);
        x.lineTo(lx + Math.cos(a) * l, ly + Math.sin(a) * l * 0.6);
        x.lineTo(lx + Math.cos(a + 0.6) * l * 1.6, ly + Math.sin(a + 0.6) * l);
        x.moveTo(lx + Math.cos(a) * l, ly + Math.sin(a) * l * 0.6);
        x.lineTo(lx + Math.cos(a - 0.7) * l * 1.5, ly + Math.sin(a - 0.7) * l * 0.9);
        x.stroke();
      } else {
        x.fillStyle = 'rgba(255,255,255,.18)';
        x.strokeStyle = 'rgba(28,22,34,.4)';
        x.lineWidth = 1.2;
        x.beginPath();
        x.ellipse(lx, ly, 3 + q * 6, 2 + q * 3, q * 9, 0, TAU);
        x.fill();
        x.stroke();
      }
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
      }
    }
  }
  // stray grass islands in the sand become sand again (their outline was dropped)
  const islands = (M.shores && M.shores.islands) || [];
  for (const is of islands) {
    const px = clamp(Math.round(is.x0 - ox - 6), 0, CH - 1),
      py = clamp(Math.round((is.y0 + is.y1) / 2 - oy), 0, CH - 1),
      d = x.getImageData(px, py, 1, 1).data;
    x.fillStyle = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
    x.beginPath();
    for (let p = 0; p < is.pts.length; p += 2) x.lineTo(is.pts[p] - ox, is.pts[p + 1] - oy);
    x.closePath();
    x.fill();
    x.strokeStyle = x.fillStyle;
    x.lineWidth = 3;
    x.stroke();
  }
  return cvs;
}
function paintPoiGround(x, p) {
  x.save();
  // village plazas, lanes and roads are crisp vectors (world/roads.ts, art/roads.ts)
  if (p.kind === 'village') {
    x.restore();
    return;
  }
  if (p.kind === 'lair') {
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
  } else if (p.kind === 'cave' || p.kind === 'gate') {
    x.fillStyle = 'rgba(90,70,60,.45)';
    x.beginPath();
    x.ellipse(p.x, p.y + 14, p.kind === 'gate' ? 62 : 70, 34, 0, 0, TAU);
    x.fill();
    if (p.kind === 'gate') {
      x.fillStyle = 'rgba(30,24,28,.4)';
      x.beginPath();
      x.ellipse(p.x, p.y + 4, 26, 10, 0, 0, TAU);
      x.fill();
    }
  }
  x.restore();
}

/**
 * The chunk (i, j) to draw now: in the world its model with its picture, in a dungeon its
 * painted tile chunk; generated while the frame's budget lasts (`gen`). Null indoors.
 */
export function getChunk(i: number, j: number, gen: boolean): Chunk | null {
  if (game.mode === 'house') return null; // interiors are drawn by render/interior.ts
  if (game.mode === 'dungeon') {
    const map = game.DG.ch,
      k = i + ',' + j;
    let c = map.get(k);
    if (!c && gen && game.genBudget > 0) {
      game.genBudget--;
      c = genDungeonChunk(game.DG, i, j);
      map.set(k, c);
      // dungeon chunks are painted at up to 3× resolution, so fewer are kept
      if (map.size > 20) {
        const a = [...map.entries()].sort((p, q) => p[1].last - q[1].last);
        for (let n = 0; n < 10; n++) map.delete(a[n][0]);
      }
    }
    if (c) c.last = performance.now();
    return c || null;
  }
  const M = chunkAt(i, j, gen);
  if (!M) return null;
  let cvs = pictures.get(M);
  if (!cvs) pictures.set(M, (cvs = paintChunk(M)));
  return Object.assign(M, { cvs }) as Chunk;
}
/** With frame budget left, prepare the next chunk around (cx, cy) in the background. */
export function bgChunks(cx: number, cy: number) {
  if (game.mode === 'world') bgStep(cx, cy);
  else if (game.mode === 'dungeon') {
    const next = nextMissing(game.DG.ch, cx, cy);
    if (next) getChunk(next[0], next[1], true);
  }
}
/** Forget every world chunk (a new game or a new world). */
export function resetChunks() {
  WCH.clear();
  game.bgGen = null;
}
/** Paint the chunks around the hero right away (after arriving somewhere). */
export function warmChunks() {
  game.genBudget = 99;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      getChunk(Math.floor(game.P.x / CH) + i, Math.floor(game.P.y / CH) + j, true);
}

/* ---------- dungeon chunks ---------- */
export function genDungeonChunk(D, cx, cy) {
  // painted at screen resolution (DPR × camera zoom, up to 3×) so floor detail stays sharp
  const res = Math.min(3, Math.ceil(DPR * clamp(Math.min(W, H) / 370, 1, 2.1))),
    cvs = mkCanvas(CH * res, CH * res),
    x = cvs.getContext('2d'),
    T = D.T,
    ox = cx * CH,
    oy = cy * CH;
  const cave = D.style === 'cave',
    pal = cave ? cavePal() : dungeonPal(D.b);
  const moss: { x: number; y: number; s: number; k?: string }[] = [];
  x.scale(res, res);
  x.fillStyle = cave ? CAVE_VOID : '#120e1a';
  x.fillRect(0, 0, CH, CH);
  x.save();
  x.translate(-ox, -oy);
  x.lineJoin = 'round';
  const i0 = Math.floor(ox / T) - 1,
    i1 = Math.floor((ox + CH) / T) + 1,
    j0 = Math.floor(oy / T) - 1,
    j1 = Math.floor((oy + CH) / T) + 1,
    isF = D.isF;
  // One floor colour and one wall colour. Detail stays inside its cell: an oval
  // that spills is sliced by the next cell's fill, which reads as a broken tile.
  const grit = (i, j, X, Y, n, salt) => {
      x.fillStyle = 'rgba(0,0,0,.16)';
      for (let k = 0; k < n; k++) {
        if (hs(i + k, j, salt) < 0.5) continue;
        x.fillRect(
          X + 3 + hs(i + k, j, salt + 1) * (T - 6),
          Y + 3 + hs(i, j + k, salt + 2) * (T - 6),
          2,
          2,
        );
      }
    },
    rockFloor = (i, j, X, Y) => {
      const v = hs(i, j, 55);
      x.fillStyle = pal[0];
      x.fillRect(X, Y, T, T);
      grit(i, j, X, Y, 3, 56);
      if (v > 0.78) {
        x.strokeStyle = 'rgba(0,0,0,.38)';
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(X + 4, Y + 16);
        x.lineTo(X + 18 + hs(i, j, 63) * 14, Y + 24);
        x.lineTo(X + 12, Y + 34);
        x.stroke();
      }
      // earthy bits (art/decor.ts drawCaveBit): roots hang from the rock face above
      if (v < 0.14 && X >= ox && X < ox + CH && Y >= oy && Y < oy + CH) {
        const roots = !isF(i, j - 1) && hs(i, j, 78) < 0.6,
          q = hs(i, j, 79);
        moss.push({
          x: X + 20,
          y: roots ? Y + 4 : Y + 22,
          s: (hs(i, j, 77) * 1e9) | 0,
          k: roots ? 'roots' : q < 0.45 ? 'pebbles' : q < 0.75 ? 'crystal' : 'puddle',
        });
      }
      // crisp shadow bands under and beside the rock, not fades that stop at tile edges
      x.fillStyle = 'rgba(0,0,0,.2)';
      if (!isF(i, j - 1)) x.fillRect(X, Y, T, 7);
      if (!isF(i - 1, j))
        x.fillRect(X, Y + (isF(i, j - 1) ? 0 : 7), 4, T - (isF(i, j - 1) ? 0 : 7));
      if (!isF(i + 1, j))
        x.fillRect(X + T - 4, Y + (isF(i, j - 1) ? 0 : 7), 4, T - (isF(i, j - 1) ? 0 : 7));
    },
    rockWall = (i, j, X, Y) => {
      x.fillStyle = pal[1];
      x.fillRect(X, Y, T, T);
      grit(i, j, X, Y, 2, 71);
    };
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const X = i * T,
        Y = j * T;
      if (isF(i, j)) {
        if (cave) {
          rockFloor(i, j, X, Y);
          continue;
        }
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
        // moss patches are drawn crisply every frame (art/decor.ts drawMoss)
        if (v < 0.08 && X >= ox && X < ox + CH && Y >= oy && Y < oy + CH)
          moss.push({ x: X + 20, y: Y + 22, s: (hs(i, j, 77) * 1e9) | 0 });
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
          if (cave) {
            rockWall(i, j, X, Y);
            continue;
          }
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
        } else if (cave) rockWall(i, j, X, Y);
        else {
          x.fillStyle = pal[2];
          x.fillRect(X, Y, T, T);
          x.fillStyle = 'rgba(0,0,0,.12)';
          x.fillRect(X + 4, Y + 4, T - 8, T - 8);
        }
      }
    }
  x.restore();
  return { cvs, decor: [], waves: [], moss, last: 0 };
}
