import { SFX } from '../audio/sfx';
import { openBossChest } from './bossChest';
import { enterDungeon, leaveDungeon, openChest } from './dungeons';
import { makeBoss } from './enemies';
import { banner, burst } from './fx';
import { save } from './save';
import { game } from './state';
import { openBoard, openPotions, openShop, openSmith, openTravel } from '../ui/village';
/* ================= INTERACTIONS ================= */
export function findInteract() {
  let best = null,
    bd = 1e9;
  const cand = (x, y, r, label, act) => {
    const d = Math.hypot(game.P.x - x, game.P.y - y);
    if (d < r && d < bd) {
      bd = d;
      best = { label, act };
    }
  };
  if (game.mode === 'dungeon') {
    cand(game.DG.exit.x, game.DG.exit.y + 10, 64, 'Leave cave', () => leaveDungeon());
    if (!game.DG.chest.open)
      cand(game.DG.chest.x, game.DG.chest.y + 14, 64, 'Open chest', openChest);
    return best;
  }
  for (const p of game.activePois) {
    if (p.kind === 'village') {
      cand(p.stall.x, p.stall.y + 22, 66, 'Trade', () => openShop(p));
      cand(p.forge.x, p.forge.y + 22, 70, 'Blacksmith', () => openSmith(p));
      cand(p.board.x, p.board.y + 18, 62, 'Bounties', () => openBoard(p));
      cand(p.way.x, p.way.y + 16, 60, 'Waystone', () => openTravel(p));
      for (const s of p.shops || [])
        cand(s.x, s.y + 22, 66, s.label, () =>
          s.kind === 'potion' ? openPotions(p) : openShop(p, true),
        );
    } else if (p.kind === 'cave') cand(p.x, p.y + 12, 62, 'Enter cave', () => enterDungeon(p));
    else if (p.kind === 'lair') {
      const ch = game.P.chests && game.P.chests[p.key];
      if (ch && !ch.open) cand(ch.x, ch.y + 14, 64, 'Open chest', () => openBossChest(p.key));
    }
  }
  return best;
}
export function visitPois() {
  for (const p of game.activePois) {
    const d = Math.hypot(game.P.x - p.x, game.P.y - p.y);
    if (p.kind === 'village' && d < 150) {
      if (!game.P.wps.includes(p.key)) {
        game.P.wps.push(p.key);
        game.P.wpInfo[p.key] = { name: p.name, x: p.x, y: p.y, lvl: p.lvl };
        SFX.quest();
        banner(p.name, 'Waystone attuned. You will wake here if you fall.');
        save();
      }
      if (game.P.home !== p.key) {
        game.P.home = p.key;
      }
    }
    if (
      p.kind === 'lair' &&
      !game.P.cleared[p.key] &&
      d < 240 &&
      !game.curBoss &&
      !game.enemies.some((e) => e.src === p)
    ) {
      const b = makeBoss(p.boss, p.lvl, p.x, p.y - 20, p);
      game.enemies.push(b);
      game.curBoss = b;
      SFX.roar();
      game.shake = 12;
      banner(b.name, p.name);
      burst(p.x, p.y - 30, '#c8a8ff', 40, 240, 4, 60, 1);
    }
  }
  if (
    game.mode === 'dungeon' &&
    game.DG.guard &&
    game.DG.guard.dormant &&
    Math.hypot(game.P.x - game.DG.guard.x, game.P.y - game.DG.guard.y) < 300
  ) {
    game.DG.guard.dormant = false;
    game.curBoss = game.DG.guard;
    SFX.roar();
    game.shake = 10;
    banner(game.DG.guard.name, 'Guardian of the treasure');
  }
}
