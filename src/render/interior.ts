import { drawFurn } from '../art/interior/furniture';
import { drawRoomBack, drawRoomFront, drawRoomLights, partitionPieces } from '../art/interior/room';
import { OUT } from '../core/math';
import { drawNpc } from '../game/npcs';
import { game } from '../game/state';
import { patronJob } from '../game/tavernQuests';
import { headY } from '../art/body';
/* ================= RENDER: house interiors ================= */
// render.ts calls these while game.mode === 'house': the room shell behind everything, the
// furniture, partitions and residents into its depth-sorted list, then the front wall,
// firelight and speech bubbles on top.
type Ctx = CanvasRenderingContext2D;
type Item = { y: number; f: (c: Ctx, t: number) => void };

export const houseBack = (c: Ctx) => drawRoomBack(c, game.HS);
export function houseItems(list: Item[]) {
  const I = game.HS;
  for (const f of I.furn) list.push({ y: f.y, f: (c, t) => drawFurn(c, f, t) });
  for (const p of partitionPieces(I)) list.push({ y: p.y, f: (c) => p.f(c) });
  for (const n of I.npcs) list.push({ y: n.y, f: (c, t) => drawNpc(c, n, t) });
}
export function houseFront(c: Ctx, t: number) {
  const I = game.HS;
  drawRoomFront(c, I);
  drawRoomLights(c, I, t);
  // job markers over patrons: ! an offer, ? ready to hand in, … still open
  I.npcs.forEach((n, i) => {
    if (n.role !== 'patron' || n.say) return;
    const job = patronJob(I, i);
    if (job) jobMark(c, n.x, n.y + (n.seated ? n.sink || 0 : 0) + headY(n.look) - 12, job.mark, t);
  });
  for (const n of I.npcs) if (n.say) speech(c, n.x, n.y - 92, n.say, Math.min(1, n.sayT * 4));
}

/** A bobbing quest mark over a patron's head. */
function jobMark(c: Ctx, x: number, y: number, mark: string, t: number) {
  const by = y + Math.sin(t * 3 + x * 0.05) * 3,
    open = mark === '…';
  c.save();
  c.font = (open ? '700 18px' : '700 26px') + ' Fredoka,sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'bottom';
  c.lineJoin = 'round';
  c.lineWidth = 5;
  c.strokeStyle = OUT;
  c.strokeText(mark, x, by);
  c.fillStyle = open ? '#c8cde0' : '#ffd23a';
  c.fillText(mark, x, by);
  c.restore();
}
/** A lost keepsake on the ground: a small gold glint with twinkling rays. */
export function drawGlint(c: Ctx, x: number, y: number, t: number) {
  const k = 0.75 + Math.sin(t * 4 + x) * 0.25;
  c.save();
  c.fillStyle = 'rgba(0,0,0,.2)';
  c.beginPath();
  c.ellipse(x, y + 1, 7, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = 1.6;
  c.fillStyle = '#f5c451';
  c.beginPath();
  c.arc(x, y - 3, 3.6, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(255,240,170,' + (0.8 * k).toFixed(3) + ')';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  for (let a = 0; a < 4; a++) {
    const ang = (a * Math.PI) / 2 + t * 0.6,
      r = 9 + 5 * k;
    c.moveTo(x + Math.cos(ang) * 5, y - 3 + Math.sin(ang) * 5);
    c.lineTo(x + Math.cos(ang) * r, y - 3 + Math.sin(ang) * r);
  }
  c.stroke();
  c.restore();
}
/** Rounded speech bubble with a tail, wrapped to a few lines, above (x, y). */
function speech(c: Ctx, x: number, y: number, text: string, a: number) {
  c.save();
  c.globalAlpha = a;
  c.font = '600 11px Fredoka,sans-serif';
  const words = text.split(' '),
    lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const tryL = cur ? cur + ' ' + w : w;
    if (c.measureText(tryL).width > 150 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = tryL;
  }
  if (cur) lines.push(cur);
  const lh = 13,
    w = Math.max(...lines.map((l) => c.measureText(l).width)) + 16,
    h = lines.length * lh + 10,
    bx = x - w / 2,
    by = y - h;
  // one outline around the bubble and its tail
  const r = 8,
    bx1 = bx + w,
    by1 = by + h;
  c.beginPath();
  c.moveTo(bx + r, by);
  c.arcTo(bx1, by, bx1, by1, r);
  c.arcTo(bx1, by1, bx, by1, r);
  c.lineTo(x + 6, by1);
  c.lineTo(x, by1 + 8);
  c.lineTo(x - 6, by1);
  c.arcTo(bx, by1, bx, by, r);
  c.arcTo(bx, by, bx1, by, r);
  c.closePath();
  c.fillStyle = '#fff8e6';
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  c.fill();
  c.stroke();
  c.fillStyle = '#241a2e';
  c.textAlign = 'center';
  c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, x, by + 6 + i * lh));
  c.restore();
}
