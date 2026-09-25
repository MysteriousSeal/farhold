import { mkCanvas, rr, shadow } from '../core/dom';
import { OUT, TAU, mulberry, sh } from '../core/math';
import { CITY, STREETS, wallPt } from '../world/city';
import { houseRoute } from '../world/poi';
/* ================= ART: Hearthfire (walls, paving, fountain, well) ================= */
type Ctx = CanvasRenderingContext2D;
const STONE = '#b8ae9f',
  STONE_DK = '#8f8576',
  WALL_H = 46,
  WALL_T = 16,
  TOWER_R = 28,
  TOWER_H = 80,
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
function tracePath(x: Ctx, pts: { x: number; y: number }[], r = 22) {
  x.beginPath();
  x.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++)
    x.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, r);
  x.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}
function paintPaving(x: Ctx, v) {
  const street = cobblePattern(x, '#b9b0a3', '#8a8175', 11),
    square = cobblePattern(x, '#c6beb0', '#93897c', 23),
    light = cobblePattern(x, '#e2d9c8', '#a89e8e', 37),
    curb = '#7a7165';
  x.lineCap = 'round';
  x.lineJoin = 'round';
  // lanes to house doors
  for (const h of v.houses) {
    if (h.street) continue;
    const r = houseRoute(v, h);
    tracePath(x, r);
    x.strokeStyle = curb;
    x.lineWidth = 27;
    x.stroke();
    x.strokeStyle = street;
    x.lineWidth = 21;
    x.stroke();
  }
  // streets
  for (const [a, b, c2, d] of STREETS) {
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(c2, d);
    x.strokeStyle = curb;
    x.lineWidth = CITY.sw + 8;
    x.stroke();
    x.strokeStyle = street;
    x.lineWidth = CITY.sw;
    x.stroke();
    // gutter stones along the middle
    x.strokeStyle = 'rgba(90,80,70,.25)';
    x.lineWidth = 3;
    x.setLineDash([6, 8]);
    x.stroke();
    x.setLineDash([]);
  }
  // the square: curb ring, paving, decorative light rings around the waystone
  const { py, prx, pry } = CITY;
  x.beginPath();
  x.ellipse(0, py, prx + 5, pry + 5, 0, 0, TAU);
  x.fillStyle = curb;
  x.fill();
  x.beginPath();
  x.ellipse(0, py, prx, pry, 0, 0, TAU);
  x.fillStyle = square;
  x.fill();
  x.strokeStyle = light;
  for (const [rx, ry, w] of [
    [prx - 10, pry - 10, 7],
    [70, 54, 12],
  ]) {
    x.beginPath();
    x.ellipse(0, py, rx, ry, 0, 0, TAU);
    x.lineWidth = w;
    x.stroke();
  }
  // compass spokes between the rings
  x.lineWidth = 5;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    x.beginPath();
    x.moveTo(Math.cos(a) * 76, py + Math.sin(a) * 60);
    x.lineTo(Math.cos(a) * (prx - 18), py + Math.sin(a) * (pry - 18));
    x.stroke();
  }
}
const TILE = 256;
const tiles = new Map<string, HTMLCanvasElement>();
/** Draw the city's paving for the visible area (tiles are rendered once, lazily). */
export function drawCityGround(c: Ctx, v, x0: number, y0: number, x1: number, y1: number) {
  for (let i = Math.floor(x0 / TILE); i <= Math.floor(x1 / TILE); i++)
    for (let j = Math.floor(y0 / TILE); j <= Math.floor(y1 / TILE); j++) {
      if (i < -3 || i > 2 || j < -3 || j > 2) continue;
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
export function drawTower(c: Ctx, tw, t: number, banner: string) {
  const { x, y } = tw,
    R = TOWER_R,
    top = y - TOWER_H;
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
  c.fillRect(x - R, top - 20, R * 2, TOWER_H + 40);
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
    if (sy > -TOWER_H + 10) rr(c, x + sx - 2, y + sy - 8, 4, 12, 2, '#2a2233', false);
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
/** Stone arch over the south gate, with the portcullis raised. */
export function drawGateArch(c: Ctx, l, r) {
  const y = Math.max(l.y, r.y),
    x0 = l.x + TOWER_R - 4,
    x1 = r.x - TOWER_R + 4,
    top = y - WALL_H - 22,
    bot = y - WALL_H + 10,
    mid = (x0 + x1) / 2;
  c.lineJoin = 'round';
  const band = () => {
    c.beginPath();
    c.moveTo(x0, top);
    c.lineTo(x1, top);
    c.lineTo(x1, bot + 12);
    c.quadraticCurveTo(mid, bot - 26, x0, bot + 12);
    c.closePath();
  };
  band();
  c.fillStyle = STONE;
  c.fill();
  c.save();
  band();
  c.clip();
  c.strokeStyle = 'rgba(60,50,45,.38)';
  c.lineWidth = 1.2;
  for (let k = x0 + 8; k < x1; k += 11) {
    c.beginPath();
    c.moveTo(k, bot + 12);
    c.lineTo(mid + (k - mid) * 0.7, top + 8);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  band();
  c.stroke();
  // raised portcullis teeth
  c.fillStyle = '#4a4048';
  for (let k = x0 + 10; k < x1 - 6; k += 9) {
    c.beginPath();
    c.moveTo(k - 2, bot - 8);
    c.lineTo(k + 2, bot - 8);
    c.lineTo(k, bot - 1);
    c.closePath();
    c.fill();
  }
  rr(c, mid - 6, top - 2, 12, 12, 2, '#d8cfbf');
  for (let k = x0 + 2; k < x1 - 4; k += 12) {
    c.lineWidth = 2;
    rr(c, k, top - 9, 8, 9, 1.2, sh(STONE, 0.05));
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
