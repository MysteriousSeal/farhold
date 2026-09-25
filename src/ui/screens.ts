import { resetCityGround } from '../art/city';
import { carryPos, drawHumanoid, drawWeapon, handOver } from '../art/humanoid';
import { backfillBossChests, refreshQuestTargets } from '../game/bossChest';
import { audioInit } from '../audio/sfx';
import { $ } from '../core/dom';
import { pick, strSeed } from '../core/math';
import { BEARDS, HAIRC, HAIRS, MATS, SKINS } from '../data/classes';
import { NAMES } from '../data/names';
import { respawn } from '../game/combat';
import { unstick } from '../game/enemies';
import { banner } from '../game/fx';
import { genItem } from '../game/items';
import { offers } from '../game/quests';
import { deleteSave, listSaves, loadSave, migrate, newSlot, save } from '../game/save';
import { game } from '../game/state';
import { calcStats, lookOfPlayer } from '../game/stats';
import { isTouch } from '../input/input';
import { setHud } from './hud';
import { refreshMenu } from './menus';
import { shopStock } from './village';
import { WCH, getChunk } from '../world/chunks';
import { poiCache, poisNear } from '../world/poi';
import { CH } from '../world/terrain';
/* ================= SCREENS ================= */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  if (['menu', 'load', 'delc', 'create', 'help'].includes(id)) {
    $('#zone').style.opacity = 0;
    $('#toast').style.opacity = 0;
  }
}
export function closeAll() {
  game.state = 'play';
  showScreen('');
  setHud(true);
  save();
}
const C = { race: 'human', gender: 'm', skin: 0, hair: 0, hairC: 1, beard: 0 };
const randSeed = () =>
  pick(['Oak', 'Ember', 'Raven', 'Frost', 'Stone', 'Wyrm', 'Thorn', 'Gale']) +
  '-' +
  ((Math.random() * 9000 + 1000) | 0);
function chips(el, items, cur, on, sw?) {
  el.innerHTML = '';
  items.forEach(([v, label, col]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (sw ? ' sw' : '') + (v === cur() ? ' on' : '');
    if (sw) {
      b.style.background = col;
      b.setAttribute('aria-label', label);
    } else b.textContent = label;
    b.onclick = () => {
      on(v);
      refreshCreate();
    };
    el.appendChild(b);
  });
}
function refreshCreate() {
  chips(
    $('#cSkin'),
    SKINS.map((c, i) => [i, 'Skin ' + (i + 1), c]),
    () => C.skin,
    (v) => (C.skin = v),
    true,
  );
  chips(
    $('#cGender'), // shown as a two-way toggle (.seg)
    [
      ['m', 'Male'],
      ['f', 'Female'],
    ],
    () => C.gender,
    (v) => {
      // each gender has its own hair styles: switch to that list's first style
      if (v !== C.gender) C.hair = HAIRS[v][0][0];
      C.gender = v;
    },
  );
  chips(
    $('#cHair'),
    HAIRS[C.gender],
    () => C.hair,
    (v) => (C.hair = v),
  );
  $('#cBeardW').style.display = C.gender === 'm' ? '' : 'none';
  chips(
    $('#cBeard'),
    BEARDS.map((b, i) => [i, b]),
    () => C.beard,
    (v) => (C.beard = v),
  );
  chips(
    $('#cHairC'),
    HAIRC.map((c, i) => [i, 'Hair color ' + (i + 1), c]),
    () => C.hairC,
    (v) => (C.hairC = v),
    true,
  );
  $('#prevname').textContent = $('#cName').value || 'Nameless';
}
function previewPlayer() {
  return {
    race: 'human',
    gender: C.gender,
    beard: C.gender === 'm' ? C.beard : 0,
    skin: SKINS[C.skin],
    hair: C.hair,
    hairC: HAIRC[C.hairC],
    eq: {},
  };
}
const pvc = $('#prev'),
  pc = pvc.getContext('2d');
export function drawPreview(t) {
  if (game.state !== 'create') return;
  pc.setTransform(1, 0, 0, 1, 0, 0);
  pc.clearRect(0, 0, 420, 460);
  pc.setTransform(5.4, 0, 0, 5.4, 205, 355);
  const L = lookOfPlayer(previewPlayer()),
    dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ],
    // faces the player; the arrows turn it
    di = dirs[face],
    walk = t * 9;
  // the rusty sword held on guard, blade up, exactly as the hero carries it in game
  const g = carryPos(di[0], di[1], true, walk, t, C.race),
    wd = () => drawWeapon(pc, g.x, g.y, g.ang, 'sword', 0, MATS[0][1], null, 0);
  if (g.behind) wd();
  drawHumanoid(pc, 0, 0, {
    look: L,
    dx: di[0],
    dy: di[1],
    moving: true,
    walk,
    time: t,
    carry: g.arm,
  });
  if (!g.behind) {
    wd();
    handOver(pc, g.x, g.y, L);
  }
  pc.setTransform(1, 0, 0, 1, 0, 0);
}
$('#cDice').onclick = () => {
  $('#cSeed').value = randSeed();
};
$('#cName').oninput = refreshCreate;
let face = 0; // preview facing, turned with the arrows (0: toward the player)
$('#cRotL').onclick = () => (face = (face + 3) % 4);
$('#cRotR').onclick = () => (face = (face + 1) % 4);
$('#cNameR').onclick = () => {
  $('#cName').value = pick(NAMES[C.gender]);
  refreshCreate();
};
$('#cRand').onclick = () => {
  // a random look (keeps the chosen gender and name)
  C.skin = (Math.random() * SKINS.length) | 0;
  C.hair = pick(HAIRS[C.gender])[0];
  C.hairC = (Math.random() * HAIRC.length) | 0;
  C.beard = C.gender === 'm' ? (Math.random() * 3) | 0 : 0;
  refreshCreate();
};
$('#cName').onkeydown = (e) => {
  if (e.key === 'Enter') $('#cGo').click();
};
function goCreate() {
  face = 0;
  game.state = 'create';
  $('#cSeed').value = randSeed();
  $('#cName').value = '';
  refreshCreate();
  showScreen('create');
}
// a new hero gets a new save slot; other heroes are kept
$('#mNew').onclick = () => {
  audioInit();
  goCreate();
};
$('#mLoad').onclick = () => {
  audioInit();
  openLoad();
};
$('#loadBack').onclick = backToMenu;
$('#mHelp').onclick = () => {
  game.state = 'help';
  showScreen('help');
};
$('#hBack').onclick = () => {
  game.state = 'menu';
  showScreen('menu');
};
$('#cBack').onclick = () => {
  game.state = 'menu';
  showScreen('menu');
};
$('#mCont').onclick = () => {
  audioInit();
  const s = loadSave();
  if (s) playSlot(s.id, s.p);
};
$('#cGo').onclick = () => {
  const p = previewPlayer();
  Object.assign(p, {
    name: $('#cName').value.trim() || pick(NAMES[C.gender]),
    lvl: 1,
    xp: 0,
    gold: 20,
    pot: 3,
    x: 0,
    y: 70,
    hp: 1e9,
    inv: [],
    seed: $('#cSeed').value.trim() || randSeed(),
  });
  game.slot = newSlot();
  startGame(migrate(p), true);
};
$('#dGo').onclick = respawn;
function playSlot(id: string, p) {
  game.slot = id;
  startGame(p);
}
function backToMenu() {
  game.state = 'menu';
  refreshMenu();
  showScreen('menu');
}

/* ---------- Load game: every saved hero, newest first; play or delete ---------- */
function openLoad() {
  const list = listSaves();
  if (!list.length) return backToMenu();
  game.state = 'help';
  $('#loadSub').textContent =
    list.length + (list.length > 1 ? ' heroes' : ' hero') + ' · most recently played first';
  const box = $('#loadList');
  box.innerHTML = '';
  for (const { id, p } of list) {
    const card = document.createElement('div');
    card.className = 'scard';
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    cv.className = 'sport';
    drawFace(cv, lookOfPlayer(p));
    const info = document.createElement('div');
    info.className = 'sinfo';
    info.innerHTML =
      '<div class="snm">' +
      esc(p.name || 'Hero') +
      '</div><div class="scl">Level ' +
      (p.lvl || 1) +
      '</div><div class="smeta">' +
      esc(p.region || 'Hearthfire') +
      ' · ' +
      playtime(p.play || 0) +
      ' played · ' +
      ago(p.last) +
      '</div>';
    const acts = document.createElement('div');
    acts.className = 'sacts';
    const play = document.createElement('button');
    play.className = 'btn sm';
    play.textContent = 'Play';
    play.onclick = () => playSlot(id, p);
    const del = document.createElement('button');
    del.className = 'btn sm alt';
    del.textContent = 'Delete';
    del.onclick = () => confirmDelete(id, p);
    acts.append(play, del);
    card.append(cv, info, acts);
    card.ondblclick = () => playSlot(id, p);
    box.appendChild(card);
  }
  showScreen('load');
}
function confirmDelete(id: string, p) {
  $('#delT').textContent =
    'Delete ' + (p.name || 'this hero') + ' (level ' + (p.lvl || 1) + ')? This cannot be undone.';
  $('#delYes').onclick = () => {
    deleteSave(id);
    if (listSaves().length) openLoad();
    else backToMenu();
  };
  $('#delNo').onclick = openLoad;
  showScreen('delc');
}
const esc = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function playtime(sec: number) {
  const m = Math.floor(sec / 60);
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}
function ago(t: number) {
  if (!t) return 'long ago';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  return h < 24 ? h + ' h ago' : Math.floor(h / 24) + ' d ago';
}
/** The hero's face for a save card (same framing as the HUD portrait). */
function drawFace(cv: HTMLCanvasElement, look) {
  const x = cv.getContext('2d'),
    k = 4.3;
  x.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2 + 32 * k);
  drawHumanoid(x, 0, 0, { look, dx: 0, dy: 1, moving: false, walk: 0, time: 0, noShadow: true });
  x.setTransform(1, 0, 0, 1, 0, 0);
}

function startGame(p, fresh?) {
  game.P = p;
  game.SEED = strSeed(game.P.seed);
  WCH.clear();
  game.bgGen = null;
  poiCache.clear();
  resetCityGround();
  backfillBossChests();
  refreshQuestTargets();
  offers.clear();
  shopStock.clear();
  game.mode = 'world';
  game.DG = null;
  game.HS = null;
  game.enemies = [];
  game.projs = [];
  game.drops = [];
  game.parts = [];
  game.texts = [];
  game.teles = [];
  game.zones = [];
  game.zoneName = '';
  game.curBoss = null;
  if (fresh) {
    // everyone starts with a rusty sword; any weapon found later can be equipped
    const w = genItem(1, 0, 'weapon');
    w.r = 0;
    w.mat = 0;
    w.style = 0;
    w.wc = 'warrior';
    w.name = 'Rusty Sword';
    w.st = { atk: 4 };
    game.P.eq.weapon = w;
  }
  calcStats();
  if (fresh || game.P.hp > game.ST.hp || game.P.hp <= 0) game.P.hp = game.ST.hp;
  game.camX = game.P.x;
  game.camY = game.P.y;
  game.genBudget = 99;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      getChunk(Math.floor(game.P.x / CH) + i, Math.floor(game.P.y / CH) + j, true);
  game.activePois = poisNear(game.P.x, game.P.y, 900);
  unstick(game.P);
  game.camX = game.P.x;
  game.camY = game.P.y;
  game.state = 'play';
  showScreen('');
  setHud(true);
  save();
  if (fresh)
    setTimeout(
      () =>
        banner(
          'Hearthfire',
          isTouch
            ? 'Drag the left side to move. Hold Attack to fight.'
            : 'WASD to move, Space or click to attack, E to interact',
        ),
      400,
    );
}
