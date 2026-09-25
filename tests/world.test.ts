import { describe, expect, it } from 'vitest';
import { strSeed } from '../src/core/math';
import { game } from '../src/game/state';
import { poiAt, poiCache } from '../src/world/poi';
import { dangerAt, terr, walkT } from '../src/world/terrain';

const SEEDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
const useSeed = (s: string) => {
  game.SEED = strSeed(s);
  poiCache.clear();
};

describe('world/terrain', () => {
  it('danger grows with distance from Hearthfire', () => {
    expect(dangerAt(0, 0)).toBe(1);
    expect(dangerAt(420, 0)).toBe(2);
    expect(dangerAt(0, -4200)).toBe(11);
  });

  it('the spawn point is always walkable meadow', () => {
    for (const s of SEEDS) {
      useSeed(s);
      const T = terr(0, 0);
      expect(walkT(T)).toBe(true);
      expect(T.b).toBe(0);
    }
  });

  it('terrain is deterministic for a seed', () => {
    useSeed('alpha');
    const a = terr(5123, -2210);
    useSeed('bravo');
    terr(5123, -2210);
    useSeed('alpha');
    expect(terr(5123, -2210)).toEqual(a);
  });

  it('terrain and biome indices stay in range', () => {
    useSeed('charlie');
    for (let i = 0; i < 400; i++) {
      const T = terr((i % 20) * 900 - 9000, Math.floor(i / 20) * 900 - 9000);
      expect(T.t).toBeGreaterThanOrEqual(0);
      expect(T.t).toBeLessThanOrEqual(5);
      expect(T.b).toBeGreaterThanOrEqual(0);
      expect(T.b).toBeLessThanOrEqual(6);
    }
  });
});

describe('world/poi', () => {
  it('Hearthfire is the home village at the origin', () => {
    for (const s of SEEDS) {
      useSeed(s);
      const v = poiAt(0, 0);
      expect(v.kind).toBe('village');
      expect(v.key).toBe('v0,0');
      expect(v.home).toBe(true);
      expect(v.stall && v.forge && v.board && v.way).toBeTruthy();
    }
  });

  it('points of interest are deterministic for a seed', () => {
    useSeed('delta');
    const pick = () => {
      const out: string[] = [];
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const p = poiAt(i, j);
        out.push(p ? `${p.kind}:${p.name}:${Math.round(p.x)},${Math.round(p.y)}` : '-');
      }
      return out;
    };
    const first = pick();
    useSeed('delta');
    expect(pick()).toEqual(first);
    expect(first.some(s => s !== '-' && !s.startsWith('village:Hearthfire'))).toBe(true);
  });
});
