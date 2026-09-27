import { SFX } from '../../core/ports';
import { drinkPot } from './combat';
import { toast } from './fx';
import { game } from './state';
import { Item } from './items';
/* ================= Consumables ================= */
// Health potions (P.pot) and torches (P.cons.torch) sit in the bags' Consumables row, outside
// the gear slots. A torch is lit by putting it in the off hand: it burns for TORCH_TIME seconds
// wherever the hero is, lights caves (and the night), then is gone. Wall torches taken in caves
// are the same torch. The Q quick slot (P.quick) uses whichever consumable is assigned to it.

/** Seconds a lit torch burns. */
export const TORCH_TIME = 300;
/** Most torches the hero can carry. */
export const TORCH_MAX = 20;
/** The barmaid's price for one torch. */
export const TORCH_COST = 100;

/** Unlit torches in the bags. */
export const torches = (p = game.P) => (p && p.cons && p.cons.torch) || 0;
/** Seconds left on the torch held in the off hand (0 without one). */
export function torchLeft(p = game.P) {
  const o = p && p.eq && p.eq.offhand;
  return o && o.kind === 'torch' ? Math.max(0, o.left) : 0;
}
/** Put a lit torch in the off hand: one from the bags, or (`fromWall`) a cave's wall torch. */
export function lightTorch(fromWall = false) {
  const P = game.P;
  if (!fromWall) {
    if (torches() <= 0) {
      toast('No torches left');
      return false;
    }
    P.cons.torch--;
  }
  P.eq.offhand = new Item({ kind: 'torch', name: 'Torch', left: TORCH_TIME, lvl: 0, r: 0 });
  SFX.pick();
  toast(fromWall ? 'You take the torch' : 'You light a torch');
  return true;
}
/** Burns the held torch down; it is gone once spent. */
export function burnTorch(dt: number) {
  const o = game.P && game.P.eq && game.P.eq.offhand;
  if (!o || o.kind !== 'torch') return;
  o.left -= dt;
  if (o.left <= 0) {
    game.P.eq.offhand = null;
    toast('Your torch burns out');
  }
}
/** Consumables the quick slot can hold. */
export const QUICK = ['pot', 'torch'] as const;
export type QuickKind = (typeof QUICK)[number];
export const quickKind = (): QuickKind => (game.P && game.P.quick) || 'pot';
/** How many of the quick slot's consumable are left. */
export const quickCount = (k: QuickKind = quickKind()) => (k === 'torch' ? torches() : game.P.pot);
/** Q (and the touch potion button): use the consumable in the quick slot. */
export function useQuick() {
  if (!game.P) return;
  if (quickKind() === 'torch') lightTorch();
  else drinkPot();
}
