import { beforeEach, describe, expect, it } from 'vitest';
import {
  bossPoints,
  canLearn,
  canSpend,
  masteryOpen,
  masteryRanks,
  pointsEarned,
  pointsFree,
  pointsNew,
  treeFx,
} from '../src/model/data/skills';
import { ADJ, LINKS, MASTERY, TREE, fxLines } from '../src/model/data/tree';
import { game } from '../src/model/game/state';

// The passive skill tree: its shape, and the rules for points, the blinking Skills button and
// mastery.
const hero = (o: Record<string, unknown> = {}) =>
  ({ lvl: 1, tree: [], sp: {}, bossDone: [], mastery: {}, wc: 'warrior', eq: {}, ...o }) as any;
const nodes = Object.values(TREE);
/** Every learnable node except keystones, in an order that respects adjacency. */
function learnAll(keys = false) {
  const own = new Set(['start']),
    out: string[] = [];
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (own.has(n.id) || (!keys && n.kind === 'key')) continue;
      if ((ADJ[n.id] || []).some((a) => own.has(a))) {
        own.add(n.id);
        out.push(n.id);
        grew = true;
      }
    }
  }
  return out;
}

describe('skill tree: shape', () => {
  it('has one start node', () => {
    expect(nodes.filter((n) => n.kind === 'start')).toHaveLength(1);
    expect(TREE.start).toBeTruthy();
  });

  it('has enough to spend a point per level up to high levels', () => {
    const learnable = nodes.filter((n) => n.kind !== 'start').length;
    expect(learnable).toBeGreaterThanOrEqual(100);
  });

  it('has small nodes, notables and keystones', () => {
    for (const k of ['small', 'notable', 'key'])
      expect(nodes.filter((n) => n.kind === k).length).toBeGreaterThan(5);
  });

  it('every link joins two real nodes', () => {
    for (const [a, b] of LINKS) {
      expect(TREE[a], a).toBeTruthy();
      expect(TREE[b], b).toBeTruthy();
      expect(a).not.toBe(b);
    }
  });

  it('adjacency goes both ways', () => {
    for (const [a, list] of Object.entries(ADJ)) for (const b of list) expect(ADJ[b]).toContain(a);
  });

  it('every node can be reached from the start', () => {
    const got = new Set(['start', ...learnAll(true)]);
    for (const n of nodes) expect(got.has(n.id), n.id).toBe(true);
  });

  it('node ids are unique and match their keys', () => {
    for (const [k, n] of Object.entries(TREE)) expect(n.id).toBe(k);
  });

  it('every node has an effect with readable text, and a position', () => {
    for (const n of nodes) {
      if (n.kind === 'start') continue;
      expect(Object.keys(n.fx).length, n.id).toBeGreaterThan(0);
      for (const line of fxLines(n.fx)) expect(line).toMatch(/^[+−]/);
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
    }
  });

  it('no two nodes sit on top of each other', () => {
    for (const a of nodes)
      for (const b of nodes)
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y), a.id + '/' + b.id).toBeGreaterThan(8);
  });

  it('there are hybrid nodes between branches', () => {
    expect(nodes.some((n) => n.br === 'h')).toBe(true);
  });

  it('mastery has four kinds, each with an effect', () => {
    expect(MASTERY).toHaveLength(4);
    for (const m of MASTERY) expect(Object.keys(m.fx).length).toBe(1);
  });
});

describe('skill points', () => {
  beforeEach(() => {
    game.P = hero();
  });

  it('one point per level after the first', () => {
    expect(pointsEarned(hero({ lvl: 1 }))).toBe(0);
    expect(pointsEarned(hero({ lvl: 10 }))).toBe(9);
  });

  it('one more point per lair boss beaten', () => {
    const p = hero({ lvl: 5, bossDone: ['l1', 'l2'] });
    expect(bossPoints(p)).toBe(2);
    expect(pointsEarned(p)).toBe(6);
  });

  it('learned nodes, skill ranks and mastery ranks all spend points', () => {
    const p = hero({
      lvl: 20,
      tree: ['a', 'b', 'c'],
      sp: { s1: 2, s2: 1 },
      mastery: { dmg: 2, hp: 1 },
    });
    expect(masteryRanks(p)).toBe(3);
    expect(pointsFree(p)).toBe(19 - 3 - 3 - 3);
  });

  it('a node can be learned only next to an owned one', () => {
    const p = hero({ lvl: 50 });
    const first = ADJ.start[0];
    expect(canLearn(first, p)).toBe(true);
    const far = nodes.find((n) => n.kind === 'key');
    expect(canLearn(far.id, p)).toBe(false);
    expect(canLearn('start', p)).toBe(false);
  });

  it('an owned node cannot be learned again', () => {
    const first = ADJ.start[0];
    expect(canLearn(first, hero({ lvl: 5, tree: [first] }))).toBe(false);
  });
});

describe('the Skills button blink', () => {
  it('blinks when there is a point and something to buy', () => {
    game.P = hero({ lvl: 3 });
    expect(canSpend(game.P)).toBe(true);
    expect(pointsNew(game.P)).toBe(true);
  });

  it('stops once the tree was opened, even with points left', () => {
    game.P = hero({ lvl: 3, ptsSeen: 2 });
    expect(canSpend(game.P)).toBe(true);
    expect(pointsNew(game.P)).toBe(false);
  });

  it('blinks again after a new level', () => {
    game.P = hero({ lvl: 4, ptsSeen: 2 });
    expect(pointsNew(game.P)).toBe(true);
  });

  it('a new lair boss point also counts as new', () => {
    game.P = hero({ lvl: 3, ptsSeen: 2, bossDone: ['l9'] });
    expect(pointsNew(game.P)).toBe(true);
  });

  it('never blinks with no free point', () => {
    game.P = hero({ lvl: 1 });
    expect(canSpend(game.P)).toBe(false);
    expect(pointsNew(game.P)).toBe(false);
  });
});

describe('mastery', () => {
  it('opens once every node but the keystones is learned', () => {
    const all = learnAll(false);
    expect(masteryOpen(hero({ tree: all.slice(0, -1) }))).toBe(false);
    expect(masteryOpen(hero({ tree: all }))).toBe(true);
  });

  it('a full tree with points left can still spend them on mastery', () => {
    const all = learnAll(true);
    game.P = hero({ lvl: all.length + 5, tree: all });
    expect(pointsFree(game.P)).toBe(4);
    expect(canSpend(game.P)).toBe(true);
  });

  it('mastery ranks add their effect each time', () => {
    const fx = treeFx(hero({ mastery: { dmg: 3, armor: 2, critd: 1 } }));
    expect(fx.dmg).toBe(3);
    expect(fx.armor).toBe(3);
    expect(fx.critd).toBe(2);
  });

  it('tree effects add up over owned nodes', () => {
    const [a, b] = learnAll(false);
    const fx = treeFx(hero({ tree: [a, b] })),
      want: Record<string, number> = {};
    for (const id of [a, b])
      for (const [k, v] of Object.entries(TREE[id].fx)) want[k] = (want[k] || 0) + v;
    // (mastery kinds show up at 0 when no rank is bought)
    expect(Object.fromEntries(Object.entries(fx).filter(([, v]) => v !== 0))).toEqual(want);
  });
});
