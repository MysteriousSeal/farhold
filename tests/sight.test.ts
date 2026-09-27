import { describe, expect, it } from 'vitest';
import { clearLine } from '../src/model/game/enemies';

// Underground aggro needs a clear line of sight: rock walls hide the hero.
/** A small dungeon from a text map: '#' rock, '.' floor. */
function level(rows: string[]) {
  const T = 40;
  return {
    T,
    isF: (i: number, j: number) => rows[j]?.[i] === '.',
  };
}
const at = (i: number, j: number) => [(i + 0.5) * 40, (j + 0.5) * 40] as const;
const room = level([
  '##########',
  '#........#',
  '#........#',
  '#...##...#',
  '#...##...#',
  '#........#',
  '##########',
]);

describe('line of sight underground', () => {
  it('sees across an open room', () => {
    expect(clearLine(room, ...at(1, 1), ...at(8, 1))).toBe(true);
    expect(clearLine(room, ...at(1, 5), ...at(8, 5))).toBe(true);
  });

  it('a rock pillar in between blocks the view', () => {
    expect(clearLine(room, ...at(2, 3), ...at(7, 4))).toBe(false);
    expect(clearLine(room, ...at(4, 1), ...at(5, 5))).toBe(false);
  });

  it('sees around the pillar along the edges', () => {
    expect(clearLine(room, ...at(1, 2), ...at(8, 2))).toBe(true);
    expect(clearLine(room, ...at(3, 1), ...at(3, 5))).toBe(true);
  });

  it('is the same both ways', () => {
    for (const [a, b] of [
      [at(2, 3), at(7, 4)],
      [at(1, 1), at(8, 5)],
      [at(3, 1), at(6, 5)],
    ])
      expect(clearLine(room, ...a, ...b)).toBe(clearLine(room, ...b, ...a));
  });

  it('two separate caves never see each other through the rock', () => {
    const two = level(['#######', '#..#..#', '#..#..#', '#######']);
    expect(clearLine(two, ...at(1, 1), ...at(5, 2))).toBe(false);
    expect(clearLine(two, ...at(2, 2), ...at(4, 1))).toBe(false);
  });

  it('a creature always sees itself', () => {
    expect(clearLine(room, ...at(3, 3), ...at(3, 3))).toBe(true);
  });
});
