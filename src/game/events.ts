import { SFX } from '../audio/sfx';
import { TAU, pick, rand } from '../core/math';
import { TABLE, typesFor } from '../data/enemies';
import { BAGMAX } from './drops';
import { gainXp } from './combat';
import { dropAt, makeEnemy } from './enemies';
import { banner, burst, ring, toast } from './fx';
import { genItem } from './items';
import { game } from './state';
import { openShop } from '../ui/village';
import { poisNear } from '../world/poi';
import { dangerAt, terr, walkT } from '../world/terrain';
/* ================= WORLD EVENTS ================= */
// Every few minutes of play in the open world, something happens nearby (one at a time):
//  · raid      a village is attacked by waves of bandits; defend it
//  · merchant  a travelling merchant's wagon stops on the road with rare wares
//  · meteor    a meteor falls; beat the monsters drawn to the crater and mine it
// The event shows on the minimap and the HUD with a countdown, and simply ends if ignored.
// Events live for the session (game.ev); rewards scale with the danger level of the spot.

export type WorldEvent = {
  id: number;
  kind: 'raid' | 'merchant' | 'meteor';
  x: number;
  y: number;
  /** seconds left (to arrive, to trade, before the crater cools) */
  t: number;
  lvl: number;
  title: string;
  where: string;
  stage: string;
  wave?: number;
  waveT?: number;
  village?: any;
  shop?: any;
  fall?: number;
};
export const EV_EVERY: [number, number] = [240, 360];
const RAID_WAVES = 3;
let nextId = 1;

/** The event under way, if any. */
export const curEvent = (): WorldEvent | null => game.ev || null;
/** Is a raid being fought in the village at (x, y)? (no safe healing there meanwhile) */
export const raidAt = (x: number, y: number) => {
  const ev = game.ev;
  return !!ev && ev.kind === 'raid' && ev.stage === 'fight' && Math.hypot(x - ev.x, y - ev.y) < 420;
};

/** A walkable spot 600–1100 from the hero, away from villages, caves and lairs. */
function openSpot() {
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * TAU,
      d = rand(600, 1100),
      x = game.P.x + Math.cos(a) * d,
      y = game.P.y + Math.sin(a) * d,
      T = terr(x, y);
    if (!walkT(T) || T.t === 1 || T.t >= 4 || Math.hypot(x, y) < 800) continue;
    if (poisNear(x, y, 260).length) continue;
    return { x, y };
  }
  return null;
}
/** Start a world event nearby: `only` forces one kind (cheats), otherwise any that fits. */
export function startEvent(only?: string) {
  if (game.ev) end(game.ev, false);
  const kinds = only ? [only] : ['raid', 'merchant', 'meteor'].sort(() => Math.random() - 0.5);
  for (const kind of kinds) {
    let ev: WorldEvent = null;
    if (kind === 'raid') {
      const v = poisNear(game.P.x, game.P.y, 1500)
        .filter(
          (p) =>
            p.kind === 'village' && !p.city && Math.hypot(p.x - game.P.x, p.y - game.P.y) > 350,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - game.P.x, a.y - game.P.y) - Math.hypot(b.x - game.P.x, b.y - game.P.y),
        )[0];
      if (!v) continue;
      ev = {
        id: nextId++,
        kind,
        x: v.x,
        y: v.y,
        t: 180,
        lvl: Math.max(1, v.lvl),
        title: 'Raid on ' + v.name,
        where: v.name,
        stage: 'wait',
        wave: 0,
        village: v,
      };
      banner('Raid on ' + v.name + '!', 'Raiders are attacking the village. Hurry to defend it!');
      SFX.roar();
    } else {
      const s = openSpot();
      if (!s) continue;
      const lvl = Math.max(1, dangerAt(s.x, s.y));
      if (kind === 'merchant') {
        ev = {
          id: nextId++,
          kind,
          x: s.x,
          y: s.y,
          t: 300,
          lvl,
          title: 'Travelling merchant',
          where: 'on the road nearby',
          stage: 'open',
          shop: {
            key: 'ev-merchant-' + Date.now(),
            lvl: lvl + 1,
            name: 'Travelling merchant',
            title: 'Travelling merchant',
          },
        };
        banner('A travelling merchant', 'Rare wares for sale nearby, for a few minutes only.');
        SFX.quest();
      } else {
        ev = {
          id: nextId++,
          kind: 'meteor',
          x: s.x,
          y: s.y,
          t: 240,
          lvl,
          title: 'Fallen meteor',
          where: 'a crater nearby',
          stage: 'fall',
          fall: 2.4,
        };
        banner('A meteor falls!', 'Reach the crater and mine the star-iron before it cools.');
        SFX.warp();
      }
    }
    game.ev = ev;
    return;
  }
}

/** Advance the world event (called every frame while playing in the open world). */
export function updateEvents(dt: number) {
  if (game.mode !== 'world') return;
  const ev: WorldEvent = game.ev;
  if (!ev) {
    game.evNext = (game.evNext ?? rand(EV_EVERY[0], EV_EVERY[1]) * 0.5) - dt;
    if (game.evNext <= 0 && !game.curBoss) {
      game.evNext = rand(EV_EVERY[0], EV_EVERY[1]);
      startEvent();
    }
    return;
  }
  ev.t -= dt;
  if (ev.kind === 'raid') raidTick(ev, dt);
  else if (ev.kind === 'meteor' && ev.stage === 'fall') {
    ev.fall -= dt;
    if (ev.fall <= 0) land(ev);
  }
  if (ev.t <= 0) end(ev, false);
}
function end(ev: WorldEvent, won: boolean) {
  if (!won) {
    toast(
      ev.kind === 'raid'
        ? 'The raiders have moved on'
        : ev.kind === 'merchant'
          ? 'The merchant has left'
          : 'The meteor has cooled',
    );
    for (const e of game.enemies) if (e.evId === ev.id && !e.aggro) e.dead = true;
  }
  game.ev = null;
}
/** Gold, xp and an item (Rare or better) for a won event. */
function reward(ev: WorldEvent, mult: number, slot?: string) {
  const gold = Math.round((70 + ev.lvl * 28) * mult),
    xp = Math.round((160 + ev.lvl * 65) * mult),
    it = genItem(ev.lvl + 1, 0.3, slot, 2);
  game.P.gold += gold;
  gainXp(xp);
  if (game.P.inv.length < BAGMAX) {
    game.P.inv.push(it);
    toast('Reward: ' + it.name);
  } else dropAt(game.P.x, game.P.y, { kind: 'item', item: it });
  return '+' + gold + ' gold, +' + xp + ' xp';
}

/* ---------- raid: waves of bandits from the edge of the village ---------- */
function raidTick(ev: WorldEvent, dt: number) {
  const v = ev.village,
    d = Math.hypot(game.P.x - v.x, game.P.y - v.y);
  if (ev.stage === 'wait') {
    if (d < v.r + 80) {
      ev.stage = 'fight';
      ev.t = 240; // time to beat all the waves
      ev.waveT = 1.2;
      banner('Defend ' + v.name + '!', RAID_WAVES + ' waves of raiders');
    }
    return;
  }
  const left = game.enemies.filter((e) => e.evId === ev.id && !e.dead && !(e.dying > 0)).length;
  if (left) return;
  if (ev.wave >= RAID_WAVES) {
    SFX.quest();
    banner('Raid repelled!', v.name + ' is grateful: ' + reward(ev, 1.6));
    end(ev, true);
    return;
  }
  ev.waveT -= dt;
  if (ev.waveT > 0 || d > 700) return;
  ev.wave++;
  ev.waveT = 2.5;
  const lvl = ev.lvl + (ev.wave === RAID_WAVES ? 1 : 0),
    bandits = ['bandit', 'archer'].filter((t) => typesFor(TABLE[v.b], lvl + 2).includes(t)),
    local = typesFor(TABLE[v.b], lvl + 1).filter((t) => t !== 'bat'),
    types = bandits.length ? bandits : local,
    n = 3 + ev.wave + (ev.lvl > 4 ? 1 : 0),
    a0 = Math.random() * TAU;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * 1.6 - 0.8,
      x = v.x + Math.cos(a) * (v.r + 20),
      y = v.y + Math.sin(a) * (v.r + 20) * 0.8;
    const e = makeEnemy(pick(types), lvl, x, y, {
      elite: ev.wave === RAID_WAVES && k === 0 ? 'Giant' : null,
    });
    e.evId = ev.id;
    e.raid = true;
    e.aggro = true;
    game.enemies.push(e);
    burst(x, y, '#c8a878', 8, 90, 3);
  }
  toast('Wave ' + ev.wave + ' of ' + RAID_WAVES);
}

/* ---------- meteor: the fall, the crater guards, mining ---------- */
function land(ev: WorldEvent) {
  ev.stage = 'crater';
  game.shake = Math.max(game.shake, 14);
  SFX.slam();
  burst(ev.x, ev.y, '#ffb24a', 50, 300, 5, 80, 1);
  ring(ev.x, ev.y, '#ffd27a', 30, 180, 5);
  const types = typesFor(TABLE[terr(ev.x, ev.y).b], ev.lvl + 1).filter((t) => t !== 'bat'),
    n = 3 + (ev.lvl > 3 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rand(-0.3, 0.3),
      e = makeEnemy(pick(types), ev.lvl + 1, ev.x + Math.cos(a) * 70, ev.y + Math.sin(a) * 50);
    e.evId = ev.id;
    game.enemies.push(e);
  }
}
const guarded = (ev: WorldEvent) =>
  game.enemies.some((e) => e.evId === ev.id && !e.dead && !(e.dying > 0));
function mine(ev: WorldEvent) {
  SFX.anvil();
  burst(ev.x, ev.y - 6, '#9fd8ff', 30, 200, 4, 80, 1);
  banner('Star-iron!', reward(ev, 1.2, pick(['ring', 'amulet'])));
  end(ev, true);
}

/** Interaction prompts of the world event (called from findInteract). */
export function eventInteract(cand) {
  const ev: WorldEvent = game.ev;
  if (!ev || game.mode !== 'world') return;
  if (ev.kind === 'merchant')
    cand(ev.x, ev.y + 18, 70, 'Trade', () => openShop(ev.shop, true), ev.y - 80);
  else if (ev.kind === 'meteor' && ev.stage === 'crater' && !guarded(ev))
    cand(ev.x, ev.y + 10, 70, 'Mine the meteorite', () => mine(ev), ev.y - 50);
}
/** "Raid on Elderdale · 2:41" for the HUD. */
export function eventLine(ev: WorldEvent) {
  const t = Math.max(0, Math.ceil(ev.t)),
    clock = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  if (ev.kind === 'raid' && ev.stage === 'fight')
    return 'Wave ' + Math.max(1, ev.wave) + '/' + RAID_WAVES + ' · ' + clock;
  if (ev.kind === 'meteor' && ev.stage === 'crater' && guarded(ev)) return 'Guarded · ' + clock;
  return clock;
}
