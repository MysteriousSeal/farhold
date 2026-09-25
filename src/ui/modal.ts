import { drawIcon } from '../art/items';
import { $, mkCanvas } from '../core/dom';
import { STATN } from '../data/classes';
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
  mp.classList.remove('bare');
  mp.innerHTML = html;
  showScreen('modal');
  setHud(false);
  mp.scrollTop = 0;
}
export function iconCanvas(it, sz = 64) {
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
