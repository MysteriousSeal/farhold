import { BAR_ROW, IT, inSolid, type Interior } from './interior';
/* ================= Tavern walks ================= */
/**
 * A walk from a seat to a free spot just in front of the bar: cell centres found by a
 * breadth-first search over floor cells no furniture blocks (the seat itself may be).
 */
export function pathToBar(I: Interior, sx: number, sy: number) {
  const GW = I.GW,
    ok = (i: number, j: number) =>
      I.grid[j * GW + i] === 1 &&
      !I.solids.some((s) => inSolid(s, (i + 0.5) * IT, (j + 0.5) * IT, 9)),
    si = Math.floor(sx / IT),
    sj = Math.floor(sy / IT),
    prev = new Map<number, number>([[sj * GW + si, -1]]),
    q = [si, sj],
    goalRow = BAR_ROW + 1;
  let goal = -1,
    best = 1e9;
  for (let k = 0; k < q.length; k += 2) {
    const i = q[k],
      j = q[k + 1];
    if (j === goalRow && ok(i, j)) {
      const d = Math.abs((i + 0.5) * IT - I.bar.x);
      if (d < best && !(Math.abs((i + 0.5) * IT - I.bar.x) < IT * 0.6)) {
        best = d;
        goal = j * GW + i;
      }
    }
    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + ox,
        nj = j + oy,
        c = nj * GW + ni;
      if (prev.has(c) || !ok(ni, nj)) continue;
      prev.set(c, j * GW + i);
      q.push(ni, nj);
    }
  }
  if (goal < 0) return null;
  const pts: { x: number; y: number }[] = [];
  for (let c = goal; c >= 0; c = prev.get(c) ?? -1)
    pts.unshift({ x: ((c % GW) + 0.5) * IT, y: (Math.floor(c / GW) + 0.5) * IT });
  pts.shift(); // the seat's own cell: the patron starts from the chair
  // stand at the bar front, facing it
  if (pts.length) pts[pts.length - 1].y = (BAR_ROW + 1.5) * IT;
  return pts;
}
