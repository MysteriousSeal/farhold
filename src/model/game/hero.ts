import { ADJ, MASTERY, TREE } from '../data/tree';
import { Item } from './items';
import type { Equipment, Look, Rec } from './types';
/* ================= The hero ================= */
// Everything saved with the hero, and what can be asked of it: skill points, the tree, active
// skill ranks, torches and the quick slot, and clearing out the bag. Saves hold the hero as
// plain data; Hero.from (called by migrate) makes a Hero of it again.

/** Active skills unlock by themselves at these levels; points buy ranks up to SKILL_MAX. */
export const SKILL_LVL = [2, 6],
  SKILL_MAX = 4;
/** Rarity at and above which bulk salvage keeps items (Epic, Legendary). */
export const SALVAGE_KEEP_R = 3;

export class Hero {
  // fields are declared only: a loaded save keeps exactly what it had, and migrate (save.ts)
  // fills in what's missing
  declare name: string;
  declare seed: string;
  declare race: string;
  declare gender?: string;
  declare lvl: number;
  declare xp: number;
  declare gold: number;
  declare hp: number;
  /** health potions */
  declare pot: number;
  declare x: number;
  declare y: number;
  declare look: Look;
  declare inv: Item[];
  declare eq: Equipment;
  /** active skill ranks bought (s1, s2) */
  declare sp: Record<string, number>;
  /** passive tree nodes owned */
  declare tree: string[];
  declare mastery?: Record<string, number>;
  /** points already seen on the skill tree (the Skills button stops blinking) */
  declare ptsSeen?: number;
  /** lair bosses beaten (one skill point each) */
  declare bossDone: string[];
  /** consumables besides potions: torch counts */
  declare cons: Record<string, number>;
  /** what the Q quick slot uses */
  declare quick: 'pot' | 'torch';
  /** places cleared, by key */
  declare cleared: Record<string, number | boolean>;
  /** saved cycles of caves and dungeons, by key */
  declare caves: Record<string, Rec>;
  declare dgClear: Record<string, number>;
  declare chests: Record<string, Rec>;
  /** waystones found, and their names and positions */
  declare wps: string[];
  declare wpInfo: Record<string, { name: string; x: number; y: number; lvl: number }>;
  declare home: string;
  declare quests: Rec[];
  declare questLog: Rec[];
  /** where the hero goes back to on leaving a cave or house */
  declare ret?: { x: number; y: number };
  /** time of day, 0..1 */
  declare tod: number;
  declare kills: number;
  /** the tavern drink in effect */
  declare buff?: { k: string; t: number } | null;
  [extra: string]: any;

  constructor(data: Rec = {}) {
    Object.assign(this, data);
  }
  /** `o` as a Hero (itself when it already is one). */
  static from(o): Hero {
    return o instanceof Hero ? o : new Hero(o);
  }

  /* ---------- skill points ---------- */
  /** Points from lair bosses: one for each boss's first defeat. */
  get bossPoints() {
    return (this.bossDone || []).length;
  }
  /** Every point earned, spent or not: one per level after the first, one per lair boss. */
  get pointsEarned() {
    return this.lvl - 1 + this.bossPoints;
  }
  /** Mastery ranks bought, all kinds together. */
  get masteryRanks() {
    return Object.values(this.mastery || {}).reduce((a, n) => a + n, 0);
  }
  /** Points not yet spent (tree nodes, active skill ranks and mastery ranks spend them). */
  get pointsFree() {
    const sp = this.sp || {};
    return (
      this.pointsEarned - (this.tree || []).length - (sp.s1 || 0) - (sp.s2 || 0) - this.masteryRanks
    );
  }
  /** Rank of active skill s1 or s2: 0 until its level, then 1 plus the ranks bought. */
  rank(id: string) {
    const i = id === 's1' ? 0 : id === 's2' ? 1 : -1;
    if (i < 0 || this.lvl < SKILL_LVL[i]) return 0;
    return Math.min(SKILL_MAX, 1 + ((this.sp && this.sp[id]) || 0));
  }
  /** Can tree node `id` be learned now (not owned, next to an owned node or the start)? */
  canLearn(id: string) {
    const own = new Set(['start', ...(this.tree || [])]);
    return !own.has(id) && (ADJ[id] || []).some((n) => own.has(n));
  }
  /** Mastery opens once every node but the keystones is learned. */
  get masteryOpen() {
    const own = new Set(this.tree || []);
    return Object.values(TREE).every(
      (n) => n.kind === 'start' || n.kind === 'key' || own.has(n.id),
    );
  }
  /**
   * Is there anything a free point could buy right now: a tree node next to an owned one, a
   * rank on an unlocked active skill that isn't maxed, or mastery? (Leftover points with
   * nothing to buy, e.g. a full tree, don't count.)
   */
  get canSpend() {
    if (this.pointsFree <= 0) return false;
    if (['s1', 's2'].some((id) => this.rank(id) > 0 && this.rank(id) < SKILL_MAX)) return true;
    if (this.masteryOpen) return true;
    return Object.keys(TREE).some((id) => this.canLearn(id));
  }
  /** The Skills button blinks only for points earned since the tree was last opened. */
  get pointsNew() {
    return this.canSpend && this.pointsEarned > (this.ptsSeen || 0);
  }
  /** The summed effects of every tree node owned and every mastery rank. */
  treeFx() {
    const F: Record<string, number> = {};
    for (const id of this.tree || []) {
      const n = TREE[id];
      if (n) for (const k in n.fx) F[k] = (F[k] || 0) + n.fx[k];
    }
    for (const m of MASTERY) {
      const r = (this.mastery && this.mastery[m.k]) || 0;
      for (const k in m.fx) F[k] = (F[k] || 0) + m.fx[k] * r;
    }
    return F;
  }

  /* ---------- consumables ---------- */
  /** Unlit torches in the bags. */
  get torches() {
    return (this.cons && this.cons.torch) || 0;
  }
  /** Seconds left on the torch held in the off hand (0 without one). */
  get torchLeft() {
    const o = this.eq && this.eq.offhand;
    return o && o.kind === 'torch' ? Math.max(0, o.left) : 0;
  }
  /** What the Q quick slot uses. */
  get quickKind(): 'pot' | 'torch' {
    return this.quick || 'pot';
  }
  /** How many of the quick slot's consumable are left. */
  get quickCount() {
    return this.quickKind === 'torch' ? this.torches : this.pot;
  }

  /* ---------- the bag ---------- */
  /** Bag items that "salvage all" would remove (equipped gear is never included). */
  get salvageable() {
    return this.inv.filter((it) => it.r < SALVAGE_KEEP_R);
  }
  /**
   * Salvage every bag item below Epic, except those `keep` spares (the caller keeps
   * upgrades); returns how many items went and the gold gained.
   */
  salvageAll(keep: (it: Item) => boolean = () => false) {
    const junk = this.salvageable.filter((it) => !keep(it)),
      gold = junk.reduce((a, it) => a + it.salvageValue, 0);
    this.inv = this.inv.filter((it) => !junk.includes(it));
    this.gold += gold;
    return { count: junk.length, gold };
  }
}
