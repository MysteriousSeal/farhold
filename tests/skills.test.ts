import { beforeEach, describe, expect, it } from 'vitest';

import { ADJ, LINKS, MASTERY, TREE, fxLines } from '../src/model/data/tree';
import { game } from '../src/model/game/state';
import { Hero } from '../src/model/game/hero';

// The passive skill tree: its shape, and the rules for points, the blinking Skills button and
// mastery.
const hero = (o: Record<string, unknown> = {}) =>
  new Hero({ lvl: 1, tree: [], sp: {}, bossDone: [], mastery: {}, wc: 'warrior', eq: {}, ...o });
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
    expect(hero({ lvl: 1 }).pointsEarned).toBe(0);
    expect(hero({ lvl: 10 }).pointsEarned).toBe(9);
  });

  it('one more point per lair boss beaten', () => {
    const p = hero({ lvl: 5, bossDone: ['l1', 'l2'] });
    expect(p.bossPoints).toBe(2);
    expect(p.pointsEarned).toBe(6);
  });

  it('learned nodes, skill ranks and mastery ranks all spend points', () => {
    const p = hero({
      lvl: 20,
      tree: ['a', 'b', 'c'],
      sp: { s1: 2, s2: 1 },
      mastery: { dmg: 2, hp: 1 },
    });
    expect(p.masteryRanks).toBe(3);
    expect(p.pointsFree).toBe(19 - 3 - 3 - 3);
  });

  it('a node can be learned only next to an owned one', () => {
    const p = hero({ lvl: 50 });
    const first = ADJ.start[0];
    expect(p.canLearn(first)).toBe(true);
    const far = nodes.find((n) => n.kind === 'key');
    expect(p.canLearn(far.id)).toBe(false);
    expect(p.canLearn('start')).toBe(false);
  });

  it('an owned node cannot be learned again', () => {
    const first = ADJ.start[0];
    expect(hero({ lvl: 5, tree: [first] }).canLearn(first)).toBe(false);
  });
});

describe('the Skills button blink', () => {
  it('blinks when there is a point and something to buy', () => {
    game.P = hero({ lvl: 3 });
    expect(game.P.canSpend).toBe(true);
    expect(game.P.pointsNew).toBe(true);
  });

  it('stops once the tree was opened, even with points left', () => {
    game.P = hero({ lvl: 3, ptsSeen: 2 });
    expect(game.P.canSpend).toBe(true);
    expect(game.P.pointsNew).toBe(false);
  });

  it('blinks again after a new level', () => {
    game.P = hero({ lvl: 4, ptsSeen: 2 });
    expect(game.P.pointsNew).toBe(true);
  });

  it('a new lair boss point also counts as new', () => {
    game.P = hero({ lvl: 3, ptsSeen: 2, bossDone: ['l9'] });
    expect(game.P.pointsNew).toBe(true);
  });

  it('never blinks with no free point', () => {
    game.P = hero({ lvl: 1 });
    expect(game.P.canSpend).toBe(false);
    expect(game.P.pointsNew).toBe(false);
  });
});

describe('mastery', () => {
  it('opens once every node but the keystones is learned', () => {
    const all = learnAll(false);
    expect(hero({ tree: all.slice(0, -1) }).masteryOpen).toBe(false);
    expect(hero({ tree: all }).masteryOpen).toBe(true);
  });

  it('a full tree with points left can still spend them on mastery', () => {
    const all = learnAll(true);
    game.P = hero({ lvl: all.length + 5, tree: all });
    expect(game.P.pointsFree).toBe(4);
    expect(game.P.canSpend).toBe(true);
  });

  it('mastery ranks add their effect each time', () => {
    const fx = hero({ mastery: { dmg: 3, armor: 2, critd: 1 } }).treeFx();
    expect(fx.dmg).toBe(3);
    expect(fx.armor).toBe(3);
    expect(fx.critd).toBe(2);
  });

  it('tree effects add up over owned nodes', () => {
    const [a, b] = learnAll(false);
    const fx = hero({ tree: [a, b] }).treeFx(),
      want: Record<string, number> = {};
    for (const id of [a, b])
      for (const [k, v] of Object.entries(TREE[id].fx)) want[k] = (want[k] || 0) + v;
    // (mastery kinds show up at 0 when no rank is bought)
    expect(Object.fromEntries(Object.entries(fx).filter(([, v]) => v !== 0))).toEqual(want);
  });
});
