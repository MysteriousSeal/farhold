import { SFX } from '../audio/sfx';
import { pick } from '../core/math';
import { BOSS } from '../data/bosses';
import { ET, TABLE, typesFor } from '../data/enemies';
import { gainXp } from './combat';
import { BAGMAX } from './drops';
import { dropAt } from './enemies';
import { banner, toast } from './fx';
import { genItem } from './items';
import { save } from './save';
import { game } from './state';
import { PC, poiAt } from '../world/poi';
/* ================= QUESTS ================= */
export const offers = new Map();
function nearestUncleared(kind, x, y) {
  let best = null,
    bd = 1e9;
  const ci = Math.floor(x / PC),
    cj = Math.floor(y / PC);
  for (let i = ci - 3; i <= ci + 3; i++)
    for (let j = cj - 3; j <= cj + 3; j++) {
      const p = poiAt(i, j);
      if (
        !p ||
        p.kind !== kind ||
        game.P.cleared[p.key] ||
        game.P.quests.some((q) => q.key === p.key)
      )
        continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  return best;
}
const plural = (s) =>
  s.endsWith('wolf') ? s.slice(0, -1) + 'ves' : s.endsWith('y') ? s.slice(0, -1) + 'ies' : s + 's';
export function genOffers(v) {
  const out = [],
    L = v.lvl;
  const types = typesFor(TABLE[v.b], L + 1).filter((t) => t !== 'bat');
  for (let i = 0; i < 2; i++) {
    const t = pick(types),
      need = 5 + ((Math.random() * 6) | 0);
    if (out.some((o) => o.target === t)) continue;
    out.push({
      id: game.uidN++,
      type: 'kill',
      target: t,
      need,
      have: 0,
      name: 'Cull the ' + plural(ET[t].n.toLowerCase()),
      desc: 'Slay ' + need + ' ' + plural(ET[t].n.toLowerCase()) + ' anywhere in the realm.',
      gold: Math.round(need * (6 + L * 4)),
      xp: Math.round(need * (10 + L * 7)),
      lvl: L,
    });
  }
  const lair = nearestUncleared('lair', v.x, v.y);
  if (lair)
    out.push({
      id: game.uidN++,
      type: 'boss',
      key: lair.key,
      x: lair.x,
      y: lair.y,
      need: 1,
      have: 0,
      name: 'Slay ' + lair.bname,
      desc:
        'Defeat ' +
        lair.bname +
        ', the ' +
        BOSS[lair.boss].n +
        ', in ' +
        lair.name +
        '. Danger level ' +
        lair.lvl +
        '.',
      gold: Math.round(80 + lair.lvl * 30),
      xp: Math.round(200 + lair.lvl * 90),
      lvl: lair.lvl,
      item: 2,
    });
  const cave = nearestUncleared('cave', v.x, v.y);
  if (cave)
    out.push({
      id: game.uidN++,
      type: 'cave',
      key: cave.key,
      x: cave.x,
      y: cave.y,
      need: 1,
      have: 0,
      name: 'Plunder ' + cave.name,
      desc: 'Reach the treasure at the bottom of ' + cave.name + '. Danger level ' + cave.lvl + '.',
      gold: Math.round(60 + cave.lvl * 24),
      xp: Math.round(150 + cave.lvl * 70),
      lvl: cave.lvl,
      item: 1,
    });
  return out;
}
export function questEvent(kind, val) {
  for (const q of game.P.quests) {
    if (q.done) continue;
    if (
      (kind === 'kill' && q.type === 'kill' && q.target === val) ||
      (kind === 'boss' && q.type === 'boss' && q.key === val) ||
      (kind === 'cave' && q.type === 'cave' && q.key === val)
    ) {
      q.have++;
      if (q.have >= q.need) completeQuest(q);
    }
  }
}
function completeQuest(q) {
  q.done = true;
  game.P.gold += q.gold;
  gainXp(q.xp);
  SFX.quest();
  banner('Bounty complete', '+' + q.gold + ' gold, +' + q.xp + ' xp');
  if (q.item) {
    const it = genItem(q.lvl, 0.3, null, q.item);
    if (game.P.inv.length < BAGMAX) {
      game.P.inv.push(it);
      toast('Reward: ' + it.name);
    } else dropAt(game.P.x, game.P.y, { kind: 'item', item: it });
  }
  setTimeout(() => {
    game.P.quests = game.P.quests.filter((o) => o !== q);
  }, 4000);
  save();
}
