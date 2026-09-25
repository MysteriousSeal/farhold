import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MATS, SLOTS } from '../src/data/classes';
import { mulberry } from '../src/core/math';
import { pointsFree } from '../src/data/skills';
import { genItem, itemStat, upCost } from '../src/game/items';
import { game } from '../src/game/state';
import { calcStats, xpNeed } from '../src/game/stats';

const hero = (o: Record<string, unknown> = {}) => ({
  cls: 'warrior',
  race: 'human',
  lvl: 1,
  hp: 1,
  skin: '#f7d4b2',
  hair: 0,
  hairC: '#2b1d14',
  eq: Object.fromEntries(SLOTS.map((s) => [s, null])),
  inv: [],
  sp: {},
  ...o,
});

describe('game/items', () => {
  beforeEach(() => {
    const r = mulberry(1234);
    vi.spyOn(Math, 'random').mockImplementation(r);
    game.P = null;
  });
  afterEach(() => vi.restoreAllMocks());

  it('generated items respect rarity, caps and slot stats', () => {
    for (let i = 0; i < 800; i++) {
      const lvl = 1 + (i % 40),
        minR = i % 3;
      const it = genItem(lvl, 0, undefined, minR);
      expect(SLOTS).toContain(it.slot);
      expect(it.r).toBeGreaterThanOrEqual(minR);
      expect(it.r).toBeLessThanOrEqual(4);
      expect(it.name).toContain(MATS[it.mat][0]);
      expect(it.val).toBeGreaterThan(0);
      if (it.slot === 'weapon') expect(it.st.atk).toBeGreaterThan(0);
      if (it.st.cdr) expect(it.st.cdr).toBeLessThanOrEqual(20);
      if (it.st.leech) expect(it.st.leech).toBeLessThanOrEqual(6);
      for (const v of Object.values(it.st)) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('forced slot and blacksmith upgrades', () => {
    const it = genItem(10, 0, 'armor');
    expect(it.slot).toBe('armor');
    const base = itemStat(it, 'def');
    it.plus = 5;
    expect(itemStat(it, 'def')).toBe(Math.round(it.st.def * 1.5));
    expect(itemStat(it, 'def')).toBeGreaterThanOrEqual(base);
    expect(upCost({ ...it, plus: 3 })).toBeGreaterThan(upCost({ ...it, plus: 2 }));
  });

  it('xp curve', () => {
    expect(xpNeed(1)).toBe(40);
    expect(xpNeed(10)).toBeGreaterThan(xpNeed(9));
  });
});

describe('game/stats', () => {
  it('base stats per class and race', () => {
    game.P = hero();
    calcStats();
    expect(game.ST).toMatchObject({ hp: 150, atk: 11, def: 4, crit: 5, spd: 150 });

    game.P = hero({ cls: 'ranger', race: 'elf' });
    calcStats();
    expect(game.ST).toMatchObject({ hp: 100, atk: 11, crit: 16, spd: 176 });

    game.P = hero({ cls: 'mage', race: 'dwarf' });
    calcStats();
    expect(game.ST).toMatchObject({ hp: 120, atk: 14, def: 3, spd: 142 });
  });

  it('levels, skills and gear feed into stats', () => {
    game.P = hero({ lvl: 5 });
    calcStats();
    expect(game.ST).toMatchObject({ hp: 206, atk: 19.8, def: 7 });

    game.P = hero({ lvl: 6, sp: { b0: 5 } });
    calcStats();
    expect(game.ST.hp).toBe(Math.round((150 + 5 * 14) * 1.35));
    expect(pointsFree()).toBe(0);

    game.P = hero();
    game.P.eq.ring = { slot: 'ring', r: 0, mat: 0, plus: 0, st: { crit: 500 }, name: 'Test Ring' };
    calcStats();
    expect(game.ST.crit).toBe(75);
  });

  it('clamps current health to the new maximum', () => {
    game.P = hero({ hp: 9999 });
    calcStats();
    expect(game.P.hp).toBe(game.ST.hp);
  });
});
