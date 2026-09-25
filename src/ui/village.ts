import { powerLines } from './inventory';
import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { RAR, SLOTS, SLOT_NAME } from '../data/classes';
import { compareItem } from '../game/power';
import { BAGMAX } from '../game/drops';
import { unstick } from '../game/enemies';
import { doFade, toast } from '../game/fx';
import { equipSlot, genItem, itemName, upCost } from '../game/items';
import { QMAX, abandonQuest, acceptQuest, genOffers, offers } from '../game/quests';
import { save } from '../game/save';
import { game } from '../game/state';
import { calcStats } from '../game/stats';
import { btn, goldPill, hdr, itemCard, iconCanvas, openModal, statLines, wireClose } from './modal';
import { closeAll } from './screens';
import { poisNear } from '../world/poi';
/* shop */
/** Each stall restocks its whole list every 10 real minutes, even while the game is closed. */
export const RESTOCK_MS = 10 * 60 * 1000;
/**
 * A stall's stock, kept in the save (P.shops[key] = { t: restock time in ms, items }).
 * Rolls a fresh list when there is none yet or the last one is 10+ minutes old.
 */
function stockFor(v, fine: boolean) {
  const shops = (game.P.shops = game.P.shops || {}),
    key = v.key + (fine ? ':fine' : '');
  let s = shops[key];
  if (!s || !(Date.now() - s.t < RESTOCK_MS)) {
    const lvl = Math.max(1, Math.max(v.lvl, game.P.lvl - 1));
    s = shops[key] = {
      t: Date.now(),
      items: fine
        ? Array.from({ length: 4 }, () => genItem(lvl + 1, 0.3, null, 2))
        : Array.from({ length: 5 }, () => genItem(lvl, 0.08)),
    };
    save(); // so a reload shows the same list
  }
  return s;
}
const mmss = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};
/** Live restock countdown in the buy tab; rerolls and redraws the shop when it runs out. */
let restockTick = 0;
/** Open a village market; `fine` is Hearthfire's fine-goods shop (Rare+ stock, pricier). */
export function openShop(v, fine = false) {
  shopFine = fine;
  shopTab = 'buy';
  renderShop(v);
}
/** Hearthfire's alchemist: potions, cheaper by the bundle. */
export function openPotions(v) {
  const pp = 12 + v.lvl * 5,
    offers = [
      [1, Math.round(pp * 0.8)],
      [5, Math.round(pp * 3.5)],
    ];
  openModal(hdr(v.name + ' alchemist', goldPill(game.P.gold)) + '<div id="potbody"></div>');
  wireClose();
  const body = $('#potbody');
  for (const [n, price] of offers) {
    const row = document.createElement('div');
    row.className = 'row2';
    row.innerHTML =
      '<div class="potic">🧪</div><div style="flex:1"><div class="nm">' +
      (n > 1 ? n + ' health potions' : 'Health potion') +
      '</div><div class="desc">Each restores 45% of your health. You carry ' +
      game.P.pot +
      '.</div></div>';
    row.appendChild(
      btn(
        'Buy for ' + price,
        () => {
          if (game.P.gold < price) {
            toast('Not enough gold');
            return;
          }
          game.P.gold -= price;
          game.P.pot += n;
          SFX.buy();
          openPotions(v);
        },
        '',
        game.P.gold < price,
      ),
    );
    body.appendChild(row);
  }
}
let shopTab = 'buy',
  shopSel = null,
  shopFine = false;
function renderShop(v) {
  const s = stockFor(v, shopFine),
    pp = 12 + v.lvl * 5;
  clearInterval(restockTick);
  openModal(
    hdr(v.name + (shopFine ? ' fine goods' : ' market'), goldPill(game.P.gold)) +
      '<div class="tabs"><button class="chip' +
      (shopTab === 'buy' ? ' on' : '') +
      '" id="tb1">Buy</button><button class="chip' +
      (shopTab === 'sell' ? ' on' : '') +
      '" id="tb2">Sell</button></div><div id="shopbody"></div>',
  );
  wireClose();
  $('#tb1').onclick = () => {
    shopTab = 'buy';
    renderShop(v);
  };
  $('#tb2').onclick = () => {
    shopTab = 'sell';
    shopSel = null;
    renderShop(v);
  };
  const body = $('#shopbody');
  if (shopTab === 'buy') renderBuy(v, body, s, pp);
  else renderSell(v, body);
}

/* ---------- buy tab: potions on top, the stock as a grid, details + buy on the right ---------- */
const ICO_CLOCK =
  '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#e8f2ff" stroke="#241a2e" stroke-width="1.8"/><path d="M10 5.5 V10 L13 12" fill="none" stroke="#241a2e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICO_POT =
  '<svg viewBox="0 0 20 20"><path d="M7.6 2.6 H12.4 V6.6 L16 13.4 Q17 17.4 13 17.6 H7 Q3 17.4 4 13.4 L7.6 6.6 Z" fill="#e8f2ff" stroke="#241a2e" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.6 12 H14.4 L15.3 13.8 Q16 16.2 13 16.3 H7 Q4 16.2 4.7 13.8 Z" fill="#e0443a"/><rect x="7" y="1.6" width="6" height="2.4" rx="1" fill="#9a6a3a" stroke="#241a2e" stroke-width="1.4"/><circle cx="8.6" cy="13.8" r="1" fill="#ffb0a0"/></svg>';
let buySel = null;
const fmt = (n: number) => n.toLocaleString('en-US');
function renderBuy(v, body, s, pp) {
  const priceOf = (it) => it.val * (shopFine ? 6 : 4),
    full = game.P.inv.length >= BAGMAX;
  if (!s.items.includes(buySel)) buySel = s.items[0] || null;
  body.innerHTML =
    '<div class="potbar">' +
    ICO_POT +
    '<div class="pinf"><div class="nm">Health potion</div><div class="desc">Restores 45% of your health · you carry <b>' +
    game.P.pot +
    '</b></div></div><div class="pbtns"></div></div><div class="sellwrap"><div><div class="buyhead"><span>' +
    (shopFine ? 'Fine goods' : 'Wares') +
    ' · ' +
    s.items.length +
    '</span><span class="desc">' +
    (full ? '<span style="color:#ff7a6a">Bag full</span> · ' : '') +
    'Bag ' +
    game.P.inv.length +
    '/' +
    BAGMAX +
    '</span></div><div class="restock" title="Every stall restocks every 10 minutes">' +
    ICO_CLOCK +
    'New stock in <b id="bTimer">' +
    mmss(s.t + RESTOCK_MS - Date.now()) +
    '</b></div><div class="sellgrid" id="bGrid"></div></div><div class="selldet" id="bDet"></div></div>';
  restockTick = window.setInterval(() => {
    const el = document.getElementById('bTimer');
    if (!el) return clearInterval(restockTick); // shop closed or switched to the sell tab
    const left = s.t + RESTOCK_MS - Date.now();
    if (left <= 0) {
      buySel = null;
      renderShop(v); // stockFor rolls the new list
      toast('New stock has arrived');
    } else el.textContent = mmss(left);
  }, 1000);
  const pb = body.querySelector('.pbtns');
  for (const n of [1, 5]) {
    const cost = pp * n;
    pb.appendChild(
      btn(
        'Buy ' + n + ' · ' + fmt(cost),
        () => {
          game.P.gold -= cost;
          game.P.pot += n;
          SFX.buy();
          renderShop(v);
        },
        n === 1 ? '' : 'alt',
        game.P.gold < cost,
      ),
    );
  }
  const grid = body.querySelector('#bGrid');
  for (const it of s.items) {
    const price = priceOf(it),
      d = itemCard(it, price, buySel === it);
    if (game.P.gold < price) d.classList.add('poor');
    d.onclick = () => {
      buySel = it;
      renderShop(v);
    };
    grid.appendChild(d);
  }
  if (!s.items.length)
    grid.innerHTML =
      '<div class="sempty">' +
      ICO_BAG +
      '<b>Sold out</b><small>New stock arrives when the timer runs out.</small></div>';
  const det = body.querySelector('#bDet');
  if (!buySel) {
    det.innerHTML = '<div class="desc" style="opacity:.75">Come back later for new wares.</div>';
    return;
  }
  const it = buySel,
    price = priceOf(it),
    short = price - game.P.gold;
  det.innerHTML =
    '<div class="nm" style="color:' +
    RAR[it.r].c +
    '">' +
    itemName(it) +
    '</div><div class="desc">' +
    RAR[it.r].n +
    ' ' +
    (SLOT_NAME[it.slot] || it.slot).toLowerCase() +
    ' · level ' +
    it.lvl +
    '</div>' +
    powerLines(it, false) +
    '<div class="stats">' +
    statLines(it, game.P.eq[equipSlot(it, game.P.eq)]) +
    '</div>' +
    (short > 0
      ? '<div class="warnpoor">You need ' + fmt(short) + ' more gold</div>'
      : full
        ? '<div class="warnpoor">Your bag is full — sell something first</div>'
        : '') +
    '<div class="acts"></div>';
  det.querySelector('.acts').appendChild(
    btn(
      'Buy for ' + fmt(price) + ' gold',
      () => {
        game.P.gold -= price;
        game.P.inv.push(it);
        s.items.splice(s.items.indexOf(it), 1);
        buySel = null;
        save();
        SFX.buy();
        toast('Bought ' + itemName(it));
        renderShop(v);
      },
      '',
      short > 0 || full,
    ),
  );
}

/* empty-state icons, in the same outlined style as the HUD buttons (index.html) */
const ICO_BAG =
  '<svg viewBox="0 0 32 32"><path d="M11.5 9 C11.5 4 20.5 4 20.5 9" fill="none" stroke="#241a2e" stroke-width="2.4"/><rect x="6" y="8.5" width="20" height="19.5" rx="6" fill="#b0663a" stroke="#241a2e" stroke-width="2.4"/><path d="M6.5 15 H25.5" stroke="#241a2e" stroke-width="2"/><rect x="10" y="17.5" width="12" height="7.5" rx="2.4" fill="#d08a50" stroke="#241a2e" stroke-width="2"/><rect x="14.3" y="13.2" width="3.4" height="4.6" rx="1" fill="#f5c451" stroke="#241a2e" stroke-width="1.6"/><path d="M9 11.5 Q10 10 12 10" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
const ICO_SEARCH =
  '<svg viewBox="0 0 32 32"><path d="M19.5 19.5 L27 27" stroke="#241a2e" stroke-width="6" stroke-linecap="round"/><path d="M19.5 19.5 L27 27" stroke="#9a6a3a" stroke-width="3" stroke-linecap="round"/><circle cx="13.5" cy="13.5" r="9" fill="#bfe0f5" stroke="#241a2e" stroke-width="2.4"/><circle cx="13.5" cy="13.5" r="9" fill="none" stroke="#f5c451" stroke-width="1.6" transform="scale(.82) translate(2.96 2.96)"/><path d="M9 11 Q10 8.6 12.6 8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
/* ---------- sell tab: a sortable, filterable grid; select an item, then sell it ---------- */
const SELL_FILTERS: [string, string, (it) => boolean][] = [
  ['all', 'All', () => true],
  ['weapon', 'Weapons', (it) => it.slot === 'weapon'],
  ['armor', 'Armor', (it) => ['helm', 'armor', 'gloves', 'pants', 'boots'].includes(it.slot)],
  ['jewel', 'Jewellery', (it) => it.slot === 'ring' || it.slot === 'amulet'],
];
const SELL_SORTS: [string, string, (a, b) => number][] = [
  ['rarity', 'Rarity', (a, b) => b.r - a.r || b.val - a.val],
  ['price', 'Price', (a, b) => b.val - a.val],
  ['slot', 'Slot', (a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || b.r - a.r],
];
let sellFilter = 'all',
  sellSort = 'rarity';
/** Multi-select: pick several items (toggle chip, or Ctrl/Cmd/Shift-click) and sell them together. */
let sellMulti = false;
const sellPick = new Set<object>();
const junkR = [true, true, false]; // bulk sale: common, uncommon, rare
/** Would equipping `it` make the hero stronger? (never sold in bulk; marked with ▲) */
const isUpgrade = (it) => compareItem(it).overall > 0.005;
function renderSell(v, body) {
  const f = SELL_FILTERS.find((x) => x[0] === sellFilter)[2],
    items = game.P.inv.filter(f).sort(SELL_SORTS.find((x) => x[0] === sellSort)[2]);
  if (shopSel && !game.P.inv.includes(shopSel)) shopSel = null;
  for (const it of sellPick) if (!game.P.inv.includes(it)) sellPick.delete(it);
  const chip = (id: string, label: string, on: boolean) =>
    '<button class="chip' + (on ? ' on' : '') + '" data-k="' + id + '">' + label + '</button>';
  body.innerHTML =
    '<div class="selltools"><div class="chips" id="sFil">' +
    SELL_FILTERS.map(([k, n, fn]) =>
      chip(k, n + ' <small>' + game.P.inv.filter(fn).length + '</small>', k === sellFilter),
    ).join('') +
    '</div><div class="chips" id="sSort"><span class="lbl">Sort</span>' +
    SELL_SORTS.map(([k, n]) => chip(k, n, k === sellSort)).join('') +
    '<button class="chip' +
    (sellMulti ? ' on' : '') +
    '" id="sMulti" title="Or Ctrl/Shift-click items">☑ Select multiple</button></div></div><div class="sellwrap"><div class="sellgrid" id="sGrid"></div><div class="selldet" id="sDet"></div></div><div class="selljunk" id="sJunk"></div>';
  body
    .querySelectorAll('#sFil .chip')
    .forEach((b: HTMLElement) => (b.onclick = () => ((sellFilter = b.dataset.k), renderShop(v))));
  body
    .querySelectorAll('#sSort .chip')
    .forEach((b: HTMLElement) => (b.onclick = () => ((sellSort = b.dataset.k), renderShop(v))));
  (body.querySelector('#sMulti') as HTMLElement).onclick = () => {
    sellMulti = !sellMulti;
    sellPick.clear();
    if (sellMulti && shopSel) sellPick.add(shopSel);
    shopSel = null;
    renderShop(v);
  };
  // grid
  const grid = body.querySelector('#sGrid');
  for (const it of items) {
    const on = sellMulti ? sellPick.has(it) : shopSel === it,
      d = itemCard(it, it.val, on);
    if (sellMulti) d.classList.add('multi');
    if (sellMulti) d.insertAdjacentHTML('beforeend', '<i class="tick">' + (on ? '✓' : '') + '</i>');
    d.onclick = (e: MouseEvent) => {
      if (!sellMulti && (e.ctrlKey || e.metaKey || e.shiftKey)) {
        // modifier-click switches to multi-select, keeping the current pick
        sellMulti = true;
        sellPick.clear();
        if (shopSel) sellPick.add(shopSel);
        shopSel = null;
      }
      if (sellMulti) {
        if (sellPick.has(it)) sellPick.delete(it);
        else sellPick.add(it);
      } else shopSel = shopSel === it ? null : it;
      renderShop(v);
    };
    grid.appendChild(d);
  }
  if (!items.length)
    grid.innerHTML = game.P.inv.length
      ? '<div class="sempty">' +
        ICO_SEARCH +
        '<b>Nothing of this kind</b><small>Try another filter.</small></div>'
      : '<div class="sempty">' +
        ICO_BAG +
        '<b>Your bags are empty</b><small>Loot from monsters and chests can be sold here.</small></div>';
  // details
  const det = body.querySelector('#sDet');
  if (sellMulti) {
    const picked = game.P.inv.filter((it) => sellPick.has(it)),
      sum = picked.reduce((a, it) => a + it.val, 0),
      ups = picked.filter(isUpgrade).length,
      byR = RAR.map((r, i) => [r, picked.filter((it) => it.r === i).length] as const).filter(
        (x) => x[1],
      );
    det.innerHTML =
      '<div class="nm">' +
      picked.length +
      (picked.length === 1 ? ' item' : ' items') +
      ' selected</div><div class="desc">' +
      (byR
        .map(
          ([r, n]) => '<span style="color:' + r.c + '">' + n + ' ' + r.n.toLowerCase() + '</span>',
        )
        .join(' · ') || 'Tap items to add them to the sale.') +
      '</div>' +
      (ups
        ? '<div class="warnup">▲ ' +
          ups +
          (ups === 1 ? ' is' : ' are') +
          ' better than what you wear</div>'
        : '') +
      '<div class="msel"></div><div class="acts"></div>';
    const ms = det.querySelector('.msel');
    ms.appendChild(
      btn(
        'Select all',
        () => (items.forEach((it) => sellPick.add(it)), renderShop(v)),
        'alt',
        !items.length,
      ),
    );
    ms.appendChild(btn('Clear', () => (sellPick.clear(), renderShop(v)), 'alt', !picked.length));
    det.querySelector('.acts').appendChild(
      btn(
        'Sell ' + picked.length + ' for ' + sum.toLocaleString('en-US') + ' gold',
        () => {
          game.P.inv = game.P.inv.filter((it) => !sellPick.has(it));
          game.P.gold += sum;
          sellPick.clear();
          SFX.coin();
          toast(
            'Sold ' +
              picked.length +
              (picked.length === 1 ? ' item' : ' items') +
              ' for ' +
              sum +
              ' gold',
          );
          renderShop(v);
        },
        '',
        !picked.length,
      ),
    );
  } else if (shopSel) {
    const it = shopSel;
    det.innerHTML =
      '<div class="nm" style="color:' +
      RAR[it.r].c +
      '">' +
      itemName(it) +
      '</div><div class="desc">' +
      RAR[it.r].n +
      ' ' +
      (SLOT_NAME[it.slot] || it.slot).toLowerCase() +
      ' · level ' +
      it.lvl +
      '</div>' +
      powerLines(it, false) +
      '<div class="stats">' +
      statLines(it, game.P.eq[equipSlot(it, game.P.eq)]) +
      '</div>' +
      (isUpgrade(it) ? '<div class="warnup">▲ Better than what you wear</div>' : '') +
      '<div class="acts"></div>';
    det.querySelector('.acts').appendChild(
      btn('Sell for ' + it.val.toLocaleString('en-US') + ' gold', () => {
        game.P.gold += it.val;
        game.P.inv.splice(game.P.inv.indexOf(it), 1);
        shopSel = null;
        SFX.coin();
        renderShop(v);
      }),
    );
  } else
    det.innerHTML =
      '<div class="desc" style="opacity:.75">Select an item to see it and its price.</div>';
  // bulk sale of junk: chosen rarities, never upgrades
  const junk = game.P.inv.filter((it) => it.r <= 2 && junkR[it.r] && !isUpgrade(it)),
    tot = junk.reduce((a, it) => a + it.val, 0),
    jb = body.querySelector('#sJunk');
  jb.innerHTML =
    '<span class="lbl">Sell junk:</span>' +
    ['Common', 'Uncommon', 'Rare']
      .map(
        (n, r) =>
          '<label class="jr" style="color:' +
          RAR[r].c +
          '"><input type="checkbox" data-r="' +
          r +
          '"' +
          (junkR[r] ? ' checked' : '') +
          '> ' +
          n +
          '</label>',
      )
      .join('') +
    '<span class="desc jsum">' +
    junk.length +
    (junk.length === 1 ? ' item' : ' items') +
    ' · upgrades kept</span>';
  jb.querySelectorAll('input').forEach(
    (cb: HTMLInputElement) =>
      (cb.onchange = () => ((junkR[+cb.dataset.r] = cb.checked), renderShop(v))),
  );
  jb.appendChild(
    btn(
      'Sell ' + junk.length + ' for ' + tot.toLocaleString('en-US') + ' gold',
      () => {
        game.P.inv = game.P.inv.filter((it) => !junk.includes(it));
        game.P.gold += tot;
        if (junk.includes(shopSel)) shopSel = null;
        SFX.coin();
        toast('Sold ' + junk.length + ' items for ' + tot + ' gold');
        renderShop(v);
      },
      'alt',
      !junk.length,
    ),
  );
}
/* smith */
export function openSmith(v) {
  renderSmith(v);
}
function renderSmith(v) {
  openModal(
    hdr(
      'Blacksmith',
      "Each upgrade adds 10% to an item's health, attack and armor. " + goldPill(game.P.gold),
    ) + '<div id="smbody"></div>',
  );
  wireClose();
  const body = $('#smbody');
  let any = false;
  for (const k of SLOTS) {
    const it = game.P.eq[k];
    if (!it) continue;
    any = true;
    const cost = upCost(it),
      max = it.plus >= 10,
      r2 = document.createElement('div');
    r2.className = 'row2';
    const ic = document.createElement('div');
    ic.className = 'cell';
    ic.style.width = '56px';
    ic.style.borderColor = RAR[it.r].c;
    ic.appendChild(iconCanvas(it));
    r2.appendChild(ic);
    const nx = Object.assign({}, it, { plus: (it.plus || 0) + 1 });
    const inf = document.createElement('div');
    inf.style.flex = '1';
    inf.innerHTML =
      '<div class="nm" style="color:' +
      RAR[it.r].c +
      '">' +
      itemName(it) +
      '</div><div class="stats sm">' +
      (max ? '<div>Fully upgraded</div>' : statLines(nx, it)) +
      '</div>';
    r2.appendChild(inf);
    r2.appendChild(
      btn(
        max ? 'Max' : 'Upgrade for ' + cost,
        () => {
          if (game.P.gold < cost) {
            toast('Not enough gold');
            return;
          }
          game.P.gold -= cost;
          it.plus = (it.plus || 0) + 1;
          calcStats();
          SFX.anvil();
          setTimeout(SFX.anvil, 150);
          toast(itemName(it) + ' forged');
          renderSmith(v);
        },
        '',
        max || game.P.gold < cost,
      ),
    );
    body.appendChild(r2);
  }
  if (!any)
    body.innerHTML = '<div class="desc">Equip gear first, then bring it here to be reforged.</div>';
}
/* bounty board */
export function openBoard(v) {
  if (!offers.has(v.key)) offers.set(v.key, genOffers(v));
  renderBoard(v);
}
function renderBoard(v) {
  const of = offers.get(v.key);
  openModal(
    hdr(
      v.name + ' bounties',
      'Up to ' + QMAX + ' bounties in your journal (L). Rewards are paid when done.',
    ) + '<h3>Posted</h3><div id="bo"></div><h3>Active</h3><div id="ba"></div>',
  );
  wireClose();
  const bo = $('#bo'),
    ba = $('#ba');
  of.forEach((q) => {
    const r2 = document.createElement('div');
    r2.className = 'row2';
    r2.innerHTML =
      '<div class="potic">' +
      (q.type === 'kill' ? '⚔' : q.type === 'boss' ? '☠' : '⛏') +
      '</div><div style="flex:1"><div class="nm">' +
      q.name +
      '</div><div class="desc">' +
      q.desc +
      '</div><div class="desc" style="color:#ffe38a">Reward: ' +
      q.gold +
      ' gold, ' +
      q.xp +
      ' xp' +
      (q.item ? ', ' + RAR[q.item].n.toLowerCase() + '+ item' : '') +
      '</div></div>';
    r2.appendChild(
      btn('Accept', () => {
        if (!acceptQuest(q)) return;
        of.splice(of.indexOf(q), 1);
        SFX.pick();
        if (!of.length) offers.set(v.key, genOffers(v));
        renderBoard(v);
      }),
    );
    bo.appendChild(r2);
  });
  if (!of.length) bo.innerHTML = '<div class="desc">No bounties right now.</div>';
  game.P.quests.forEach((q) => {
    const r2 = document.createElement('div');
    r2.className = 'row2';
    r2.innerHTML =
      '<div style="flex:1"><div class="nm">' +
      q.name +
      (q.type === 'kill' ? ' (' + q.have + '/' + q.need + ')' : '') +
      '</div><div class="desc">' +
      q.desc +
      '</div></div>';
    r2.appendChild(
      btn(
        'Abandon',
        () => {
          abandonQuest(q);
          renderBoard(v);
        },
        'alt',
      ),
    );
    ba.appendChild(r2);
  });
  if (!game.P.quests.length) ba.innerHTML = '<div class="desc">None yet.</div>';
}
/* travel */
export function openTravel(v) {
  const list = game.P.wps
    .map((k) => Object.assign({ key: k }, game.P.wpInfo[k]))
    .filter((w) => w.name)
    .sort(
      (a, b) =>
        Math.hypot(a.x - game.P.x, a.y - game.P.y) - Math.hypot(b.x - game.P.x, b.y - game.P.y),
    );
  openModal(
    hdr(
      'Waystone',
      'Travel instantly to any waystone you have attuned. You wake at the last village you visited.',
    ) + '<div id="tw"></div>',
  );
  wireClose();
  const tw = $('#tw');
  for (const w of list) {
    const r2 = document.createElement('div');
    r2.className = 'row2';
    const here = w.key === v.key;
    r2.innerHTML =
      '<div class="potic">🜂</div><div style="flex:1"><div class="nm">' +
      w.name +
      '</div><div class="desc">Danger level ' +
      w.lvl +
      ', ' +
      Math.round(Math.hypot(w.x - game.P.x, w.y - game.P.y) / 100) +
      ' leagues away</div></div>';
    r2.appendChild(
      btn(
        here ? 'You are here' : 'Travel',
        () => {
          closeAll();
          doFade(() => {
            game.P.x = w.x;
            game.P.y = w.y + 70;
            unstick(game.P);
            game.camX = game.P.x;
            game.camY = game.P.y;
            game.enemies = [];
            game.projs = [];
            game.drops = [];
            game.curBoss = null;
            game.activePois = poisNear(game.P.x, game.P.y, 900);
            game.zoneName = '';
          });
        },
        '',
        here,
      ),
    );
    tw.appendChild(r2);
  }
}
