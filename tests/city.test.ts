import { describe, expect, it } from 'vitest';
import { strSeed } from '../src/core/math';
import { game } from '../src/model/game/state';
import { BRIDGES, CITY, STREETS, inWall, onBridge } from '../src/model/world/city';
import { poiAt, poiCache, poiSolid } from '../src/model/world/poi';
import { RIVER, riverDepth, riverY, terr, walkT } from '../src/model/world/terrain';

const SEEDS = ['alpha', 'bravo', 'charlie', 'delta'];
const city = (s: string) => {
  game.SEED = strSeed(s);
  poiCache.clear();
  return poiAt(0, 0);
};
/** Can a body of radius 8 stand at (x, y) in town (terrain, bridges and the town's solids)? */
const open = (v, x: number, y: number) =>
  (walkT(terr(x, y)) || onBridge(x, y)) && !poiSolid(v, x, y, 8);

describe('Hearthfire', () => {
  it('has its landmarks and a dense town', () => {
    for (const s of SEEDS) {
      const v = city(s),
        kinds = v.houses.map((h) => h.kind);
      for (const k of ['keep', 'temple', 'tavern', 'smithy']) expect(kinds).toContain(k);
      expect(v.houses.length).toBeGreaterThanOrEqual(34);
      expect(v.market.length).toBeGreaterThanOrEqual(6);
      expect(v.npcs.filter((n) => n.role === 'villager').length).toBeGreaterThan(15);
      expect(v.clutter.length).toBeGreaterThan(20);
      expect(v.gardens.length).toBeGreaterThan(3);
      expect(v.graveyard.stones.length).toBeGreaterThan(5);
    }
  });

  it('keeps every house inside the wall, apart from the others and out of the river', () => {
    for (const s of SEEDS) {
      const v = city(s);
      for (const h of v.houses) {
        expect(inWall(h.x - h.w / 2, h.y - 44)).toBe(true);
        expect(inWall(h.x + h.w / 2, h.y)).toBe(true);
        expect(riverDepth(h.x, h.y + 10)).toBeLessThan(-10);
        for (const o of v.houses)
          if (o !== h && Math.abs(o.y - h.y) < 44)
            expect(Math.abs(o.x - h.x)).toBeGreaterThanOrEqual((o.w + h.w) / 2);
      }
    }
  });

  it('can be crossed along the main streets, gate to gate and square to keep', () => {
    for (const s of SEEDS) {
      const v = city(s);
      for (const [x0, y0, x1, y1] of STREETS.slice(0, 4))
        for (let t = 0; t <= 1; t += 0.01) {
          const x = x0 + (x1 - x0) * t,
            y = y0 + (y1 - y0) * t;
          expect(open(v, x, y), `${s}: street blocked at ${x | 0},${y | 0}`).toBe(true);
        }
    }
  });

  it('has a river that blocks the way except over its bridges', () => {
    const v = city('alpha');
    for (const br of BRIDGES) {
      expect(walkT(terr(br.x, br.y))).toBe(false);
      expect(open(v, br.x, br.y)).toBe(true);
      expect(open(v, br.x, br.y - RIVER.w)).toBe(true);
      // the parapets keep the hero on the deck
      expect(open(v, br.x + br.hw + 4, br.y)).toBe(false);
    }
    for (const x of [-300, 200, 600]) expect(open(v, x, riverY(x))).toBe(false);
    // the river leaves the town under the wall into ponds
    expect(walkT(terr(CITY.rx + 60, riverY(CITY.rx + 60)))).toBe(false);
    expect(walkT(terr(RIVER.pond, riverY(RIVER.pond)))).toBe(false);
  });

  it('lets the hero reach every door and stall', () => {
    for (const s of SEEDS) {
      const v = city(s);
      for (const h of v.houses) {
        if (h.closed) continue;
        const dx = h.x + (h.door || 0) * h.w * 0.22;
        expect(open(v, dx, h.y + 16), `${s}: ${h.kind} door`).toBe(true);
      }
      for (const m of [v.stall, ...v.shops]) expect(open(v, m.x, m.y + 16)).toBe(true);
    }
  });

  it('keeps other places clear of the town', () => {
    for (const s of SEEDS) {
      city(s);
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++) {
          const p = poiAt(i, j);
          if (!p || p.city) continue;
          expect(inWall(p.x, p.y, -(p.r + 150))).toBe(false);
        }
    }
  });
});
