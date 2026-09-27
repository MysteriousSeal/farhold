import { beforeEach, describe, expect, it } from 'vitest';
import { strSeed } from '../src/core/math';
import { BOSS } from '../src/model/data/bosses';
import { ET } from '../src/model/data/enemies';
import { Enemy, updateEnemies } from '../src/model/game/enemies';
import { Hero } from '../src/model/game/hero';
import { game } from '../src/model/game/state';

// Enemies as objects: how they are made, scaled and brought down.
beforeEach(() => {
  game.SEED = strSeed('enemy-tests');
  game.mode = 'world';
  game.state = 'play';
  game.P = new Hero({ x: 0, y: 5000, lvl: 5, hp: 100 });
  game.enemies = [];
});

describe('Enemy', () => {
  it.each(Object.keys(ET))('a %s starts at full health, idle and on its spot', (k) => {
    const e = new Enemy(k, 6, 100, 200);
    expect(e).toBeInstanceOf(Enemy);
    expect(e.hp).toBe(e.max);
    expect(e.max).toBeGreaterThan(0);
    expect(e.dmg).toBeGreaterThan(0);
    expect([e.x, e.y]).toEqual([100, 200]);
    expect(e.aggro).toBe(false);
  });

  it('grows tougher and hits harder with its level', () => {
    const lo = new Enemy('wolf', 2, 0, 0),
      hi = new Enemy('wolf', 20, 0, 0);
    expect(hi.max).toBeGreaterThan(lo.max);
    expect(hi.dmg).toBeGreaterThan(lo.dmg);
  });

  it('an elite is bigger and tougher; a Giant most of all; Swift is faster', () => {
    const plain = new Enemy('boar', 8, 0, 0),
      armored = new Enemy('boar', 8, 0, 0, { elite: 'Armored' }),
      giant = new Enemy('boar', 8, 0, 0, { elite: 'Giant' }),
      swift = new Enemy('boar', 8, 0, 0, { elite: 'Swift' });
    expect(armored.max).toBeGreaterThan(plain.max);
    expect(giant.max).toBeGreaterThan(armored.max);
    expect(giant.sc).toBeGreaterThan(armored.sc);
    expect(swift.spd).toBeGreaterThan(plain.spd * 1.2);
  });

  it.each(Object.keys(BOSS))('the %s boss is an Enemy that is out for the hero', (bt) => {
    const b = Enemy.boss(bt, 10, 0, 0, null);
    expect(b).toBeInstanceOf(Enemy);
    expect(b.boss).toBe(BOSS[bt]);
    expect(b.aggro).toBe(true);
    expect(b.hp).toBe(b.max);
    expect(b.home).toEqual({ x: 0, y: 0 });
  });

  it('a guardian (mini boss) is weaker than the lair boss', () => {
    const bt = Object.keys(BOSS)[0];
    expect(Enemy.boss(bt, 10, 0, 0, { mini: true }).max).toBeLessThan(
      Enemy.boss(bt, 10, 0, 0, null).max,
    );
  });

  it('far from the hero in the world, an enemy despawns', () => {
    const e = new Enemy('wolf', 5, 0, 0);
    game.enemies = [e];
    updateEnemies(1 / 30);
    expect(game.enemies).toHaveLength(0);
  });

  it('a dying enemy is gone once its fall is over', () => {
    const e = new Enemy('wolf', 5, 0, 5050);
    e.dying = 0.1;
    game.enemies = [e];
    updateEnemies(0.05);
    expect(game.enemies).toHaveLength(1);
    updateEnemies(0.1);
    expect(game.enemies).toHaveLength(0);
  });
});
