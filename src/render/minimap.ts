import { $, mkCanvas } from '../core/dom';
import { OUT, TAU } from '../core/math';
import { game, hero } from '../game/state';
import { poisNear } from '../world/poi';
import { COL, terr } from '../world/terrain';
/* ================= MINIMAP ================= */
export const mini = $('#mini'),
  mc = mini.getContext('2d');
let miniT = 0,
  miniImg = null,
  miniGen = null;
const MINI_R = 950, // world radius shown
  MINI_S = 96, // terrain samples across
  MINI_ROWS = 8; // sample rows computed per frame (spreads the work)
/** Build the terrain snapshot a few rows per frame; swap it in once complete. */
function stepMiniGen() {
  const g = miniGen,
    S = MINI_S,
    R = MINI_R,
    end = Math.min(S, g.row + MINI_ROWS);
  for (let j = g.row; j < end; j++)
    for (let i = 0; i < S; i++) {
      const T = terr(g.x + ((i + 0.5) / S - 0.5) * 2 * R, g.y + ((j + 0.5) / S - 0.5) * 2 * R),
        a = COL[T.t][T.b],
        k = (j * S + i) * 4;
      g.img.data[k] = a[0];
      g.img.data[k + 1] = a[1];
      g.img.data[k + 2] = a[2];
      g.img.data[k + 3] = 255;
    }
  g.row = end;
  if (g.row >= S) {
    const t = mkCanvas(S, S);
    t.getContext('2d').putImageData(g.img, 0, 0);
    miniImg = { c: t, x: g.x, y: g.y, R };
    miniGen = null;
  }
}
export function drawMini(dt) {
  const M = mini.width;
  mc.save();
  mc.clearRect(0, 0, M, M);
  mc.beginPath();
  mc.arc(M / 2, M / 2, M / 2, 0, TAU);
  mc.clip();
  mc.imageSmoothingEnabled = false;
  if (game.mode === 'dungeon') {
    mc.fillStyle = '#120e1a';
    mc.fillRect(0, 0, M, M);
    const R = 600,
      sc = M / (2 * R),
      T = game.DG.T;
    mc.drawImage(
      game.DG.mini,
      M / 2 - game.P.x * sc,
      M / 2 - game.P.y * sc,
      game.DG.GW * T * sc,
      game.DG.GH * T * sc,
    );
    const ic = (x, y, col, r = 5) => {
      mc.fillStyle = col;
      mc.strokeStyle = OUT;
      mc.lineWidth = 2;
      mc.beginPath();
      mc.arc(M / 2 + (x - game.P.x) * sc, M / 2 + (y - game.P.y) * sc, r, 0, TAU);
      mc.fill();
      mc.stroke();
    };
    ic(game.DG.exit.x, game.DG.exit.y, '#bfe6ff');
    if (!game.DG.chest.open && !game.DG.chest.hidden)
      ic(game.DG.chest.x, game.DG.chest.y, '#ffd27a', 6);
    remainingEnemies(M, sc);
  } else {
    miniT -= dt;
    const R = MINI_R;
    if (!miniGen && (miniT <= 0 || !miniImg)) {
      miniT = 0.8;
      miniGen = { img: new ImageData(MINI_S, MINI_S), row: 0, x: game.P.x, y: game.P.y };
    }
    if (miniGen) {
      stepMiniGen();
      // the very first snapshot is built in one go so the map is never empty
      while (!miniImg && miniGen) stepMiniGen();
    }
    const sc = M / (2 * R);
    mc.imageSmoothingEnabled = false;
    mc.drawImage(
      miniImg.c,
      M / 2 + (miniImg.x - game.P.x) * sc - M / 2,
      M / 2 + (miniImg.y - game.P.y) * sc - M / 2,
      M,
      M,
    );
    for (const p of poisNear(game.P.x, game.P.y, R)) {
      const x = M / 2 + (p.x - game.P.x) * sc,
        y = M / 2 + (p.y - game.P.y) * sc;
      mc.lineWidth = 2.5;
      mc.strokeStyle = OUT;
      if (p.kind === 'village') {
        mc.fillStyle = game.P.wps.includes(p.key) ? '#6ae4ff' : '#fff6e0';
        mc.beginPath();
        mc.moveTo(x - 8, y + 6);
        mc.lineTo(x - 8, y - 2);
        mc.lineTo(x, y - 9);
        mc.lineTo(x + 8, y - 2);
        mc.lineTo(x + 8, y + 6);
        mc.closePath();
        mc.fill();
        mc.stroke();
      } else if (p.kind === 'lair') {
        mc.fillStyle = game.P.cleared[p.key] ? '#8a8a8a' : '#ff4a5a';
        mc.beginPath();
        mc.arc(x, y, 7, 0, TAU);
        mc.fill();
        mc.stroke();
        mc.fillStyle = OUT;
        mc.fillRect(x - 3, y - 2, 2, 2);
        mc.fillRect(x + 1, y - 2, 2, 2);
      } else {
        mc.fillStyle = game.P.cleared[p.key] ? '#8a8a8a' : '#c8a070';
        mc.beginPath();
        mc.arc(x, y + 2, 8, Math.PI, 0);
        mc.closePath();
        mc.fill();
        mc.stroke();
        mc.fillStyle = OUT;
        mc.fillRect(x - 3, y - 3, 6, 5);
      }
    }
    for (const q of game.P.quests) {
      if (q.x == null || q.done) continue;
      const dx = q.x - game.P.x,
        dy = q.y - game.P.y,
        d = Math.hypot(dx, dy);
      let x, y;
      if (d * sc < M / 2 - 12) {
        x = M / 2 + dx * sc;
        y = M / 2 + dy * sc;
      } else {
        x = M / 2 + (dx / d) * (M / 2 - 12);
        y = M / 2 + (dy / d) * (M / 2 - 12);
      }
      star(mc, x, y, 9, '#ffd23a');
    }
    if (Math.hypot(game.P.x, game.P.y) > R && game.mode === 'world') {
      const w = game.P.wpInfo[game.P.home];
      if (w) {
        const dx = w.x - game.P.x,
          dy = w.y - game.P.y,
          d = Math.hypot(dx, dy);
        if (d * sc > M / 2 - 10) {
          mc.fillStyle = '#6ae4ff';
          mc.beginPath();
          mc.arc(M / 2 + (dx / d) * (M / 2 - 10), M / 2 + (dy / d) * (M / 2 - 10), 5, 0, TAU);
          mc.fill();
        }
      }
    }
  }
  const R2 = game.mode === 'dungeon' ? 600 : 950,
    sc2 = M / (2 * R2);
  for (const e of game.enemies) {
    if (e.dying > 0) continue;
    mc.fillStyle = e.boss ? '#ff2a4a' : e.elite ? '#ffb13a' : '#ff5a4a';
    const s = e.boss ? 9 : 6;
    mc.fillRect(
      M / 2 + (e.x - game.P.x) * sc2 - s / 2,
      M / 2 + (e.y - game.P.y) * sc2 - s / 2,
      s,
      s,
    );
  }
  mc.translate(M / 2, M / 2);
  mc.rotate(hero.aim);
  mc.fillStyle = '#fff';
  mc.strokeStyle = OUT;
  mc.lineWidth = 2.5;
  mc.beginPath();
  mc.moveTo(11, 0);
  mc.lineTo(-7, -8);
  mc.lineTo(-3, 0);
  mc.lineTo(-7, 8);
  mc.closePath();
  mc.fill();
  mc.stroke();
  mc.restore();
}
function star(c, x, y, r, col) {
  c.fillStyle = col;
  c.strokeStyle = OUT;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2,
      rr2 = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  c.closePath();
  c.fill();
  c.stroke();
}

/** From 65% cleared on, mark the cave's remaining enemies: dots in range, arrows on the rim. */
export const HINT_AT = 0.65;
function remainingEnemies(M: number, sc: number) {
  const D = game.DG;
  if (!D || !D.total || D.bonus || D.killed / D.total < HINT_AT) return;
  const pulse = 0.75 + Math.sin(game.time * 5) * 0.25,
    rim = M / 2 - 16;
  mc.lineJoin = 'round';
  for (const e of game.enemies) {
    if (!e.dg || e.dead || e.dying > 0) continue;
    const dx = (e.x - game.P.x) * sc,
      dy = (e.y - game.P.y) * sc,
      d = Math.hypot(dx, dy) || 1,
      guard = e.dgi === -1;
    mc.strokeStyle = OUT;
    mc.lineWidth = 2.5;
    if (d < rim - 6) {
      const x = M / 2 + dx,
        y = M / 2 + dy;
      if (guard) skull(x, y, 9 * (0.9 + pulse * 0.15));
      else {
        mc.fillStyle = 'rgba(255,80,70,' + pulse.toFixed(3) + ')';
        mc.beginPath();
        mc.arc(x, y, 5.5, 0, TAU);
        mc.fill();
        mc.stroke();
      }
    } else {
      // arrow on the rim pointing toward the enemy
      const a = Math.atan2(dy, dx),
        x = M / 2 + Math.cos(a) * rim,
        y = M / 2 + Math.sin(a) * rim,
        s = (guard ? 13 : 10) * (0.9 + pulse * 0.15);
      mc.save();
      mc.translate(x, y);
      mc.rotate(a);
      mc.beginPath();
      mc.moveTo(s, 0);
      mc.lineTo(-s * 0.7, -s * 0.75);
      mc.lineTo(-s * 0.35, 0);
      mc.lineTo(-s * 0.7, s * 0.75);
      mc.closePath();
      mc.fillStyle = guard ? '#f5e6c8' : 'rgba(255,80,70,' + pulse.toFixed(3) + ')';
      mc.fill();
      mc.stroke();
      mc.restore();
    }
  }
}
/** Guardian marker: a small skull. */
function skull(x: number, y: number, r: number) {
  mc.fillStyle = '#f5e6c8';
  mc.beginPath();
  mc.arc(x, y - r * 0.15, r, 0, TAU);
  mc.fill();
  mc.stroke();
  mc.beginPath();
  mc.rect(x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.55);
  mc.fill();
  mc.stroke();
  mc.fillStyle = OUT;
  mc.beginPath();
  mc.arc(x - r * 0.38, y - r * 0.15, r * 0.27, 0, TAU);
  mc.arc(x + r * 0.38, y - r * 0.15, r * 0.27, 0, TAU);
  mc.fill();
}
