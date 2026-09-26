import { game } from '../game/state';
import { heroStyle } from '../game/style';
import { ADJ, MASTERY, TREE } from './tree';
/* ---- skill trees ---- */
// Per-style trees: only their active skills (s1, s2) are still used, see skillTree().
export const TREES = {
  warrior: {
    cols: ['Blade', 'Iron', 'Techniques'],
    nodes: [
      {
        id: 'a0',
        c: 0,
        r: 0,
        n: 'Sharpened steel',
        ic: '⚔',
        max: 5,
        d: (r) => '+' + 6 * r + '% damage',
      },
      {
        id: 'a1',
        c: 0,
        r: 1,
        n: 'Cleave',
        ic: '◗',
        max: 3,
        d: (r) => '+' + 15 * r + '% swing reach and arc',
      },
      {
        id: 'a2',
        c: 0,
        r: 2,
        n: 'Executioner',
        ic: '✖',
        max: 3,
        d: (r) => '+' + 25 * r + '% critical damage',
      },
      { id: 'b0', c: 1, r: 0, n: 'Toughness', ic: '♥', max: 5, d: (r) => '+' + 7 * r + '% health' },
      {
        id: 'b1',
        c: 1,
        r: 1,
        n: 'Plate training',
        ic: '⛨',
        max: 3,
        d: (r) => '+' + 12 * r + '% armor',
      },
      {
        id: 'b2',
        c: 1,
        r: 2,
        n: 'Second wind',
        ic: '✚',
        max: 3,
        d: (r) => 'Regenerate ' + (0.4 * r).toFixed(1) + '% health per second',
      },
      {
        id: 's1',
        c: 2,
        r: 0,
        n: 'Whirlwind',
        ic: '🌀',
        max: 4,
        act: 1,
        d: (r) => 'Spin for 0.7s, striking all nearby foes. ' + (55 + 15 * r) + '% damage per hit',
      },
      {
        id: 'c1',
        c: 2,
        r: 1,
        n: 'Battle rhythm',
        ic: '⟳',
        max: 3,
        d: (r) => '-' + 10 * r + '% skill cooldowns',
      },
      {
        id: 's2',
        c: 2,
        r: 2,
        n: 'Leap slam',
        ic: '⤓',
        max: 4,
        act: 2,
        d: (r) => 'Leap onto a foe, stunning all around. ' + (170 + 30 * r) + '% damage',
      },
    ],
  },
  ranger: {
    cols: ['Marksman', 'Survival', 'Techniques'],
    nodes: [
      {
        id: 'a0',
        c: 0,
        r: 0,
        n: 'Deadeye',
        ic: '◎',
        max: 5,
        d: (r) => '+' + 4 * r + '% crit chance',
      },
      {
        id: 'a1',
        c: 0,
        r: 1,
        n: 'Piercing arrows',
        ic: '➶',
        max: 2,
        d: (r) => 'Arrows pierce ' + r + ' more ' + (r > 1 ? 'foes' : 'foe'),
      },
      {
        id: 'a2',
        c: 0,
        r: 2,
        n: "Hunter's focus",
        ic: '⚔',
        max: 3,
        d: (r) => '+' + 10 * r + '% damage',
      },
      {
        id: 'b0',
        c: 1,
        r: 0,
        n: 'Fleet foot',
        ic: '»',
        max: 4,
        d: (r) => '+' + 5 * r + '% movement speed',
      },
      {
        id: 'b1',
        c: 1,
        r: 1,
        n: 'Tumble',
        ic: '↻',
        max: 3,
        d: (r) => '-' + 15 * r + '% roll cooldown',
      },
      { id: 'b2', c: 1, r: 2, n: 'Vitality', ic: '♥', max: 3, d: (r) => '+' + 8 * r + '% health' },
      {
        id: 's1',
        c: 2,
        r: 0,
        n: 'Volley',
        ic: '⋔',
        max: 4,
        act: 1,
        d: (r) => 'Loose a fan of ' + (6 + r) + ' arrows, ' + (60 + 10 * r) + '% damage each',
      },
      {
        id: 'c1',
        c: 2,
        r: 1,
        n: 'Quickdraw',
        ic: '⟳',
        max: 3,
        d: (r) => '-' + 10 * r + '% skill cooldowns, +' + 5 * r + '% attack speed',
      },
      {
        id: 's2',
        c: 2,
        r: 2,
        n: 'Rain of arrows',
        ic: '☔',
        max: 4,
        act: 2,
        d: (r) => 'Arrows rain on an area for 1.2s. ' + (45 + 10 * r) + '% damage per volley',
      },
    ],
  },
  mage: {
    cols: ['Arcana', 'Ward', 'Techniques'],
    nodes: [
      { id: 'a0', c: 0, r: 0, n: 'Potency', ic: '✦', max: 5, d: (r) => '+' + 6 * r + '% damage' },
      {
        id: 'a1',
        c: 0,
        r: 1,
        n: 'Unstable magic',
        ic: '✺',
        max: 3,
        d: (r) => '+' + 15 * r + '% blast radius',
      },
      {
        id: 'a2',
        c: 0,
        r: 2,
        n: 'Twin cast',
        ic: '⁂',
        max: 3,
        d: (r) => r * 10 + '% chance to cast bolts twice',
      },
      {
        id: 'b0',
        c: 1,
        r: 0,
        n: 'Arcane ward',
        ic: '⛨',
        max: 3,
        d: (r) => '+' + 10 * r + '% armor, +' + 4 * r + '% health',
      },
      {
        id: 'b1',
        c: 1,
        r: 1,
        n: 'Soul leech',
        ic: '❦',
        max: 3,
        d: (r) => 'Heal for ' + (1.5 * r).toFixed(1) + '% of damage dealt',
      },
      { id: 'b2', c: 1, r: 2, n: 'Vitality', ic: '♥', max: 3, d: (r) => '+' + 8 * r + '% health' },
      {
        id: 's1',
        c: 2,
        r: 0,
        n: 'Frost nova',
        ic: '❄',
        max: 4,
        act: 1,
        d: (r) =>
          'Freeze all nearby foes for ' +
          (1.6 + 0.2 * r).toFixed(1) +
          's. ' +
          (90 + 20 * r) +
          '% damage',
      },
      {
        id: 'c1',
        c: 2,
        r: 1,
        n: 'Focus',
        ic: '⟳',
        max: 3,
        d: (r) => '-' + 10 * r + '% skill cooldowns',
      },
      {
        id: 's2',
        c: 2,
        r: 2,
        n: 'Meteor',
        ic: '☄',
        max: 4,
        act: 2,
        d: (r) => 'Call a meteor that scorches the ground. ' + (260 + 40 * r) + '% damage',
      },
    ],
  },
};
/**
 * The shared skill tree: passive nodes for every hero, while the two active skills (s1, s2)
 * are the ones of the equipped weapon's style (taken from the per-style trees above).
 */
/** The tree for the hero's current fighting style (shared passives + the style's two skills). */
export type SkillNode = {
  id: string;
  c: number;
  r: number;
  n: string;
  ic: string;
  max: number;
  act?: number;
  d: (r: number) => string;
};
export function skillTree(style = heroStyle()): { cols: string[]; nodes: SkillNode[] } {
  return { cols: [], nodes: TREES[style].nodes.filter((n) => n.act) };
}
export const SKILLCD = { warrior: [7, 10], ranger: [5, 11], mage: [7, 12] };
export const SKILLN = {
  warrior: ['Whirlwind', 'Leap slam'],
  ranger: ['Volley', 'Rain of arrows'],
  mage: ['Frost nova', 'Meteor'],
};
/* ---------- points, active skill ranks and the passive tree (data/tree.ts) ---------- */
/** Active skills unlock by themselves at these levels; points buy ranks up to SKILL_MAX. */
export const SKILL_LVL = [2, 6],
  SKILL_MAX = 4;
/** Rank of an active skill ('s1', 's2'): 0 while locked, 1 when unlocked, +1 per point spent. */
export const rank = (id: string) => {
  const i = id === 's1' ? 0 : id === 's2' ? 1 : -1;
  if (i < 0 || !game.P || game.P.lvl < SKILL_LVL[i]) return 0;
  return Math.min(SKILL_MAX, 1 + ((game.P.sp && game.P.sp[id]) || 0));
};
/** Skill points from lair bosses: one for each boss's first defeat. */
export const bossPoints = (p = game.P) => (p.bossDone || []).length;
export const ownedNodes = (p = game.P): string[] => p.tree || [];
/** Points not yet spent: one per level after the first, plus one per lair boss. */
export function pointsFree(p = game.P) {
  const sp = p.sp || {};
  return (
    p.lvl - 1 + bossPoints(p) - ownedNodes(p).length - (sp.s1 || 0) - (sp.s2 || 0) - masteryRanks(p)
  );
}
/** Mastery ranks bought, all kinds together. */
export const masteryRanks = (p = game.P) =>
  Object.values((p.mastery || {}) as Record<string, number>).reduce((a, n) => a + n, 0);
/** Mastery opens once every node but the keystones is learned. */
export function masteryOpen(p = game.P) {
  const own = new Set(ownedNodes(p));
  return Object.values(TREE).every((n) => n.kind === 'start' || n.kind === 'key' || own.has(n.id));
}
/**
 * Is there anything a free point could buy right now: a tree node next to an owned one, or
 * a rank on an unlocked active skill that isn't maxed? (Leftover points with nothing to
 * buy, e.g. a full tree, don't count.)
 */
export function canSpend(p = game.P) {
  if (pointsFree(p) <= 0) return false;
  if ((['s1', 's2'] as const).some((id) => rank(id) > 0 && rank(id) < SKILL_MAX)) return true;
  if (masteryOpen(p)) return true;
  return Object.keys(TREE).some((id) => canLearn(id, p));
}
/** Can the tree node be learned now (not owned, next to an owned node or the start)? */
export function canLearn(id: string, p = game.P) {
  const own = new Set(['start', ...ownedNodes(p)]);
  return !own.has(id) && (ADJ[id] || []).some((n) => own.has(n));
}
/** The summed effects of every tree node the hero owns. */
export function treeFx(p = game.P) {
  const F: Record<string, number> = {};
  for (const id of ownedNodes(p)) {
    const n = TREE[id];
    if (n) for (const k in n.fx) F[k] = (F[k] || 0) + n.fx[k];
  }
  for (const m of MASTERY) {
    const r = (p.mastery && p.mastery[m.k]) || 0;
    for (const k in m.fx) F[k] = (F[k] || 0) + m.fx[k] * r;
  }
  return F;
}
