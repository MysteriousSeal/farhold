/* ================= Game model types ================= */
// The shapes of the game's records. Every known field is typed. Records the game extends at
// run time (enemies pick up AI timers, the hero saved long ago may carry old fields) keep an
// index signature for those extras.

export type Rec = Record<string, any>;
/** Gear and the lit torch are Item objects (a class, model/game/items.ts). */
export type { Item } from './items';
export type { Hero } from './hero';
export type { Enemy } from './enemies';
export type { Dungeon } from '../world/dungeon';
import type { Item } from './items';

/** Item stats by name (atk, hp, def, crit, critd, aspd, spd, leech...). */
export type StatMap = Record<string, number>;

/** What the hero wears, by slot (null when empty). */
export type Equipment = Record<string, Item | null>;

/** How a humanoid looks: skin, hair, face, clothes, armour and gear colours. */
export interface Look {
  skin?: string;
  hair?: number;
  hairC?: string;
  fem?: boolean;
  [extra: string]: any;
}

/** A place on the world map: village, lair, cave or stone gate. */
export interface Poi {
  kind: string;
  key: string;
  x: number;
  y: number;
  r: number;
  lvl: number;
  name?: string;
  [extra: string]: any;
}

/** The hero's computed stats (from level, gear, the tree and buffs). */
export type Stats = Rec;

/** What the hero can act on right now, and where its prompt bubble points. */
export interface Interact {
  label: string;
  act: () => void;
  tx: number;
  ty: number;
  /** E works but the prompt stays hidden (a speech bubble is there) */
  quiet?: boolean;
}

/** Which screen or window has the game. */
export type GameStateName = 'menu' | 'create' | 'help' | 'play' | 'modal' | 'inv' | 'dead';
/** Where the hero is: the open world, a cave or crypt, or inside a house. */
export type GameMode = 'world' | 'dungeon' | 'house';
