import { $ } from '../core/dom';
import { TAU } from '../core/math';
import { ET } from '../data/enemies';
import { makeEnemy, unstick } from '../game/enemies';
import { game } from '../game/state';
import { startEvent } from '../game/events';
import { banner, doFade, toast } from '../game/fx';
import { gainXp } from '../game/combat';
import { BAGMAX } from '../game/drops';
import { helmSkins } from '../game/items';
import { xpNeed } from '../game/stats';
import { PC, poiAt } from '../world/poi';
import { solidAt } from '../world/chunks';
/* ================= CHEATS (dev builds only, loaded from main.ts) ================= */
// A button in the bottom-left corner opens a panel to spawn any regular enemy, at the
// hero's level, right next to the hero; start a world event; gain a level; jump to the
// nearest uncleared cave or stone-gate dungeon; or drop every helmet look into the bag.

/** A free spot 70–110 units from the hero, or the hero's own position as a fallback. */
function spotNearHero() {
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * TAU,
      d = 70 + Math.random() * 40,
      x = game.P.x + Math.cos(a) * d,
      y = game.P.y + Math.sin(a) * d;
    if (!solidAt(x, y, 14)) return { x, y };
  }
  return { x: game.P.x + 60, y: game.P.y };
}
function spawn(type: string) {
  if (game.state !== 'play' || !game.P) return;
  const { x, y } = spotNearHero();
  game.enemies.push(makeEnemy(type, game.P.lvl, x, y));
}

const css = document.createElement('style');
css.textContent = `
#cheatBtn{position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:30;
  padding:6px 12px;border-radius:10px;border:2px solid #1c1008;background:#7a1e22;color:#ffe7a8;
  font:700 13px var(--f);cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.45)}
#cheatPanel{position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom) + 52px);z-index:30;
  display:none;width:min(340px,calc(100vw - 24px));max-height:calc(100vh - 180px);overflow:auto;
  padding:12px 14px 14px;border-radius:14px;border:2px solid #1c1008;
  background:rgba(24,18,34,.97);box-shadow:inset 0 0 0 2px #c9912c,0 8px 20px rgba(0,0,0,.55)}
#cheatPanel.on{display:block}
#cheatPanel .chead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
#cheatPanel .chead b{font:700 17px var(--f);color:#f5c451}
#cheatPanel .chead small{font:500 12px var(--f);color:#c8bfa8}
#cheatPanel section{padding:10px 0 4px;border-top:1px solid rgba(201,145,44,.35)}
#cheatPanel h3{margin:0 0 2px;font:700 14px var(--f);color:#ffe7a8;letter-spacing:.3px}
#cheatPanel p{margin:0 0 8px;font:400 12px var(--f);color:#b9b0c8}
#cheatPanel .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#cheatPanel .grid.three{grid-template-columns:1fr 1fr 1fr}
#cheatPanel button{padding:8px 8px;border-radius:8px;border:1.5px solid #1c1008;
  background:#efe0bf;color:#241a2e;font:600 13px var(--f);cursor:pointer;text-align:center;
  box-shadow:0 2px 0 rgba(0,0,0,.35)}
#cheatPanel button:hover{background:#f5c451}
#cheatPanel button:active{transform:translateY(1px);box-shadow:none}
#cheatPanel .wide{grid-column:1/-1}`;
document.head.appendChild(css);

const btn = document.createElement('button'),
  panel = document.createElement('div');
btn.id = 'cheatBtn';
btn.textContent = 'Cheats';
panel.id = 'cheatPanel';
const section = (id: string, title: string, desc: string, cls = '') => {
  panel.insertAdjacentHTML(
    'beforeend',
    '<section><h3>' +
      title +
      '</h3><p>' +
      desc +
      '</p><div class="grid ' +
      cls +
      '" id="' +
      id +
      '"></div></section>',
  );
  return panel.querySelector('#' + id);
};
const add = (el: Element, label: string, fn: () => void, cls = '') => {
  const b = document.createElement('button');
  b.textContent = label;
  if (cls) b.className = cls;
  b.onclick = fn;
  el.appendChild(b);
};
/** Level up once, as if the experience had been earned (the usual fanfare and point). */
function levelUp() {
  if (game.state !== 'play' || !game.P) return;
  game.P.xp = xpNeed(game.P.lvl);
  gainXp(0);
  $('#cheatLv').textContent = 'Level ' + game.P.lvl;
}
/**
 * Jump to the nearest uncleared entrance of one kind (from the open world only).
 * A dungeon is a stone gate; a cave mound is separate.
 */
function toNearestPlace(kind: 'cave' | 'gate') {
  if (game.state !== 'play' || !game.P) return;
  if (game.mode !== 'world') {
    toast('Step outside first');
    return;
  }
  const ci = Math.floor(game.P.x / PC),
    cj = Math.floor(game.P.y / PC);
  const R = 8;
  let best = null,
    bd = 1e9;
  for (let i = ci - R; i <= ci + R; i++)
    for (let j = cj - R; j <= cj + R; j++) {
      const q = poiAt(i, j);
      if (!q || q.kind !== kind || game.P.cleared[q.key]) continue;
      const d = Math.hypot(q.x - game.P.x, q.y - game.P.y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
  if (!best) {
    toast(kind === 'cave' ? 'No uncleared cave nearby' : 'No uncleared dungeon nearby');
    return;
  }
  doFade(() => {
    game.P.x = best.x;
    game.P.y = best.y + 60; // just in front of the entrance
    unstick(game.P);
    game.enemies = [];
    game.camX = game.P.x;
    game.camY = game.P.y;
    game.poiT = 0;
    banner(best.name, 'Danger level ' + best.lvl);
  });
}
/** Put every helmet look in the bag: each metal as a Cap and a Helm. */
function giveHelms() {
  if (game.state !== 'play' || !game.P) return;
  const have = new Set(game.P.inv.filter((it) => it.slot === 'helm').map((it) => it.name));
  const fresh = helmSkins(game.P.lvl).filter((it) => !have.has(it.name));
  if (!fresh.length) {
    toast('Every helmet is already in your bag');
    return;
  }
  game.P.inv.push(...fresh);
  $('#bagBtn').classList.add('pulse');
  toast(
    'Added ' +
      fresh.length +
      ' helmet' +
      (fresh.length === 1 ? '' : 's') +
      (game.P.inv.length > BAGMAX ? ' — bag is over its limit' : ''),
  );
}
panel.innerHTML = '<div class="chead"><b>Cheats</b><small id="cheatLv"></small></div>';
const hero = section('cHero', 'Hero', 'Level up, or jump to a cave or the nearest dungeon.');
add(hero, '+1 level', levelUp, 'wide');
add(hero, 'Nearest dungeon', () => toNearestPlace('gate'), 'wide');
add(hero, 'Nearest cave', () => toNearestPlace('cave'), 'wide');
const gear = section('cGear', 'Gear', 'One of every metal, as a Cap and a Helm.');
add(gear, 'All helmets', giveHelms, 'wide');
const ev = section('cEv', 'World events', 'Start one right away, near you.', 'three');
for (const [kind, label] of [
  ['raid', 'Raid'],
  ['merchant', 'Merchant'],
  ['meteor', 'Meteor'],
])
  add(ev, label, () => {
    if (!startEvent(kind))
      toast(
        kind === 'raid'
          ? 'No village close enough for a raid'
          : 'No clear spot nearby for this event, move a little',
      );
  });
const foes = section('cFoe', 'Spawn enemy', 'At your level, right next to you.');
for (const [type, D] of Object.entries(ET) as [string, { n: string }][])
  add(foes, D.n, () => spawn(type));
btn.onclick = () => {
  panel.classList.toggle('on');
  if (game.P) $('#cheatLv').textContent = 'Level ' + game.P.lvl;
};
// keep the canvas from treating clicks here as attacks
for (const el of [btn, panel]) {
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.addEventListener('touchstart', (e) => e.stopPropagation());
}
document.body.append(btn, panel);
// only while playing
setInterval(() => {
  const on = game.state === 'play';
  btn.style.display = on ? 'block' : 'none';
  if (!on) panel.classList.remove('on');
}, 250);
