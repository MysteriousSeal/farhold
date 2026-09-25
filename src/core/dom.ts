import { TAU } from './math';
/* ================= CORE ================= */
export const $ = (s) => document.querySelector(s);
export const cv = $('#c'),
  g = cv.getContext('2d');
export let W = 0,
  H = 0,
  DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth;
  H = innerHeight;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
}
addEventListener('resize', resize);
resize();
export function rr(c, x, y, w, h, r, fill, stroke = true) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) c.stroke();
}
export function circ(c, x, y, r, fill, stroke = true) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) c.stroke();
}
export function ell(c, x, y, rx, ry, fill, stroke = true, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) c.stroke();
}
export function shadow(c, x, y, rx, ry, a = 0.28) {
  c.fillStyle = 'rgba(20,15,30,' + a + ')';
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
