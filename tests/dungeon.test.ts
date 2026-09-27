import { beforeAll, describe, expect, it } from 'vitest';
import { strSeed } from '../src/core/math';
import { game } from '../src/model/game/state';
import { Dungeon, genDungeon } from '../src/model/world/dungeon';

// Caves (natural caverns) and stone-gate crypts: layout rules that once broke, checked over
// many generated levels.
const CAVES = Array.from({ length: 24 }, (_, i) => 'c' + i * 7 + '_' + (i % 5));
const CRYPTS = Array.from({ length: 10 }, (_, i) => 'g' + i * 11 + '_2');

beforeAll(() => {
  game.SEED = strSeed('dungeon-tests');
});
const cave = (k: string) => genDungeon(k, 5, 0, 'cave');
const walls = (D, x: number, y: number) => !D.isF(x, y);
/** Floor cells reachable from the start with 4-way steps. */
function reach(D) {
  const seen = new Set<number>(),
    q = [[D.start.cx, D.start.cy]];
  seen.add(D.start.cy * D.GW + D.start.cx);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        k = ny * D.GW + nx;
      if (!D.isF(nx, ny) || seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}
const cell = (D, x: number, y: number) => [Math.floor(x / D.T), Math.floor(y / D.T)];

describe('caverns: shape', () => {
  it.each(CAVES)('%s has no corner-only floor pinches', (k) => {
    const D = cave(k);
    for (let y = 0; y < D.GH - 1; y++)
      for (let x = 0; x < D.GW - 1; x++) {
        const a = D.isF(x, y),
          b = D.isF(x + 1, y),
          c = D.isF(x, y + 1),
          d = D.isF(x + 1, y + 1);
        expect((a && d && !b && !c) || (b && c && !a && !d), `pinch at ${x},${y}`).toBe(false);
      }
  });

  it.each(CAVES)('%s has no lone rock tiles or one-tile rock strips', (k) => {
    const D = cave(k);
    for (let y = 1; y < D.GH - 1; y++)
      for (let x = 1; x < D.GW - 1; x++) {
        if (D.isF(x, y)) continue;
        const rib = (D.isF(x - 1, y) && D.isF(x + 1, y)) || (D.isF(x, y - 1) && D.isF(x, y + 1));
        expect(rib, `rock strip at ${x},${y}`).toBe(false);
      }
  });

  it.each(CAVES)('%s: the chest chamber is reachable from the entrance', (k) => {
    const D = cave(k);
    expect(reach(D).has(D.end.cy * D.GW + D.end.cx)).toBe(true);
  });

  it('caves are deterministic for a key', () => {
    const a = cave('c-same'),
      b = cave('c-same');
    expect([...a.grid]).toEqual([...b.grid]);
    expect(a.exit).toEqual(b.exit);
  });
});

describe('caverns: the way out', () => {
  it.each(CAVES)('%s: the mouth is in a north rock face with room to arrive', (k) => {
    const D = cave(k),
      i = Math.floor(D.exit.x / D.T),
      j = Math.round((D.exit.y - 6) / D.T);
    expect(D.isF(i, j)).toBe(true);
    expect(walls(D, i, j - 1)).toBe(true);
    // the hero arrives just below it, on floor
    const [ax, ay] = cell(D, D.exit.x, D.exit.y + 54);
    expect(D.isF(ax, ay)).toBe(true);
    expect(reach(D).has(j * D.GW + i)).toBe(true);
  });

  it.each(CAVES)('%s: the mouth belongs to the first chamber', (k) => {
    const D = cave(k),
      i = Math.floor(D.exit.x / D.T),
      j = Math.round((D.exit.y - 6) / D.T),
      s = D.start;
    expect(i).toBeGreaterThanOrEqual(s.x - 3);
    expect(i).toBeLessThanOrEqual(s.x + s.w + 3);
    expect(j).toBeGreaterThanOrEqual(s.y - 3);
    expect(j).toBeLessThanOrEqual(s.y + s.h + 3);
  });
});

describe('caverns: torches', () => {
  it.each(CAVES)('%s: torches hang on rock faces above floor, spaced apart', (k) => {
    const D = cave(k);
    for (const t of D.torches) {
      expect(walls(D, t.tx, t.ty)).toBe(true);
      expect(D.isF(t.tx, t.ty + 1)).toBe(true);
    }
    for (const a of D.torches)
      for (const b of D.torches)
        if (a !== b) expect(Math.abs(a.tx - b.tx) < 4 && Math.abs(a.ty - b.ty) < 3).toBe(false);
  });

  it.each(CAVES)('%s: no torch on the mouth face', (k) => {
    const D = cave(k),
      i = Math.floor(D.exit.x / D.T),
      j = Math.round((D.exit.y - 6) / D.T);
    for (const t of D.torches) expect(t.ty === j - 1 && Math.abs(t.tx - i) < 3).toBe(false);
  });

  it('almost every chamber has a torch', () => {
    let rooms = 0,
      dark = 0;
    for (const k of CAVES) {
      const D = cave(k);
      for (const r of D.rooms) {
        rooms++;
        const lit = D.torches.some(
          (t) => t.tx >= r.x - 1 && t.tx < r.x + r.w + 1 && t.ty >= r.y - 2 && t.ty < r.y + r.h,
        );
        if (!lit) dark++;
      }
    }
    expect(dark / rooms).toBeLessThan(0.03);
  });

  it('caves average about a dozen torches', () => {
    const n = CAVES.reduce((a, k) => a + cave(k).torches.length, 0) / CAVES.length;
    expect(n).toBeGreaterThan(8);
    expect(n).toBeLessThan(17);
  });
});

describe('caverns: floor dressing', () => {
  it.each(CAVES)('%s: no rubble in caves', (k) => {
    expect(cave(k).props.some((p) => p.k === 'rubble')).toBe(false);
  });

  it.each(CAVES)('%s: bones and stalagmites stand on open floor, clear of the rock', (k) => {
    const D = cave(k);
    for (const p of D.props) {
      if (p.k === 'web') continue;
      const [i, j] = cell(D, p.x, p.y);
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        expect(D.isF(i + dx, j + dy), `${p.k} at ${i},${j}`).toBe(true);
    }
  });

  it.each(CAVES)('%s: cobwebs sit in corners where two rock faces meet', (k) => {
    const D = cave(k);
    for (const p of D.props.filter((q) => q.k === 'web')) {
      expect(p.corner).toBeTruthy();
      const [sx, sy] = p.corner,
        // the web's point is a cell corner; the floor cell is on the opposite side
        i = Math.floor((p.x - sx * 1) / D.T),
        j = Math.floor((p.y - sy * 1) / D.T);
      expect(D.isF(i, j)).toBe(true);
      expect(walls(D, i + sx, j)).toBe(true);
      expect(walls(D, i, j + sy)).toBe(true);
      expect(p.x % D.T).toBe(0);
      expect(p.y % D.T).toBe(0);
    }
  });

  it.each(CAVES)('%s: nothing is dropped on the mouth', (k) => {
    const D = cave(k),
      i = Math.floor(D.exit.x / D.T),
      j = Math.round((D.exit.y - 6) / D.T);
    for (const p of D.props.filter((q) => q.k !== 'web')) {
      const [pi, pj] = cell(D, p.x, p.y);
      expect(Math.abs(pi - i) + Math.abs(pj - j)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Dungeon objects', () => {
  it.each(CAVES.slice(0, 6))('%s: rock blocks the way, open floor does not', (k) => {
    const D = cave(k);
    expect(D).toBeInstanceOf(Dungeon);
    const s = D.start;
    expect(D.solidAt((s.cx + 0.5) * D.T, (s.cy + 0.5) * D.T, 6)).toBe(false);
    expect(D.solidAt(-50, -50, 6)).toBe(true);
    // a body far wider than the chamber can't stand in it
    expect(D.solidAt((s.cx + 0.5) * D.T, (s.cy + 0.5) * D.T, D.T * 30)).toBe(true);
  });

  it('isF can be handed around on its own', () => {
    const D = cave('c-detached'),
      f = D.isF;
    expect(f(D.start.cx, D.start.cy)).toBe(true);
    expect(f(-1, -1)).toBe(false);
  });
});

describe('crypts (stone gates)', () => {
  it.each(CRYPTS)('%s keeps the built style, reachable end and its stairs exit', (k) => {
    const D = genDungeon(k, 5, 0, 'crypt');
    expect(D.style).not.toBe('cave');
    expect(reach(D).has(D.end.cy * D.GW + D.end.cx)).toBe(true);
    const [i, j] = cell(D, D.exit.x, D.exit.y);
    expect(D.isF(i, j)).toBe(true);
  });

  it('crypt layouts still use rubble and crates', () => {
    const kinds = new Set(
      CRYPTS.flatMap((k) => genDungeon(k, 5, 0, 'crypt').props.map((p) => p.k)),
    );
    expect(kinds.has('rubble') || kinds.has('crate')).toBe(true);
  });
});
