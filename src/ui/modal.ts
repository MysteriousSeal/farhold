import { drawIcon } from '../art/items';
import { $, mkCanvas } from '../core/dom';
import { RAR, STATN } from '../data/classes';
import { compareItem } from '../game/power';
import { itemStat } from '../game/items';
import { game } from '../game/state';
import { joy } from '../input/input';
import { setHud } from './hud';
import { closeAll, showScreen } from './screens';
/* ---- modal helpers ---- */
const mp = $('#mp');
export function openModal(html) {
  game.state = 'modal';
  game.atkHeld = false;
  joy.id = null;
  joy.x = joy.y = 0;
  mp.classList.remove('bare', 'wide');
  mp.innerHTML = html;
  showScreen('modal');
  setHud(false);
  mp.scrollTop = 0;
}
/**
 * An item card (bags and vendor grids): icon, ▲/▼ power change vs what is worn (top-left),
 * and a footer with the item level and a gold amount (price or salvage value).
 */
export function itemCard(it, gold: number, sel = false) {
  const d = document.createElement('div'),
    pc = Math.round(compareItem(it).overall * 100);
  d.className = 'cell scell' + (sel ? ' sel' : '');
  d.style.borderColor = RAR[it.r].c;
  d.appendChild(iconCanvas(it));
  d.insertAdjacentHTML(
    'beforeend',
    (pc > 0
      ? '<i class="pct up" title="Better than what you wear">▲' + pc + '%</i>'
      : pc < 0
        ? '<i class="pct down" title="Weaker than what you wear">▼' + -pc + '%</i>'
        : '') +
      '<span class="foot"><i class="lv">Lv' +
      it.lvl +
      '</i><b class="price">' +
      gold.toLocaleString('en-US') +
      '</b></span>',
  );
  return d;
}
export function iconCanvas(it, sz = 128) {
  const c = mkCanvas(sz, sz);
  drawIcon(c.getContext('2d'), it, sz);
  return c;
}
export function statLines(it, cmp) {
  return Object.keys(STATN)
    .filter((k) => it.st[k] || (cmp && cmp.st[k]))
    .map((k) => {
      const a = itemStat(it, k),
        b = cmp ? itemStat(cmp, k) : 0,
        d = Math.round((a - b) * 10) / 10;
      return (
        '<div>' +
        STATN[k] +
        ' <b>' +
        (a ? '+' + a : '0') +
        (cmp && d
          ? ' <span class="' + (d > 0 ? 'up' : 'dn') + '">(' + (d > 0 ? '+' : '') + d + ')</span>'
          : '') +
        '</b></div>'
      );
    })
    .join('');
}
const COIN_SVG =
  '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#f5c451" stroke="#241a2e" stroke-width="1.8"/><circle cx="10" cy="10" r="5.2" fill="none" stroke="#b8862e" stroke-width="1.4"/><path d="M6.5 6.8 Q8 5.4 10 5.4" stroke="#fff6c8" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
/** The hero's purse as a gold pill with the HUD coin: "(coin) 29,410". */
export const goldPill = (n: number) =>
  '<span class="goldpill" title="Gold">' +
  COIN_SVG +
  '<b>' +
  n.toLocaleString('en-US') +
  '</b></span>';
const POT_SVG =
  '<svg viewBox="0 0 20 20"><path d="M7.6 2.6 H12.4 V6.6 L16 13.4 Q17 17.4 13 17.6 H7 Q3 17.4 4 13.4 L7.6 6.6 Z" fill="#e8f2ff" stroke="#241a2e" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.6 12 H14.4 L15.3 13.8 Q16 16.2 13 16.3 H7 Q4 16.2 4.7 13.8 Z" fill="#e0443a"/><rect x="7" y="1.6" width="6" height="2.4" rx="1" fill="#9a6a3a" stroke="#241a2e" stroke-width="1.4"/><circle cx="8.6" cy="13.8" r="1" fill="#ffb0a0"/></svg>';
/** Potion count as a pill with the HUD potion flask. */
export const potPill = (n: number) =>
  '<span class="goldpill potpill" title="Health potions">' + POT_SVG + '<b>' + n + '</b></span>';
export function hdr(title, sub) {
  return (
    '<div class="mh"><div><h2>' +
    title +
    '</h2>' +
    (sub ? '<div class="desc">' + sub + '</div>' : '') +
    '</div><button class="btn sm" data-close>Close</button></div>'
  );
}
export function wireClose() {
  mp.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeAll));
}
export function btn(label, fn, cls = '', dis = false) {
  const b = document.createElement('button');
  b.className = 'btn sm ' + cls;
  b.textContent = label;
  b.disabled = dis;
  b.onclick = fn;
  return b;
}
