import { game } from '../game/state';
export const TAU = Math.PI * 2,
  OUT = '#2a1d2c';
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp = (a, b, t) => a + (b - a) * t,
  rand = (a, b) => a + Math.random() * (b - a);
export const pick = (a) => a[(Math.random() * a.length) | 0];
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function strSeed(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function hs(x, y, s) {
  let h = (game.SEED + Math.imul(s, 2654435761)) | 0;
  h = (h + Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vn(x, y, s) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = hs(xi, yi, s),
    b = hs(xi + 1, yi, s),
    c = hs(xi, yi + 1, s),
    d = hs(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o, s) {
  let t = 0,
    a = 0.5,
    n = 0;
  for (let i = 0; i < o; i++) {
    t += vn(x, y, s + i * 31) * a;
    n += a;
    a *= 0.5;
    x *= 2.03;
    y *= 2.03;
  }
  return t / n;
}
function hexs(r, g2, b) {
  return (
    '#' +
    (
      (1 << 24) |
      (clamp(Math.round(r), 0, 255) << 16) |
      (clamp(Math.round(g2), 0, 255) << 8) |
      clamp(Math.round(b), 0, 255)
    )
      .toString(16)
      .slice(1)
  );
}
export function sh(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g2 = (n >> 8) & 255,
    b = n & 255;
  if (f < 0) {
    r *= 1 + f;
    g2 *= 1 + f;
    b *= 1 + f;
  } else {
    r += (255 - r) * f;
    g2 += (255 - g2) * f;
    b += (255 - b) * f;
  }
  return hexs(r, g2, b);
}
export function mixCol(a, b, t = 0.5) {
  const A = parseInt(a.slice(1), 16),
    B = parseInt(b.slice(1), 16);
  return hexs(
    lerp(A >> 16, B >> 16, t),
    lerp((A >> 8) & 255, (B >> 8) & 255, t),
    lerp(A & 255, B & 255, t),
  );
}
