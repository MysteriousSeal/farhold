/* ================= DATA: the passive skill tree ================= */
// A web of passive nodes around a start node. Three branches leave the centre: Might (up),
// Cunning (down right) and Guard (down left). Each runs out to a notable fork, then splits
// into two paths of small nodes, a notable and a keystone at the end. A ring of hybrid nodes
// links the three forks, so builds can mix branches. You learn a node next to one you own.
//
// Effects (fx) are summed into the hero's stats by game/stats.ts:
//   dmg %, hp %, armor %, crit (+crit chance), critd (+crit damage %), aspd %, spd (move %),
//   leech %, regen (% max health per second), cdr %, roll (roll cooldown -%), reach (+15% arc
//   and radius, +1 pierce per point), gold %, xp %, dodge %, dr (damage taken -%),
//   killHeal (% max health per kill), pot (potion healing %), last (damage below 35% health %)

export type TreeKind = 'start' | 'small' | 'notable' | 'key';
export type TreeNode = {
  id: string;
  kind: TreeKind;
  /** branch: m Might, g Guard, c Cunning, h hybrid (ring), s start */
  br: string;
  n: string;
  /** icon glyph drawn by ui/skillTree.ts */
  ic: string;
  fx: Record<string, number>;
  /** extra rule text for keystones and some notables */
  note?: string;
  x: number;
  y: number;
};

type Path = {
  small: [string, string, Record<string, number>][];
  notable: Omit<TreeNode, 'id' | 'kind' | 'br' | 'x' | 'y'>;
  key: Omit<TreeNode, 'id' | 'kind' | 'br' | 'x' | 'y'>;
};
type Branch = {
  id: string;
  ang: number; // degrees, 0 = right, 90 = down
  inner: [string, string, Record<string, number>][];
  fork: Omit<TreeNode, 'id' | 'kind' | 'br' | 'x' | 'y'>;
  paths: [Path, Path];
};

const BRANCHES: Branch[] = [
  {
    id: 'm',
    ang: -90,
    inner: [
      ['Honed edge', 'dmg', { dmg: 4 }],
      ['Honed edge', 'dmg', { dmg: 4 }],
    ],
    fork: { n: 'Brutality', ic: 'dmg', fx: { dmg: 8, critd: 10 } },
    paths: [
      {
        // left: crits
        small: [
          ['Keen eye', 'crit', { crit: 2 }],
          ['Cruel strikes', 'critd', { critd: 12 }],
          ['Keen eye', 'crit', { crit: 2 }],
        ],
        notable: { n: 'Deadly precision', ic: 'crit', fx: { crit: 5, critd: 25 } },
        key: {
          n: "Executioner's creed",
          ic: 'key',
          fx: { critd: 60, crit: 5, hp: -15 },
          note: 'Crits hit far harder, but you have 15% less health.',
        },
      },
      {
        // right: attack speed and life steal
        small: [
          ['Quick hands', 'aspd', { aspd: 5 }],
          ['Quick hands', 'aspd', { aspd: 5 }],
          ['Bloodletting', 'leech', { leech: 1.5 }],
        ],
        notable: { n: 'Bloodthirst', ic: 'leech', fx: { leech: 3, killHeal: 2 } },
        key: {
          n: 'Berserker',
          ic: 'key',
          fx: { dmg: 30, aspd: 10, armor: -30 },
          note: 'Hit harder and faster, with 30% less armor.',
        },
      },
    ],
  },
  {
    id: 'c',
    ang: 30,
    inner: [
      ['Light step', 'spd', { spd: 3 }],
      ['Tumbler', 'roll', { roll: 8 }],
    ],
    fork: { n: 'Nimble', ic: 'dodge', fx: { spd: 5, dodge: 5 } },
    paths: [
      {
        // up: cooldowns and reach
        small: [
          ['Focus', 'cdr', { cdr: 4 }],
          ['Wide swings', 'reach', { reach: 1 }],
          ['Focus', 'cdr', { cdr: 4 }],
        ],
        notable: { n: 'Tactician', ic: 'cdr', fx: { cdr: 10, dmg: 5 } },
        key: {
          n: 'Arcane surge',
          ic: 'key',
          fx: { cdr: 25, reach: 1, hp: -12 },
          note: 'Skills come back much sooner, but you have 12% less health.',
        },
      },
      {
        // down: fortune
        small: [
          ['Coin sense', 'gold', { gold: 10 }],
          ['Quick study', 'xp', { xp: 5 }],
          ['Coin sense', 'gold', { gold: 10 }],
        ],
        notable: { n: 'Treasure hunter', ic: 'gold', fx: { gold: 20, xp: 10 } },
        key: {
          n: 'Gambler',
          ic: 'key',
          fx: { gold: 40, xp: 20, pot: -30 },
          note: 'Richer and wiser, but potions heal 30% less.',
        },
      },
    ],
  },
  {
    id: 'g',
    ang: 150,
    inner: [
      ['Sturdy', 'hp', { hp: 5 }],
      ['Thick hide', 'armor', { armor: 6 }],
    ],
    fork: { n: 'Stalwart', ic: 'armor', fx: { hp: 10, armor: 10 } },
    paths: [
      {
        // down: regeneration and potions
        small: [
          ['Recovery', 'regen', { regen: 0.2 }],
          ['Herbalist', 'pot', { pot: 15 }],
          ['Recovery', 'regen', { regen: 0.2 }],
        ],
        notable: { n: 'Second wind', ic: 'regen', fx: { regen: 0.5, hp: 5 } },
        key: {
          n: 'Undying',
          ic: 'key',
          fx: { regen: 1, last: 25, dmg: -10 },
          note: 'Heal fast and fight hard when nearly down, but deal 10% less damage.',
        },
      },
      {
        // up: armour and resilience
        small: [
          ['Thick hide', 'armor', { armor: 6 }],
          ['Iron skin', 'dr', { dr: 3 }],
          ['Sturdy', 'hp', { hp: 5 }],
        ],
        notable: { n: 'Bulwark', ic: 'dr', fx: { dr: 6, armor: 10 } },
        key: {
          n: 'Juggernaut',
          ic: 'key',
          fx: { armor: 35, hp: 20, spd: -12 },
          note: 'A wall of iron and flesh, but you move 12% slower.',
        },
      },
    ],
  },
];
/** The ring of hybrid nodes between forks (Might–Cunning, Cunning–Guard, Guard–Might). */
const RING: [string, string, Record<string, number>][][] = [
  [
    ['Swift blade', 'aspd', { dmg: 3, spd: 3 }],
    ['Opportunist', 'crit', { crit: 2, dodge: 2 }],
  ],
  [
    ['Survivor', 'hp', { hp: 4, roll: 5 }],
    ['Field medic', 'pot', { pot: 10, regen: 0.1 }],
  ],
  [
    ['Veteran', 'armor', { armor: 5, dmg: 3 }],
    ['Blood and iron', 'leech', { leech: 1, hp: 3 }],
  ],
];

const rad = (d: number) => (d * Math.PI) / 180;
const at = (r: number, deg: number) => ({ x: Math.cos(rad(deg)) * r, y: Math.sin(rad(deg)) * r });

/** Every node of the tree, and the links between them. */
export const TREE: Record<string, TreeNode> = {};
export const LINKS: [string, string][] = [];
const add = (n: TreeNode) => (TREE[n.id] = n);
const link = (a: string, b: string) => LINKS.push([a, b]);

add({ id: 'start', kind: 'start', br: 's', n: 'Wanderer', ic: 'start', fx: {}, x: 0, y: 0 });
const FORK_R = 205;
for (const B of BRANCHES) {
  let prev = 'start';
  B.inner.forEach(([n, ic, fx], i) => {
    const id = B.id + 'i' + i,
      p = at(68 + i * 68, B.ang);
    add({ id, kind: 'small', br: B.id, n, ic, fx, ...p });
    link(prev, id);
    prev = id;
  });
  const fork = B.id + 'f';
  add({ id: fork, kind: 'notable', br: B.id, ...B.fork, ...at(FORK_R, B.ang) });
  link(prev, fork);
  B.paths.forEach((P, pi) => {
    const s = pi ? 1 : -1;
    let pv = fork;
    P.small.forEach(([n, ic, fx], i) => {
      const id = B.id + 'p' + pi + i,
        p = at(FORK_R + 72 + i * 66, B.ang + s * (13 + i * 3.5));
      add({ id, kind: 'small', br: B.id, n, ic, fx, ...p });
      link(pv, id);
      pv = id;
    });
    const nid = B.id + 'n' + pi,
      kid = B.id + 'k' + pi;
    add({
      id: nid,
      kind: 'notable',
      br: B.id,
      ...P.notable,
      ...at(FORK_R + 72 + 3 * 66 + 6, B.ang + s * 24),
    });
    link(pv, nid);
    add({
      id: kid,
      kind: 'key',
      br: B.id,
      ...P.key,
      ...at(FORK_R + 72 + 4 * 66 + 22, B.ang + s * 26),
    });
    link(nid, kid);
  });
}
// the outer arms: each path's notable leads further out (not through its keystone, so no
// drawback is forced) to two small nodes, a stronger outer notable, two more small nodes and
// a new keystone
type Outer = {
  small: [string, string, Record<string, number>][]; // four: two before the notable, two after
  notable: Omit<TreeNode, 'id' | 'kind' | 'br' | 'x' | 'y'>;
  key: Omit<TreeNode, 'id' | 'kind' | 'br' | 'x' | 'y'>;
};
const OUTER: Record<string, Outer> = {
  m0: {
    small: [
      ['Keen eye', 'crit', { crit: 2 }],
      ['Vicious', 'critd', { critd: 10 }],
      ['Honed edge', 'dmg', { dmg: 4 }],
      ['Keen eye', 'crit', { crit: 2 }],
    ],
    notable: { n: "Assassin's mark", ic: 'crit', fx: { crit: 4, critd: 30 } },
    key: {
      n: 'Glass cannon',
      ic: 'key',
      fx: { dmg: 40, hp: -25 },
      note: 'Deal far more damage, with a quarter less health.',
    },
  },
  m1: {
    small: [
      ['Quick hands', 'aspd', { aspd: 4 }],
      ['Bloodletting', 'leech', { leech: 1 }],
      ['Bloodletting', 'leech', { leech: 1.5 }],
      ['Quick hands', 'aspd', { aspd: 4 }],
    ],
    notable: { n: 'Frenzy', ic: 'aspd', fx: { aspd: 12, dmg: 6 } },
    key: {
      n: 'Vampire',
      ic: 'key',
      fx: { leech: 8, killHeal: 3, pot: -50 },
      note: 'Live on the blood you spill, but potions heal half as much.',
    },
  },
  c0: {
    small: [
      ['Focus', 'cdr', { cdr: 3 }],
      ['Wide swings', 'reach', { reach: 1 }],
      ['Focus', 'cdr', { cdr: 3 }],
      ['Light step', 'spd', { spd: 3 }],
    ],
    notable: { n: 'Arcanist', ic: 'cdr', fx: { cdr: 8, reach: 1 } },
    key: {
      n: 'Tempest',
      ic: 'key',
      fx: { cdr: 20, aspd: 15, armor: -25 },
      note: 'Strike and cast in a whirl, with a quarter less armor.',
    },
  },
  c1: {
    small: [
      ['Coin sense', 'gold', { gold: 8 }],
      ['Quick study', 'xp', { xp: 4 }],
      ['Quick study', 'xp', { xp: 4 }],
      ['Light step', 'spd', { spd: 3 }],
    ],
    notable: { n: "Fortune's favour", ic: 'gold', fx: { gold: 15, xp: 8, dodge: 3 } },
    key: {
      n: 'Shadow dancer',
      ic: 'key',
      fx: { dodge: 15, spd: 10, hp: -15 },
      note: 'Slip past blows and move faster, with 15% less health.',
    },
  },
  g0: {
    small: [
      ['Recovery', 'regen', { regen: 0.15 }],
      ['Herbalist', 'pot', { pot: 10 }],
      ['Sturdy', 'hp', { hp: 4 }],
      ['Recovery', 'regen', { regen: 0.15 }],
    ],
    notable: { n: 'Troll blood', ic: 'regen', fx: { regen: 0.6, hp: 6 } },
    key: {
      n: 'Iron will',
      ic: 'key',
      fx: { hp: 30, last: 30, spd: -8 },
      note: 'Much hardier and fiercer when nearly down, but 8% slower.',
    },
  },
  g1: {
    small: [
      ['Thick hide', 'armor', { armor: 5 }],
      ['Iron skin', 'dr', { dr: 2 }],
      ['Sturdy', 'hp', { hp: 4 }],
      ['Iron skin', 'dr', { dr: 2 }],
    ],
    notable: { n: 'Fortress', ic: 'dr', fx: { armor: 15, dr: 5 } },
    key: {
      n: 'Unbreakable',
      ic: 'key',
      fx: { dr: 15, armor: 20, dmg: -15 },
      note: 'Shrug off blows, but deal 15% less damage.',
    },
  },
};
for (const B of BRANCHES)
  [0, 1].forEach((pi) => {
    const O = OUTER[B.id + pi],
      s = pi ? 1 : -1,
      ang = B.ang + s * 16,
      id = (k: number) => B.id + 'o' + pi + k;
    let pv = B.id + 'n' + pi;
    const put = (k: number, node: Omit<TreeNode, 'id' | 'x' | 'y'>, r: number) => {
      add({ id: id(k), ...node, ...at(r, ang) });
      link(pv, id(k));
      pv = id(k);
    };
    const small = (k: number, [n, ic, fx]: [string, string, Record<string, number>], r: number) =>
      put(k, { kind: 'small', br: B.id, n, ic, fx }, r);
    small(0, O.small[0], 565);
    small(1, O.small[1], 630);
    put(2, { kind: 'notable', br: B.id, ...O.notable }, 700);
    small(3, O.small[2], 770);
    small(4, O.small[3], 835);
    put(5, { kind: 'key', br: B.id, ...O.key }, 910);
  });
// the ring: two hybrid nodes on the arc between neighbouring forks
BRANCHES.forEach((B, i) => {
  const C = BRANCHES[(i + 1) % BRANCHES.length],
    span = (C.ang - B.ang + 360) % 360 || 360;
  let prev = B.id + 'f';
  RING[i].forEach(([n, ic, fx], k) => {
    const id = 'h' + i + k;
    add({ id, kind: 'small', br: 'h', n, ic, fx, ...at(FORK_R, B.ang + (span * (k + 1)) / 3) });
    link(prev, id);
    prev = id;
  });
  link(prev, C.id + 'f');
});
// two more hybrid rings between neighbouring branches (Might–Cunning, Cunning–Guard,
// Guard–Might): a middle ring joining the paths' third small nodes (small, a hybrid notable,
// small), and an outer ring joining the outer notables (two small, a hybrid notable, two small)
type Hyb = [string, string, Record<string, number>];
type HybNotable = Omit<TreeNode, 'id' | 'kind' | 'br' | 'x' | 'y'>;
const MID: [Hyb, HybNotable, Hyb][] = [
  [
    ['Duelist', 'aspd', { dmg: 3, aspd: 3 }],
    { n: 'Spellblade', ic: 'cdr', fx: { dmg: 8, cdr: 8 } },
    ['Opportunist', 'crit', { crit: 2, spd: 2 }],
  ],
  [
    ['Nimble guard', 'dodge', { dodge: 2, armor: 4 }],
    { n: 'Wayfarer', ic: 'spd', fx: { spd: 5, hp: 8 } },
    ['Field medic', 'pot', { pot: 8, regen: 0.1 }],
  ],
  [
    ['Battle-hardened', 'armor', { armor: 4, dmg: 3 }],
    { n: 'Warlord', ic: 'dmg', fx: { dmg: 8, hp: 8 } },
    ['Blood and iron', 'leech', { leech: 1, hp: 3 }],
  ],
];
const OUT: [Hyb, Hyb, HybNotable, Hyb, Hyb][] = [
  [
    ['Swift blade', 'aspd', { aspd: 3, spd: 2 }],
    ['Keen focus', 'crit', { crit: 2, cdr: 2 }],
    { n: 'Blademaster', ic: 'crit', fx: { crit: 5, aspd: 8, cdr: 5 } },
    ['Deft strikes', 'critd', { critd: 8, dodge: 2 }],
    ['Swift blade', 'aspd', { aspd: 3, spd: 2 }],
  ],
  [
    ['Survivor', 'hp', { hp: 3, roll: 5 }],
    ['Scavenger', 'gold', { gold: 6, pot: 6 }],
    { n: 'Pathfinder', ic: 'dodge', fx: { spd: 6, dodge: 4, regen: 0.3 } },
    ['Hardy traveller', 'regen', { regen: 0.1, xp: 3 }],
    ['Survivor', 'hp', { hp: 3, roll: 5 }],
  ],
  [
    ['Veteran', 'armor', { armor: 4, dmg: 3 }],
    ['Brutal guard', 'dr', { dr: 1.5, critd: 6 }],
    { n: 'Champion', ic: 'armor', fx: { dmg: 10, armor: 10, hp: 5 } },
    ['Bloodied', 'leech', { leech: 1, last: 6 }],
    ['Veteran', 'armor', { armor: 4, dmg: 3 }],
  ],
];
BRANCHES.forEach((B, i) => {
  const C = BRANCHES[(i + 1) % BRANCHES.length],
    gapTo = (a: number, b: number) => (b - a + 360) % 360;
  /** Nodes on the arc of radius r from angle a0 to a1, linked from `from` to `to`. */
  const arc = (
    tag: string,
    nodes: [TreeKind, Hyb | HybNotable][],
    r: number,
    a0: number,
    a1: number,
    from: string,
    to: string,
  ) => {
    const span = gapTo(a0, a1);
    let prev = from;
    nodes.forEach(([kind, v], k) => {
      const id = tag + i + k,
        ang = a0 + (span * (k + 1)) / (nodes.length + 1),
        body = Array.isArray(v) ? { n: v[0], ic: v[1], fx: v[2] } : v;
      add({ id, kind, br: 'h', ...body, ...at(r, ang) });
      link(prev, id);
      prev = id;
    });
    link(prev, to);
  };
  const [m0, mn, m1] = MID[i],
    [o0, o1, on, o2, o3] = OUT[i];
  arc(
    'hm',
    [
      ['small', m0],
      ['notable', mn],
      ['small', m1],
    ],
    420,
    B.ang + 20,
    C.ang - 20,
    B.id + 'p12',
    C.id + 'p02',
  );
  arc(
    'ho',
    [
      ['small', o0],
      ['small', o1],
      ['notable', on],
      ['small', o2],
      ['small', o3],
    ],
    700,
    B.ang + 16,
    C.ang - 16,
    B.id + 'o12',
    C.id + 'o02',
  );
});
/** Neighbours of each node. */
export const ADJ: Record<string, string[]> = {};
for (const [a, b] of LINKS) {
  (ADJ[a] = ADJ[a] || []).push(b);
  (ADJ[b] = ADJ[b] || []).push(a);
}

/** One line per effect, e.g. "+4% damage". */
const FX_TEXT: Record<string, (v: number) => string> = {
  dmg: (v) => v + '% damage',
  hp: (v) => v + '% health',
  armor: (v) => v + '% armor',
  crit: (v) => v + '% critical chance',
  critd: (v) => v + '% critical damage',
  aspd: (v) => v + '% attack speed',
  spd: (v) => v + '% movement speed',
  leech: (v) => v + '% life steal',
  regen: (v) => v + '% health regenerated per second',
  cdr: (v) => v + '% faster skill cooldowns',
  roll: (v) => v + '% faster roll cooldown',
  reach: (v) => v * 15 + '% swing arc and spell radius, arrows pierce ' + v + ' more',
  gold: (v) => v + '% gold from monsters',
  xp: (v) => v + '% experience',
  dodge: (v) => v + '% chance to dodge a hit',
  dr: (v) => v + '% less damage taken',
  killHeal: (v) => v + '% health healed on each kill',
  pot: (v) => v + '% potion healing',
  last: (v) => v + '% damage below 35% health',
};
export function fxLines(fx: Record<string, number>) {
  return Object.entries(fx).map(([k, v]) => (v < 0 ? '−' + FX_TEXT[k](-v) : '+' + FX_TEXT[k](v)));
}

/**
 * Mastery: repeatable ranks that open once every node but the keystones is learned (those
 * stay optional), so points are never wasted. Each rank adds `fx` again; no rank limit.
 */
export const MASTERY: { k: string; n: string; ic: string; fx: Record<string, number> }[] = [
  { k: 'dmg', n: 'Might mastery', ic: 'dmg', fx: { dmg: 1 } },
  { k: 'hp', n: 'Vigor mastery', ic: 'hp', fx: { hp: 1 } },
  { k: 'armor', n: 'Guard mastery', ic: 'armor', fx: { armor: 1.5 } },
  { k: 'critd', n: 'Precision mastery', ic: 'critd', fx: { critd: 2 } },
];
