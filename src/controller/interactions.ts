import { startWarp } from '../model/game/warp';
import { SFX } from '../core/ports';
import { openBossChest } from '../model/game/bossChest';
import { enterDungeon, leaveDungeon, openChest } from '../model/game/dungeons';
import { makeBoss } from '../model/game/enemies';
import { banner, burst } from '../model/game/fx';
import { save } from '../model/game/save';
import { houseDoors, houseInteract } from '../model/game/houses';
import { eventInteract } from '../model/game/events';
import { game, hero } from '../model/game/state';
import { lightTorch, torchLeft } from '../model/game/consumables';
import { openBoard, openPotions, openShop, openTravel } from '../view/ui/village';
/* ================= INTERACTIONS ================= */
/**
 * The interaction in reach, if any. `tx`/`ty` is the world point the floating prompt hovers
 * over (the top of the stall, cave mouth, stairs, chest…).
 */
export function findInteract() {
  let best = null,
    bd = 1e9;
  // (x, y) is where the hero stands to act, within r; the bubble points at (tx ?? x, ty).
  // `quiet`: E still works but the prompt stays hidden (someone's speech bubble is there)
  const cand = (x, y, r, label, act, ty, tx?, quiet = false) => {
    const d = Math.hypot(game.P.x - x, game.P.y - y);
    if (d < r && d < bd) {
      bd = d;
      best = { label, act, tx: tx ?? x, ty, quiet };
    }
  };
  if (game.mode === 'dungeon') {
    const ex = game.DG.exit,
      ch = game.DG.chest;
    cand(
      ex.x,
      ex.y + 10,
      64,
      game.DG.entrance === 'gate' ? 'Leave gate' : 'Leave cave',
      () => leaveDungeon(),
      ex.y - 30,
    );
    if (!ch.open && !ch.hidden) cand(ch.x, ch.y + 14, 64, 'Open chest', openChest, ch.y - 34);
    // wall torches come off their brackets to light the way through the dark
    for (const tr of game.DG.torches)
      if (!tr.taken)
        cand(
          tr.x,
          tr.y,
          56,
          torchLeft() > 0 ? 'Swap for a fresh torch' : 'Take torch',
          () => {
            tr.taken = true;
            // the bracket stays empty until the cave's next cycle (saved with its progress)
            const st = game.DG.cave;
            if (st) (st.torchesTaken = st.torchesTaken || []).push(game.DG.torches.indexOf(tr));
            lightTorch(true);
            burst(tr.x, tr.y - 28, '#ffb13a', 8, 60, 2.5, 30, 1);
          },
          tr.y - 60,
        );
    const pt = game.DG.portal;
    if (pt && !hero.warp)
      cand(pt.x, pt.y + 8, 80, 'Warp portal: back to the entrance', startWarp, pt.y - 78);
    return best;
  }
  if (game.mode === 'house') {
    houseInteract(cand);
    return best;
  }
  eventInteract(cand);
  for (const p of game.activePois) {
    if (p.kind === 'village') {
      houseDoors(p, cand);
      cand(p.stall.x, p.stall.y + 22, 66, 'Trade', () => openShop(p), p.stall.y - 66);
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
    else if (p.kind === 'gate')
      cand(p.x, p.y + 12, 62, 'Enter gate', () => enterDungeon(p), p.y - 72);
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
