import { powerLines } from './inventory';
import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { RAR, SLOTS } from '../data/classes';
import { BAGMAX } from '../game/drops';
import { unstick } from '../game/enemies';
import { doFade, toast } from '../game/fx';
import { genItem, itemName, upCost } from '../game/items';
import { genOffers, offers } from '../game/quests';
import { game } from '../game/state';
import { calcStats } from '../game/stats';
import { btn, hdr, iconCanvas, openModal, statLines, wireClose } from './modal';
import { closeAll } from './screens';
import { poisNear } from '../world/poi';
/* shop */
export const shopStock = new Map();
/** Open a village market; `fine` is Hearthfire's fine-goods shop (Rare+ stock, pricier). */
export function openShop(v, fine = false) {
  shopKey = v.key + (fine ? ':fine' : '');
  shopFine = fine;
  let s = shopStock.get(shopKey);
  if (!s || game.time - s.t > 300) {
    const lvl = Math.max(1, Math.max(v.lvl, game.P.lvl - 1));
    s = {
      t: game.time,
      items: fine
        ? Array.from({ length: 4 }, () => genItem(lvl + 1, 0.3, null, 2))
        : Array.from({ length: 5 }, () => genItem(lvl, 0.08)),
    };
    shopStock.set(shopKey, s);
  }
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
  openModal(hdr(v.name + ' alchemist', '🪙 ' + game.P.gold + ' gold') + '<div id="potbody"></div>');
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
  shopKey = '',
  shopFine = false;
function renderShop(v) {
  const s = shopStock.get(shopKey),
    pp = 12 + v.lvl * 5;
  openModal(
    hdr(v.name + (shopFine ? ' fine goods' : ' market'), '🪙 ' + game.P.gold + ' gold') +
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
  if (shopTab === 'buy') {
    const row = document.createElement('div');
    row.className = 'row2';
    row.innerHTML =
      '<div class="potic">🧪</div><div style="flex:1"><div class="nm">Health potion</div><div class="desc">Restores 45% of your health. You carry ' +
      game.P.pot +
      '.</div></div>';
    row.appendChild(
      btn(
        'Buy for ' + pp,
        () => {
          if (game.P.gold < pp) {
            toast('Not enough gold');
            return;
          }
          game.P.gold -= pp;
          game.P.pot++;
          SFX.buy();
          renderShop(v);
        },
        '',
        game.P.gold < pp,
      ),
    );
    body.appendChild(row);
    for (const it of s.items) {
      const price = it.val * (shopFine ? 6 : 4),
        cur = game.P.eq[it.slot],
        r2 = document.createElement('div');
      r2.className = 'row2';
      const ic = document.createElement('div');
      ic.className = 'cell';
      ic.style.width = '56px';
      ic.style.borderColor = RAR[it.r].c;
      ic.appendChild(iconCanvas(it));
      r2.appendChild(ic);
      const inf = document.createElement('div');
      inf.style.flex = '1';
      inf.innerHTML =
        '<div class="nm" style="color:' +
        RAR[it.r].c +
        '">' +
        itemName(it) +
        '</div>' +
        powerLines(it, false) +
        '<div class="stats sm">' +
        statLines(it, cur) +
        '</div>';
      r2.appendChild(inf);
      r2.appendChild(
        btn(
          'Buy for ' + price,
          () => {
            if (game.P.gold < price) {
              toast('Not enough gold');
              return;
            }
            if (game.P.inv.length >= BAGMAX) {
              toast('Bag is full');
              return;
            }
            game.P.gold -= price;
            game.P.inv.push(it);
            s.items.splice(s.items.indexOf(it), 1);
            SFX.buy();
            toast('Bought ' + it.name);
            renderShop(v);
          },
          '',
          game.P.gold < price,
        ),
      );
      body.appendChild(r2);
    }
    if (!s.items.length)
      body.insertAdjacentHTML(
        'beforeend',
        '<div class="desc">Sold out. New stock arrives in a few minutes.</div>',
      );
  } else {
    const bag = document.createElement('div');
    bag.className = 'bag';
    game.P.inv.forEach((it) => {
      const d = document.createElement('div');
      d.className = 'cell' + (shopSel === it ? ' sel' : '');
      d.style.borderColor = RAR[it.r].c;
      d.appendChild(iconCanvas(it));
      d.onclick = () => {
        shopSel = it;
        renderShop(v);
      };
      bag.appendChild(d);
    });
    body.appendChild(bag);
    if (!game.P.inv.length)
      body.insertAdjacentHTML('beforeend', '<div class="desc">Your bag is empty.</div>');
    const det = document.createElement('div');
    det.id = 'detail';
    body.appendChild(det);
    if (shopSel && game.P.inv.includes(shopSel)) {
      const it = shopSel;
      det.innerHTML =
        '<div class="nm" style="color:' +
        RAR[it.r].c +
        '">' +
        itemName(it) +
        '</div><div class="stats">' +
        statLines(it, game.P.eq[it.slot]) +
        '</div><div class="acts"></div>';
      det.querySelector('.acts').appendChild(
        btn('Sell for ' + it.val, () => {
          game.P.gold += it.val;
          game.P.inv.splice(game.P.inv.indexOf(it), 1);
          shopSel = null;
          SFX.coin();
          renderShop(v);
        }),
      );
    } else det.innerHTML = '<span style="opacity:.75">Tap an item to sell it.</span>';
    const junk = game.P.inv.filter((i) => i.r <= 1);
    if (junk.length) {
      const tot = junk.reduce((a, i) => a + i.val, 0);
      det.appendChild(
        btn(
          'Sell all common and uncommon (' + tot + ')',
          () => {
            game.P.inv = game.P.inv.filter((i) => i.r > 1);
            game.P.gold += tot;
            SFX.coin();
            toast('Sold ' + junk.length + ' items for ' + tot + ' gold');
            renderShop(v);
          },
          'alt',
        ),
      );
    }
  }
}
/* smith */
export function openSmith(v) {
  renderSmith(v);
}
function renderSmith(v) {
  openModal(
    hdr(
      'Blacksmith',
      "Each upgrade adds 10% to an item's health, attack and armor. 🪙 " + game.P.gold + ' gold',
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
    hdr(v.name + ' bounties', 'Up to 3 active bounties. Rewards are paid when done.') +
      '<h3>Posted</h3><div id="bo"></div><h3>Active</h3><div id="ba"></div>',
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
        if (game.P.quests.filter((o) => !o.done).length >= 3) {
          toast('You already have 3 bounties');
          return;
        }
        game.P.quests.push(q);
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
          game.P.quests.splice(game.P.quests.indexOf(q), 1);
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
