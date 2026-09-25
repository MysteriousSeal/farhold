import { SFX } from '../audio/sfx';
import { dropAt } from './enemies';
import { burst, ring, toast } from './fx';
import { genItem } from './items';
import { save } from './save';
import { game } from './state';
import { poiAt } from '../world/poi';
/* ================= BOSS CHESTS ================= */
// A defeated lair boss leaves a treasure chest at the lair's centre (its spawn point).
// Chests live in the save (P.chests[lairKey]) until opened, then stay as an open chest.

/** Share of a lair boss's gold that goes into its chest (the rest drops on the spot). */
export const CHEST_GOLD_SHARE = 0.8;

export function spawnBossChest(lair, lvl: number, gold: number) {
  const ch = { x: lair.x, y: lair.y, lvl, gold, open: false };
  game.P.chests[lair.key] = ch;
  SFX.chest();
  ring(ch.x, ch.y - 14, '#ffd27a', 40, 240, 3);
  burst(ch.x, ch.y - 10, '#ffe38a', 24, 200, 3, 80, 1);
  toast('A treasure chest appeared where the boss rose');
  return ch;
}

/** What a boss chest contains: gold, a potion, and items (one guaranteed Epic or better). */
export function bossChestLoot(lvl: number, gold: number) {
  const items = [
    genItem(lvl, 0.3, null, 3),
    genItem(lvl, 0.25, null, 2),
    genItem(lvl, 0.25, null, 2),
    genItem(lvl, 0.35, null, 1),
  ];
  const coins = Math.min(14, 3 + ((gold / 8) | 0));
  return { items, coins, coinAmt: Math.max(1, Math.round(gold / coins)), pots: 1 };
}

export function openBossChest(key: string) {
  const ch = game.P.chests[key];
  if (!ch || ch.open) return;
  ch.open = true;
  SFX.chest();
  ring(ch.x, ch.y - 14, '#ffd27a', 30, 200, 3);
  const L = bossChestLoot(ch.lvl, ch.gold);
  for (const it of L.items) dropAt(ch.x, ch.y, { kind: 'item', item: it });
  for (let i = 0; i < L.coins; i++) dropAt(ch.x, ch.y, { kind: 'gold', amt: L.coinAmt });
  for (let i = 0; i < L.pots; i++) dropAt(ch.x, ch.y, { kind: 'pot' });
  save();
}

/**
 * Give every lair cleared before boss chests existed its unopened chest (runs on load; lairs
 * that already have a chest, opened or not, are left alone). Returns how many were added.
 */
export function backfillBossChests() {
  let n = 0;
  for (const key of Object.keys(game.P.cleared)) {
    if (key[0] !== 'l' || game.P.chests[key]) continue;
    const [i, j] = key.slice(1).split(',').map(Number),
      lair = poiAt(i, j);
    if (!lair || lair.key !== key) continue;
    // average lair-boss gold, same share as a fresh kill
    const gold = Math.round((3.5 + lair.lvl * 1.8) * 14 * CHEST_GOLD_SHARE);
    game.P.chests[key] = { x: lair.x, y: lair.y, lvl: lair.lvl, gold, open: false };
    n++;
  }
  if (n)
    toast(
      n + (n > 1 ? ' treasure chests wait' : ' treasure chest waits') + ' at lairs you cleared',
    );
  return n;
}

/**
 * Re-point accepted bounties at their lair/cave's current position (worlds can change between
 * versions); bounties whose target no longer exists are dropped. Runs on load.
 */
export function refreshQuestTargets() {
  let dropped = 0;
  game.P.quests = game.P.quests.filter((q) => {
    if (!q.key || q.done) return true;
    const [i, j] = q.key.slice(1).split(',').map(Number),
      p = poiAt(i, j);
    if (!p || p.key !== q.key) {
      dropped++;
      return false;
    }
    q.x = p.x;
    q.y = p.y;
    return true;
  });
  if (dropped)
    toast(
      dropped + (dropped > 1 ? ' bounties were' : ' bounty was') + ' withdrawn: the place is gone',
    );
}
