import { world } from '../../core/math';
import type { Interior } from '../world/interior';
import type {
  Dungeon,
  Enemy,
  GameMode,
  GameStateName,
  Hero,
  Interact,
  Poi,
  Rec,
  Stats,
} from './types';
import type { WorldEvent } from './events';
/* ================= GAME STATE ================= */
/** Everything the running game shares across modules. */
export interface GameState {
  /** the world seed (kept in core/math as world.seed) */
  SEED: number;
  /** chunks the frame may still generate */
  genBudget: number;
  /** the world chunk being sampled in the background */
  bgGen: Rec | null;
  uidN: number;
  state: GameStateName;
  mode: GameMode;
  /** the cave or crypt while mode is 'dungeon' */
  DG: Dungeon | null;
  /** save slot of the hero being played */
  slot: string | null;
  /** the house interior while mode is 'house' */
  HS: Interior | null;
  P: Hero | null;
  ST: Stats | null;
  time: number;
  hitstop: number;
  enemies: Enemy[];
  projs: Rec[];
  drops: Rec[];
  parts: Rec[];
  texts: Rec[];
  teles: Rec[];
  zones: Rec[];
  shake: number;
  camX: number;
  camY: number;
  camKX: number;
  camKY: number;
  kickX: number;
  kickY: number;
  spawnT: number;
  zoneName: string;
  saveT: number;
  curBoss: Enemy | null;
  interact: Interact | null;
  fade: number;
  fadeDir: number;
  fadeCb: (() => void) | null;
  /** night darkness 0..0.6, and the dusk tint */
  dark: number;
  dusk: number;
  activePois: Poi[];
  poiT: number;
  ghosts: Rec[];
  atkHeld: boolean;
  hudT: number;
  /** the world event in progress, and when the next may start */
  ev?: WorldEvent | null;
  evNext?: number;
}
export const game: GameState = {
  /** the world seed: kept in core/math (world.seed), which every hash and noise reads */
  get SEED() {
    return world.seed;
  },
  set SEED(v: number) {
    world.seed = v;
  },
  genBudget: 1,
  bgGen: null,
  uidN: Date.now() % 100000,
  state: 'menu',
  mode: 'world',
  DG: null,
  slot: null,
  HS: null,
  P: null,
  ST: null,
  time: 0,
  hitstop: 0,
  enemies: [],
  projs: [],
  drops: [],
  parts: [],
  texts: [],
  teles: [],
  zones: [],
  shake: 0,
  camX: 0,
  camY: 0,
  camKX: 0,
  camKY: 0,
  kickX: 0,
  kickY: 0,
  spawnT: 0,
  zoneName: '',
  saveT: 0,
  curBoss: null,
  interact: null,
  fade: 0,
  fadeDir: 0,
  fadeCb: null,
  dark: 0,
  dusk: 0,
  activePois: [],
  poiT: 0,
  ghosts: [],
  atkHeld: false,
  hudT: 0,
};

export const hero = {
  vx: 0,
  vy: 0,
  dx: 0,
  dy: 1,
  aim: Math.PI / 2,
  walk: 0,
  moving: false,
  cd: 0,
  atk: 0,
  roll: 0,
  rollCd: 0,
  rdx: 0,
  rdy: 0,
  inv: 0,
  regen: 0,
  kbx: 0,
  kby: 0,
  combo: 0,
  lastAtk: 0,
  comboSw: 0,
  scd: [0, 0],
  potCd: 0, // seconds until another potion can be drunk
  whirl: 0,
  whirlTick: 0,
  leap: null,
  slow: 0,
  stepT: 0,
  warp: null as any,
  faceT: 0,
  face: undefined as number | undefined,
};
export const lights = [];

export const weather = { type: 'none', t: 20, k: 0, target: 0 };
