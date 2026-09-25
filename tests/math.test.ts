import { beforeEach, describe, expect, it } from 'vitest';
import { clamp, fbm, hs, lerp, mixCol, mulberry, sh, strSeed, vn } from '../src/core/math';
import { game } from '../src/game/state';

describe('core/math', () => {
  beforeEach(() => {
    game.SEED = strSeed('test');
  });

  it('clamps and lerps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('strSeed is stable and discriminating', () => {
    expect(strSeed('farhold')).toBe(strSeed('farhold'));
    expect(strSeed('farhold')).not.toBe(strSeed('farhold2'));
  });

  it('mulberry is a deterministic [0,1) generator', () => {
    const a = mulberry(42), b = mulberry(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('noise depends only on coordinates and world seed', () => {
    const v1 = [hs(3, 7, 1), vn(12.3, -4.5, 9), fbm(100.5, 200.25, 4, 1)];
    const v2 = [hs(3, 7, 1), vn(12.3, -4.5, 9), fbm(100.5, 200.25, 4, 1)];
    expect(v1).toEqual(v2);
    game.SEED = strSeed('other');
    expect(hs(3, 7, 1)).not.toBe(v1[0]);
  });

  it('noise stays in [0,1]', () => {
    for (let i = 0; i < 500; i++) {
      const x = (i * 37.1) % 997, y = (i * 91.7) % 991;
      const v = vn(x, y, 5), f = fbm(x, y, 4, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('shades and mixes colors', () => {
    expect(sh('#000000', 0.5)).toBe('#808080');
    expect(sh('#ffffff', -1)).toBe('#000000');
    expect(mixCol('#000000', '#ffffff')).toBe('#808080');
  });
});
