import { describe, expect, it } from 'vitest';
import { faceOf, headY, makeRig, rightArm } from '../src/art/body';
import { carryPos, handPos, restAng, weaponBehind } from '../src/art/humanoid';

// The humanoid skeleton, checked by numbers: weapons in the right hand in every facing, the
// guard pose mirrored between sides, staffs upright, and a real sitting pose.
const L = { race: 'human', skin: '#f0c8a0', hair: 0 };
const DIRS: [string, number, number][] = [
  ['down', 0, 1],
  ['down-right', 1, 1],
  ['right', 1, 0],
  ['up-right', 1, -1],
  ['up', 0, -1],
  ['up-left', -1, -1],
  ['left', -1, 0],
  ['down-left', -1, 1],
];
const hand = (dx: number, dy: number, off = false) =>
  handPos(dx, dy, false, 0, 0, 'human', 1, L, off);
/** The hero's own right side in the world: the facing turned a quarter clockwise. */
const rightOf = (dx: number, dy: number) => [-dy, dx];

describe('facings', () => {
  it.each(DIRS)('%s maps to the right view', (_, dx, dy) => {
    const f = faceOf(dx, dy);
    if (dy > 0) expect(f.f).toBe(dx === 0 || Math.abs(dy) > 0 ? 'down' : 'side');
    if (dy < 0) expect(f.f).toBe('up');
    if (dy === 0) expect(f.f).toBe('side');
    expect(f.flip).toBe(dx < 0);
    expect(f.diag).toBe(dx !== 0 && dy !== 0);
  });

  it('standing still faces the viewer', () => {
    expect(faceOf(0, 0)).toEqual({ f: 'down', flip: false, diag: false });
  });
});

describe('the weapon is always in the right hand', () => {
  it.each(DIRS)("%s: the hand is on the hero's right side", (_, dx, dy) => {
    const h = hand(dx, dy),
      [rx] = rightOf(dx, dy);
    if (rx !== 0) expect(Math.sign(h.x), `hand x ${h.x}`).toBe(Math.sign(rx));
  });

  it.each(DIRS)('%s: it is behind the body when the right side faces away', (_, dx, dy) => {
    const h = hand(dx, dy),
      [, ry] = rightOf(dx, dy);
    // the right side points away from the viewer (up the screen): far hand
    if (dx !== 0) expect(h.far).toBe(ry < 0);
    if (dx === 0) expect(h.far).toBe(false);
  });

  it.each(DIRS)('%s: the off hand is the other one', (_, dx, dy) => {
    const r = hand(dx, dy),
      l = hand(dx, dy, true);
    expect(l.px).toBe(-r.px);
    if (dx === 0) expect(Math.sign(l.x)).toBe(-Math.sign(r.x));
  });

  it('rightArm picks the arm on the right in every view', () => {
    expect(rightArm('down', false)).toBe(0);
    expect(rightArm('up', false)).toBe(1);
    expect(rightArm('side', false)).toBe(1);
    expect(rightArm('side', true)).toBe(0);
    expect(rightArm('down', true)).toBe(1);
    expect(rightArm('up', true)).toBe(0);
  });

  it('facing left, a resting weapon is drawn behind the body', () => {
    expect(weaponBehind(hand(-1, 0), 'warrior')).toBe(true);
    expect(weaponBehind(hand(1, 0), 'warrior')).toBe(false);
  });
});

describe('the guard pose (blade up)', () => {
  const guard = (dx: number, dy: number) => carryPos(dx, dy, false, 0, 0, 'human', 1, L);

  it.each(DIRS)('%s: the guard hand is the right hand', (_, dx, dy) => {
    const g = guard(dx, dy),
      [rx] = rightOf(dx, dy);
    if (rx !== 0) expect(Math.sign(g.x)).toBe(Math.sign(rx));
  });

  it.each(DIRS)('%s: the blade points up', (_, dx, dy) => {
    expect(Math.sin(guard(dx, dy).ang)).toBeLessThan(-0.9);
  });

  it('facing left mirrors facing right', () => {
    const r = guard(1, 0),
      l = guard(-1, 0);
    expect(l.x).toBeCloseTo(-r.x * (l.arm.x / r.arm.x), 5);
    expect(Math.cos(l.ang)).toBeCloseTo(-Math.cos(r.ang), 5);
    expect(Math.sin(l.ang)).toBeCloseTo(Math.sin(r.ang), 5);
  });

  it.each(DIRS.filter(([, dx, dy]) => dx !== 0 && dy !== 0))(
    '%s: the blade leans outward, away from the body',
    (_, dx, dy) => {
      const g = guard(dx, dy);
      expect(Math.sign(Math.cos(g.ang))).toBe(Math.sign(g.x));
    },
  );

  it('the blade is behind the body from behind and on the far side', () => {
    expect(guard(0, -1).behind).toBe(true);
    expect(guard(-1, 0).behind).toBe(true);
    expect(guard(-1, 0).far).toBe(true);
    expect(guard(1, 0).behind).toBe(false);
    expect(guard(0, 1).behind).toBe(false);
  });

  it('a far hand reaches further out so the blade clears the head', () => {
    expect(Math.abs(guard(-1, 0).arm.x)).toBeGreaterThan(Math.abs(guard(1, 0).arm.x));
  });
});

describe('resting angles', () => {
  it.each(DIRS)('%s: a staff stays nearly upright (orb up)', (_, dx, dy) => {
    const a = restAng(hand(dx, dy), 'mage');
    expect(Math.abs(a)).toBeLessThan(0.5);
  });

  it.each(DIRS)('%s: a bow is held upright at the side', (_, dx, dy) => {
    const a = restAng(hand(dx, dy), 'ranger');
    expect(Math.abs(Math.sin(a))).toBeLessThan(1e-9);
  });

  it.each(DIRS)('%s: a resting blade points down and outward', (_, dx, dy) => {
    const h = hand(dx, dy),
      a = restAng(h, 'warrior');
    if (h.f !== 'side') {
      expect(Math.sin(a)).toBeGreaterThan(0.5);
      expect(Math.sign(Math.cos(a))).toBe(Math.sign(h.x));
    }
  });
});

describe('sitting', () => {
  const views: [string, boolean][] = [
    ['down', false],
    ['down', true],
    ['side', false],
    ['up', true],
    ['up', false],
  ];
  const rig = (f: string, diag: boolean, sit: boolean) =>
    makeRig(L, f, diag, false, 0, 0, null, sit);

  it.each(views)('%s (diag %s): the hips come down to seat height', (f, diag) => {
    expect(rig(f, diag, true).hipY).toBeGreaterThan(rig(f, diag, false).hipY + 1);
  });

  it.each(views)('%s (diag %s): the feet stay on the floor, where standing feet are', (f, diag) => {
    // (in 3/4 views the far foot stands a little higher, standing or seated)
    const S = rig(f, diag, true),
      U = rig(f, diag, false);
    S.legs.forEach((g, i) => expect(g.c[1]).toBeCloseTo(U.legs[i].c[1], 5));
  });

  it.each(views)('%s (diag %s): the head stays above the hips', (f, diag) => {
    const R = rig(f, diag, true);
    expect(R.hy).toBeLessThan(R.hipY);
    expect(R.shY).toBeLessThan(R.hipY);
  });

  it('from the side the thighs point forward', () => {
    const R = rig('side', false, true);
    for (const g of R.legs) expect(g.b[0] - g.a[0]).toBeGreaterThan(4);
  });

  it('facing us the knees come toward the viewer (below the hips)', () => {
    const R = rig('down', false, true);
    for (const g of R.legs) expect(g.b[1]).toBeGreaterThan(g.a[1]);
  });

  it('a seated head is lower than a standing one', () => {
    expect(headY(L, true)).toBeGreaterThan(headY(L));
  });

  it('standing is unchanged by the new option', () => {
    const a = makeRig(L, 'down', false, false, 0, 0),
      b = makeRig(L, 'down', false, false, 0, 0, null, false);
    expect(b.hipY).toBe(a.hipY);
    expect(b.legs).toEqual(a.legs);
  });
});
