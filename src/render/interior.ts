import { drawFurn } from '../art/interior/furniture';
import { drawRoomBack, drawRoomFront, drawRoomLights, partitionPieces } from '../art/interior/room';
import { OUT } from '../core/math';
import { drawNpc } from '../game/npcs';
import { game } from '../game/state';
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
  for (const n of I.npcs) if (n.say) speech(c, n.x, n.y - 92, n.say, Math.min(1, n.sayT * 4));
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
