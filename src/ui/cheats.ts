import { TAU } from '../core/math';
import { ET } from '../data/enemies';
import { makeEnemy, unstick } from '../game/enemies';
import { game } from '../game/state';
import { startEvent } from '../game/events';
import { banner, doFade, toast } from '../game/fx';
import { gainXp } from '../game/combat';
import { xpNeed } from '../game/stats';
import { PC, poiAt } from '../world/poi';
import { solidAt } from '../world/chunks';
/* ================= CHEATS (dev builds only, loaded from main.ts) ================= */
// A button in the bottom-left corner opens a panel to spawn any regular enemy, at the
// hero's level, right next to the hero; start a world event; gain a level; or jump to the
// nearest uncleared cave.

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
  display:none;width:250px;padding:10px;border-radius:12px;border:2px solid #1c1008;
  background:rgba(36,26,46,.95);box-shadow:inset 0 0 0 2px #c9912c,0 6px 14px rgba(0,0,0,.5)}
#cheatPanel.on{display:block}
#cheatPanel h3{margin:0 0 8px;font:700 14px var(--f);color:#ffe7a8}
#cheatPanel .grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
#cheatPanel button{padding:5px 6px;border-radius:7px;border:1.5px solid #1c1008;
  background:#efe0bf;color:#241a2e;font:600 12px var(--f);cursor:pointer;text-align:left}
#cheatPanel button:hover{background:#f5c451}`;
document.head.appendChild(css);

const btn = document.createElement('button'),
  panel = document.createElement('div');
btn.id = 'cheatBtn';
btn.textContent = 'Cheats';
panel.id = 'cheatPanel';
panel.innerHTML = '<h3>Spawn enemy (your level)</h3><div class="grid"></div>';
const grid = panel.querySelector('.grid');
for (const [type, D] of Object.entries(ET) as [string, { n: string }][]) {
  const b = document.createElement('button');
  b.textContent = D.n;
  b.onclick = () => spawn(type);
  grid.appendChild(b);
}
panel.insertAdjacentHTML('beforeend', '<h3>World event</h3><div class="grid ev"></div>');
for (const [kind, label] of [
  ['raid', 'Raid'],
  ['merchant', 'Merchant'],
  ['meteor', 'Meteor'],
]) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => {
    if (!startEvent(kind))
      toast(
        kind === 'raid'
          ? 'No village close enough for a raid'
          : 'No clear spot nearby for this event, move a little',
      );
  };
  panel.querySelector('.grid.ev').appendChild(b);
}
/** Level up once, as if the experience had been earned (the usual fanfare and point). */
function levelUp() {
  if (game.state !== 'play' || !game.P) return;
  game.P.xp = xpNeed(game.P.lvl);
  gainXp(0);
}
/** Jump to the entrance of the nearest cave not yet cleared (from the open world only). */
function toNearestCave() {
  if (game.state !== 'play' || !game.P) return;
  if (game.mode !== 'world') {
    toast('Step outside first');
    return;
  }
  const ci = Math.floor(game.P.x / PC),
    cj = Math.floor(game.P.y / PC);
  let best = null,
    bd = 1e9;
  for (let i = ci - 8; i <= ci + 8; i++)
    for (let j = cj - 8; j <= cj + 8; j++) {
      const q = poiAt(i, j);
      if (!q || q.kind !== 'cave' || game.P.cleared[q.key]) continue;
      const d = Math.hypot(q.x - game.P.x, q.y - game.P.y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
  if (!best) {
    toast('No uncleared cave nearby');
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
panel.insertAdjacentHTML('beforeend', '<h3>Hero</h3><div class="grid hero"></div>');
for (const [label, fn] of [
  ['+1 level', levelUp],
  ['Nearest cave', toNearestCave],
] as [string, () => void][]) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = fn;
  panel.querySelector('.grid.hero').appendChild(b);
}
btn.onclick = () => panel.classList.toggle('on');
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
