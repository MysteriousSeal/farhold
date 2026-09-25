import { WALL_H } from '../art/interior/room';
import { SFX } from '../audio/sfx';
import { H, W } from '../core/dom';
import { clamp } from '../core/math';
import { TAU, rand } from '../core/math';
import { zoom } from '../render/render';
import { IT, genInterior, type Interior } from '../world/interior';
import { DOOR_F } from '../world/poi';
import { moveEnt, unstick } from './enemies';
import { banner, doFade } from './fx';
import { save } from './save';
import { game, hero } from './state';
/* ================= HOUSES: entering, residents, talking ================= */
// Interiors are generated on first visit and kept for the session, so residents stay where
// they wandered. Inside is safe: no enemies, and health comes back quickly (update.ts).
const cache = new Map<string, Interior>();

/** Where a house's front door is outside, in world coordinates. */
export const doorOf = (h) => ({ x: h.x + (h.door || 0) * h.w * DOOR_F, y: h.y });

export function enterHouse(v, h, idx: number) {
  doFade(() => {
    const d = doorOf(h),
      key = v.key + '/' + idx;
    let I = cache.get(key);
    if (!I) cache.set(key, (I = genInterior(v, h, idx)));
    game.P.ret = { x: d.x, y: d.y + 30 };
    game.mode = 'house';
    game.HS = I;
    game.enemies = [];
    game.projs = [];
    game.drops = [];
    game.teles = [];
    game.zones = [];
    game.curBoss = null;
    game.parts = []; // outside smoke and sparks stay outside
    game.P.x = I.door.x;
    game.P.y = I.door.y - 18;
    hero.dx = 0;
    hero.dy = -1;
    hero.aim = -Math.PI / 2;
    [game.camX, game.camY] = houseCam(game.P.x, game.P.y);
    game.zoneName = I.name;
    banner(I.name, I.sub);
    save();
  });
}
export function leaveHouse(instant?: boolean) {
  const go = () => {
    const r = game.P.ret || { x: 0, y: 60 };
    game.mode = 'world';
    game.HS = null;
    game.P.x = r.x;
    game.P.y = r.y;
    unstick(game.P);
    hero.dx = 0;
    hero.dy = 1;
    game.enemies = [];
    game.projs = [];
    game.drops = [];
    game.parts = [];
    game.camX = game.P.x;
    game.camY = game.P.y;
    game.poiT = 0; // refresh the places around right away
    save();
  };
  if (instant) go();
  else doFade(go);
}

/**
 * Camera target inside a house: the room is centred when it fits on screen; otherwise the
 * camera follows the hero but stops at the room's edges.
 */
export function houseCam(x: number, y: number) {
  const I = game.HS,
    z = zoom(),
    vw = W / z / 2,
    vh = H / z / 2,
    x0 = IT - 24,
    x1 = (I.GW - 1) * IT + 24,
    y0 = IT - WALL_H - 30,
    y1 = (I.GH - 1) * IT + 40,
    fit = (a: number, b: number, v: number, h: number) =>
      b - a <= h * 2 ? (a + b) / 2 : clamp(v, a + h, b - h);
  return [fit(x0, x1, x, vw), fit(y0, y1, y, vh)];
}
/** Say the resident's next line in a speech bubble, turning to face the hero. */
export function talkTo(n) {
  n.say = n.lines[n.line % n.lines.length];
  n.line++;
  n.sayT = 4.5;
  n.tx = null;
  n.moving = false;
  n.dx = game.P.x - n.x;
  n.dy = game.P.y - n.y;
  n.wt = 5;
  SFX.pick();
}
/** Residents potter about their rooms; they stop to face the hero while talking. */
export function updateHouse(dt: number) {
  const I = game.HS;
  if (!I) return;
  for (const n of I.npcs) {
    if (n.sayT > 0) {
      n.sayT -= dt;
      if (n.sayT <= 0) n.say = null;
      n.dx = game.P.x - n.x;
      n.dy = game.P.y - n.y;
      continue;
    }
    n.wt -= dt;
    if (n.wt <= 0) {
      n.wt = rand(2, 5);
      if (Math.random() < 0.45) n.tx = null;
      else {
        // a nearby spot within the house
        const a = Math.random() * TAU,
          r = rand(20, 110);
        n.tx = Math.max(IT + 12, Math.min((I.GW - 1) * IT - 12, n.x + Math.cos(a) * r));
        n.ty = Math.max(IT + 10, Math.min((I.GH - 1) * IT - 14, n.y + Math.sin(a) * r * 0.7));
      }
    }
    if (n.tx != null) {
      const dx = n.tx - n.x,
        dy = n.ty - n.y,
        d = Math.hypot(dx, dy);
      if (d < 4) {
        n.tx = null;
        n.moving = false;
      } else {
        const ok = moveEnt(n, (dx / d) * 32 * dt, (dy / d) * 32 * dt, 8);
        n.dx = dx;
        n.dy = dy;
        n.moving = true;
        n.walk += dt * 7;
        if (!ok) n.tx = null;
      }
    } else {
      n.moving = false;
      // idle: glance at the hero when close
      const hx = game.P.x - n.x,
        hy = game.P.y - n.y;
      if (Math.hypot(hx, hy) < 120) {
        n.dx = hx;
        n.dy = hy;
      }
    }
  }
}
/** Interaction candidates inside a house: residents to talk to, and the way out. */
export function houseInteract(cand) {
  const I = game.HS;
  for (const n of I.npcs) cand(n.x, n.y + 6, 48, 'Talk', () => talkTo(n), n.y - 62);
  cand(I.door.x, I.door.y - 6, 50, 'Go outside', () => leaveHouse(), I.door.y - 60);
}
/** Door prompts for the houses of a village (outside). */
export function houseDoors(v, cand) {
  v.houses.forEach((h, idx) => {
    const d = doorOf(h);
    cand(
      d.x,
      d.y + 12,
      40,
      h.kind === 'hall' ? 'Enter the hall' : 'Enter house',
      () => enterHouse(v, h, idx),
      d.y - 44,
    );
  });
}
