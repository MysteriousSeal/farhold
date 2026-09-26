import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MATS, SLOTS } from '../src/data/classes';
import { mulberry } from '../src/core/math';
import { pointsFree } from '../src/data/skills';
import { genItem, itemStat, salvageAll, salvageable, upCost } from '../src/game/items';
import { game } from '../src/game/state';
import { OUTFIT } from '../src/data/classes';
import { heroStyle, weaponStyle } from '../src/game/style';
import { UNDERWEAR, calcStats, lookOfPlayer, xpNeed } from '../src/game/stats';

const hero = (o: Record<string, unknown> = {}) => ({
  race: 'human',
  lvl: 1,
  hp: 1,
  skin: '#f7d4b2',
  hair: 0,
  hairC: '#2b1d14',
  // a plain blade with no stats, so the base numbers are the hero's own
  eq: {
    ...Object.fromEntries(SLOTS.map((s) => [s, null])),
    weapon: { slot: 'weapon', wc: 'warrior', r: 0, mat: 0, plus: 0, st: {} },
  } as Record<string, any>,
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

  it('salvage all keeps Epic and Legendary items and equipped gear', () => {
    const mk = (r: number, val: number) => ({ slot: 'ring', r, val, st: {}, name: 'R' + r });
    const bag = [mk(0, 5), mk(1, 9), mk(2, 20), mk(3, 60), mk(4, 150), mk(2, 3)];
    const worn = mk(0, 7);
    const p: any = { ...hero({ gold: 10, inv: bag }), eq: { ring: worn } };
    expect(salvageable(p.inv).map((it) => it.r)).toEqual([0, 1, 2, 2]);
    const res = salvageAll(p);
    expect(res).toEqual({ count: 4, gold: 3 + 5 + 10 + 2 });
    expect(p.gold).toBe(10 + 20);
    expect(p.inv.map((it) => it.r)).toEqual([3, 4]);
    expect(p.eq.ring).toBe(worn);
    expect(salvageAll(p)).toEqual({ count: 0, gold: 0 });
  });

  it('xp curve', () => {
    expect(xpNeed(1)).toBe(40);
    expect(xpNeed(10)).toBeGreaterThan(xpNeed(9));
  });
});

describe('game/stats', () => {
  it('every hero starts with the same base stats', () => {
    game.P = hero();
    calcStats();
    expect(game.ST).toMatchObject({ hp: 120, atk: 10, def: 2, crit: 5, spd: 150 });
  });

  it('bare fists hit for less', () => {
    game.P = hero();
    game.P.eq.weapon = null;
    calcStats();
    expect(game.ST.atk).toBe(6);
  });

  it('the equipped weapon decides the fighting style', () => {
    const p: any = hero();
    expect(heroStyle(p)).toBe('warrior'); // bare-handed fights in melee
    p.eq.weapon = { slot: 'weapon', wc: 'ranger', st: {} };
    expect(heroStyle(p)).toBe('ranger');
    expect(weaponStyle({ slot: 'weapon', wc: 'mage' })).toBe('mage');
    expect(weaponStyle({ slot: 'weapon' })).toBe('warrior');
  });

  it('levels, skills and gear feed into stats', () => {
    game.P = hero({ lvl: 5 });
    calcStats();
    expect(game.ST).toMatchObject({ hp: 176, atk: 18.8, def: 5 });

    // the passive tree: Sturdy (+5% health) then Stalwart (+10% health, +10% armor)
    game.P = hero({ lvl: 6, tree: ['gi0', 'gi1', 'gf'], sp: { s1: 1 } });
    calcStats();
    expect(game.ST.hp).toBe(Math.round((120 + 5 * 14) * 1.15));
    expect(pointsFree()).toBe(5 - 3 - 1);

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

describe('player look', () => {
  const gear = (slot: string, name: string) => ({ slot, name, r: 0, mat: 1, plus: 0, st: {} });

  it('an unequipped hero wears only linen shorts and is barefoot', () => {
    {
      const p = hero();
      const L = lookOfPlayer(p);
      expect(L.shorts).toBe(UNDERWEAR);
      expect(L.cloth).toBe(p.skin);
      expect(L.pants).toBe(p.skin);
      expect(L.cape).toBeNull();
      expect(L.robe).toBe(false);
      expect(L.helm).toBeUndefined();
      expect(L.boots).not.toBe(MATS[1][1]);
    }
  });

  it('gender shapes the look: a linen top for women, facial hair only for men', () => {
    const f = lookOfPlayer(hero({ gender: 'f', hair: 5, beard: 2 }));
    expect(f.fem).toBe(true);
    expect(f.top).toBe(UNDERWEAR);
    expect(f.beard).toBe(false);
    expect(f.hair).toBe(5);
    const m = lookOfPlayer(hero({ gender: 'm', beard: 1 }));
    expect(m.fem).toBe(false);
    expect(m.top).toBeUndefined();
    expect(m.stubble).toBe(true);
    const armored = hero({ gender: 'f' });
    armored.eq.armor = { slot: 'armor', name: 'Iron Tunic', r: 0, mat: 1, plus: 0, st: {} };
    expect(lookOfPlayer(armored).top).toBeUndefined();
  });

  it('each gear slot dresses its own body part', () => {
    const p = hero();
    p.eq.boots = gear('boots', 'Iron Boots');
    let L = lookOfPlayer(p);
    expect(L.shorts).toBe(UNDERWEAR);
    expect(L.boots).not.toBe(lookOfPlayer(hero()).boots);

    p.eq.armor = gear('armor', 'Iron Tunic');
    p.eq.helm = gear('helm', 'Iron Cap');
    L = lookOfPlayer(p);
    expect(L.shorts).toBe(UNDERWEAR); // legs stay bare until pants are worn
    expect(L.cloth).toBe(OUTFIT.cloth);
    expect(L.robe).toBe(false);
    expect(L.helm).toBe(MATS[1][1]);

    p.eq.pants = gear('pants', 'Iron Leggings');
    p.eq.gloves = gear('gloves', 'Iron Gloves');
    L = lookOfPlayer(p);
    expect(L.shorts).toBeUndefined();
    expect(L.pants).not.toBe(p.skin);
    expect(L.gloves).toBeTruthy();
  });

  it('a second ring fills the empty ring slot, then replaces the weaker ring', async () => {
    const { equipSlot } = await import('../src/game/items');
    const ring = (lvl: number) => ({ slot: 'ring', r: 1, lvl, plus: 0 });
    expect(equipSlot(ring(5), {})).toBe('ring');
    expect(equipSlot(ring(5), { ring: ring(3) })).toBe('ring2');
    expect(equipSlot(ring(5), { ring: ring(9), ring2: ring(2) })).toBe('ring2');
    expect(equipSlot({ slot: 'gloves' }, {})).toBe('gloves');
  });
});

describe('item power comparison', () => {
  it('scores weapons as damage and armor as toughness', async () => {
    const { compareItem, fmtPct } = await import('../src/game/power');
    game.P = hero();
    const axe = { slot: 'weapon', r: 2, mat: 1, plus: 0, st: { atk: 10 }, name: 'Axe' };
    const vest = { slot: 'armor', r: 1, mat: 1, plus: 0, st: { def: 5, hp: 20 }, name: 'Vest' };
    const w = compareItem(axe);
    expect(w.dmg).toBeCloseTo(1, 5); // 10 → 20 attack doubles damage
    expect(w.tough).toBeCloseTo(0, 5);
    expect(w.overall).toBeCloseTo(0.5, 5); // melee weighs damage 50%
    const a = compareItem(vest);
    expect(a.tough).toBeGreaterThan(0);
    expect(a.dmg).toBeCloseTo(0, 5);
    expect([fmtPct(0.144), fmtPct(-0.05), fmtPct(0.001)]).toEqual(['+14%', '−5%', '±0%']);
  });
});
