import { drawHumanoid, drawWeapon, handOver, handPos, restAng } from '../art/humanoid';
import { compareItem, fmtPct } from '../game/power';
import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { CLS, MATS, RACE, RAR, SLOT_NAME } from '../data/classes';
import { BAGMAX } from '../game/drops';
import { toast } from '../game/fx';
import {
  equipSlot,
  gearScore,
  itemName,
  salvageAll,
  salvageValue,
  salvageable,
} from '../game/items';
import { game } from '../game/state';
import { calcStats, xpNeed } from '../game/stats';
import { btn, iconCanvas, openModal, statLines } from './modal';
import { closeAll } from './screens';
/* ================= CHARACTER SHEET & BAGS ================= */
// Two independent windows shown side by side (stacked on phones): the character sheet (C) with
// a front-facing portrait framed by the gear slots, and the bags (B / I).

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

let charOpen = false,
  bagsOpen = false,
  selItem = null,
  salvageArmed = false;

function open() {
  if (!charOpen && !bagsOpen) {
    closeAll();
    return;
  }
  if (game.state !== 'inv') {
    openModal('<div class="wins" id="wins"></div>');
    game.state = 'inv';
  }
  $('#mp').classList.add('bare');
  render();
}
/** B / I / Tab / bag button: show or hide the bags window. */
export function toggleBags() {
  if (game.state !== 'play' && game.state !== 'inv') return;
  if (game.state === 'play') charOpen = false;
  bagsOpen = game.state === 'play' ? true : !bagsOpen;
  if (bagsOpen) salvageArmed = false;
  $('#bagBtn').classList.remove('pulse');
  open();
}
/** C / hero button: show or hide the character sheet. */
export function toggleChar() {
  if (game.state !== 'play' && game.state !== 'inv') return;
  if (game.state === 'play') bagsOpen = false;
  charOpen = game.state === 'play' ? true : !charOpen;
  open();
}
/** Kept for callers that simply want the bags. */
export const openInv = toggleBags;

function winHead(title: string, sub: string, which: string) {
  return (
    '<div class="mh"><div><h2>' +
    title +
    '</h2>' +
    (sub ? '<div class="desc">' + sub + '</div>' : '') +
    '</div><button class="btn sm" data-win="' +
    which +
    '" aria-label="Close">✕</button></div>'
  );
}
function render() {
  const root = $('#wins');
  if (!root) return;
  root.innerHTML =
    (charOpen ? '<div class="win charw" id="wChar"></div>' : '') +
    (bagsOpen ? '<div class="win bagsw" id="wBags"></div>' : '');
  if (charOpen) renderChar();
  if (bagsOpen) renderBags();
  root.querySelectorAll('[data-win]').forEach((b: HTMLElement) => {
    b.onclick = () => {
      if (b.dataset.win === 'char') charOpen = false;
      else bagsOpen = false;
      open();
    };
  });
}

/* ---------- character sheet ---------- */
function drawPortrait(cv: HTMLCanvasElement) {
  const x = cv.getContext('2d'),
    w = game.P.eq.weapon;
  x.clearRect(0, 0, cv.width, cv.height);
  // centre the whole figure (helmet top ≈ -48, feet ≈ +4, weapon slightly to the right)
  const k = 2 * 2.9;
  x.setTransform(k, 0, 0, k, cv.width / 2 - 2 * k, cv.height / 2 + 22 * k);
  const hp = handPos(0, 1, false, 0, 0, game.P.race),
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
        null, // no rarity glow on held weapons
        w ? w.style : 0,
      );
  drawHumanoid(x, 0, 0, { look: game.P.look, dx: 0, dy: 1, moving: false, walk: 0, time: 0 });
  wd();
  handOver(x, hp.x, hp.y, game.P.look);
  x.setTransform(1, 0, 0, 1, 0, 0);
}
const SLOT_ICON = {
  helm: '⛑',
  amulet: '📿',
  armor: '🥋',
  gloves: '🧤',
  pants: '👖',
  ring: '💍',
  ring2: '💍',
  boots: '👢',
  weapon: '⚔',
};
function slotCell(k: string) {
  const it = game.P.eq[k],
    d = document.createElement('div');
  d.className = 'cell slot' + (selItem && selItem.eq && selItem.it === it && it ? ' sel' : '');
  if (it) {
    d.style.borderColor = RAR[it.r].c;
    d.appendChild(iconCanvas(it));
  } else {
    const e = document.createElement('span');
    e.className = 'empty';
    e.textContent = SLOT_ICON[k];
    d.appendChild(e);
  }
  const lb = document.createElement('span');
  lb.className = 'lab';
  lb.textContent = SLOT_NAME[k];
  d.appendChild(lb);
  d.title = it ? itemName(it) : 'Empty ' + SLOT_NAME[k].toLowerCase() + ' slot';
  d.onclick = () => {
    if (!it) return;
    selItem = { it, eq: true, key: k };
    render();
  };
  return d;
}
function renderChar() {
  const P = game.P,
    need = xpNeed(P.lvl),
    el = $('#wChar');
  el.innerHTML =
    winHead(P.name, 'Level ' + P.lvl + ' ' + RACE[P.race].n + ' ' + CLS[P.cls].n, 'char') +
    '<div class="bar xp sheetxp"><i style="width:' +
    Math.min(100, (P.xp / need) * 100).toFixed(1) +
    '%"></i></div><div class="xpt">' +
    Math.floor(P.xp) +
    ' / ' +
    need +
    ' xp</div>' +
    '<div class="sheet"><div class="scol" id="sLeft"></div><div class="portrait"><canvas id="sHero" width="440" height="652"></canvas></div><div class="scol" id="sRight"></div></div>' +
    '<div class="wslot" id="sWeapon"></div>' +
    '<div class="gs">Gear score <b>' +
    gearScore(P.eq) +
    '</b></div><div class="stats sheetstats" id="sStats"></div><div id="cdetail"></div>';
  for (const k of ['helm', 'armor', 'gloves', 'pants']) $('#sLeft').appendChild(slotCell(k));
  for (const k of ['amulet', 'ring', 'ring2', 'boots']) $('#sRight').appendChild(slotCell(k));
  $('#sWeapon').appendChild(slotCell('weapon'));
  drawPortrait($('#sHero'));
  $('#sStats').innerHTML = [
    ['Health', Math.ceil(P.hp) + ' / ' + game.ST.hp],
    ['Attack', game.ST.atk],
    ['Armor', game.ST.def],
    ['Crit chance', game.ST.crit + '%'],
    ['Crit damage', '+' + game.ST.critd + '%'],
    ['Attack speed', '+' + game.ST.aspd + '%'],
    ['Speed', game.ST.spd],
    ['Life steal', game.ST.leech + '%'],
    ['Skill cooldown', '-' + game.ST.cdr + '%'],
    ['Gold', P.gold],
  ]
    .map((r) => '<div>' + r[0] + ' <b>' + r[1] + '</b></div>')
    .join('');
  if (selItem && selItem.eq) renderDetail($('#cdetail'));
}

/* ---------- bags ---------- */
function renderBags() {
  const el = $('#wBags');
  el.innerHTML =
    winHead(
      'Bags <span style="opacity:.6;font-size:20px">' +
        game.P.inv.length +
        '/' +
        BAGMAX +
        '</span>',
      '🪙 ' + game.P.gold + ' gold   🧪 ' + game.P.pot + ' potions',
      'bags',
    ) +
    '<div class="bag" id="iBag"></div><div class="acts" id="iBulk"></div><div id="detail"></div>';
  const bg = $('#iBag');
  game.P.inv.forEach((it) => {
    const d = document.createElement('div');
    d.className = 'cell' + (selItem && !selItem.eq && selItem.it === it ? ' sel' : '');
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
      render();
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
            render();
            return;
          }
          const r = salvageAll(game.P);
          salvageArmed = false;
          if (selItem && !selItem.eq && !game.P.inv.includes(selItem.it)) selItem = null;
          SFX.coin();
          toast('Salvaged ' + r.count + ' items for ' + r.gold + ' gold');
          render();
        },
        salvageArmed ? '' : 'alt',
      ),
    );
  } else salvageArmed = false;
  const dt = $('#detail');
  if (selItem && !selItem.eq) renderDetail(dt);
  else
    dt.innerHTML =
      '<span style="opacity:.75">Tap an item to inspect it. Badges show how much stronger (or weaker) it would make you.</span>';
}

/* ---------- item details (equip / unequip / salvage) ---------- */
function renderDetail(dt: HTMLElement) {
  const it = selItem.it,
    cur = selItem.eq ? null : game.P.eq[equipSlot(it, game.P.eq)];
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
        game.P.eq[selItem.key] = null;
        game.P.inv.push(it);
        selItem = null;
        calcStats();
        render();
      }),
    );
  else {
    const equip = (key: string) => () => {
      const old = game.P.eq[key];
      game.P.eq[key] = it;
      game.P.inv.splice(game.P.inv.indexOf(it), 1);
      if (old) game.P.inv.push(old);
      selItem = null;
      calcStats();
      SFX.pick();
      render();
    };
    if (it.slot === 'ring' && game.P.eq.ring && game.P.eq.ring2) {
      // both ring slots full: choose which one to replace (the weaker one is suggested first)
      const weak = equipSlot(it, game.P.eq);
      for (const key of weak === 'ring' ? ['ring', 'ring2'] : ['ring2', 'ring'])
        bx.appendChild(
          btn('Replace ring ' + (key === 'ring' ? 1 : 2), equip(key), key === weak ? '' : 'alt'),
        );
    } else bx.appendChild(btn('Equip', equip(equipSlot(it, game.P.eq))));
    bx.appendChild(
      btn(
        'Salvage for ' + salvageValue(it) + ' gold',
        () => {
          game.P.gold += salvageValue(it);
          game.P.inv.splice(game.P.inv.indexOf(it), 1);
          selItem = null;
          SFX.coin();
          render();
        },
        'alt',
      ),
    );
  }
}
