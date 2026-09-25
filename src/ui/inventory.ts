import { drawHumanoid, drawWeapon, handPos, restAng } from '../art/humanoid';
import { compareItem, fmtPct } from '../game/power';
import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { MATS, RAR, SLOTS } from '../data/classes';
import { BAGMAX } from '../game/drops';
import { toast } from '../game/fx';
import { itemName, salvageAll, salvageValue, salvageable } from '../game/items';
import { game } from '../game/state';
import { calcStats } from '../game/stats';
import { btn, hdr, iconCanvas, openModal, statLines, wireClose } from './modal';
/* inventory */
const pctSpan = (x: number) =>
  '<span class="' + (x < 0 ? 'dn' : 'up') + '">' + fmtPct(x) + '</span>';
/** Headline "+14% overall" plus a damage / toughness breakdown for a bag item. */
export function powerLines(it, equipped: boolean) {
  if (equipped) return '';
  const r = compareItem(it);
  return (
    '<div style="margin-top:6px;font-weight:700;font-size:16px">' +
    pctSpan(r.overall) +
    ' overall</div><div style="opacity:.85;font-size:13px">Damage ' +
    pctSpan(r.dmg) +
    ' · Toughness ' +
    pctSpan(r.tough) +
    '</div>'
  );
}
let selItem = null,
  salvageArmed = false;
export function openInv() {
  if (game.state !== 'play') return;
  selItem = null;
  salvageArmed = false;
  openModal('<div id="invroot"></div>');
  game.state = 'inv';
  renderInv();
  $('#bagBtn').classList.remove('pulse');
}
function drawDoll() {
  const cv2 = $('#invHero');
  if (!cv2) return;
  const x = cv2.getContext('2d');
  x.clearRect(0, 0, 300, 300);
  const w = game.P.eq.weapon,
    poses = [
      [0, 1, -62],
      [1, 0, 62],
    ];
  for (const [dx, dy, ox] of poses) {
    x.setTransform(2.7, 0, 0, 2.7, 150 + ox, 228);
    const hp = handPos(dx, dy, false, 0, 0, game.P.race),
      ang = restAng(hp, game.P.cls),
      wd = () =>
        drawWeapon(
          x,
          hp.x,
          hp.y,
          ang,
          game.P.cls,
          0,
          w ? MATS[w.mat][1] : null,
          w && w.r >= 2 ? RAR[w.r].c : null,
          w ? w.style : 0,
        );
    if (hp.behind) wd();
    drawHumanoid(x, 0, 0, { look: game.P.look, dx, dy, moving: false, walk: 0, time: 0 });
    if (!hp.behind) wd();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
}
function renderInv() {
  const root = $('#invroot');
  if (!root) return;
  root.innerHTML =
    hdr('Inventory', '🪙 ' + game.P.gold + ' gold   🧪 ' + game.P.pot + ' potions') +
    '<div class="invgrid"><div><div class="doll"><canvas id="invHero" width="300" height="300"></canvas></div><h3>Equipped</h3><div class="slots" id="iSlots"></div><div class="stats" id="iStats"></div></div><div><h3>Bag <span style="opacity:.6">' +
    game.P.inv.length +
    '/' +
    BAGMAX +
    '</span></h3><div class="bag" id="iBag"></div><div class="acts" id="iBulk"></div><div id="detail"></div></div></div>';
  wireClose();
  drawDoll();
  const sl = $('#iSlots');
  for (const k of SLOTS) {
    const it = game.P.eq[k],
      d = document.createElement('div');
    d.className = 'cell' + (selItem && selItem.it === it && it ? ' sel' : '');
    if (it) {
      d.style.borderColor = RAR[it.r].c;
      d.appendChild(iconCanvas(it));
    }
    const lb = document.createElement('span');
    lb.className = 'lab';
    lb.textContent = k;
    d.appendChild(lb);
    d.onclick = () => {
      if (it) {
        selItem = { it, eq: true };
        renderInv();
      }
    };
    sl.appendChild(d);
  }
  const bg = $('#iBag');
  game.P.inv.forEach((it) => {
    const d = document.createElement('div');
    d.className = 'cell' + (selItem && selItem.it === it ? ' sel' : '');
    d.style.borderColor = RAR[it.r].c;
    d.appendChild(iconCanvas(it));
    // overall change if this item were equipped
    const pw = compareItem(it).overall;
    if (Math.abs(pw) >= 0.005) {
      const u = document.createElement('span');
      u.className = 'upg';
      u.textContent = fmtPct(pw);
      if (pw < 0) u.style.color = '#ff7d70';
      d.appendChild(u);
    }
    d.onclick = () => {
      selItem = { it };
      salvageArmed = false;
      renderInv();
    };
    bg.appendChild(d);
  });
  for (let i = game.P.inv.length; i < BAGMAX; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.style.opacity = '.35';
    bg.appendChild(d);
  }
  const junk = salvageable(game.P.inv);
  if (junk.length) {
    const gold = junk.reduce((a, it) => a + salvageValue(it), 0);
    $('#iBulk').appendChild(
      btn(
        salvageArmed
          ? 'Tap again: salvage ' + junk.length + ' items for ' + gold + ' gold'
          : 'Salvage all except Epic & Legendary (' + junk.length + ')',
        () => {
          if (!salvageArmed) {
            salvageArmed = true;
            renderInv();
            return;
          }
          const r = salvageAll(game.P);
          salvageArmed = false;
          if (selItem && !selItem.eq && !game.P.inv.includes(selItem.it)) selItem = null;
          SFX.coin();
          toast('Salvaged ' + r.count + ' items for ' + r.gold + ' gold');
          renderInv();
        },
        salvageArmed ? '' : 'alt',
      ),
    );
  } else salvageArmed = false;
  $('#iStats').innerHTML = [
    ['Level', game.P.lvl],
    ['Health', Math.ceil(game.P.hp) + ' / ' + game.ST.hp],
    ['Attack', game.ST.atk],
    ['Armor', game.ST.def],
    ['Crit chance', game.ST.crit + '%'],
    ['Crit damage', '+' + game.ST.critd + '%'],
    ['Attack speed', '+' + game.ST.aspd + '%'],
    ['Speed', game.ST.spd],
    ['Life steal', game.ST.leech + '%'],
    ['Skill cooldown', '-' + game.ST.cdr + '%'],
  ]
    .map((r) => '<div>' + r[0] + ' <b>' + r[1] + '</b></div>')
    .join('');
  const dt = $('#detail');
  if (!selItem) {
    dt.innerHTML =
      '<span style="opacity:.75">Tap an item to inspect it. Badges show how much stronger (or weaker) it would make you.</span>';
    return;
  }
  const it = selItem.it,
    cur = selItem.eq ? null : game.P.eq[it.slot];
  dt.innerHTML =
    '<div class="nm" style="color:' +
    RAR[it.r].c +
    '">' +
    itemName(it) +
    '</div><div style="opacity:.75">' +
    RAR[it.r].n +
    ' ' +
    it.slot +
    ', item level ' +
    it.lvl +
    '</div>' +
    powerLines(it, selItem.eq) +
    '<div class="stats">' +
    statLines(it, cur) +
    '</div><div class="acts"></div>';
  const bx = dt.querySelector('.acts');
  if (selItem.eq)
    bx.appendChild(
      btn('Unequip', () => {
        if (game.P.inv.length >= BAGMAX) {
          toast('Bag is full');
          return;
        }
        game.P.eq[it.slot] = null;
        game.P.inv.push(it);
        selItem = null;
        calcStats();
        renderInv();
      }),
    );
  else {
    bx.appendChild(
      btn('Equip', () => {
        const old = game.P.eq[it.slot];
        game.P.eq[it.slot] = it;
        game.P.inv.splice(game.P.inv.indexOf(it), 1);
        if (old) game.P.inv.push(old);
        selItem = null;
        calcStats();
        SFX.pick();
        renderInv();
      }),
    );
    bx.appendChild(
      btn(
        'Salvage for ' + salvageValue(it) + ' gold',
        () => {
          game.P.gold += salvageValue(it);
          game.P.inv.splice(game.P.inv.indexOf(it), 1);
          selItem = null;
          SFX.coin();
          renderInv();
        },
        'alt',
      ),
    );
  }
}
