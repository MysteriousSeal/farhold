import { SFX } from '../audio/sfx';
import { TAU } from '../core/math';
import { ET, TABLE, typesFor } from '../data/enemies';
import { COLLECT_ITEMS, LOST_ITEMS, TASK_SAYS } from '../data/tavern';
import { gainXp } from './combat';
import { banner, toast } from './fx';
import { LOG_MAX, acceptQuest } from './quests';
import { save } from './save';
import { game } from './state';
import type { Interior } from '../world/interior';
import { poisNear } from '../world/poi';
import { terr, walkT } from '../world/terrain';
/* ================= TAVERN JOBS: small quests from patrons ================= */
// Up to TQ_GIVERS patrons per tavern offer a job (a gold ! over their head). Jobs are quests of
// type 'task' in the journal: collect items dropped by a monster type, hunt a few monsters,
// deliver a parcel to another village's tavern, or find a lost keepsake out in the wilds.
// Once done (q.ready) you go back to the patron (a gold ?) to hand it in. A declined or
// finished job frees its slot, and a new offer appears TQ_REFRESH_MS later.
// State per tavern in the save: P.tq[interiorKey] = { offers: { npcIndex: quest }, next: ms }.

export const TQ_GIVERS = 2,
  TQ_REFRESH_MS = 10 * 60 * 1000;
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const fill = (s: string, o: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? ''));
const plural = (s: string) =>
  s.endsWith('wolf') ? s.slice(0, -1) + 'ves' : s.endsWith('y') ? s.slice(0, -1) + 'ies' : s + 's';

const stateOf = (key: string) => {
  const P = game.P;
  P.tq = P.tq || {};
  return (P.tq[key] = P.tq[key] || { offers: {}, next: 0 });
};
/** The jobs taken from tavern `key` that are still open. */
const takenFrom = (key: string) =>
  game.P.quests.filter((q) => q.type === 'task' && q.giver && q.giver.key === key);

/** Fill the tavern's free job slots once their wait is over. */
export function ensureOffers(I: Interior) {
  if (I.kind !== 'tavern') return;
  const st = stateOf(I.key);
  if (Date.now() < st.next) return;
  const taken = takenFrom(I.key),
    busy = new Set([...Object.keys(st.offers).map(Number), ...taken.map((q) => q.giver.idx)]);
  let n = busy.size;
  const free = I.npcs
    .map((o, i) => (o.role === 'patron' && !busy.has(i) ? i : -1))
    .filter((i) => i >= 0);
  while (n < TQ_GIVERS && free.length) {
    const idx = free.splice(Math.floor(Math.random() * free.length), 1)[0],
      q = makeTask(I, idx);
    if (!q) break;
    st.offers[idx] = q;
    n++;
  }
  save();
}
function makeTask(I: Interior, idx: number) {
  const v = I.village,
    L = Math.max(1, v.lvl || 1),
    n = I.npcs[idx],
    giver = {
      key: I.key,
      idx,
      name: n.name || 'a patron',
      tavern: I.name,
      village: v.name,
      vx: v.tavern ? v.tavern.x : v.x,
      vy: v.tavern ? v.tavern.y : v.y,
    },
    base = {
      id: game.uidN++,
      type: 'task',
      giver,
      have: 0,
      lvl: L,
      gold: Math.round(14 + L * 7),
      xp: Math.round(35 + L * 22),
      pot: Math.random() < 0.35 ? 1 : 0,
    };
  const foes: string[] = typesFor(TABLE[v.b], L + 1).filter((t) => COLLECT_ITEMS[t]),
    kinds = ['collect', 'hunt', 'find', 'deliver'];
  for (let tries = 0; tries < 6; tries++) {
    const task = pick(kinds);
    if ((task === 'collect' || task === 'hunt') && foes.length) {
      const t = pick(foes),
        foe = plural(ET[t].n.toLowerCase()),
        need = 3 + Math.floor(Math.random() * 3);
      if (task === 'collect') {
        const [one, many] = COLLECT_ITEMS[t];
        return {
          ...base,
          task,
          target: t,
          need,
          item: one,
          items: many,
          name: 'Gather ' + many,
          desc:
            'Bring ' +
            giver.name +
            ' ' +
            need +
            ' ' +
            many +
            '. ' +
            ET[t].n +
            's drop them now and then; they show in gold on your minimap.',
          say: fill(pick(TASK_SAYS.collect), { n: need, item: many, foe }),
          gold: Math.round(base.gold * 1.2),
        };
      }
      return {
        ...base,
        task,
        target: t,
        need,
        name: 'Thin out the ' + foe,
        desc:
          'Slay ' +
          need +
          ' ' +
          foe +
          ' for ' +
          giver.name +
          '. They show in gold on your minimap.',
        say: fill(pick(TASK_SAYS.hunt), { n: need, foe }),
      };
    }
    if (task === 'deliver') {
      const to = poisNear(v.x, v.y, 4200)
        .filter((p) => p.kind === 'village' && p.key !== v.key && p.tavern)
        .sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
      if (!to) continue;
      const far = Math.hypot(to.x - v.x, to.y - v.y);
      return {
        ...base,
        task,
        need: 1,
        to: to.key + '/' + to.houses.indexOf(to.tavern),
        x: to.tavern.x,
        y: to.tavern.y,
        name: 'Deliver a parcel to ' + to.name,
        desc:
          'Take ' +
          giver.name +
          "'s parcel to the barmaid at " +
          to.tavern.name +
          ' in ' +
          to.name +
          '.',
        say: fill(pick(TASK_SAYS.deliver), { place: to.tavern.name + ' in ' + to.name }),
        gold: Math.round(base.gold * (1 + far / 3000)),
      };
    }
    if (task === 'find') {
      const spot = lostSpot(v);
      if (!spot) continue;
      const item = pick(LOST_ITEMS);
      return {
        ...base,
        task,
        need: 1,
        item,
        x: spot.x,
        y: spot.y,
        name: 'Find the lost ' + item,
        desc: giver.name + ' lost a ' + item + ' out in the wilds. It glints on the ground.',
        say: fill(pick(TASK_SAYS.find), { item }),
      };
    }
  }
  return null;
}
/** A walkable spot out in the wilds, 500–1100 from the village. */
function lostSpot(v) {
  for (let k = 0; k < 30; k++) {
    const a = Math.random() * TAU,
      d = 500 + Math.random() * 600,
      x = v.x + Math.cos(a) * d,
      y = v.y + Math.sin(a) * d,
      T = terr(x, y);
    if (walkT(T) && T.t !== 1 && T.t < 4) return { x, y };
  }
  return null;
}

/* ---------- taking, progress and handing in ---------- */
export function acceptTask(I: Interior, idx: number) {
  const st = stateOf(I.key),
    q = st.offers[idx];
  if (!q || !acceptQuest(q)) return false;
  delete st.offers[idx];
  SFX.pick();
  toast('Job taken: ' + q.name);
  save();
  return true;
}
export function declineTask(I: Interior, idx: number) {
  const st = stateOf(I.key);
  delete st.offers[idx];
  st.next = Date.now() + TQ_REFRESH_MS;
  save();
}
/** The job is done: head back to the patron (the tracker and minimap now point to the tavern). */
export function taskReady(q) {
  q.ready = true;
  q.have = q.need;
  q.x = q.giver.vx;
  q.y = q.giver.vy;
  SFX.quest();
  toast('Return to ' + q.giver.name + ' at ' + q.giver.tavern);
  save();
}
/** A monster of `type` died: hunt jobs count it, collect jobs sometimes get its item. */
export function taskKill(type: string) {
  for (const q of game.P.quests) {
    if (q.type !== 'task' || q.ready || q.target !== type) continue;
    if (q.task === 'hunt') q.have++;
    else if (q.task === 'collect' && Math.random() < 0.5) {
      q.have++;
      toast('+1 ' + q.item + ' (' + Math.min(q.have, q.need) + '/' + q.need + ')');
    } else continue;
    if (q.have >= q.need) taskReady(q);
  }
}
/** Opening the barmaid's menu at tavern `key` delivers parcels addressed there. */
export function taskDeliver(key: string) {
  for (const q of game.P.quests)
    if (q.type === 'task' && q.task === 'deliver' && !q.ready && q.to === key) {
      toast('You hand over the parcel from ' + q.giver.name);
      taskReady(q);
    }
}
/** Walking over a lost keepsake picks it up. */
export function taskFindTick() {
  if (game.mode !== 'world') return;
  for (const q of game.P.quests)
    if (
      q.type === 'task' &&
      q.task === 'find' &&
      !q.ready &&
      Math.hypot(q.x - game.P.x, q.y - game.P.y) < 36
    ) {
      toast('You found the ' + q.item + '!');
      taskReady(q);
    }
}
/** Hand a finished job in to its patron: gold, xp and maybe a potion. */
export function handInTask(q) {
  const P = game.P;
  P.gold += q.gold;
  gainXp(q.xp);
  if (q.pot) P.pot += q.pot;
  SFX.quest();
  banner('Job done', '+' + q.gold + ' gold, +' + q.xp + ' xp' + (q.pot ? ', +1 potion' : ''));
  P.questLog.unshift({
    name: q.name,
    type: 'task',
    gold: q.gold,
    xp: q.xp,
    item: 0,
    at: Date.now(),
  });
  P.questLog.length = Math.min(P.questLog.length, LOG_MAX);
  P.quests = P.quests.filter((o) => o !== q);
  stateOf(q.giver.key).next = Date.now() + TQ_REFRESH_MS;
  save();
}
/**
 * What patron `idx` of tavern `I` has for the hero: an offer ('!'), a job to hand in ('?'),
 * an open job ('…'), or nothing.
 */
export function patronJob(I: Interior, idx: number) {
  const st = game.P.tq && game.P.tq[I.key];
  if (st && st.offers[idx]) return { mark: '!', q: st.offers[idx] };
  const q = takenFrom(I.key).find((o) => o.giver.idx === idx);
  if (q) return { mark: q.ready ? '?' : '…', q };
  return null;
}
