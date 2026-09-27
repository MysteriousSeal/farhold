import { DPR, H, W, mkCanvas } from '../dom';
import { clamp } from '../../core/math';
import { game, lights } from '../../model/game/state';
import { torchLeft } from '../../model/game/consumables';
/* ================= Underground darkness ================= */
// Caves are very dark and crypts dim. Light comes from the hero (a small glow, or a carried
// torch), wall torches, the cave mouth, chests, portals and glowing effects. Enemies left in
// the dark are only faint shapes, without their name and health bar.

type Light = { x: number; y: number; r: number; col?: string };

/** How dark the unlit ground is here: 0 outside, pitch black in caves, 0.55 in crypts. */
export function underDark() {
  if (game.mode !== 'dungeon' || !game.DG) return 0;
  return game.DG.style === 'cave' ? 1 : 0.55;
}
const flick = (t: number, ph: number) =>
  1 + Math.sin(t * 9 + ph) * 0.03 + Math.sin(t * 23 + ph * 2) * 0.02;
/** The fixed lights of the level and the hero's own, this frame. */
function baseLights(t: number): Light[] {
  const D = game.DG,
    L: Light[] = [];
  // the hero's own light: a lit torch, or (in crypts only) a small glow; caves are pitch black
  if (game.P) {
    const torch = torchLeft() > 0;
    if (torch || D.style !== 'cave')
      L.push({
        x: game.P.x,
        y: game.P.y - 16,
        r: torch ? 175 * flick(t, 0) : 95,
        col: torch ? '#ffa04a' : undefined,
      });
  }
  for (const tr of D.torches)
    if (!tr.taken) L.push({ x: tr.x, y: tr.y - 24, r: 150 * flick(t, tr.ph) }); // glow: drawTorch
  L.push(
    D.style === 'cave'
      ? { x: D.exit.x, y: D.exit.y - 20, r: 170, col: '#ffe2a0' }
      : { x: D.exit.x, y: D.exit.y, r: 120 },
  );
  if (!D.chest.hidden && !D.chest.open) L.push({ x: D.chest.x, y: D.chest.y - 14, r: 100 });
  if (D.portal) L.push({ x: D.portal.x, y: D.portal.y - 30, r: 150 });
  return L;
}
/** 0 in the dark, up to 1 right by a light. */
function lightAt(L: Light[], x: number, y: number) {
  let best = 0;
  for (const l of L) {
    const k = 1 - Math.hypot(x - l.x, y - l.y) / l.r;
    if (k > best) best = k;
  }
  return best;
}
/** Flags enemies standing in the dark, before they are drawn (their plates hide). */
export function markDark(t: number) {
  const dark = underDark();
  for (const e of game.enemies) e.inDark = false;
  if (!dark) return;
  const L = baseLights(t);
  for (const e of game.enemies) e.inDark = lightAt(L, e.x, e.y - 12) < 0.12;
}
let mask: HTMLCanvasElement | null = null;
/** Whether the hero stood out of every light this frame (set by drawDarkness). */
export let heroDark = false;
/** Lays the darkness over the world (in world transform), cut open by every light. */
export function drawDarkness(g: CanvasRenderingContext2D, t: number) {
  const dark = underDark();
  if (!dark) return;
  const L = baseLights(t);
  for (const l of lights) if (l.r > 0) L.push({ x: l.x, y: l.y, r: l.r * 0.8, col: l.col });
  heroDark = !!game.P && lightAt(L, game.P.x, game.P.y - 16) < 0.25;
  if (!mask || mask.width !== Math.ceil(W) || mask.height !== Math.ceil(H)) mask = mkCanvas(W, H);
  const m = mask.getContext('2d'),
    tf = g.getTransform();
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, mask.width, mask.height);
  m.fillStyle = 'rgba(8,5,12,' + dark + ')';
  m.fillRect(0, 0, mask.width, mask.height);
  m.setTransform(tf.a / DPR, tf.b / DPR, tf.c / DPR, tf.d / DPR, tf.e / DPR, tf.f / DPR);
  m.globalCompositeOperation = 'destination-out';
  for (const l of L) {
    const gr = m.createRadialGradient(l.x, l.y, l.r * 0.15, l.x, l.y, l.r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.55, 'rgba(0,0,0,.7)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = gr;
    m.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  g.save();
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.drawImage(mask, 0, 0, W, H);
  g.restore();
  // warm glow of flames on top
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const l of L) {
    if (!l.col) continue;
    const gr = g.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r * 0.6);
    gr.addColorStop(0, hexA(l.col, 0.16 * dark));
    gr.addColorStop(1, hexA(l.col, 0));
    g.fillStyle = gr;
    g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  g.restore();
}
function hexA(h: string, a: number) {
  const n = parseInt(h.slice(1), 16);
  return (
    'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + clamp(a, 0, 1) + ')'
  );
}
