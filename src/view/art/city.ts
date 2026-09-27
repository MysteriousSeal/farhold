import { mkCanvas, rr, shadow } from '../dom';
import { OUT, TAU, mulberry, sh } from '../../core/math';
import { BRIDGES, BRIDGE_HL, CITY, FORECOURT, STREETS, wallPt } from '../../model/world/city';
import { RIVER, riverY } from '../../model/world/terrain';
/* ================= ART: Hearthfire (walls, paving, fountain, well) ================= */
type Ctx = CanvasRenderingContext2D;
const STONE = '#b8ae9f',
  STONE_DK = '#8f8576',
  WALL_H = 58,
  WALL_T = 22,
  TOWER_R = 32,
  TOWER_H = 100,
  GATE_R = 40,
  GATE_H = 124,
  RES = 2; // paving is rendered at 2 pixels per world unit, like the sprites

/* ---------- paving (pre-rendered into high-resolution tiles) ---------- */
function cobblePattern(c: Ctx, base: string, mortar: string, seed: number) {
  const W = 48,
    H = 36,
    cv = mkCanvas(W * RES, H * RES),
    x = cv.getContext('2d'),
    rnd = mulberry(seed);
  x.scale(RES, RES);
  x.fillStyle = mortar;
  x.fillRect(0, 0, W, H);
  for (let r = 0; r < 4; r++)
    for (let k = -12; k < W + 12; k += 12) {
      const cx = k + (r % 2) * 6,
        cy = r * 9;
      x.fillStyle = sh(base, (rnd() - 0.5) * 0.14);
      x.strokeStyle = 'rgba(55,45,40,.35)';
      x.lineWidth = 0.9;
      x.beginPath();
      if (x.roundRect) x.roundRect(cx + 0.9, cy + 0.9, 10.2, 7.2, 2.6);
      else x.rect(cx + 0.9, cy + 0.9, 10.2, 7.2);
      x.fill();
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,.22)';
      x.fillRect(cx + 2.4, cy + 1.8, 6, 1.3);
    }
  const p = c.createPattern(cv, 'repeat');
  p.setTransform(new DOMMatrix().scale(1 / RES));
  return p;
}
/** Big irregular flagstones for the yards between the streets (warmer, rougher than cobbles). */
function flagPattern(c: Ctx) {
  const W = 96,
    H = 72,
    cv = mkCanvas(W * RES, H * RES),
    x = cv.getContext('2d'),
    rnd = mulberry(71);
  x.scale(RES, RES);
  x.fillStyle = '#857a6a';
  x.fillRect(0, 0, W, H);
  for (let r = 0; r < 4; r++) {
    let k = -((r * 11) % 17);
    while (k < W) {
      const w = 14 + rnd() * 16,
        base = sh('#a39684', (rnd() - 0.5) * 0.16);
      for (const ox of [0, W])
        if (k + ox < W + 20) {
          x.fillStyle = base;
          x.strokeStyle = 'rgba(55,45,40,.3)';
          x.lineWidth = 0.9;
          x.beginPath();
          x.roundRect(k + ox - W * (ox ? 1 : 0) + 0.9, r * 18 + 0.9, w - 1.8, 16.2, 2);
          x.fill();
          x.stroke();
        }
      x.fillStyle = 'rgba(255,255,255,.12)';
      x.fillRect(k + 2, r * 18 + 2, w - 5, 1.3);
      if (rnd() < 0.25) {
        x.strokeStyle = 'rgba(55,45,40,.3)';
        x.beginPath();
        x.moveTo(k + w * 0.3, r * 18 + 3);
        x.lineTo(k + w * 0.5, r * 18 + 9);
        x.stroke();
      }
      k += w;
    }
  }
  const p = c.createPattern(cv, 'repeat');
  p.setTransform(new DOMMatrix().scale(1 / RES));
  return p;
}
/** Trace the river's centre line across the town (and a little beyond the wall). */
function riverPath(x: Ctx) {
  x.beginPath();
  for (let px = -CITY.rx - 40; px <= CITY.rx + 40; px += 8)
    if (px === -CITY.rx - 40) x.moveTo(px, riverY(px));
    else x.lineTo(px, riverY(px));
}
function paintPaving(x: Ctx, v) {
  const yard = flagPattern(x),
    street = cobblePattern(x, '#c4bbae', '#8a8175', 11),
    square = cobblePattern(x, '#cfc7b8', '#93897c', 23),
    light = cobblePattern(x, '#e2d9c8', '#a89e8e', 37),
    curb = '#6f665b';
  x.lineCap = 'round';
  x.lineJoin = 'round';
  // everything inside the wall is paved (the yard stones), apart from gardens
  x.save();
  x.beginPath();
  x.ellipse(0, CITY.cy, CITY.rx + WALL_T, CITY.ry + WALL_T, 0, 0, TAU);
  x.clip();
  x.fillStyle = yard;
  x.fillRect(-CITY.rx - 40, CITY.cy - CITY.ry - 40, CITY.rx * 2 + 80, CITY.ry * 2 + 80);
  // streets: every curb first, then every surface, so crossings join cleanly
  const F = FORECOURT;
  for (const pass of [0, 1]) {
    x.strokeStyle = pass ? street : curb;
    x.fillStyle = pass ? street : curb;
    const grow = pass ? 0 : 4;
    STREETS.forEach(([a, b, c2, d, w]) => {
      x.beginPath();
      x.moveTo(a, b);
      x.lineTo(c2, d);
      x.lineWidth = w + grow * 2;
      x.stroke();
    });
    x.beginPath();
    x.roundRect(F.x0 - grow, F.y0 - grow, F.x1 - F.x0 + grow * 2, F.y1 - F.y0 + grow * 2, 10);
    x.fill();
    x.beginPath();
    x.ellipse(0, CITY.py, CITY.prx + grow + 1, CITY.pry + grow + 1, 0, 0, TAU);
    x.fillStyle = pass ? square : curb;
    x.fill();
  }
  // gutter stones along the middle of the main streets
  x.strokeStyle = 'rgba(90,80,70,.22)';
  x.lineWidth = 3;
  x.setLineDash([6, 8]);
  for (const [a, b, c2, d] of STREETS.slice(0, 4)) {
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(c2, d);
    x.stroke();
  }
  x.setLineDash([]);
  // the square's decorative rings and spokes
  const { py, prx, pry } = CITY;
  x.strokeStyle = light;
  for (const [rx, ry, w] of [
    [prx - 12, pry - 12, 7],
    [70, 54, 12],
  ]) {
    x.beginPath();
    x.ellipse(0, py, rx, ry, 0, 0, TAU);
    x.lineWidth = w;
    x.stroke();
  }
  x.lineWidth = 5;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    x.beginPath();
    x.moveTo(Math.cos(a) * 76, py + Math.sin(a) * 60);
    x.lineTo(Math.cos(a) * (prx - 20), py + Math.sin(a) * (pry - 20));
    x.stroke();
  }
  // gardens and the graveyard: lawns inside a hedge or a low wall
  for (const g of [...v.gardens, v.graveyard]) paintLawn(x, g, g === v.graveyard);
  // the river: stone quays either side, the terrain's water shows through the middle
  riverPath(x);
  x.lineCap = 'butt';
  x.strokeStyle = curb;
  x.lineWidth = (RIVER.w + 16) * 2;
  x.stroke();
  x.strokeStyle = '#b3aa9c';
  x.lineWidth = (RIVER.w + 12) * 2;
  x.stroke();
  x.strokeStyle = '#8a8174';
  x.lineWidth = (RIVER.w + 7) * 2;
  x.stroke();
  x.globalCompositeOperation = 'destination-out';
  x.strokeStyle = '#000';
  x.lineWidth = (RIVER.w + 2) * 2;
  x.stroke();
  x.globalCompositeOperation = 'source-over';
  x.lineCap = 'round';
  for (const br of BRIDGES) paintBridge(x, br, street, curb);
  x.restore();
}
/** A lawn with flower beds, bordered by a hedge (gardens) or a low stone wall (graveyard). */
function paintLawn(x: Ctx, g, walled: boolean) {
  const w = g.x1 - g.x0,
    h = g.y1 - g.y0;
  x.lineWidth = 2.2;
  x.strokeStyle = OUT;
  rr(x, g.x0, g.y0, w, h, 8, walled ? '#8a8276' : '#3f7a34');
  rr(x, g.x0 + 5, g.y0 + 5, w - 10, h - 10, 5, walled ? '#6f9a4a' : '#7cbf5a');
  const rnd = mulberry(((g.x0 * 31 + g.y0 * 7) | 0) + 99);
  for (let k = 0; k < (w * h) / 260; k++) {
    x.fillStyle = rnd() < 0.5 ? 'rgba(40,90,30,.35)' : 'rgba(200,240,150,.35)';
    x.fillRect(g.x0 + 8 + rnd() * (w - 16), g.y0 + 8 + rnd() * (h - 16), 2, 3);
  }
  for (const b of g.beds || []) {
    const cols = [
      ['#e0443c', '#ffd24a'],
      ['#ff8fb0', '#fff6e0'],
      ['#b8d8ff', '#c872ff'],
      ['#ffd24a', '#ff8a3a'],
    ][b.c];
    x.lineWidth = 1.6;
    rr(x, b.x - 16, b.y - 7, 32, 14, 5, '#7a5a3a');
    for (let k = 0; k < 6; k++) {
      const fx = b.x - 12 + (k % 3) * 12,
        fy = b.y - 3 + ((k / 3) | 0) * 6;
      x.fillStyle = '#4c9a3a';
      x.beginPath();
      x.arc(fx, fy + 1, 3, 0, TAU);
      x.fill();
      x.fillStyle = cols[k % 2];
      x.beginPath();
      x.arc(fx, fy, 1.8, 0, TAU);
      x.fill();
    }
  }
  if (!walled) {
    // a gravel path from the street into the garden
    const px = (g.x0 + g.x1) / 2;
    x.fillStyle = '#c9b89a';
    x.fillRect(px - 8, g.y0 - 1, 16, 12);
  }
}
/** A stone bridge: cobbled deck over the water, with parapets along both sides. */
function paintBridge(x: Ctx, br, street, curb: string) {
  const L = BRIDGE_HL,
    x0 = br.x - br.hw,
    w = br.hw * 2;
  // the arch's shadow on the water, and the deck
  x.fillStyle = 'rgba(10,20,40,.35)';
  x.fillRect(x0 - 4, br.y - L + 6, w + 8, L * 2 - 4);
  x.fillStyle = curb;
  x.fillRect(x0 - 2, br.y - L, w + 4, L * 2);
  x.fillStyle = street;
  x.fillRect(x0 + 2, br.y - L, w - 4, L * 2);
  // parapets
  x.strokeStyle = OUT;
  x.lineWidth = 2;
  for (const px of [x0 - 7, br.x + br.hw + 1]) {
    rr(x, px, br.y - L + 4, 6, L * 2 - 8, 2, '#c4bcae');
    x.fillStyle = 'rgba(60,50,45,.35)';
    for (let yy = br.y - L + 12; yy < br.y + L - 8; yy += 10) x.fillRect(px + 1, yy, 4, 1.2);
  }
}
const TILE = 256;
const tiles = new Map<string, HTMLCanvasElement>();
/** Draw the city's paving for the visible area (tiles are rendered once, lazily). */
export function drawCityGround(c: Ctx, v, x0: number, y0: number, x1: number, y1: number) {
  for (let i = Math.floor(x0 / TILE); i <= Math.floor(x1 / TILE); i++)
    for (let j = Math.floor(y0 / TILE); j <= Math.floor(y1 / TILE); j++) {
      if (i < -4 || i > 3 || j < -4 || j > 3) continue;
      const k = v.key + ':' + i + ',' + j;
      let cv = tiles.get(k);
      if (!cv) {
        cv = mkCanvas(TILE * RES, TILE * RES);
        const x = cv.getContext('2d');
        x.setTransform(RES, 0, 0, RES, -i * TILE * RES, -j * TILE * RES);
        paintPaving(x, v);
        tiles.set(k, cv);
      }
      c.drawImage(cv, i * TILE, j * TILE, TILE + 0.5, TILE + 0.5);
    }
}
/** Forget pre-rendered paving (e.g. when another world is loaded). */
export const resetCityGround = () => tiles.clear();

/* ---------- walls & towers ---------- */
const norm = (a: number) => {
  const nx = Math.cos(a) / CITY.rx,
    ny = Math.sin(a) / CITY.ry,
    l = Math.hypot(nx, ny);
  return { x: nx / l, y: ny / l };
};
/** Base line of the visible (south-facing) face and the wall-walk corners of a segment. */
function segGeom(a0: number, a1: number) {
  const P = [a0, a1].map((a) => {
    const c = wallPt(a),
      n = norm(a);
    return {
      inn: { x: c.x - (n.x * WALL_T) / 2, y: c.y - (n.y * WALL_T) / 2 },
      out: { x: c.x + (n.x * WALL_T) / 2, y: c.y + (n.y * WALL_T) / 2 },
      south: n.y > 0,
    };
  });
  const face = P.map((p) => (p.south ? p.out : p.inn));
  return { P, face, key: Math.max(face[0].y, face[1].y) };
}
export const wallSegKey = (a0: number, a1: number) => segGeom(a0, a1).key;
export function drawWallSeg(c: Ctx, a0: number, a1: number) {
  const { P, face } = segGeom(a0, a1),
    H = WALL_H;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // face
  c.beginPath();
  c.moveTo(face[0].x, face[0].y);
  c.lineTo(face[1].x, face[1].y);
  c.lineTo(face[1].x, face[1].y - H);
  c.lineTo(face[0].x, face[0].y - H);
  c.closePath();
  c.fillStyle = STONE;
  c.fill();
  c.save();
  c.clip();
  c.strokeStyle = 'rgba(60,50,45,.38)';
  c.lineWidth = 1.2;
  for (let r = 1; r < 5; r++) {
    const f = r * 9.5;
    c.beginPath();
    c.moveTo(face[0].x, face[0].y - f);
    c.lineTo(face[1].x, face[1].y - f);
    c.stroke();
    for (const t of r % 2 ? [0.35, 0.85] : [0.1, 0.6]) {
      const jx = face[0].x + (face[1].x - face[0].x) * t,
        jy = face[0].y + (face[1].y - face[0].y) * t;
      c.beginPath();
      c.moveTo(jx, jy - f);
      c.lineTo(jx, jy - f + 9.5);
      c.stroke();
    }
  }
  c.fillStyle = 'rgba(0,0,0,.12)';
  c.fillRect(Math.min(face[0].x, face[1].x) - 2, Math.min(face[0].y, face[1].y) - 12, 40, 14);
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  c.stroke();
  // wall-walk on top
  c.beginPath();
  c.moveTo(P[0].inn.x, P[0].inn.y - H);
  c.lineTo(P[1].inn.x, P[1].inn.y - H);
  c.lineTo(P[1].out.x, P[1].out.y - H);
  c.lineTo(P[0].out.x, P[0].out.y - H);
  c.closePath();
  c.fillStyle = sh(STONE, 0.14);
  c.fill();
  c.stroke();
  // battlements on the outer edge
  for (const t of [0.22, 0.72]) {
    const mx = P[0].out.x + (P[1].out.x - P[0].out.x) * t,
      my = P[0].out.y + (P[1].out.y - P[0].out.y) * t - H;
    c.lineWidth = 2;
    rr(c, mx - 4, my - 8, 8, 9, 1.2, sh(STONE, 0.05));
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(mx - 3, my - 7, 6, 1.5);
  }
}
/** The wall over the river: a stretch of wall with a grated arch the water runs through. */
export function drawWaterGate(c: Ctx, a0: number, a1: number) {
  const { P, face } = segGeom(a0, a1),
    H = WALL_H,
    at = (t: number) => ({
      x: face[0].x + (face[1].x - face[0].x) * t,
      y: face[0].y + (face[1].y - face[0].y) * t,
    });
  const arch = () => {
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const p = at(0.14 + 0.72 * u),
        ay = p.y - 38 * Math.sqrt(Math.sin(Math.PI * u));
      if (u === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, ay);
    }
    c.closePath();
  };
  c.lineJoin = 'round';
  // the tunnel: dark, with the water running out at the bottom and the iron grate
  c.save();
  c.beginPath();
  arch();
  c.fillStyle = '#1e2430';
  c.fill();
  c.clip();
  const l = at(0.1),
    r = at(0.9);
  c.fillStyle = '#3f6fa8';
  c.beginPath();
  c.moveTo(l.x, l.y - 10);
  c.lineTo(r.x, r.y - 10);
  c.lineTo(r.x, r.y + 4);
  c.lineTo(l.x, l.y + 4);
  c.fill();
  c.strokeStyle = 'rgba(200,230,255,.5)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(l.x, l.y - 9);
  c.lineTo(r.x, r.y - 9);
  c.stroke();
  c.strokeStyle = '#4a4048';
  c.lineWidth = 3;
  for (let t = 0.18; t < 0.84; t += 0.07) {
    const p = at(t);
    c.beginPath();
    c.moveTo(p.x, p.y - 50);
    c.lineTo(p.x, p.y + 2);
    c.stroke();
  }
  for (const dy of [-26, -12]) {
    c.beginPath();
    c.moveTo(l.x, l.y + dy);
    c.lineTo(r.x, r.y + dy);
    c.stroke();
  }
  c.restore();
  // the face around the arch
  c.beginPath();
  c.moveTo(face[0].x, face[0].y);
  c.lineTo(face[0].x, face[0].y - H);
  c.lineTo(face[1].x, face[1].y - H);
  c.lineTo(face[1].x, face[1].y);
  arch();
  c.fillStyle = STONE;
  c.fill('evenodd');
  c.save();
  c.clip('evenodd');
  c.strokeStyle = 'rgba(60,50,45,.38)';
  c.lineWidth = 1.2;
  for (let r2 = 1; r2 < 6; r2++) {
    const f = r2 * 9.5;
    c.beginPath();
    c.moveTo(face[0].x, face[0].y - f);
    c.lineTo(face[1].x, face[1].y - f);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(face[0].x, face[0].y);
  c.lineTo(face[0].x, face[0].y - H);
  c.lineTo(face[1].x, face[1].y - H);
  c.lineTo(face[1].x, face[1].y);
  c.stroke();
  c.beginPath();
  arch();
  c.stroke();
  // voussoirs round the arch
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(60,50,45,.45)';
  for (let u = 0.1; u < 0.95; u += 0.1) {
    const p = at(0.14 + 0.72 * u),
      ay = p.y - 38 * Math.sqrt(Math.sin(Math.PI * u));
    c.beginPath();
    c.moveTo(p.x, ay);
    c.lineTo(p.x + (u - 0.5) * 10, ay - 8);
    c.stroke();
  }
  // wall-walk and battlements on top
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(P[0].inn.x, P[0].inn.y - H);
  c.lineTo(P[1].inn.x, P[1].inn.y - H);
  c.lineTo(P[1].out.x, P[1].out.y - H);
  c.lineTo(P[0].out.x, P[0].out.y - H);
  c.closePath();
  c.fillStyle = sh(STONE, 0.14);
  c.fill();
  c.stroke();
  for (let t = 0.08; t < 0.95; t += 0.16) {
    const mx = P[0].out.x + (P[1].out.x - P[0].out.x) * t,
      my = P[0].out.y + (P[1].out.y - P[0].out.y) * t - H;
    c.lineWidth = 2;
    rr(c, mx - 4, my - 8, 8, 9, 1.2, sh(STONE, 0.05));
  }
}
export function drawTower(c: Ctx, tw, t: number, banner: string) {
  const { x, y } = tw,
    R = tw.gate ? GATE_R : TOWER_R,
    TH = tw.gate ? GATE_H : TOWER_H,
    top = y - TH;
  shadow(c, x, y + 2, R + 8, R * 0.45, 0.3);
  c.lineJoin = 'round';
  const body = () => {
    c.beginPath();
    c.moveTo(x - R, top);
    c.lineTo(x - R, y);
    c.ellipse(x, y, R, R * 0.4, 0, Math.PI, 0, true);
    c.lineTo(x + R, top);
    c.closePath();
  };
  body();
  c.fillStyle = STONE;
  c.fill();
  c.save();
  body();
  c.clip();
  c.strokeStyle = 'rgba(60,50,45,.38)';
  c.lineWidth = 1.2;
  for (let yy = y - 6, r = 0; yy > top; yy -= 10, r++) {
    c.beginPath();
    c.ellipse(x, yy, R, R * 0.4, 0, 0, Math.PI);
    c.stroke();
    for (const k of r % 2 ? [-0.5, 0.3] : [-0.1, 0.65]) {
      c.beginPath();
      c.moveTo(x + k * R, yy + R * 0.4 * Math.sqrt(1 - k * k));
      c.lineTo(x + k * R, yy + R * 0.4 * Math.sqrt(1 - k * k) - 10);
      c.stroke();
    }
  }
  const g = c.createLinearGradient(x - R, 0, x + R, 0);
  g.addColorStop(0, 'rgba(255,255,255,.22)');
  g.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,.3)');
  c.fillStyle = g;
  c.fillRect(x - R, top - 20, R * 2, TH + 40);
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  body();
  c.stroke();
  // arrow slits
  c.fillStyle = '#2a2233';
  for (const [sx, sy] of [
    [0, -46],
    [-12, -28],
    [12, -28],
  ])
    if (sy > -TH + 10) rr(c, x + sx - 2, y + sy - 8, 4, 12, 2, '#2a2233', false);
  // crenellated top
  c.beginPath();
  c.ellipse(x, top, R + 4, (R + 4) * 0.4, 0, 0, TAU);
  c.fillStyle = sh(STONE, 0.12);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(x, top, R - 3, (R - 3) * 0.4, 0, 0, TAU);
  c.fillStyle = sh(STONE, -0.2);
  c.fill();
  c.stroke();
  for (let k = 0; k < 7; k++) {
    const a = (k / 6) * Math.PI,
      mx = x + Math.cos(a) * (R + 1),
      my = top + Math.sin(a) * (R + 1) * 0.4;
    c.lineWidth = 2;
    rr(c, mx - 4.5, my - 9, 9, 10, 1.2, sh(STONE, 0.06));
  }
  // banner hanging on gate towers, a flag on corner towers
  if (tw.gate) {
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 8, y - 70);
    c.lineTo(x + 8, y - 70);
    c.lineTo(x + 8, y - 40);
    c.lineTo(x, y - 34);
    c.lineTo(x - 8, y - 40);
    c.closePath();
    c.fillStyle = banner;
    c.fill();
    c.stroke();
    c.fillStyle = '#f5c451';
    c.beginPath();
    c.arc(x, y - 55, 3.5, 0, TAU);
    c.fill();
  } else {
    const fy = top - 8,
      wave = Math.sin(t * 3 + x) * 3;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(x, fy);
    c.lineTo(x, fy - 26);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, fy - 26);
    c.quadraticCurveTo(x + 10, fy - 24 + wave, x + 20, fy - 21 + wave);
    c.lineTo(x, fy - 15);
    c.closePath();
    c.fillStyle = banner;
    c.fill();
    c.stroke();
  }
}
/**
 * The gatehouse over the south gate: a stone front between the gate towers with a round arch
 * (voussoirs and a keystone), the portcullis raised into the arch's top, and battlements.
 */
export function drawGateArch(c: Ctx, l, r) {
  const y = Math.max(l.y, r.y),
    x0 = l.x + GATE_R - 6,
    x1 = r.x - GATE_R + 6,
    mid = (x0 + x1) / 2,
    top = y - WALL_H - 34,
    spring = y - 40, // where the arch starts to curve
    ar = (x1 - x0) / 2 - 6, // arch radius
    crown = spring - ar * 0.55;
  const archPath = (grow: number) => {
    c.moveTo(mid - ar - grow, y);
    c.lineTo(mid - ar - grow, spring);
    c.ellipse(mid, spring, ar + grow, ar * 0.55 + grow, 0, Math.PI, 0);
    c.lineTo(mid + ar + grow, y);
  };
  c.lineJoin = 'round';
  // the portcullis, raised: bars and crossbars with spikes, filling the arch's top
  c.save();
  c.beginPath();
  archPath(0);
  c.closePath();
  c.clip();
  c.fillStyle = 'rgba(20,16,28,.55)';
  c.fillRect(x0, crown - 4, x1 - x0, 24);
  c.strokeStyle = OUT;
  c.lineWidth = 3.4;
  for (let k = mid - ar + 7; k < mid + ar; k += 10) {
    c.beginPath();
    c.moveTo(k, crown - 4);
    c.lineTo(k, spring - 6);
    c.stroke();
  }
  c.strokeStyle = '#5a5058';
  c.lineWidth = 1.8;
  for (let k = mid - ar + 7; k < mid + ar; k += 10) {
    c.beginPath();
    c.moveTo(k, crown - 4);
    c.lineTo(k, spring - 6);
    c.stroke();
  }
  for (const yy of [crown + 8, spring - 12]) {
    c.strokeStyle = OUT;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(x0, yy);
    c.lineTo(x1, yy);
    c.stroke();
    c.strokeStyle = '#5a5058';
    c.lineWidth = 1.8;
    c.stroke();
  }
  c.fillStyle = '#5a5058';
  c.strokeStyle = OUT;
  c.lineWidth = 1.4;
  for (let k = mid - ar + 7; k < mid + ar; k += 10) {
    c.beginPath();
    c.moveTo(k - 2.5, spring - 6);
    c.lineTo(k + 2.5, spring - 6);
    c.lineTo(k, spring + 1);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.restore();
  // the stone front around the arch
  c.beginPath();
  c.rect(x0, top, x1 - x0, y - top);
  archPath(0);
  c.closePath();
  c.fillStyle = STONE;
  c.fill('evenodd');
  c.save();
  c.clip('evenodd');
  c.strokeStyle = 'rgba(60,50,45,.38)';
  c.lineWidth = 1.2;
  for (let yy = y - 9.5, row = 0; yy > top; yy -= 9.5, row++) {
    c.beginPath();
    c.moveTo(x0, yy);
    c.lineTo(x1, yy);
    c.stroke();
    for (let k = x0 + (row % 2 ? 6 : 14); k < x1; k += 17) {
      c.beginPath();
      c.moveTo(k, yy);
      c.lineTo(k, yy + 9.5);
      c.stroke();
    }
  }
  c.restore();
  // voussoirs: a ring of wedge stones round the arch, with a keystone at the crown
  c.beginPath();
  c.ellipse(mid, spring, ar + 9, ar * 0.55 + 9, 0, Math.PI, 0);
  c.ellipse(mid, spring, ar, ar * 0.55, 0, 0, Math.PI, true);
  c.closePath();
  c.fillStyle = sh(STONE, 0.1);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  c.stroke();
  c.strokeStyle = 'rgba(60,50,45,.5)';
  c.lineWidth = 1.2;
  for (let k = 1; k < 9; k++) {
    const a = Math.PI + (k / 9) * Math.PI;
    c.beginPath();
    c.moveTo(mid + Math.cos(a) * ar, spring + Math.sin(a) * ar * 0.55);
    c.lineTo(mid + Math.cos(a) * (ar + 9), spring + Math.sin(a) * (ar * 0.55 + 9));
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  rr(c, mid - 6, crown - 12, 12, 14, 2, sh(STONE, 0.2));
  // outline, then the battlements along the top
  c.beginPath();
  c.moveTo(x0, y);
  c.lineTo(x0, top);
  c.lineTo(x1, top);
  c.lineTo(x1, y);
  c.stroke();
  c.beginPath();
  archPath(0);
  c.stroke();
  rr(c, x0 - 3, top - 4, x1 - x0 + 6, 6, 1.5, sh(STONE, 0.14));
  for (let k = x0 + 1; k < x1 - 6; k += 12) {
    c.lineWidth = 2;
    rr(c, k, top - 13, 8, 10, 1.2, sh(STONE, 0.05));
  }
}
/* ---------- fountain & well ---------- */
export function drawFountain(c: Ctx, f, t: number) {
  const { x, y } = f;
  shadow(c, x, y + 2, 48, 18, 0.28);
  c.lineJoin = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  // basin wall
  c.beginPath();
  c.moveTo(x - 42, y - 14);
  c.lineTo(x - 42, y);
  c.ellipse(x, y, 42, 17, 0, Math.PI, 0, true);
  c.lineTo(x + 42, y - 14);
  c.closePath();
  c.fillStyle = STONE;
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(x, y - 14, 42, 17, 0, 0, TAU);
  c.fillStyle = sh(STONE, 0.18);
  c.fill();
  c.stroke();
  // water with ripples
  c.beginPath();
  c.ellipse(x, y - 14, 35, 12.5, 0, 0, TAU);
  c.fillStyle = '#5aa2dc';
  c.fill();
  c.stroke();
  c.save();
  c.beginPath();
  c.ellipse(x, y - 14, 35, 12.5, 0, 0, TAU);
  c.clip();
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    c.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - p)).toFixed(3) + ')';
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(x, y - 14, 8 + p * 28, 3 + p * 10, 0, 0, TAU);
    c.stroke();
  }
  c.restore();
  // pedestal and upper bowl
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  rr(c, x - 6, y - 44, 12, 32, 2, STONE);
  c.beginPath();
  c.moveTo(x - 17, y - 44);
  c.quadraticCurveTo(x, y - 32, x + 17, y - 44);
  c.closePath();
  c.fillStyle = sh(STONE, 0.1);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(x, y - 44, 17, 6, 0, 0, TAU);
  c.fillStyle = '#6ab2ea';
  c.fill();
  c.stroke();
  rr(c, x - 3, y - 56, 6, 12, 2, sh(STONE, 0.12));
  // jets
  c.strokeStyle = 'rgba(200,235,255,.85)';
  c.lineWidth = 2;
  c.setLineDash([5, 4]);
  c.lineDashOffset = -t * 30;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(x, y - 56);
    c.quadraticCurveTo(x + s * 14, y - 70, x + s * 22, y - 18);
    c.stroke();
    c.beginPath();
    c.moveTo(x + s * 15, y - 45);
    c.quadraticCurveTo(x + s * 24, y - 44, x + s * 28, y - 16);
    c.stroke();
  }
  c.setLineDash([]);
  c.fillStyle = 'rgba(230,248,255,.9)';
  for (let k = 0; k < 4; k++) {
    const a = t * 2 + k * 1.7;
    c.beginPath();
    c.arc(x + Math.cos(a) * 20, y - 16 + Math.sin(a * 1.3) * 3, 1.6, 0, TAU);
    c.fill();
  }
}
export function drawWell(c: Ctx, w) {
  const { x, y } = w;
  shadow(c, x, y + 2, 22, 8, 0.28);
  c.lineJoin = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  // posts and roof
  rr(c, x - 17, y - 50, 4, 40, 1, '#7a4f2e');
  rr(c, x + 13, y - 50, 4, 40, 1, '#7a4f2e');
  c.beginPath();
  c.moveTo(x - 24, y - 46);
  c.lineTo(x, y - 62);
  c.lineTo(x + 24, y - 46);
  c.closePath();
  c.fillStyle = '#9a5a3a';
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.25)';
  c.lineWidth = 1.2;
  for (let k = -18; k < 20; k += 6) {
    c.beginPath();
    c.moveTo(x + k, y - 46);
    c.lineTo(x + k * 0.35, y - 58);
    c.stroke();
  }
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  rr(c, x - 15, y - 42, 30, 3, 1, '#6b4423');
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 2, y - 40);
  c.lineTo(x + 2, y - 26);
  c.stroke();
  c.lineWidth = 2;
  rr(c, x - 3, y - 27, 10, 8, 2, '#8a5a36');
  // stone ring
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(x - 18, y - 12);
  c.lineTo(x - 18, y);
  c.ellipse(x, y, 18, 7, 0, Math.PI, 0, true);
  c.lineTo(x + 18, y - 12);
  c.closePath();
  c.fillStyle = STONE;
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(x, y - 12, 18, 7, 0, 0, TAU);
  c.fillStyle = sh(STONE, 0.15);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(x, y - 12, 12.5, 4.5, 0, 0, TAU);
  c.fillStyle = '#1e2a44';
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(60,50,45,.4)';
  c.lineWidth = 1;
  for (const k of [-10, 0, 10]) {
    c.beginPath();
    c.moveTo(x + k, y - 6);
    c.lineTo(x + k, y + 3);
    c.stroke();
  }
}
export { STONE_DK };
