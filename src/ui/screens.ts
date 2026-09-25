import { resetCityGround } from '../art/city';
import {
  drawHumanoid,
  drawWeapon,
  handOver,
  handPos,
  restAng,
  weaponBehind,
} from '../art/humanoid';
import { backfillBossChests, refreshQuestTargets } from '../game/bossChest';
import { audioInit } from '../audio/sfx';
import { $ } from '../core/dom';
import { pick, strSeed } from '../core/math';
import { CLS, HAIRC, HAIRS, RACE, SKINS } from '../data/classes';
import { respawn } from '../game/combat';
import { unstick } from '../game/enemies';
import { banner } from '../game/fx';
import { genItem } from '../game/items';
import { offers } from '../game/quests';
import { loadSave, migrate, save } from '../game/save';
import { game } from '../game/state';
import { calcStats, lookOfPlayer } from '../game/stats';
import { isTouch } from '../input/input';
import { setHud } from './hud';
import { shopStock } from './village';
import { WCH, getChunk } from '../world/chunks';
import { poiCache, poisNear } from '../world/poi';
import { CH } from '../world/terrain';
/* ================= SCREENS ================= */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  if (['menu', 'confirm', 'create', 'help'].includes(id)) {
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
const C = { cls: 'warrior', race: 'human', skin: 0, hair: 0, hairC: 1 };
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
    $('#cCls'),
    Object.keys(CLS).map((k) => [k, CLS[k].n]),
    () => C.cls,
    (v) => (C.cls = v),
  );
  $('#cClsD').textContent = CLS[C.cls].desc;
  chips(
    $('#cRace'),
    Object.keys(RACE).map((k) => [k, RACE[k].n]),
    () => C.race,
    (v) => (C.race = v),
  );
  $('#cRaceD').textContent = RACE[C.race].desc;
  const sk = C.race === 'orc' ? SKINS.orc : SKINS.std;
  chips(
    $('#cSkin'),
    sk.map((c, i) => [i, 'Skin ' + (i + 1), c]),
    () => C.skin,
    (v) => (C.skin = v),
    true,
  );
  chips(
    $('#cHair'),
    HAIRS.map((h, i) => [i, h]),
    () => C.hair,
    (v) => (C.hair = v),
  );
  chips(
    $('#cHairC'),
    HAIRC.map((c, i) => [i, 'Hair color ' + (i + 1), c]),
    () => C.hairC,
    (v) => (C.hairC = v),
    true,
  );
  $('#prevname').textContent =
    ($('#cName').value || 'Nameless') + ', ' + RACE[C.race].n + ' ' + CLS[C.cls].n;
}
function previewPlayer() {
  const sk = C.race === 'orc' ? SKINS.orc : SKINS.std;
  return {
    cls: C.cls,
    race: C.race,
    skin: sk[C.skin],
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
  pc.setTransform(4.4, 0, 0, 4.4, 200, 330);
  const L = lookOfPlayer(previewPlayer()),
    dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ],
    di = dirs[Math.floor(t / 1.6) % 4],
    walk = t * 9;
  const hp = handPos(di[0], di[1], true, walk, t, C.race),
    ang = restAng(hp, C.cls),
    wd = () => drawWeapon(pc, hp.x, hp.y, ang, C.cls, 0);
  const behind = weaponBehind(hp, C.cls);
  if (behind) wd();
  drawHumanoid(pc, 0, 0, { look: L, dx: di[0], dy: di[1], moving: true, walk, time: t });
  if (!behind) {
    wd();
    handOver(pc, hp.x, hp.y, L);
  }
  pc.setTransform(1, 0, 0, 1, 0, 0);
}
$('#cDice').onclick = () => {
  $('#cSeed').value = randSeed();
};
$('#cName').oninput = refreshCreate;
function goCreate() {
  game.state = 'create';
  $('#cSeed').value = randSeed();
  $('#cName').value = '';
  refreshCreate();
  showScreen('create');
}
$('#mNew').onclick = () => {
  audioInit();
  const s = loadSave();
  if (s) {
    $('#confT').textContent =
      'Start a new hero? ' + s.name + ' (level ' + s.lvl + ') will be replaced.';
    game.state = 'help';
    showScreen('confirm');
  } else goCreate();
};
$('#confYes').onclick = goCreate;
$('#confNo').onclick = () => {
  game.state = 'menu';
  showScreen('menu');
};
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
  if (s) startGame(s);
};
$('#cGo').onclick = () => {
  const p = previewPlayer();
  Object.assign(p, {
    name:
      $('#cName').value.trim() ||
      pick(['Aldric', 'Wren', 'Brom', 'Isolde', 'Kael', 'Maren', 'Tamsin', 'Rook']),
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
  startGame(migrate(p), true);
};
$('#dGo').onclick = respawn;
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
    const w = genItem(1, 0, 'weapon');
    w.r = 0;
    w.mat = 0;
    w.style = 0;
    w.name = 'Rusty ' + { warrior: 'Sword', ranger: 'Shortbow', mage: 'Staff' }[game.P.cls];
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
