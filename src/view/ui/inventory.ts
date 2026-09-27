import { headY } from '../art/body';
import { carryPos, drawHumanoid, drawWeapon, handOver, handPos, restAng } from '../art/humanoid';
import { heroStyle } from '../../model/game/style';
import { compareItem, fmtPct } from '../../model/game/power';
import { SFX } from '../audio/sfx';
import { $ } from '../dom';
import { MATS, RAR, SLOT_NAME } from '../../model/data/classes';
import { BAGMAX } from '../../model/game/drops';
import { POT_CD, drinkPot } from '../../model/game/combat';
import {
  QUICK,
  TORCH_MAX,
  TORCH_TIME,
  lightTorch,
  quickKind,
  torchLeft,
  torches,
  type QuickKind,
} from '../../model/game/consumables';
import { toast } from '../../model/game/fx';
import { fmtClock } from '../../model/game/dungeons';
import {
  equipSlot,
  gearScore,
  itemName,
  salvageAll,
  salvageValue,
  salvageable,
} from '../../model/game/items';
import { game } from '../../model/game/state';
import { calcStats, xpNeed } from '../../model/game/stats';
import { btn, consCanvas, goldPill, itemCard, iconCanvas, openModal, statLines } from './modal';
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
export function drawPortrait(cv: HTMLCanvasElement) {
  const x = cv.getContext('2d'),
    w = game.P.eq.weapon;
  x.clearRect(0, 0, cv.width, cv.height);
  // centre the whole figure (from above the helmet to the feet, weapon slightly to the right)
  const L = game.P.look,
    top = headY(L) - 14,
    k = Math.min(5.8, (cv.height * 0.86) / (4 - top));
  x.setTransform(k, 0, 0, k, cv.width / 2 - 2 * k, cv.height / 2 - ((top + 4) / 2) * k);
  // warriors stand on guard (blade up); other classes hold their weapon at rest
  const guard =
      w && heroStyle() === 'warrior' ? carryPos(0, 1, false, 0, 0, game.P.race, 1, L) : null,
    hp = guard || handPos(0, 1, false, 0, 0, game.P.race, 1, L),
    ang = guard ? guard.ang : restAng(hp, heroStyle()),
    wd = () =>
      drawWeapon(
        x,
        hp.x,
        hp.y,
        ang,
        heroStyle(),
        0,
        MATS[w.mat][1],
        null, // no rarity glow on held weapons
        w.style,
      );
  drawHumanoid(x, 0, 0, {
    look: game.P.look,
    dx: 0,
    dy: 1,
    moving: false,
    walk: 0,
    time: 0,
    carry: guard ? guard.arm : null,
  });
  // bare hands hold nothing
  if (w) {
    wd();
    handOver(x, hp.x, hp.y, game.P.look);
  }
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
  offhand: '🛡',
};
function slotCell(k: string) {
  const it = game.P.eq[k],
    d = document.createElement('div');
  d.className = 'cell slot' + (selItem && selItem.eq && selItem.it === it && it ? ' sel' : '');
  if (it && it.kind === 'torch') {
    d.style.borderColor = '#ffb45a';
    d.appendChild(consCanvas('torch'));
    d.insertAdjacentHTML('beforeend', '<span class="cnt">' + fmtClock(it.left * 1000) + '</span>');
    d.classList.add('potcell');
  } else if (it) {
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
  d.title = it
    ? it.kind === 'torch'
      ? 'Lit torch'
      : itemName(it)
    : 'Empty ' + SLOT_NAME[k].toLowerCase() + ' slot';
  // a torch dragged from the Consumables row is lit in the off hand
  if (k === 'offhand')
    dropZone(
      d,
      (c) => c === 'torch',
      () => {
        if (lightTorch()) render();
      },
    );
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
    winHead(P.name, 'Level ' + P.lvl, 'char') +
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
  // right hand then left hand, as on the front-facing portrait
  $('#sWeapon').appendChild(slotCell('weapon'));
  $('#sWeapon').appendChild(slotCell('offhand'));
  drawPortrait($('#sHero'));
  $('#sStats').innerHTML = [
    ['Health', Math.ceil(P.hp) + ' / ' + game.ST.hp],
    ['Attack', Math.round(game.ST.atk)],
    ['Armor', game.ST.def],
    ['Crit chance', game.ST.crit + '%'],
    ['Crit damage', '+' + game.ST.critd + '%'],
    ['Attack speed', '+' + game.ST.aspd + '%'],
    ['Speed', game.ST.spd],
    ['Life steal', game.ST.leech + '%'],
    ['Skill cooldown', game.ST.cdr ? '-' + game.ST.cdr + '%' : '0%'],
    ['Gold', P.gold],
  ]
    .map((r) => '<div>' + r[0] + ' <b>' + r[1] + '</b></div>')
    .join('');
  if (selItem && selItem.eq)
    if (selItem.it.kind === 'torch') renderLitTorch($('#cdetail'));
    else renderDetail($('#cdetail'));
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
      goldPill(game.P.gold),
      'bags',
    ) +
    '<div class="bagsplit"><div><div class="bag" id="iBag"></div><div class="acts" id="iBulk"></div>' +
    '<div class="consum"><h3>Consumables</h3><div class="bag" id="iCons"></div></div></div>' +
    '<div id="detail"></div></div>';
  const bg = $('#iBag');
  game.P.inv.forEach((it) => {
    // same card as the vendor: power change vs worn, level and salvage value
    const d = itemCard(it, salvageValue(it), !!selItem && !selItem.eq && selItem.it === it);
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
  // items that would make the hero stronger (the ▲ badge) are never bulk-salvaged
  const isUp = (it) => compareItem(it).overall > 0.005,
    junk = salvageable(game.P.inv).filter((it) => !isUp(it));
  if (junk.length) {
    const gold = junk.reduce((a, it) => a + salvageValue(it), 0);
    $('#iBulk').appendChild(
      btn(
        salvageArmed
          ? 'Tap again: salvage ' + junk.length + ' items for ' + gold + ' gold'
          : 'Salvage all except Epic, Legendary and upgrades (' + junk.length + ')',
        () => {
          if (!salvageArmed) {
            salvageArmed = true;
            render();
            return;
          }
          const r = salvageAll(game.P, isUp);
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
  // consumables have their own row and never take bag space: the Q quick slot, then the stacks
  const row = $('#iCons'),
    qk = quickKind(),
    q = document.createElement('div');
  q.className = 'cell potcell quick';
  q.appendChild(consCanvas(qk));
  q.insertAdjacentHTML('beforeend', '<span class="qk">Q</span>');
  q.title = 'Quick slot (Q): ' + CONS[qk].n + '. Drag a consumable here to change it.';
  dropZone(
    q,
    () => true,
    (k) => {
      game.P.quick = k;
      toast(CONS[k].n + ' on Q');
      render();
    },
  );
  row.appendChild(q);
  for (const k of QUICK) {
    const n = k === 'torch' ? torches() : game.P.pot,
      c = document.createElement('div');
    c.className = 'cell potcell' + (selItem && selItem.cons === k ? ' sel' : '');
    c.style.opacity = n > 0 ? '' : '.45';
    c.appendChild(consCanvas(k));
    c.insertAdjacentHTML('beforeend', '<span class="cnt">' + n + '</span>');
    c.title = CONS[k].n + ' ×' + n;
    c.draggable = true;
    c.ondragstart = (e) => e.dataTransfer.setData('text/plain', 'cons:' + k);
    c.onclick = () => {
      selItem = { cons: k };
      salvageArmed = false;
      render();
    };
    row.appendChild(c);
  }
  const dt = $('#detail');
  if (selItem && selItem.cons) renderCons(dt, selItem.cons);
  else if (selItem && !selItem.eq) renderDetail(dt);
  else
    dt.innerHTML =
      '<div class="dempty"><b>No item selected</b><span>Tap an item to see its stats. Badges show how much stronger (or weaker) it would make you.</span></div>';
}

/* ---------- consumables ---------- */
const CONS: Record<QuickKind, { n: string; col: string }> = {
  pot: { n: 'Health potion', col: '#ff8a7a' },
  torch: { n: 'Torch', col: '#ffb45a' },
};
/** Accept a consumable dragged from the Consumables row (`cons:<kind>`). */
function dropZone(el: HTMLElement, ok: (k: QuickKind) => boolean, fn: (k: QuickKind) => void) {
  const kindOf = (e: DragEvent) => {
    const v = e.dataTransfer.getData('text/plain');
    return v.startsWith('cons:') ? (v.slice(5) as QuickKind) : null;
  };
  el.ondragover = (e) => {
    e.preventDefault();
    el.classList.add('drop');
  };
  el.ondragleave = () => el.classList.remove('drop');
  el.ondrop = (e) => {
    e.preventDefault();
    el.classList.remove('drop');
    const k = kindOf(e);
    if (k && QUICK.includes(k) && ok(k)) fn(k);
  };
}
/** A consumable stack: what it does, how many are left, using it and putting it on Q. */
function renderCons(dt: HTMLElement, k: QuickKind) {
  const pot = k === 'pot',
    n = pot ? game.P.pot : torches(),
    lines = pot
      ? [
          ['Restores', Math.round(game.ST.hp * 0.45 * (game.ST.potMul || 1)) + ' health'],
          ['You have', n],
          ['Cooldown', POT_CD + 's'],
        ]
      : [
          ['Burns', TORCH_TIME / 60 + ' minutes, once lit'],
          ['You have', n + ' / ' + TORCH_MAX],
          ['Held in', 'the off hand'],
        ];
  if (quickKind() === k) lines.push(['Shortcut', 'Q']);
  dt.innerHTML =
    '<div class="nm" style="color:' +
    CONS[k].col +
    '">' +
    CONS[k].n +
    '</div><div style="opacity:.75">Consumable' +
    (pot ? '' : ' · lights caves, and the night around you') +
    '</div><div class="stats">' +
    lines.map((l) => '<div>' + l[0] + ' <b>' + l[1] + '</b></div>').join('') +
    '</div><div class="acts"></div>';
  const bx = dt.querySelector('.acts');
  bx.appendChild(
    btn(
      pot ? 'Drink' : torchLeft() > 0 ? 'Light a fresh one' : 'Hold in off hand',
      () => {
        if (pot) drinkPot();
        else lightTorch();
        render();
      },
      '',
      n <= 0,
    ),
  );
  if (quickKind() !== k)
    bx.appendChild(
      btn(
        'Put on Q',
        () => {
          game.P.quick = k;
          render();
        },
        'alt',
      ),
    );
}
/** The lit torch in the off hand: time left, or put it out (it is lost). */
function renderLitTorch(dt: HTMLElement) {
  dt.innerHTML =
    '<div class="nm" style="color:#ffb45a">Lit torch</div><div style="opacity:.75">Off hand</div>' +
    '<div class="stats"><div>Burns for <b>' +
    fmtClock(torchLeft() * 1000) +
    '</b></div></div><div class="acts"></div>';
  dt.querySelector('.acts').appendChild(
    btn(
      'Put out',
      () => {
        game.P.eq.offhand = null;
        selItem = null;
        toast('You put out the torch');
        render();
      },
      'alt',
    ),
  );
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
