import { WALL_H } from '../art/interior/room';
import { SFX } from '../audio/sfx';
import { H, W } from '../core/dom';
import { clamp } from '../core/math';
import { TAU, rand } from '../core/math';
import { zoom } from '../render/render';
import { BARMAID_LINES, TASK_WAIT } from '../data/tavern';
import { ensureOffers, handInTask, patronJob } from './tavernQuests';
import { BAR_ROW, IT, genInterior, type Interior } from '../world/interior';
import { DOOR_F } from '../world/poi';
import { moveEnt, unstick } from './enemies';
import { banner, burst, doFade } from './fx';
import { openJob, openTavern } from '../ui/tavern';
import { openSmith } from '../ui/village';
import { save } from './save';
import { game, hero } from './state';
/* ================= HOUSES: entering, residents, talking ================= */
// Interiors are generated on first visit and kept for the session, so residents stay where
// they wandered. Inside is safe: no enemies, and health comes back quickly (update.ts).
const cache = new Map<string, Interior>();
const TALK_R = 48; // talk range (the 'Talk' prompt shows inside it)

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
    ensureOffers(I);
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
/** A patron whose job is still open reminds you of it. */
function remind(n) {
  const keep = n.lines;
  n.lines = [TASK_WAIT[Math.floor(Math.random() * TASK_WAIT.length)]];
  n.line = 0;
  talkTo(n);
  n.lines = keep;
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
let offerT = 0;
/** Residents potter about their rooms; they stop to face the hero while talking. */
export function updateHouse(dt: number) {
  const I = game.HS;
  if (!I) return;
  offerT -= dt;
  if (offerT <= 0) {
    offerT = 2; // a tavern's free job slots refill once their wait is over
    ensureOffers(I);
  }
  for (const n of I.npcs) {
    if (n.role === 'smith') {
      smithWork(n, dt);
      continue;
    }
    if (n.role === 'barmaid') {
      barmaidWork(n, dt);
      continue;
    }
    if (n.sayT > 0) {
      // walking out of talk range ends the line: the bubble fades out quickly
      if (Math.hypot(game.P.x - n.x, game.P.y - n.y - 6) > TALK_R) n.sayT = Math.min(n.sayT, 0.25);
      n.sayT -= dt;
      if (n.sayT <= 0) n.say = null;
      n.dx = game.P.x - n.x;
      n.dy = n.seated ? Math.max(20, game.P.y - n.y) : game.P.y - n.y;
      continue;
    }
    if (n.role === 'patron') {
      patronWork(n, dt);
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
/**
 * The smith hammers at the anvil beside him (sparks and a clang every beat) and turns to face
 * the hero when they come to the counter.
 */
function smithWork(n, dt: number) {
  const I = game.HS,
    near = I.counter && Math.hypot(game.P.x - I.counter.x, game.P.y - I.counter.y) < 120;
  if (near) {
    n.dx = game.P.x - n.x;
    n.dy = Math.max(20, game.P.y - n.y);
    n.ham = 0;
    return;
  }
  n.dx = 1;
  n.dy = 0;
  n.ham = (n.ham || 0) + dt;
  if (n.ham > 1.3) {
    n.ham = 0;
    burst(n.x + 26, n.y - 20, '#ffd27a', 7, 120, 2, 60, 1);
    SFX.anvil();
  }
}
/* ---------- the tavern ---------- */
/** Walk `n` toward the next waypoint of `n.path`; true once the path is used up. */
function walkPath(n, dt: number, speed = 38) {
  const q = n.path[0];
  if (!q) return true;
  const dx = q.x - n.x,
    dy = q.y - n.y,
    d = Math.hypot(dx, dy),
    step = speed * dt;
  n.moving = true;
  n.walk += dt * 7;
  n.dx = dx;
  n.dy = dy;
  if (d <= step) {
    n.x = q.x;
    n.y = q.y;
    n.path.shift();
  } else {
    n.x += (dx / d) * step;
    n.y += (dy / d) * step;
  }
  return !n.path.length;
}
/**
 * Patrons sit at their table (sunk behind it) and now and then get up, walk to the bar by the
 * clear rows and the aisle, wait for a refill and go back. One patron at the bar at a time.
 */
function patronWork(n, dt: number) {
  const I = game.HS,
    front = (BAR_ROW + 1.5) * IT;
  if (!n.st || n.st === 'sit') {
    n.seated = true;
    n.moving = false;
    n.x = n.seat.x;
    n.y = n.seat.y;
    const hx = game.P.x - n.x;
    n.dx = Math.abs(hx) < 140 ? hx : 0;
    n.dy = 30;
    n.wt -= dt;
    if (n.wt <= 0) {
      if (I.npcs.some((o) => o.role === 'patron' && o.st && o.st !== 'sit')) {
        n.wt = rand(4, 10);
        return;
      }
      const barX = clamp(I.bar.x + rand(-60, 60), IT * 1.5, (I.GW - 1.5) * IT),
        aisle = (I.door.cx + 0.5) * IT,
        up = (n.seat.row - 0.5) * IT; // the clear row just above the patron's chair row
      n.route =
        n.seat.row <= BAR_ROW + 2
          ? [
              { x: n.seat.x, y: front },
              { x: barX, y: front },
            ]
          : [
              { x: n.seat.x, y: up },
              { x: aisle, y: up },
              { x: aisle, y: front },
              { x: barX, y: front },
            ];
      n.path = n.route.slice();
      n.st = 'go';
      n.seated = false;
    }
    return;
  }
  if (n.st === 'go') {
    if (walkPath(n, dt)) {
      n.st = 'bar';
      n.wt = rand(3, 6);
      n.moving = false;
      n.dx = 0;
      n.dy = -1;
    }
  } else if (n.st === 'bar') {
    n.wt -= dt;
    if (n.wt <= 0) {
      n.path = [...n.route.slice(0, -1).reverse(), { x: n.seat.x, y: n.seat.y }];
      n.st = 'back';
    }
  } else if (walkPath(n, dt)) {
    n.st = 'sit';
    n.wt = rand(15, 40);
  }
}
/** The barmaid works along the bar, and greets the hero and faces them when they come near. */
function barmaidWork(n, dt: number) {
  const I = game.HS,
    dh = Math.hypot(game.P.x - I.bar.x, game.P.y - I.bar.y);
  n.seated = true; // the bar hides her legs
  if (n.sayT > 0) {
    n.sayT -= dt;
    if (n.sayT <= 0) n.say = null;
  }
  if (dh > 220) n.greeted = false;
  if (dh < 110) {
    if (!n.greeted) {
      n.greeted = true;
      n.say = BARMAID_LINES[Math.floor(Math.random() * BARMAID_LINES.length)];
      n.sayT = 4;
    }
    n.moving = false;
    n.dx = game.P.x - n.x;
    n.dy = 30;
    return;
  }
  n.wt -= dt;
  if (n.wt <= 0) {
    n.wt = rand(3, 7);
    n.tx = rand(n.x0, n.x1);
  }
  if (n.tx != null) {
    const dx = n.tx - n.x;
    if (Math.abs(dx) < 2) {
      n.tx = null;
      n.moving = false;
      n.dx = 0;
      n.dy = -1; // back to the kegs and bottles
    } else {
      n.x += Math.sign(dx) * Math.min(Math.abs(dx), 30 * dt);
      n.dx = dx;
      n.dy = 0;
      n.moving = true;
      n.walk += dt * 7;
    }
  }
}
/** Interaction candidates inside a house: residents to talk to, and the way out. */
export function houseInteract(cand) {
  const I = game.HS;
  if (I.counter)
    cand(I.counter.x, I.counter.y, 64, 'Blacksmith', () => openSmith(I.village), I.counter.y - 118);
  if (I.bar) cand(I.bar.x, I.bar.y, 64, 'Barmaid', () => openTavern(I), I.bar.y - 150);
  I.npcs.forEach((n, i) => {
    if (n.role === 'smith' || n.role === 'barmaid') return;
    const job = n.role === 'patron' ? patronJob(I, i) : null;
    if (job && job.mark === '!')
      cand(n.x, n.y + 6, TALK_R, 'Job offer', () => openJob(I, i), n.y - 62);
    else if (job && job.mark === '?')
      cand(n.x, n.y + 6, TALK_R, 'Hand in', () => handInTask(job.q), n.y - 62);
    else if (job) cand(n.x, n.y + 6, TALK_R, 'Talk', () => remind(n), n.y - 62);
    else cand(n.x, n.y + 6, TALK_R, 'Talk', () => talkTo(n), n.y - 62);
  });
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
      h.kind === 'hall'
        ? 'Enter the hall'
        : h.kind === 'smithy'
          ? 'Enter the smithy'
          : h.kind === 'tavern'
            ? 'Enter ' + h.name
            : 'Enter house',
      () => enterHouse(v, h, idx),
      d.y - 44,
    );
  });
}
