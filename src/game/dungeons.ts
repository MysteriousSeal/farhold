import { SFX } from '../audio/sfx';
import { pick } from '../core/math';
import { settings } from '../core/settings';
import { DTABLE, typesFor } from '../data/enemies';
import { ELITES, dropAt, makeBoss, makeEnemy, unstick } from './enemies';
import { banner, doFade, ring, toast } from './fx';
import { genItem } from './items';
import { questEvent } from './quests';
import { save } from './save';
import { game } from './state';
import { getChunk, solidAt } from '../world/chunks';
import { genDungeon } from '../world/dungeon';
import { CH } from '../world/terrain';
/* ================= DUNGEONS ================= */
export function enterDungeon(p) {
  doFade(() => {
    game.P.ret = { x: p.x, y: p.y + 44 };
    game.mode = 'dungeon';
    game.DG = genDungeon(p.key, p.lvl, p.b);
    game.DG.name = p.name;
    game.DG.poiKey = p.key;
    game.DG.cleared = !!game.P.cleared[p.key];
    if (game.DG.cleared) game.DG.chest.open = true;
    game.enemies = [];
    game.projs = [];
    game.drops = [];
    game.teles = [];
    game.zones = [];
    game.curBoss = null;
    game.P.x = game.DG.exit.x;
    game.P.y = game.DG.exit.y + 54;
    unstick(game.P);
    game.camX = game.P.x;
    game.camY = game.P.y;
    const rnd = Math.random;
    for (const r of game.DG.rooms) {
      if (r === game.DG.start) continue;
      const dn = settings.density === 'few' ? 0 : settings.density === 'many' ? 2 : 1,
        n = Math.max(1, dn + ((rnd() * 2) | 0) + (r.w * r.h > 90 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const x = (r.x + 1 + rnd() * (r.w - 2)) * game.DG.T,
          y = (r.y + 1 + rnd() * (r.h - 2)) * game.DG.T;
        const lv = p.lvl + (rnd() < 0.2 ? 1 : 0);
        const e = makeEnemy(pick(typesFor(DTABLE, lv)), lv, x, y, {
          elite: rnd() < 0.08 ? pick(ELITES) : null,
        });
        if (!solidAt(x, y, e.r * 0.6)) game.enemies.push(e);
      }
    }
    if (!game.DG.cleared) {
      const bt = pick(['bonelord', 'lich', 'brood']);
      const b = makeBoss(bt, p.lvl + 1, game.DG.chest.x, game.DG.chest.y + 80, {
        mini: true,
        key: p.key,
      });
      b.aggro = false;
      b.dormant = true;
      game.enemies.push(b);
      game.DG.guard = b;
    } else game.DG.guardDead = true;
    game.genBudget = 99;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        getChunk(Math.floor(game.P.x / CH) + i, Math.floor(game.P.y / CH) + j, true);
    banner(p.name, 'Danger level ' + p.lvl);
    game.zoneName = p.name;
    save();
  });
}
export function leaveDungeon(instant?) {
  const go = () => {
    game.mode = 'world';
    const r = game.P.ret || { x: 0, y: 60 };
    game.DG = null;
    game.P.x = r.x;
    game.P.y = r.y;
    unstick(game.P);
    game.enemies = [];
    game.projs = [];
    game.drops = [];
    game.teles = [];
    game.zones = [];
    game.curBoss = null;
    game.camX = game.P.x;
    game.camY = game.P.y;
    game.zoneName = '';
    save();
  };
  if (instant) go();
  else doFade(go);
}
export function openChest() {
  const c = game.DG.chest;
  if (c.open) return;
  if (!game.DG.guardDead) {
    toast('Defeat the guardian first');
    return;
  }
  c.open = true;
  SFX.chest();
  ring(c.x, c.y - 14, '#ffd27a', 30, 200, 3);
  const L = game.DG.lvl;
  for (let i = 0; i < 3; i++)
    dropAt(c.x, c.y, { kind: 'item', item: genItem(L, 0.2, null, i === 0 ? 2 : 1) });
  for (let i = 0; i < 10; i++) dropAt(c.x, c.y, { kind: 'gold', amt: Math.round(4 + L * 3) });
  dropAt(c.x, c.y, { kind: 'pot' });
  game.P.cleared[game.DG.poiKey] = 1;
  questEvent('cave', game.DG.poiKey);
  banner('Treasure claimed', game.DG.name + ' cleared');
  save();
}
