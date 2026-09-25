import { beforeEach, describe, expect, it } from 'vitest';
import { SLOTS } from '../src/data/classes';
import { deleteSave, listSaves, loadSave, migrate, save } from '../src/game/save';
import { game } from '../src/game/state';

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

describe('game/save', () => {
  beforeEach(() => {
    store.clear();
    game.P = null;
    game.mode = 'world';
  });

  it('migrates a minimal v1 save', () => {
    const p = migrate({ inv: [{ st: {} }], eq: { weapon: { st: { atk: 3 } } } });
    expect(p.wps).toEqual(['v0,0']);
    expect(p.home).toBe('v0,0');
    expect(p.wpInfo['v0,0'].name).toBe('Hearthfire');
    expect(Object.keys(p.eq).sort()).toEqual([...SLOTS].sort());
    expect(p.eq.weapon.plus).toBe(0);
    expect(p.inv[0].style).toBe(0);
    expect(p.kills).toBe(0);
  });

  it('moves a legacy v1 save into a slot', () => {
    store.set('farhold_save_v1', JSON.stringify({ name: 'Old', inv: [] }));
    expect(loadSave()?.p.name).toBe('Old');
    expect(store.has('farhold_save_v1')).toBe(false);
    expect(listSaves()).toHaveLength(1);
  });

  it('saves into the current slot, at the cave entrance, without derived data', () => {
    game.slot = 'a';
    game.P = migrate({
      name: 'Brom',
      x: 5,
      y: 6,
      inv: [],
      look: { skin: '#fff' },
      ret: { x: 100, y: 200 },
    });
    game.mode = 'dungeon';
    save();
    const s = JSON.parse(store.get('farhold_slot:a')!);
    expect([s.x, s.y]).toEqual([100, 200]);
    expect(s.look).toBeUndefined();
    expect(s.last).toBeGreaterThan(0);
    expect(loadSave()?.p.name).toBe('Brom');
  });

  it('lists several heroes newest first and deletes one', () => {
    store.set('farhold_slot:x', JSON.stringify({ name: 'Old', inv: [], last: 1 }));
    store.set('farhold_slot:y', JSON.stringify({ name: 'New', inv: [], last: 2 }));
    expect(listSaves().map((s) => s.p.name)).toEqual(['New', 'Old']);
    deleteSave('y');
    expect(listSaves().map((s) => s.p.name)).toEqual(['Old']);
  });

  it('turns former elves, dwarves and orcs into humans', () => {
    const p = migrate({ inv: [], race: 'orc', skin: '#74a85a' });
    expect(p.race).toBe('human');
    expect(p.skin).toBe('#e6b187');
    expect(migrate({ inv: [], race: 'elf', skin: '#c4895c' }).skin).toBe('#c4895c');
  });

  it('drops the class, keeps weapon families and refunds skills once', () => {
    const p = migrate({
      inv: [{ slot: 'weapon', st: {} }],
      eq: { weapon: { slot: 'weapon', wc: 'ranger', st: {} } },
      cls: 'mage',
      sp: { a0: 3 },
    });
    expect(p.cls).toBeUndefined();
    expect(p.inv[0].wc).toBe('mage');
    expect(p.eq.weapon.wc).toBe('ranger');
    expect(p.sp).toEqual({});
    p.sp.a0 = 2;
    expect(migrate(p).sp).toEqual({ a0: 2 });
  });

  it('skips a corrupt save', () => {
    store.set('farhold_slot:bad', '{nope');
    expect(loadSave()).toBeNull();
  });
});

describe('cave reset', () => {
  it('clears cave progress once and keeps lairs', () => {
    const p = migrate({ inv: [], cleared: { 'c1,2': 1, 'l0,1': 1 }, dgClear: { 'c1,2': 1 } });
    expect(p.cleared).toEqual({ 'l0,1': 1 });
    expect(p.dgClear).toEqual({});
    p.cleared['c3,3'] = 1;
    expect(migrate(p).cleared['c3,3']).toBe(1);
  });
});
