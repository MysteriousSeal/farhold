/* ================= Tavern floor layout ================= */
// Tables are placed one by one as loose clusters on the free floor below the bar row: a long
// feast table with benches, round tables and small two-seaters, each with chairs on several
// sides. Clusters keep a one-cell aisle between them, and every placement is kept only if the
// door can still reach the bar and every seat. Small random offsets break up the grid.

/** Which way a seated patron faces: down (toward us, behind a table), up (back to us), or
 * across the table from its side. */
export type Face = 'down' | 'up' | 'left' | 'right';
/** A chair, bench place or bar stool a patron can sit on. */
export type Seat = { x: number; y: number; face: Face; cx: number; cy: number; stool?: boolean };
type Put = (
  k: string,
  cx: number,
  cy: number,
  cw?: number,
  ch?: number,
  extra?: Record<string, unknown>,
) => { x: number; y: number };
/** How far behind a table's front edge its back chairs stand (the seat tucks under the top). */
const CHAIR_IN = 22;

type Piece = {
  k: string;
  cw: number;
  /** seats relative to the table's top-left cell: dx, dy (cells) and which way they face */
  seats: [number, number, Face][];
};
/** The kinds of table, with their possible seatings (one is picked per table). */
function pieceChoices(rnd: () => number): Piece[] {
  const two: [number, number, Face][][] = [
      [
        [0, -1, 'down'],
        [1, -1, 'down'],
      ],
      [
        [0, -1, 'down'],
        [1, 1, 'up'],
      ],
      [
        [-1, 0, 'right'],
        [2, 0, 'left'],
      ],
      [
        [1, -1, 'down'],
        [-1, 0, 'right'],
      ],
    ],
    round: [number, number, Face][][] = [
      [
        [0, -1, 'down'],
        [1, -1, 'down'],
        [-1, 0, 'right'],
        [2, 0, 'left'],
      ],
      [
        [0, -1, 'down'],
        [-1, 0, 'right'],
        [2, 0, 'left'],
        [1, 1, 'up'],
      ],
      [
        [1, -1, 'down'],
        [-1, 0, 'right'],
        [0, 1, 'up'],
      ],
    ],
    pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
  return [
    { k: 'rtable', cw: 2, seats: pick(round) },
    { k: 'ttable', cw: 2, seats: pick(two) },
  ];
}

/**
 * Lays out the tables of a tavern whose floor is cells 1..w × 1..d, with the bar row `barRow`
 * (the row below it stays a walkway) and the door at the bottom in column `dc`. Returns the
 * seats; furniture goes through `put`.
 */
export function layTavern(
  rnd: () => number,
  put: Put,
  w: number,
  d: number,
  barRow: number,
  dc: number,
  big: boolean,
  IT: number,
): Seat[] {
  const GW = w + 2,
    top = barRow + 2, // first row tables and chairs may use
    foot = new Uint8Array(GW * (d + 2)), // cells under a cluster
    ring = new Uint8Array(GW * (d + 2)), // the aisle around a cluster
    at = (i: number, j: number) => j * GW + i,
    inside = (i: number, j: number) => i >= 1 && i <= w && j >= top && j <= d;
  const seats: Seat[] = [];
  // the doormat and the cell above it stay clear
  foot[at(dc, d)] = 2;
  foot[at(dc, d - 1)] = 2;
  // can the door still reach the bar front and every chair?
  const connected = (extra: Set<number>) => {
    const free = (i: number, j: number) =>
        i >= 1 &&
        i <= w &&
        j >= barRow + 1 &&
        j <= d &&
        foot[at(i, j)] !== 1 &&
        !extra.has(at(i, j)),
      seen = new Uint8Array(GW * (d + 2)),
      q = [dc, d];
    seen[at(dc, d)] = 1;
    for (let k = 0; k < q.length; k += 2)
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const i = q[k] + ox,
          j = q[k + 1] + oy;
        if (!free(i, j) || seen[at(i, j)]) continue;
        seen[at(i, j)] = 1;
        q.push(i, j);
      }
    if (!seen[at(Math.max(1, Math.min(w, dc)), barRow + 1)]) return false;
    // every seat needs a free neighbour the door reaches
    const all = [
      ...seats.map((s) => [s.cx, s.cy]),
      ...[...extra].map((c) => [c % GW, (c / GW) | 0]),
    ];
    return all.every(([i, j]) =>
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([ox, oy]) => seen[at(i + ox, j + oy)]),
    );
  };
  const tryPlace = (k: string, cw: number, sp: [number, number, Face][], tries: number) => {
    for (let n = 0; n < tries; n++) {
      const tx = 1 + Math.floor(rnd() * w),
        ty = top + Math.floor(rnd() * (d - top + 1));
      const cells: number[][] = [];
      for (let i = 0; i < cw; i++) cells.push([tx + i, ty]);
      for (const [sx, sy] of sp) cells.push([tx + sx, ty + sy]);
      if (!cells.every(([i, j]) => inside(i, j) && !foot[at(i, j)] && !ring[at(i, j)])) continue;
      // chairs facing down sit above the table: that row can't be the walkway under the bar
      if (sp.some(([, sy]) => sy < 0) && ty - 1 < top) continue;
      const mine = new Set(cells.map(([i, j]) => at(i, j)));
      if (!connected(mine)) continue;
      // keep it: mark its cells and the aisle around them
      for (const c of mine) foot[c] = 1;
      for (const [i, j] of cells)
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++)
            if (!foot[at(i + ox, j + oy)]) ring[at(i + ox, j + oy)] = 1;
      // a small offset so tables don't line up
      const jx = Math.round((rnd() - 0.5) * 12),
        jy = Math.round((rnd() - 0.5) * 8);
      const t = put(k, tx, ty, cw, 1);
      t.x += jx;
      t.y += jy;
      for (const [sx, sy, face] of sp) {
        const cx = tx + sx,
          cy = ty + sy;
        // where the patron sits (their feet), and the chair or bench piece
        let x: number, y: number;
        if (face === 'down') {
          x = t.x + (sx - (cw - 1) / 2) * IT * 0.9;
          y = t.y - CHAIR_IN;
          if (k !== 'ltable') put('chair', cx, cy, 1, 1, { x, y, flip: sx > (cw - 1) / 2 });
        } else if (face === 'up') {
          x = t.x + (sx - (cw - 1) / 2) * IT * 0.9;
          y = t.y + 20;
          if (k !== 'ltable') put('chairB', cx, cy, 1, 1, { x, y: y + 14 });
        } else {
          const s = face === 'right' ? -1 : 1;
          x = t.x + s * (cw / 2 + 0.3) * IT;
          y = t.y - 8;
          // drawn behind the sitter (z), seat at hip height under their thighs
          put('chairSb', cx, cy, 1, 1, { x: x + s * 7, y: y + 9, side: s, z: y - 1 });
          put('chairS', cx, cy, 1, 1, { x, y: y + 9, side: s, z: y - 0.5 });
        }
        seats.push({ x, y, face, cx, cy });
      }
      return { t, tx, ty };
    }
    return null;
  };
  // one long feast table with benches either side
  const lw = big ? 5 : 4,
    lt = tryPlace(
      'ltable',
      lw,
      [
        ...Array.from({ length: lw }, (_, i) => [i, -1, 'down'] as [number, number, Face]),
        ...Array.from({ length: lw }, (_, i) => [i, 1, 'up'] as [number, number, Face]),
      ],
      120,
    );
  if (lt) {
    put('benchN', lt.tx, lt.ty - 1, lw, 1, { x: lt.t.x, y: lt.t.y - CHAIR_IN + 4 });
    put('benchS', lt.tx, lt.ty + 1, lw, 1, { x: lt.t.x, y: lt.t.y + 26 });
  }
  // round tables and two-seaters until the floor is full
  const want = big ? 6 : 4;
  for (let n = 0, placed = 0; n < 60 && placed < want; n++) {
    const choices = pieceChoices(rnd),
      p = choices[rnd() < 0.55 ? 0 : 1];
    if (tryPlace(p.k, p.cw, p.seats, 40)) placed++;
  }
  // a few things on the floor: crates and sacks against the walls, a sleeping dog, spills
  const props = ['crate', 'sack', 'barrel', 'dog', 'spill', 'spill'],
    nProps = 2 + Math.floor(rnd() * (big ? 4 : 3));
  for (let n = 0, done = 0; n < 80 && done < nProps; n++) {
    const k = props[Math.floor(rnd() * props.length)],
      i = 1 + Math.floor(rnd() * w),
      j = top + Math.floor(rnd() * (d - top + 1)),
      flat = k === 'spill';
    if (foot[at(i, j)] || (!flat && ring[at(i, j)])) continue;
    // solid props stand by a wall, out of the way
    if (!flat && !(i === 1 || i === w || j === d)) continue;
    if (!flat && !connected(new Set([at(i, j)]))) continue;
    if (!flat) foot[at(i, j)] = 1;
    put(k, i, j, 1, 1, {
      x: (i + 0.5) * IT + Math.round((rnd() - 0.5) * 10),
      y: (j + 1) * IT - 6 + Math.round((rnd() - 0.5) * 6),
    });
    done++;
  }
  return seats;
}
