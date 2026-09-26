import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { OUT, TAU, clamp } from '../core/math';
import {
  SKILLCD,
  SKILL_LVL,
  SKILL_MAX,
  bossPoints,
  canLearn,
  ownedNodes,
  pointsFree,
  rank,
  skillTree,
  treeFx,
} from '../data/skills';
import { LINKS, TREE, fxLines, type TreeNode } from '../data/tree';
import { toast } from '../game/fx';
import { save } from '../game/save';
import { game } from '../game/state';
import { calcStats } from '../game/stats';
import { STYLE_NAME, heroStyle } from '../game/style';
import { btn, hdr, openModal, wireClose } from './modal';
/* ================= UI: the skill tree (K) ================= */
// A pannable, zoomable map of the passive tree (data/tree.ts) on a canvas, with a side panel:
// the two active skills of the current fighting style (ranked with points), the selected
// node's details and Learn button, a summary of the tree's bonuses and the paid reset.

const BR_COL = { m: '#e0604e', g: '#4f8ad8', c: '#5cc46a', h: '#e3b24a', s: '#f5c451' };
const BR_NAME = { m: 'Might', g: 'Guard', c: 'Cunning', h: 'Hybrid', s: 'Start' };
const KIND_NAME = { start: 'Start', small: 'Minor', notable: 'Notable', key: 'Keystone' };
const RAD = { start: 26, small: 17, notable: 25, key: 31 };

/** Camera over the tree (kept between openings), the selection and the learn flashes. */
const cam = { x: 0, y: 30, z: 0 };
let sel: string | null = null,
  hover: string | null = null,
  flash: { id: string; t: number } | null = null,
  raf = 0;

export function openSkillTree() {
  if (game.state !== 'play') return;
  sel = null;
  render();
}
function render() {
  const free = pointsFree();
  openModal(
    hdr(
      'Skill tree',
      '<b class="stpts">' +
        free +
        '</b> point' +
        (free === 1 ? '' : 's') +
        ' to spend · one per level, one per lair boss (' +
        bossPoints() +
        ' so far)',
    ) +
      '<div class="stwrap"><div class="stview" id="stView"><canvas id="stC"></canvas>' +
      '<div class="stzoom"><button class="btn sm alt" id="stZi" aria-label="Zoom in">+</button>' +
      '<button class="btn sm alt" id="stZo" aria-label="Zoom out">−</button>' +
      '<button class="btn sm alt" id="stZr" aria-label="Recentre">⌂</button></div>' +
      '<div class="stlegend">' +
      ['m', 'g', 'c', 'h']
        .map((b) => '<span><i style="background:' + BR_COL[b] + '"></i>' + BR_NAME[b] + '</span>')
        .join('') +
      '</div></div><div class="stside"><div id="stActs"></div><div id="stDet"></div><div id="stSum"></div></div></div>',
  );
  $('#mp').classList.add('wide');
  wireClose();
  side();
  setupCanvas();
}
/** Refresh the side panel and the points in the header, keeping the canvas. */
function side() {
  const free = pointsFree(),
    pts = document.querySelector('.stpts');
  if (pts) pts.textContent = String(free);
  actives(free);
  details(free);
  summary();
}

/* ---------- side panel ---------- */
function actives(free: number) {
  const el = $('#stActs'),
    style = heroStyle(),
    nodes = skillTree().nodes;
  el.innerHTML = '<h4>' + STYLE_NAME[style] + ' skills</h4>';
  nodes.forEach((n, i) => {
    const id = 's' + (i + 1),
      r = rank(id),
      card = document.createElement('div');
    card.className = 'stact' + (r ? '' : ' lock');
    card.innerHTML =
      '<span class="sti">' +
      n.ic +
      '</span><div class="stai"><b>' +
      n.n +
      '</b><span class="stdots">' +
      Array.from(
        { length: SKILL_MAX },
        (_, k) => '<i' + (k < r ? ' class="on"' : '') + '></i>',
      ).join('') +
      '</span><span class="desc">' +
      (r ? n.d(r) : 'Unlocks at level ' + SKILL_LVL[i]) +
      ' · ' +
      SKILLCD[style][i] +
      's</span></div>';
    const why = !r ? 'Locked' : r >= SKILL_MAX ? 'Max' : free <= 0 ? '+1' : '';
    const b = btn(
      why || '+1',
      () => {
        game.P.sp[id] = (game.P.sp[id] || 0) + 1;
        calcStats();
        SFX.lvl();
        save();
        side();
      },
      'alt',
      !!why,
    );
    b.title = r && r < SKILL_MAX ? 'Next rank: ' + n.d(r + 1) : '';
    card.appendChild(b);
    el.appendChild(card);
  });
}
function details(free: number) {
  const el = $('#stDet'),
    n = sel && TREE[sel];
  if (!n) {
    el.innerHTML =
      '<div class="desc sthelp">Drag to move around, scroll or use + and − to zoom. Learn a node next to one you own. Notables are big bonuses; keystones are powerful but come with a drawback.</div>';
    return;
  }
  const owned = n.kind === 'start' || ownedNodes().includes(n.id),
    ok = canLearn(n.id);
  el.innerHTML =
    '<div class="stnm" style="color:' +
    BR_COL[n.br] +
    '">' +
    n.n +
    '</div><div class="desc">' +
    KIND_NAME[n.kind] +
    (n.br !== 's' ? ' · ' + BR_NAME[n.br] : '') +
    '</div><ul class="stfx">' +
    (n.kind === 'start'
      ? '<li>Where every hero begins.</li>'
      : fxLines(n.fx)
          .map((l) => '<li class="' + (l[0] === '−' ? 'dn' : 'up') + '">' + l + '</li>')
          .join('')) +
    '</ul>' +
    (n.note ? '<div class="desc stnote">' + n.note + '</div>' : '') +
    '<div class="acts"></div>';
  if (n.kind === 'start') return;
  const why = owned
    ? 'Learned ✓'
    : !ok
      ? 'Connect it to a node you own'
      : free <= 0
        ? 'No points left'
        : '';
  el.querySelector('.acts').appendChild(
    btn(
      why || 'Learn (1 point)',
      () => {
        game.P.tree = [...ownedNodes(), n.id];
        flash = { id: n.id, t: 0 };
        calcStats();
        SFX.lvl();
        save();
        side();
      },
      '',
      !!why,
    ),
  );
}
function summary() {
  const el = $('#stSum'),
    lines = fxLines(treeFx()),
    cost = game.P.lvl * 25;
  el.innerHTML =
    '<h4>Your tree <small>' +
    ownedNodes().length +
    ' nodes</small></h4>' +
    (lines.length
      ? '<ul class="stfx sm">' +
        lines
          .map((l) => '<li class="' + (l[0] === '−' ? 'dn' : 'up') + '">' + l + '</li>')
          .join('') +
        '</ul>'
      : '<div class="desc">Nothing learned yet.</div>');
  const spent = ownedNodes().length + (game.P.sp.s1 || 0) + (game.P.sp.s2 || 0);
  el.appendChild(
    btn(
      'Reset all for ' + cost + ' gold',
      () => {
        if (game.P.gold < cost) {
          toast('Not enough gold');
          return;
        }
        game.P.gold -= cost;
        game.P.tree = [];
        game.P.sp = {};
        calcStats();
        save();
        toast('Skill points refunded');
        side();
      },
      'alt',
      !spent || game.P.gold < cost,
    ),
  );
}

/* ---------- the canvas ---------- */
let cv: HTMLCanvasElement,
  cx: CanvasRenderingContext2D,
  W = 0,
  H = 0;
const toScreen = (x: number, y: number) => [
  W / 2 + (x - cam.x) * cam.z,
  H / 2 + (y - cam.y) * cam.z,
];
const toWorld = (sx: number, sy: number) => [
  cam.x + (sx - W / 2) / cam.z,
  cam.y + (sy - H / 2) / cam.z,
];
/** Frame the whole tree (with room for the keystone names). */
function fit() {
  const ns = Object.values(TREE),
    x0 = Math.min(...ns.map((n) => n.x)) - 60,
    x1 = Math.max(...ns.map((n) => n.x)) + 60,
    y0 = Math.min(...ns.map((n) => n.y)) - 50,
    y1 = Math.max(...ns.map((n) => n.y)) + 70;
  cam.x = (x0 + x1) / 2;
  cam.y = (y0 + y1) / 2;
  cam.z = clamp(Math.min(W / (x1 - x0), H / (y1 - y0)), 0.3, 1.2);
}
function setupCanvas() {
  cv = $('#stC') as HTMLCanvasElement;
  cx = cv.getContext('2d');
  const view = $('#stView'),
    size = () => {
      const r = view.getBoundingClientRect(),
        dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
  size();
  if (!cam.z) fit();
  // drag to pan, tap to select, wheel to zoom
  let down: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
  cv.onpointerdown = (e) => {
    cv.setPointerCapture(e.pointerId);
    down = { x: e.offsetX, y: e.offsetY, cx: cam.x, cy: cam.y, moved: false };
  };
  cv.onpointermove = (e) => {
    if (down) {
      const dx = e.offsetX - down.x,
        dy = e.offsetY - down.y;
      if (Math.hypot(dx, dy) > 4) down.moved = true;
      if (down.moved) {
        cam.x = down.cx - dx / cam.z;
        cam.y = down.cy - dy / cam.z;
      }
    }
    hover = hit(e.offsetX, e.offsetY);
    cv.style.cursor = down && down.moved ? 'grabbing' : hover ? 'pointer' : 'grab';
  };
  cv.onpointerup = (e) => {
    if (down && !down.moved) {
      const h = hit(e.offsetX, e.offsetY);
      if (h !== sel) {
        sel = h;
        side();
        if (h) SFX.pick();
      }
    }
    down = null;
  };
  cv.onpointerleave = () => (hover = null);
  cv.onwheel = (e) => {
    e.preventDefault();
    zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };
  $('#stZi').onclick = () => zoomAt(W / 2, H / 2, 1.25);
  $('#stZo').onclick = () => zoomAt(W / 2, H / 2, 0.8);
  $('#stZr').onclick = fit;
  cancelAnimationFrame(raf);
  let last = performance.now();
  const loop = (now: number) => {
    if (!cv.isConnected) return; // the modal closed
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (Math.abs(view.getBoundingClientRect().width - W) > 1) size();
    if (flash && (flash.t += dt) > 0.8) flash = null;
    draw(now / 1000);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function zoomAt(sx: number, sy: number, k: number) {
  const [wx, wy] = toWorld(sx, sy);
  cam.z = clamp(cam.z * k, 0.3, 2.2);
  cam.x = wx - (sx - W / 2) / cam.z;
  cam.y = wy - (sy - H / 2) / cam.z;
}
/** The node under a screen point, if any. */
function hit(sx: number, sy: number) {
  let best: string | null = null,
    bd = 1e9;
  for (const n of Object.values(TREE)) {
    const [x, y] = toScreen(n.x, n.y),
      d = Math.hypot(sx - x, sy - y);
    if (d < (RAD[n.kind] + 6) * cam.z + 4 && d < bd) {
      bd = d;
      best = n.id;
    }
  }
  return best;
}
/** Faint stars behind the tree (seeded, fixed in the world). */
const STARS = Array.from({ length: 160 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453,
    b = Math.sin(i * 78.233) * 12345.678;
  return [(a - Math.floor(a) - 0.5) * 1700, (b - Math.floor(b) - 0.5) * 1500, ((i * 7) % 3) + 1];
});
function draw(t: number) {
  const c = cx,
    own = new Set(['start', ...ownedNodes()]),
    free = pointsFree();
  c.clearRect(0, 0, W, H);
  const bg = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0, '#1d2350');
  bg.addColorStop(1, '#0d1028');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(220,230,255,.35)';
  for (const [x, y, s] of STARS) {
    const [px, py] = toScreen(x * 1, y * 1);
    c.fillRect(px, py, s * 0.6, s * 0.6);
  }
  // soft glows in the branch colours
  for (const [b, ang] of [
    ['m', -90],
    ['c', 30],
    ['g', 150],
  ] as [string, number][]) {
    const [gx, gy] = toScreen(
        Math.cos((ang * Math.PI) / 180) * 380,
        Math.sin((ang * Math.PI) / 180) * 380,
      ),
      g = c.createRadialGradient(gx, gy, 0, gx, gy, 320 * cam.z);
    g.addColorStop(0, BR_COL[b] + '22');
    g.addColorStop(1, BR_COL[b] + '00');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  // links
  c.lineCap = 'round';
  for (const [a, b] of LINKS) {
    const A = TREE[a],
      B = TREE[b],
      [ax, ay] = toScreen(A.x, A.y),
      [bx, by] = toScreen(B.x, B.y),
      oa = own.has(a),
      ob = own.has(b);
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    if (oa && ob) {
      c.strokeStyle = 'rgba(245,196,81,.35)';
      c.lineWidth = 10 * cam.z;
      c.stroke();
      c.strokeStyle = '#f5c451';
      c.lineWidth = 4 * cam.z;
      c.stroke();
    } else if (oa || ob) {
      const other = oa ? B : A;
      c.strokeStyle = BR_COL[other.br];
      c.globalAlpha = 0.75;
      c.lineWidth = 3 * cam.z;
      c.setLineDash([8 * cam.z, 6 * cam.z]);
      c.lineDashOffset = -t * 20 * cam.z;
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
    } else {
      c.strokeStyle = '#353d6e';
      c.lineWidth = 3 * cam.z;
      c.stroke();
    }
  }
  // nodes
  for (const n of Object.values(TREE)) node(c, n, own.has(n.id), canLearn(n.id) && free > 0, t);
}
function node(c: CanvasRenderingContext2D, n: TreeNode, owned: boolean, open: boolean, t: number) {
  const [x, y] = toScreen(n.x, n.y),
    z = cam.z,
    r = RAD[n.kind] * z,
    col = BR_COL[n.br],
    lit = owned || n.kind === 'start';
  if (x < -60 || y < -60 || x > W + 60 || y > H + 60) return;
  // glow behind owned nodes, a pulse around learnable ones
  if (lit) {
    const g = c.createRadialGradient(x, y, r * 0.5, x, y, r * 2.2);
    g.addColorStop(0, col + '88');
    g.addColorStop(1, col + '00');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 2.2, 0, TAU);
    c.fill();
  } else if (open) {
    c.strokeStyle = col;
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 4);
    c.lineWidth = 2.5 * z;
    c.beginPath();
    c.arc(x, y, r + 5 * z + Math.sin(t * 4) * 1.5 * z, 0, TAU);
    c.stroke();
    c.globalAlpha = 1;
  }
  // the node: a disc, a keystone is an octagon
  const shape = () => {
    c.beginPath();
    if (n.kind === 'key')
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + TAU / 16;
        c[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08);
      }
    else c.arc(x, y, r, 0, TAU);
    c.closePath();
  };
  shape();
  c.fillStyle = lit ? col : open ? '#2c3468' : '#1e2550';
  c.fill();
  c.lineWidth = Math.max(1.5, 3 * z);
  c.strokeStyle = lit ? OUT : open ? col : '#4a5488';
  c.stroke();
  // an inner ring: gold on notables and keystones, the branch colour on open nodes
  if (n.kind === 'notable' || n.kind === 'key' || (!lit && open)) {
    c.beginPath();
    c.arc(x, y, r - 3.5 * z, 0, TAU);
    c.strokeStyle = n.kind === 'small' ? col : lit ? '#fff3c8' : '#c9a24a';
    c.lineWidth = Math.max(1, 2 * z);
    c.stroke();
  }
  glyph(c, n.ic, x, y, r * 0.55, lit ? '#fffaf0' : open ? '#e0e5ff' : '#8a93c8');
  if (n.id === sel || n.id === hover) {
    c.beginPath();
    c.arc(x, y, r + 7 * z, 0, TAU);
    c.strokeStyle = n.id === sel ? '#ffffff' : 'rgba(255,255,255,.5)';
    c.lineWidth = 2.5 * z;
    c.stroke();
  }
  if (flash && flash.id === n.id) {
    const k = flash.t / 0.8;
    c.beginPath();
    c.arc(x, y, r + k * 40 * z, 0, TAU);
    c.strokeStyle = 'rgba(255,240,180,' + (1 - k).toFixed(3) + ')';
    c.lineWidth = 4 * z;
    c.stroke();
  }
  // names under notables and keystones when zoomed in enough
  if ((n.kind === 'notable' || n.kind === 'key') && z > 0.42) {
    c.font = '600 ' + Math.round(Math.max(11, Math.min(15, 14 * z))) + 'px Fredoka,sans-serif';
    // names sit on the outer side: beside nodes on up/down paths, above keystones and below
    // notables on sideways paths, so neighbours' names never collide
    const len = Math.hypot(n.x, n.y) || 1,
      ox = n.x / len,
      oy = n.y / len,
      beside = Math.abs(oy) > Math.abs(ox) * 1.1,
      above = !beside && n.kind === 'key';
    let tx = x,
      ty = above ? y - r - 6 * z : y + r + 6 * z;
    c.textAlign = 'center';
    c.textBaseline = above ? 'bottom' : 'top';
    if (beside) {
      tx = x + Math.sign(ox || 1) * (r + 8 * z);
      ty = y;
      c.textAlign = ox < 0 ? 'right' : 'left';
      c.textBaseline = 'middle';
    }
    c.lineJoin = 'round';
    c.lineWidth = 4;
    c.strokeStyle = '#0d1028';
    c.strokeText(n.n, tx, ty);
    c.fillStyle = lit ? '#fff3c8' : '#aab2dc';
    c.fillText(n.n, tx, ty);
  }
}
/** Small line icons for the node types (centred on x, y, size s). */
function glyph(
  c: CanvasRenderingContext2D,
  ic: string,
  x: number,
  y: number,
  s: number,
  col: string,
) {
  c.save();
  c.translate(x, y);
  c.scale(s / 10, s / 10);
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  switch (ic) {
    case 'dmg': // a sword
      c.moveTo(-7, 7);
      c.lineTo(7, -7);
      c.moveTo(-8, 2);
      c.lineTo(-2, 8);
      c.stroke();
      break;
    case 'crit': // a four-point star
    case 'critd':
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU - Math.PI / 2,
          rr = k % 2 ? 3 : 9;
        c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      if (ic === 'crit') c.fill();
      else c.stroke();
      break;
    case 'aspd': // double chevron
      c.moveTo(-8, -6);
      c.lineTo(-2, 0);
      c.lineTo(-8, 6);
      c.moveTo(1, -6);
      c.lineTo(7, 0);
      c.lineTo(1, 6);
      c.stroke();
      break;
    case 'spd': // an arrow with speed lines
      c.moveTo(-8, 0);
      c.lineTo(7, 0);
      c.moveTo(2, -5);
      c.lineTo(7, 0);
      c.lineTo(2, 5);
      c.moveTo(-8, -5);
      c.lineTo(-4, -5);
      c.moveTo(-8, 5);
      c.lineTo(-4, 5);
      c.stroke();
      break;
    case 'leech': // a drop
      c.moveTo(0, -9);
      c.quadraticCurveTo(8, 1, 0, 8);
      c.quadraticCurveTo(-8, 1, 0, -9);
      c.fill();
      break;
    case 'hp': // a heart
      c.moveTo(0, 8);
      c.bezierCurveTo(-10, 0, -7, -9, 0, -4);
      c.bezierCurveTo(7, -9, 10, 0, 0, 8);
      c.fill();
      break;
    case 'armor': // a shield
    case 'dr':
      c.moveTo(0, -9);
      c.lineTo(8, -5);
      c.quadraticCurveTo(7, 5, 0, 9);
      c.quadraticCurveTo(-7, 5, -8, -5);
      c.closePath();
      if (ic === 'armor') c.fill();
      else {
        c.stroke();
        c.beginPath();
        c.arc(0, 0, 2.4, 0, TAU);
        c.fill();
      }
      break;
    case 'regen': // a plus
      c.lineWidth = 3.4;
      c.moveTo(0, -7);
      c.lineTo(0, 7);
      c.moveTo(-7, 0);
      c.lineTo(7, 0);
      c.stroke();
      break;
    case 'pot': // a flask
      c.moveTo(-2.5, -8);
      c.lineTo(2.5, -8);
      c.moveTo(-2, -8);
      c.lineTo(-2, -3);
      c.lineTo(-7, 6);
      c.quadraticCurveTo(0, 10, 7, 6);
      c.lineTo(2, -3);
      c.lineTo(2, -8);
      c.stroke();
      break;
    case 'cdr': // a clock
      c.arc(0, 0, 8, 0, TAU);
      c.moveTo(0, -5);
      c.lineTo(0, 0);
      c.lineTo(4, 3);
      c.stroke();
      break;
    case 'roll': // a circular arrow
      c.arc(0, 0, 7, -Math.PI * 0.2, Math.PI * 1.4);
      c.stroke();
      c.beginPath();
      c.moveTo(5, -8);
      c.lineTo(6, -3);
      c.lineTo(1, -3);
      c.stroke();
      break;
    case 'reach': // a sweeping arc
      c.arc(-4, 6, 12, -Math.PI * 0.5, 0);
      c.stroke();
      c.beginPath();
      c.arc(-4, 6, 6, -Math.PI * 0.5, 0);
      c.stroke();
      break;
    case 'gold': // a coin
      c.arc(0, 0, 8, 0, TAU);
      c.stroke();
      c.beginPath();
      c.moveTo(0, -4);
      c.lineTo(0, 4);
      c.stroke();
      break;
    case 'xp': // an open book
      c.moveTo(0, -5);
      c.quadraticCurveTo(-5, -8, -9, -6);
      c.lineTo(-9, 6);
      c.quadraticCurveTo(-5, 4, 0, 7);
      c.quadraticCurveTo(5, 4, 9, 6);
      c.lineTo(9, -6);
      c.quadraticCurveTo(5, -8, 0, -5);
      c.lineTo(0, 7);
      c.stroke();
      break;
    case 'dodge': // gusts of wind
      c.moveTo(-8, -3);
      c.lineTo(3, -3);
      c.quadraticCurveTo(8, -3, 7, -7);
      c.moveTo(-8, 3);
      c.lineTo(5, 3);
      c.quadraticCurveTo(9, 3, 8, 7);
      c.stroke();
      break;
    case 'key': // a rune: a diamond with a cross
      c.moveTo(0, -9);
      c.lineTo(7, 0);
      c.lineTo(0, 9);
      c.lineTo(-7, 0);
      c.closePath();
      c.moveTo(0, -5);
      c.lineTo(0, 5);
      c.moveTo(-3.5, 0);
      c.lineTo(3.5, 0);
      c.stroke();
      break;
    default: // start: a compass star
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU - Math.PI / 2,
          rr = k % 2 ? 3.5 : 10;
        c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
  }
  c.restore();
}
