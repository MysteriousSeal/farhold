import { beforeAll, describe, expect, it } from 'vitest';
import { strSeed } from '../src/core/math';
import { game } from '../src/model/game/state';
import { BAR_ROW, IT, genInterior, inSolid } from '../src/model/world/interior';
import { pathToBar } from '../src/model/world/tavernPath';

// Tavern interiors: loose table clusters, seats on every side, the bar sealed at its open
// end, and patrons able to walk to the bar. Generated for many villages, small and big.
const VILLAGES = Array.from({ length: 14 }, (_, i) => ({
  key: 'v' + i + ',' + (i * 3 - 7),
  name: 'Testford',
  b: i % 7,
  lvl: 1 + i,
  big: i % 4 === 0,
}));
beforeAll(() => {
  game.SEED = strSeed('tavern-tests');
});
const inn = (v) =>
  genInterior(v, { kind: 'tavern', big: v.big, name: 'The Test Mug', door: 0, w: 120 }, 3);
const CASES = VILLAGES.map((v) => [v.key + (v.big ? ' (big)' : ''), v] as const);

/** Cells the hero can stand in: floor with no furniture solid at the centre. */
function walkable(I, i: number, j: number) {
  return (
    I.grid[j * I.GW + i] === 1 &&
    !I.solids.some((s) => inSolid(s, (i + 0.5) * IT, (j + 0.5) * IT, 9))
  );
}
function reachFromDoor(I) {
  const seen = new Set<number>(),
    q: number[][] = [];
  // the doormat cell and the ones next to it
  for (let j = I.GH - 2; j >= I.GH - 3; j--)
    if (walkable(I, I.door.cx, j)) {
      q.push([I.door.cx, j]);
      seen.add(j * I.GW + I.door.cx);
      break;
    }
  while (q.length) {
    const [i, j] = q.pop();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + dx,
        nj = j + dy,
        k = nj * I.GW + ni;
      if (seen.has(k) || !walkable(I, ni, nj)) continue;
      seen.add(k);
      q.push([ni, nj]);
    }
  }
  return seen;
}

describe('tavern interiors', () => {
  it.each(CASES)('%s: the bar spot and the barmaid are set up', (_, v) => {
    const I = inn(v);
    expect(I.bar).toBeTruthy();
    expect(I.npcs.filter((n) => n.role === 'barmaid')).toHaveLength(1);
    expect(I.furn.filter((f) => f.k === 'bar')).toHaveLength(1);
  });

  it.each(CASES)('%s: the hero can walk from the door to the bar', (_, v) => {
    const I = inn(v),
      seen = reachFromDoor(I),
      bi = Math.floor(I.bar.x / IT);
    const near = [-1, 0, 1].some((d) => seen.has((BAR_ROW + 1) * I.GW + bi + d));
    expect(near).toBe(true);
  });

  it.each(CASES)('%s: nobody can get behind the bar', (_, v) => {
    // walk the floor in fine steps, with the hero's size, from the doormat
    const I = inn(v),
      bar = I.furn.find((f) => f.k === 'bar'),
      step = 8,
      r = 9,
      free = (x: number, y: number) =>
        x > IT + r &&
        x < (I.GW - 1) * IT - r &&
        y > IT + 18 + r - 12 &&
        y < (I.GH - 1) * IT - r &&
        !I.solids.some((s) => inSolid(s, x, y, r)),
      key = (x: number, y: number) => x * 10000 + y,
      start: [number, number] = [(I.door.cx + 0.5) * IT, (I.GH - 1.5) * IT],
      seen = new Set([key(...start)]),
      q = [start];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (seen.has(key(nx, ny)) || !free(nx, ny)) continue;
        seen.add(key(nx, ny));
        q.push([nx, ny]);
      }
    }
    // the strip between the counter and the back wall stays out of reach
    const x0 = bar.cx * IT,
      x1 = (bar.cx + bar.cw) * IT,
      yBack = (BAR_ROW + 1) * IT - 30; // the counter's top edge
    for (const k of seen) {
      const x = Math.floor(k / 10000),
        y = k % 10000;
      expect(x > x0 && x < x1 && y < yBack, `reached ${x},${y}`).toBe(false);
    }
  });

  it.each(CASES)('%s: the bar turns the corner at its open end (a shut flap)', (_, v) => {
    const I = inn(v),
      bar = I.furn.find((f) => f.k === 'bar'),
      flap = I.furn.find((f) => f.k === 'barflap');
    expect(flap).toBeTruthy();
    const openRight = bar.cx === 1;
    expect(openRight ? flap.cx === bar.cx + bar.cw - 1 : flap.cx === bar.cx).toBe(true);
  });

  it.each(CASES)('%s: tables are not all in rows (several table rows and kinds)', (_, v) => {
    const I = inn(v),
      tables = I.furn.filter((f) => ['ttable', 'rtable', 'ltable'].includes(f.k));
    expect(tables.length).toBeGreaterThanOrEqual(2);
    expect(new Set(tables.map((t) => t.k)).size).toBeGreaterThanOrEqual(1);
    // offsets break the grid: at least one table is not on a whole cell
    expect(tables.some((t) => Math.abs(t.x - (t.cx + t.cw / 2) * IT) > 0.5)).toBe(true);
  });

  it.each(CASES)('%s: table clusters never overlap', (_, v) => {
    const I = inn(v),
      tables = I.furn.filter((f) => ['ttable', 'rtable', 'ltable'].includes(f.k));
    const cells = new Set<string>();
    for (const t of tables)
      for (let i = t.cx; i < t.cx + t.cw; i++) {
        const key = i + ',' + t.cy;
        expect(cells.has(key)).toBe(false);
        cells.add(key);
      }
  });

  it.each(CASES)('%s: every furniture piece stands on the floor', (_, v) => {
    const I = inn(v);
    for (const f of I.furn) {
      if (f.k === 'rug') continue;
      for (let i = f.cx; i < f.cx + f.cw; i++)
        for (let j = f.cy; j < f.cy + f.ch; j++)
          expect(I.grid[j * I.GW + i], `${f.k} at ${i},${j}`).toBe(1);
    }
  });

  it.each(CASES)('%s: patrons sit on seats and every seat faces a real way', (_, v) => {
    const I = inn(v),
      pats = I.npcs.filter((n) => n.role === 'patron');
    expect(pats.length).toBeGreaterThanOrEqual(3);
    for (const n of pats) {
      expect(['down', 'up', 'left', 'right']).toContain(n.seat.face);
      expect(n.sits).toBe(true);
      expect(n.x).toBe(n.seat.x);
    }
  });

  it.each(CASES)('%s: no two patrons share a seat', (_, v) => {
    const I = inn(v),
      spots = I.npcs.filter((n) => n.role === 'patron').map((n) => n.seat.x + ',' + n.seat.y);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it.each(CASES)('%s: every table patron can walk to the bar', (_, v) => {
    const I = inn(v);
    for (const n of I.npcs.filter((p) => p.role === 'patron' && !p.seat.stool)) {
      const path = pathToBar(I, n.seat.x, n.seat.y);
      expect(path, `patron at ${n.seat.x},${n.seat.y}`).toBeTruthy();
      const last = path[path.length - 1];
      expect(last.y).toBe((BAR_ROW + 1.5) * IT);
      // they don't queue on the hero's ordering spot
      expect(Math.abs(last.x - I.bar.x)).toBeGreaterThanOrEqual(IT * 0.6);
    }
  });

  it.each(CASES)('%s: bar stools stay clear of the ordering spot', (_, v) => {
    const I = inn(v);
    for (const s of I.furn.filter((f) => f.k === 'barstool')) {
      expect(s.cy).toBe(BAR_ROW + 1);
      expect(Math.abs(s.x - I.bar.x)).toBeGreaterThanOrEqual(IT * 1.5);
    }
  });

  it('side chairs sort behind their sitter', () => {
    for (const v of VILLAGES) {
      const I = inn(v);
      for (const f of I.furn.filter((q) => q.k === 'chairS' || q.k === 'chairSb'))
        expect(f.z).toBeLessThan(f.y);
    }
  });

  it('big taverns seat more than small ones', () => {
    const seats = (big: boolean) =>
      VILLAGES.filter((v) => v.big === big)
        .map((v) => inn(v).npcs.filter((n) => n.role === 'patron').length)
        .reduce((a, b) => a + b, 0) / VILLAGES.filter((v) => v.big === big).length;
    expect(seats(true)).toBeGreaterThan(seats(false));
  });

  it('the same village always gets the same tavern', () => {
    const a = inn(VILLAGES[2]),
      b = inn(VILLAGES[2]);
    expect(a.furn.map((f) => [f.k, f.x, f.y])).toEqual(b.furn.map((f) => [f.k, f.x, f.y]));
  });
});
