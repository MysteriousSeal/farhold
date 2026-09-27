/* ================= Game model types ================= */
// The shapes of the game's records. Every known field is typed. Records the game extends at
// run time (enemies pick up AI timers, the hero saved long ago may carry old fields) keep an
// index signature for those extras.

export type Rec = Record<string, any>;

/** Item stats by name (atk, hp, def, crit, critd, aspd, spd, leech...). */
export type StatMap = Record<string, number>;

/** A piece of gear, or a lit torch in the off hand (kind 'torch'). */
export interface Item {
  id?: number;
  slot?: string;
  /** rarity index into RAR (0 common … 4 legendary) */
  r: number;
  lvl: number;
  /** material index into MATS */
  mat?: number;
  style?: number;
  /** smith upgrades, 0..10 */
  plus?: number;
  /** weapon class: warrior, ranger or mage */
  wc?: string;
  st: StatMap;
  name?: string;
  /** merchant value in gold */
  val?: number;
  /** a lit torch: 'torch', with the seconds it has left */
  kind?: string;
  left?: number;
  [extra: string]: any;
}

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

/** The hero: everything saved with them. */
export interface Hero {
  name: string;
  seed: string;
  race: string;
  gender?: string;
  lvl: number;
  xp: number;
  gold: number;
  hp: number;
  /** health potions */
  pot: number;
  x: number;
  y: number;
  look: Look;
  inv: Item[];
  eq: Equipment;
  /** active skill ranks bought (s1, s2) */
  sp: Record<string, number>;
  /** passive tree nodes owned */
  tree: string[];
  mastery?: Record<string, number>;
  /** points already seen on the skill tree (the Skills button stops blinking) */
  ptsSeen?: number;
  /** lair bosses beaten (one skill point each) */
  bossDone: string[];
  /** consumables besides potions: torch counts */
  cons: Record<string, number>;
  /** what the Q quick slot uses */
  quick: 'pot' | 'torch';
  /** places cleared, by key */
  cleared: Record<string, number | boolean>;
  /** saved cycles of caves and dungeons, by key */
  caves: Record<string, Rec>;
  dgClear: Record<string, number>;
  chests: Record<string, Rec>;
  /** waystones found, and their names and positions */
  wps: string[];
  wpInfo: Record<string, { name: string; x: number; y: number; lvl: number }>;
  home: string;
  quests: Rec[];
  questLog: Rec[];
  /** where the hero goes back to on leaving a cave or house */
  ret?: { x: number; y: number };
  /** time of day, 0..1 */
  tod: number;
  kills: number;
  /** the tavern drink in effect */
  buff?: { k: string; t: number } | null;
  [extra: string]: any;
}

/** A monster, beast or humanoid enemy (bosses included); AI timers are added as it acts. */
export interface Enemy {
  type: string;
  lvl: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  dmg: number;
  spd: number;
  r: number;
  dx: number;
  dy: number;
  aggro: boolean;
  dead?: boolean;
  boss?: boolean;
  elite?: string;
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

/** A cave (style 'cave') or stone-gate crypt, as generated for one visit. */
export interface Dungeon {
  key: string;
  lvl: number;
  b: number;
  GW: number;
  GH: number;
  T: number;
  g: Uint8Array;
  style?: string;
  isF?: (x: number, y: number) => boolean;
  rooms: Rec[];
  start: Rec;
  end: Rec;
  exit?: { x: number; y: number };
  chest?: { x: number; y: number; open: boolean; hidden?: boolean };
  props: Rec[];
  torches: Rec[];
  pillars: Rec[];
  ch: Map<string, any>;
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
