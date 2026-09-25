import { beforeEach, describe, expect, it } from 'vitest';
import { SLOTS } from '../src/data/classes';
import { loadSave, migrate, save } from '../src/game/save';
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

  it('reads a legacy v1 key', () => {
    store.set('farhold_save_v1', JSON.stringify({ name: 'Old', inv: [] }));
    expect(loadSave()?.name).toBe('Old');
  });

  it('saves the cave entrance position and drops derived data', () => {
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
    const s = JSON.parse(store.get('farhold_save_v2')!);
    expect([s.x, s.y]).toEqual([100, 200]);
    expect(s.look).toBeUndefined();
    expect(loadSave()?.name).toBe('Brom');
  });

  it('returns null on a corrupt save', () => {
    store.set('farhold_save_v2', '{nope');
    expect(loadSave()).toBeNull();
  });
});
