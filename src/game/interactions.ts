import { startWarp } from './warp';
import { SFX } from '../audio/sfx';
import { openBossChest } from './bossChest';
import { enterDungeon, leaveDungeon, openChest } from './dungeons';
import { makeBoss } from './enemies';
import { banner, burst } from './fx';
import { save } from './save';
import { game, hero } from './state';
import { openBoard, openPotions, openShop, openSmith, openTravel } from '../ui/village';
/* ================= INTERACTIONS ================= */
/**
 * The interaction in reach, if any. `tx`/`ty` is the world point the floating prompt hovers
 * over (the top of the stall, cave mouth, stairs, chest…).
 */
export function findInteract() {
  let best = null,
    bd = 1e9;
  const cand = (x, y, r, label, act, ty) => {
    const d = Math.hypot(game.P.x - x, game.P.y - y);
    if (d < r && d < bd) {
      bd = d;
      best = { label, act, tx: x, ty };
    }
  };
  if (game.mode === 'dungeon') {
    const ex = game.DG.exit,
      ch = game.DG.chest;
    cand(ex.x, ex.y + 10, 64, 'Leave cave', () => leaveDungeon(), ex.y - 30);
    if (!ch.open && !ch.hidden) cand(ch.x, ch.y + 14, 64, 'Open chest', openChest, ch.y - 34);
    const pt = game.DG.portal;
    if (pt && !hero.warp)
      cand(pt.x, pt.y + 8, 80, 'Warp portal: back to the entrance', startWarp, pt.y - 78);
    return best;
  }
  for (const p of game.activePois) {
    if (p.kind === 'village') {
      cand(p.stall.x, p.stall.y + 22, 66, 'Trade', () => openShop(p), p.stall.y - 66);
      cand(p.forge.x, p.forge.y + 22, 70, 'Blacksmith', () => openSmith(p), p.forge.y - 66);
      cand(p.board.x, p.board.y + 18, 62, 'Bounties', () => openBoard(p), p.board.y - 76);
      cand(p.way.x, p.way.y + 16, 60, 'Waystone', () => openTravel(p), p.way.y - 82);
      for (const s of p.shops || [])
        cand(
          s.x,
          s.y + 22,
          66,
          s.label,
          () => (s.kind === 'potion' ? openPotions(p) : openShop(p, true)),
          s.y - 66,
        );
    } else if (p.kind === 'cave')
      cand(p.x, p.y + 12, 62, 'Enter cave', () => enterDungeon(p), p.y - 64);
    else if (p.kind === 'lair') {
      const ch = game.P.chests && game.P.chests[p.key];
      if (ch && !ch.open)
        cand(ch.x, ch.y + 14, 64, 'Open chest', () => openBossChest(p.key), ch.y - 38);
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
