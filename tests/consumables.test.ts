import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SLOTS } from '../src/model/data/classes';
import {
  QUICK,
  TORCH_COST,
  TORCH_MAX,
  TORCH_TIME,
  burnTorch,
  lightTorch,
  useQuick,
} from '../src/model/game/consumables';
import { RESET_MS, caveState, resetLeft } from '../src/model/game/dungeons';
import { fmtClock } from '../src/core/format';
import { Item, gearScore } from '../src/model/game/items';
import { migrate } from '../src/model/game/save';
import { game } from '../src/model/game/state';
import { Hero } from '../src/model/game/hero';
import { gameHour } from '../src/model/game/worldTick';

// count the potions drunk through the quick slot
const drank = vi.hoisted(() => ({ n: 0 }));
vi.mock('../src/model/game/combat', () => ({ drinkPot: () => drank.n++ }));

// Consumables (potions and torches), the Q quick slot, cave cycles and the day clock.
const hero = (o: Record<string, unknown> = {}) =>
  new Hero({
    lvl: 5,
    pot: 3,
    cons: {},
    quick: 'pot',
    eq: Object.fromEntries(SLOTS.map((s) => [s, null])),
    caves: {},
    cleared: {},
    ...o,
  });

describe('torches', () => {
  beforeEach(() => {
    game.P = hero({ cons: { torch: 3 } });
  });

  it('are sold for 100 gold, up to 20 carried, and burn 5 minutes', () => {
    expect(TORCH_COST).toBe(100);
    expect(TORCH_MAX).toBe(20);
    expect(TORCH_TIME).toBe(300);
  });

  it('counts the torches in the bags', () => {
    expect(game.P.torches).toBe(3);
    expect(hero().torches).toBe(0);
  });

  it('lighting one takes it from the bags into the off hand', () => {
    expect(lightTorch()).toBe(true);
    expect(game.P.torches).toBe(2);
    expect(game.P.eq.offhand.kind).toBe('torch');
    expect(game.P.torchLeft).toBe(TORCH_TIME);
  });

  it('a torch from a cave wall is free', () => {
    game.P = hero();
    expect(lightTorch(true)).toBe(true);
    expect(game.P.torchLeft).toBe(TORCH_TIME);
    expect(game.P.torches).toBe(0);
  });

  it('cannot light one with none left', () => {
    game.P = hero();
    expect(lightTorch()).toBe(false);
    expect(game.P.eq.offhand).toBeNull();
  });

  it('a lit torch burns down and disappears', () => {
    lightTorch();
    burnTorch(100);
    expect(game.P.torchLeft).toBeCloseTo(TORCH_TIME - 100);
    burnTorch(TORCH_TIME);
    expect(game.P.torchLeft).toBe(0);
    expect(game.P.eq.offhand).toBeNull();
  });

  it('only burns while held (bag torches keep)', () => {
    burnTorch(1000);
    expect(game.P.torches).toBe(3);
  });

  it('lighting a fresh one replaces the burning one', () => {
    lightTorch();
    burnTorch(250);
    lightTorch();
    expect(game.P.torchLeft).toBe(TORCH_TIME);
    expect(game.P.torches).toBe(1);
  });

  it('a lit torch adds nothing to gear score and breaks no stats', () => {
    lightTorch();
    expect(gearScore(game.P.eq)).toBe(0);
    expect(Number.isNaN(gearScore(game.P.eq))).toBe(false);
  });
});

describe('the Q quick slot', () => {
  it('holds potions by default', () => {
    game.P = hero({ quick: undefined });
    expect(game.P.quickKind).toBe('pot');
    expect(game.P.quickCount).toBe(3);
  });

  it('can hold torches instead', () => {
    game.P = hero({ quick: 'torch', cons: { torch: 7 } });
    expect(game.P.quickKind).toBe('torch');
    expect(game.P.quickCount).toBe(7);
  });

  it('only potions and torches can go on it', () => {
    expect([...QUICK]).toEqual(['pot', 'torch']);
  });

  it('with a potion on Q, pressing Q drinks', () => {
    game.P = hero({ quick: 'pot' });
    const before = drank.n;
    useQuick();
    expect(drank.n).toBe(before + 1);
  });

  it('with a torch on Q, pressing Q lights one', () => {
    game.P = hero({ quick: 'torch', cons: { torch: 2 } });
    useQuick();
    expect(game.P.torchLeft).toBe(TORCH_TIME);
    expect(game.P.torches).toBe(1);
  });
});

describe('save migration for new slots', () => {
  it('old saves gain an empty off hand, consumables and a potion quick slot', () => {
    const p = migrate({
      name: 'Old',
      lvl: 3,
      xp: 0,
      gold: 1,
      pot: 2,
      inv: [],
      eq: { weapon: null },
      cleared: {},
    } as any);
    expect(p.eq).toHaveProperty('offhand', null);
    expect(p.cons).toEqual({});
    expect(p.quick).toBe('pot');
  });

  it('loaded items are Items again (bag, gear, shop stock)', () => {
    const plain = { slot: 'ring', r: 1, lvl: 4, plus: 2, st: { atk: 10 }, name: 'Band', val: 9 };
    const p = migrate({
      name: 'Load',
      lvl: 3,
      xp: 0,
      gold: 1,
      pot: 2,
      inv: [{ ...plain }],
      eq: { ring: { ...plain } },
      shops: { v1: { t: 0, items: [{ ...plain }] } },
      cleared: {},
    } as any);
    for (const it of [p.inv[0], p.eq.ring, p.shops.v1.items[0]]) {
      expect(it).toBeInstanceOf(Item);
      expect(it.stat('atk')).toBe(12);
      expect(it.fullName).toBe('+2 Band');
    }
  });

  it('a lit torch survives a save and load', () => {
    const p = migrate({
      name: 'Lit',
      lvl: 3,
      xp: 0,
      gold: 1,
      pot: 2,
      inv: [],
      eq: { offhand: { kind: 'torch', name: 'Torch', left: 120, lvl: 0, r: 0, st: {} } },
      cleared: {},
      cons: { torch: 4 },
      quick: 'torch',
    } as any);
    expect(p.eq.offhand.left).toBe(120);
    expect(p.cons.torch).toBe(4);
    expect(p.quick).toBe('torch');
  });
});

describe('cave cycles', () => {
  beforeEach(() => {
    game.P = hero();
  });

  it('a new cave starts at cycle 0 with nothing taken', () => {
    const s = caveState('c1');
    expect(s.gen).toBe(0);
    expect(s.dead).toEqual([]);
    expect(s.torchesTaken).toEqual([]);
  });

  it('keeps its state (taken torches, kills) between visits', () => {
    const s = caveState('c1');
    s.torchesTaken.push(2);
    s.dead.push(5);
    expect(caveState('c1').torchesTaken).toEqual([2]);
    expect(caveState('c1').dead).toEqual([5]);
  });

  it('resets once its timer ran out: torches back, kills forgotten, uncleared', () => {
    const s = caveState('c1');
    s.torchesTaken.push(2);
    s.done = true;
    game.P.cleared.c1 = 1;
    s.resetAt = Date.now() - 1;
    const n = caveState('c1');
    expect(n.gen).toBe(1);
    expect(n.torchesTaken).toEqual([]);
    expect(game.P.cleared.c1).toBeUndefined();
  });

  it('does not reset before its timer', () => {
    const s = caveState('c1');
    s.resetAt = Date.now() + RESET_MS;
    s.torchesTaken.push(1);
    expect(caveState('c1').torchesTaken).toEqual([1]);
    expect(resetLeft('c1')).toBeGreaterThan(RESET_MS - 1000);
  });

  it('shows time left as m:ss', () => {
    expect(fmtClock(0)).toBe('0:00');
    expect(fmtClock(61_000)).toBe('1:01');
    expect(fmtClock(299_500)).toBe('5:00');
  });
});

describe('the day clock', () => {
  it('maps the time of day to a 24-hour clock', () => {
    expect(gameHour(0)).toBe(6);
    expect(gameHour(0.25)).toBe(12);
    expect(gameHour(0.5)).toBe(18);
    expect(gameHour(0.75)).toBe(0);
    expect(gameHour(0.9)).toBeCloseTo(3.6);
  });

  it('stays within 0..24', () => {
    for (let t = 0; t < 1; t += 0.013) {
      const h = gameHour(t);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(24);
    }
  });
});
