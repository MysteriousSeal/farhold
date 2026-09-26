import { circ, ell, rr, shadow } from '../core/dom';
import { OUT, TAU } from '../core/math';
import { addLight } from '../game/fx';
import type { WorldEvent } from '../game/events';
import { drawHumanoid } from './humanoid';
/* ================= ART: world events ================= */
// The travelling merchant's wagon, the meteor streaking down and its glowing crater.
type Ctx = CanvasRenderingContext2D;
const WOOD = '#8a5a36',
  WOOD_L = '#a8744a',
  WOOD_D = '#5e3c22';

const MERCHANT = {
  skin: '#e6b187',
  hair: 0,
  hairC: '#e4e4e4',
  beard: true,
  cloth: '#3f6f8a',
  cloth2: '#2a4a5c',
  cape: '#6b2a5a',
  hat: '#6b2a5a',
  pants: '#4a3a2e',
  boots: '#3a2a1e',
};

/** A covered wagon with striped canvas, goods and the merchant standing beside it. */
function wagon(c: Ctx, ev: WorldEvent, t: number) {
  const { x, y } = ev;
  shadow(c, x, y + 2, 62, 12, 0.3);
  c.save();
  c.translate(x, y);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = 2.2;
  // far wheels
  for (const wx of [-30, 26]) {
    circ(c, wx + 4, -12, 11, WOOD_D);
  }
  // the bed and its side boards
  rr(c, -46, -34, 88, 18, 3, WOOD);
  c.save();
  c.strokeStyle = 'rgba(40,24,14,.45)';
  c.lineWidth = 1.2;
  for (let k = -36; k < 40; k += 14) {
    c.beginPath();
    c.moveTo(k, -33);
    c.lineTo(k, -17);
    c.stroke();
  }
  c.restore();
  // the canvas cover: bows of striped cloth
  c.beginPath();
  c.moveTo(-42, -34);
  c.bezierCurveTo(-44, -84, 38, -84, 36, -34);
  c.closePath();
  c.fillStyle = '#f0e2c0';
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = '#b8423a';
  for (let k = -40; k < 40; k += 16) c.fillRect(k, -90, 8, 60);
  c.fillStyle = 'rgba(0,0,0,.12)';
  c.fillRect(8, -90, 40, 60);
  c.restore();
  c.stroke();
  // the open back with goods inside
  c.beginPath();
  c.ellipse(-3, -38, 20, 22, 0, Math.PI, 0);
  c.closePath();
  c.fillStyle = '#3a2a30';
  c.fill();
  c.stroke();
  rr(c, -18, -46, 12, 10, 2, '#c8964e');
  circ(c, 2, -42, 5, '#e3b24a');
  rr(c, 8, -50, 7, 13, 2, '#4f6fb3');
  // shaft for the (absent) horse
  rr(c, 40, -24, 26, 4, 2, WOOD_L);
  // near wheels with spokes
  for (const wx of [-30, 26]) {
    circ(c, wx, -10, 11, WOOD_L);
    c.save();
    c.strokeStyle = WOOD_D;
    c.lineWidth = 1.6;
    c.beginPath();
    for (let a = 0; a < TAU; a += TAU / 6) {
      c.moveTo(wx, -10);
      c.lineTo(wx + Math.cos(a + t * 0) * 9, -10 + Math.sin(a) * 9);
    }
    c.stroke();
    c.restore();
    circ(c, wx, -10, 3, WOOD_D);
  }
  // crates and a sack by the wagon, with a little sign
  rr(c, -70, -20, 18, 18, 2, '#c8964e');
  rr(c, -64, -34, 14, 14, 2, '#b8864e');
  ell(c, -48, -8, 8, 9, '#d8c49a');
  c.lineWidth = 2;
  rr(c, 52, -58, 3, 56, 1, WOOD_D);
  rr(c, 44, -64, 26, 14, 2, '#f0e2c0');
  c.fillStyle = '#b8423a';
  c.font = '700 8px Fredoka,sans-serif';
  c.textAlign = 'center';
  c.fillText('RARE', 57, -54);
  c.restore();
  // the merchant, facing the road
  drawHumanoid(c, x + 34, y + 20, {
    look: MERCHANT,
    dx: -0.3,
    dy: 1,
    moving: false,
    walk: 0,
    time: t,
  });
}
/** Where the falling meteor is (0 = sky, 1 = ground) and its screen offset from the crater. */
function fallPos(ev: WorldEvent) {
  const k = 1 - Math.max(0, ev.fall) / 2.4;
  return { k, dx: (1 - k) * 320, dy: -(1 - k) * 520 };
}
/** The meteor streaking down toward its crater. */
function falling(c: Ctx, ev: WorldEvent, t: number) {
  const { k, dx, dy } = fallPos(ev),
    x = ev.x + dx,
    y = ev.y + dy - 20;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const tail = c.createLinearGradient(x, y, x + 140, y - 230);
  tail.addColorStop(0, 'rgba(255,200,110,.9)');
  tail.addColorStop(1, 'rgba(255,120,60,0)');
  c.strokeStyle = tail;
  c.lineCap = 'round';
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + 140, y - 230);
  c.stroke();
  const g = c.createRadialGradient(x, y, 2, x, y, 30);
  g.addColorStop(0, 'rgba(255,250,220,1)');
  g.addColorStop(0.4, 'rgba(255,190,90,.8)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, 30, 0, TAU);
  c.fill();
  c.restore();
  // a warning ring on the ground where it will land
  c.save();
  c.strokeStyle = 'rgba(255,170,80,' + (0.3 + 0.5 * k).toFixed(3) + ')';
  c.lineWidth = 3;
  c.setLineDash([8, 6]);
  c.beginPath();
  c.ellipse(ev.x, ev.y, 46, 24, 0, 0, TAU);
  c.stroke();
  c.restore();
  addLight(x, y, 160, 0.8, '#ffb24a');
  void t;
}
/** The scorched crater with the glowing star-iron in the middle. */
function crater(c: Ctx, ev: WorldEvent, t: number) {
  const { x, y } = ev,
    pulse = 0.6 + Math.sin(t * 3) * 0.25;
  c.save();
  c.lineJoin = 'round';
  c.strokeStyle = OUT;
  // scorched ground and the crater bowl
  c.fillStyle = 'rgba(30,20,20,.35)';
  c.beginPath();
  c.ellipse(x, y, 74, 38, 0, 0, TAU);
  c.fill();
  c.lineWidth = 2.2;
  ell(c, x, y, 50, 24, '#5a4a44');
  c.fillStyle = '#3a2e2c';
  c.beginPath();
  c.ellipse(x, y + 2, 40, 18, 0, 0, TAU);
  c.fill();
  // rim stones
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + 0.3,
      sx = x + Math.cos(a) * 50,
      sy = y + Math.sin(a) * 24;
    c.lineWidth = 1.8;
    ell(c, sx, sy, 7 - (k % 3), 4.5, k % 2 ? '#7a6a64' : '#8a7a70');
  }
  // the star-iron: a dark rock with glowing veins
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(x - 18, y);
  c.quadraticCurveTo(x - 20, y - 20, x - 4, y - 24);
  c.quadraticCurveTo(x + 16, y - 26, x + 19, y - 6);
  c.quadraticCurveTo(x + 18, y + 4, x, y + 4);
  c.quadraticCurveTo(x - 14, y + 5, x - 18, y);
  c.closePath();
  c.fillStyle = '#3a3448';
  c.fill();
  c.stroke();
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(120,220,255,' + pulse.toFixed(3) + ')';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 10, y - 4);
  c.lineTo(x - 3, y - 14);
  c.lineTo(x + 4, y - 10);
  c.lineTo(x + 11, y - 18);
  c.moveTo(x - 3, y - 14);
  c.lineTo(x - 6, y - 20);
  c.moveTo(x + 4, y - 10);
  c.lineTo(x + 8, y - 2);
  c.stroke();
  const g = c.createRadialGradient(x, y - 10, 2, x, y - 10, 60);
  g.addColorStop(0, 'rgba(140,220,255,' + (0.35 * pulse).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(140,220,255,0)');
  c.fillStyle = g;
  c.fillRect(x - 60, y - 70, 120, 120);
  c.restore();
  c.restore();
  addLight(x, y - 10, 140, 0.7, '#8fe0ff');
}
/** Draw the world event's scenery (the raid needs none: its raiders are the event). */
export function drawEvent(c: Ctx, ev: WorldEvent, t: number) {
  if (ev.kind === 'merchant') wagon(c, ev, t);
  else if (ev.kind === 'meteor') {
    if (ev.stage === 'fall') falling(c, ev, t);
    else crater(c, ev, t);
  }
}
