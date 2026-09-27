import { HEAD_K, headY } from '../art/body';
import { drawHumanoid } from '../art/humanoid';
import { heroStyle } from '../../model/game/style';
import { zoom } from '../render/render';
import { clearBonusXp, fmtClock, resetLeft } from '../../model/game/dungeons';
import { $, H, W } from '../dom';
import { clamp } from '../../core/math';
import { pointsNew, rank, SKILLCD, skillTree } from '../../model/data/skills';
import { game, hero } from '../../model/game/state';
import { xpNeed } from '../../model/game/stats';
import { POT_CD } from '../../model/game/combat';
import { gameHour } from '../../model/game/worldTick';
import { quickCount, quickKind } from '../../model/game/consumables';
import { consCanvas } from './modal';
import { isTouch } from '../../core/device';
import { mini } from '../render/minimap';
import { QMAX, activeQuests, trackedQuests } from '../../model/game/quests';
import { QICON, heroWorldPos, questProgress } from './questUi';
import { dangerAt } from '../../model/world/terrain';
import { DRINKS } from '../../model/data/tavern';
import { curEvent, eventLine } from '../../model/game/events';
import { DRINK_ICON } from './tavern';

/** The world event under way as a HUD chip: what, where and the time left. */
const EV_ICON = {
  raid: '<svg viewBox="0 0 20 20"><g stroke="#241a2e" stroke-width="1.6" stroke-linejoin="round"><path d="M3 3 L12.5 12.5 L11 14 L1.6 4.4 Z" fill="#f2f5fc"/><path d="M17 3 L7.5 12.5 L9 14 L18.4 4.4 Z" fill="#f2f5fc"/></g><path d="M10 13.4 L14.6 18 M10 13.4 L5.4 18" stroke="#e05a4a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  merchant:
    '<svg viewBox="0 0 20 20"><path d="M2 12 Q2 3 10 3 Q18 3 18 12 Z" fill="#f0e2c0" stroke="#241a2e" stroke-width="1.6"/><path d="M6 4.2 V12 M10 3 V12 M14 4.2 V12" stroke="#b8423a" stroke-width="2"/><rect x="1.5" y="11" width="17" height="4" rx="1.4" fill="#a8744a" stroke="#241a2e" stroke-width="1.5"/><circle cx="5" cy="16.5" r="2.2" fill="#5e3c22" stroke="#241a2e" stroke-width="1.3"/><circle cx="15" cy="16.5" r="2.2" fill="#5e3c22" stroke="#241a2e" stroke-width="1.3"/></svg>',
  meteor:
    '<svg viewBox="0 0 20 20"><path d="M18 2 L9 11" stroke="#ffb24a" stroke-width="3.2" stroke-linecap="round" opacity=".8"/><circle cx="7.5" cy="12.5" r="5" fill="#3a3448" stroke="#241a2e" stroke-width="1.6"/><path d="M5.5 12 L7.5 10 L9 12.5" stroke="#8fe0ff" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>',
};
let evEl: HTMLElement = null,
  evKey = '';
function eventChip() {
  const ev = curEvent();
  if (!evEl) {
    if (!ev) return;
    evEl = document.createElement('span');
    evEl.className = 'chip evchip';
    $('#dgt').closest('.chips').appendChild(evEl);
  }
  evEl.style.display = ev ? '' : 'none';
  if (!ev) return;
  const key = ev.id + ev.kind;
  if (evKey !== key) {
    evKey = key;
    evEl.innerHTML = EV_ICON[ev.kind] + '<span></span>';
    evEl.classList.toggle('raid', ev.kind === 'raid');
  }
  evEl.title = ev.title + ' (' + ev.where + ')';
  evEl.lastElementChild.textContent = ev.title + ' · ' + eventLine(ev);
}
/** The active tavern drink as a HUD chip with its time left (created on first use). */
let bufEl: HTMLElement = null,
  bufKey = '';
function buffChip() {
  const b = game.P.buff;
  if (!bufEl) {
    if (!b) return;
    bufEl = document.createElement('span');
    bufEl.className = 'chip buffchip';
    $('#dgt').closest('.chips').appendChild(bufEl);
  }
  bufEl.style.display = b ? '' : 'none';
  if (!b) return;
  const d = DRINKS.find((q) => q.k === b.k),
    t = Math.max(0, Math.ceil(b.t));
  if (bufKey !== b.k) {
    bufKey = b.k;
    bufEl.innerHTML = DRINK_ICON[b.k] + '<span></span>';
    bufEl.title = d.n + ': ' + d.desc;
  }
  bufEl.lastElementChild.textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}
/* ================= HUD ================= */
const fmt = (n: number) => n.toLocaleString('en-US');

/** Hero face in the unit frame's medallion; redrawn only when the look changes. */
let portKey = '';
function drawPortrait() {
  const look = game.P.look;
  if (!look) return;
  const key = JSON.stringify(look);
  if (key === portKey) return;
  portKey = key;
  const cv = $('#portC') as HTMLCanvasElement,
    x = cv.getContext('2d'),
    k = 4.3 / HEAD_K; // the head fills the circle
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, cv.width, cv.height);
  x.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2 - (headY(look) + 3 * HEAD_K) * k);
  drawHumanoid(x, 0, 0, {
    look,
    dx: 0,
    dy: 1,
    moving: false,
    walk: 0,
    time: 0,
    noShadow: true,
  });
  x.setTransform(1, 0, 0, 1, 0, 0);
}

/** Which consumable the HUD quick slot currently shows (to swap its icon only on change). */
let quickShown = '';
/* ---- in-game clock: a pill under the minimap ---- */
const SUN_SVG =
    '<svg viewBox="0 0 20 20"><g stroke="#f5c451" stroke-width="2" stroke-linecap="round"><path d="M10 1.5v2.5M10 16v2.5M1.5 10h2.5M16 10h2.5M4 4l1.8 1.8M14.2 14.2L16 16M4 16l1.8-1.8M14.2 5.8L16 4"/></g><circle cx="10" cy="10" r="4.4" fill="#ffd66a" stroke="#241a2e" stroke-width="1.6"/></svg>',
  MOON_SVG =
    '<svg viewBox="0 0 20 20"><path d="M13.5 3.2A7 7 0 1 0 16.8 13 5.6 5.6 0 0 1 13.5 3.2Z" fill="#dfe6ff" stroke="#241a2e" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.6" cy="12" r="1.1" fill="#b8c2e6"/></svg>';
let clockEl: HTMLElement | null = null,
  clockTxt = '';
function clock() {
  if (!clockEl) {
    clockEl = document.createElement('div');
    clockEl.id = 'clock';
    clockEl.title = 'Time of day';
    document.body.appendChild(clockEl);
  }
  return clockEl;
}
function updateClock() {
  const h = gameHour(game.P.tod || 0),
    hh = Math.floor(h),
    mm = Math.floor((h - hh) * 6) * 10, // shown in 10-minute steps
    night = h >= 19.5 || h < 5,
    txt = (night ? 'm' : 's') + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  if (txt === clockTxt) return;
  clockTxt = txt;
  clock().innerHTML = (night ? MOON_SVG : SUN_SVG) + '<b>' + txt.slice(1) + '</b>';
}
export function setHud(on) {
  $('#hud').classList.toggle('on', on);
  mini.style.display = on ? 'block' : 'none';
  clock().style.display = on ? 'flex' : 'none';
  $('#touch').classList.toggle('on', on && isTouch);
  $('#topbtns').style.display = on ? 'flex' : 'none';
  $('#topbtns').classList.toggle('touch', isTouch);
  $('#skillbar').style.display = on && !isTouch ? 'flex' : 'none';
  $('#quests').style.display = on ? 'block' : 'none';
  if (!on) {
    $('#bossbar').style.display = 'none';
    $('#dgbar').style.display = 'none';
    $('#bAct').style.display = 'none';
  }
}
export function updHud() {
  const hpK = clamp(game.P.hp / game.ST.hp, 0, 1),
    need = xpNeed(game.P.lvl),
    xpK = clamp(game.P.xp / need, 0, 1);
  $('#hpb').style.width = hpK * 100 + '%';
  $('#hpt').textContent = fmt(Math.ceil(game.P.hp)) + ' / ' + fmt(game.ST.hp);
  $('#hud').classList.toggle('low', hpK > 0 && hpK < 0.3);
  $('#xpb').style.width = xpK * 100 + '%';
  $('#xpt').textContent =
    fmt(Math.floor(game.P.xp)) + ' / ' + fmt(need) + ' (' + Math.floor(xpK * 100) + '%)';
  $('#xpbar').title = 'Experience: ' + fmt(Math.floor(game.P.xp)) + ' / ' + fmt(need);
  $('#lvt').textContent = String(game.P.lvl);
  $('#nmt').textContent = game.P.name;
  $('#gdt').textContent = fmt(game.P.gold);
  updateClock();
  $('#ptt').textContent = game.P.pot;
  // the Q quick slot: whichever consumable it holds, its count, the potion cooldown sweep,
  // dimmed when none are left
  const qk = quickKind(),
    qn = quickCount(qk);
  if (quickShown !== qk) {
    if (!quickShown) {
      // the top bar's potion counter: the same flask as in the bags
      const chip = $('#hud .chip[title="Potions"] svg');
      if (chip) chip.replaceWith(consCanvas('pot', 44));
      const tb = $('#bPot');
      if (tb.firstChild && tb.firstChild.nodeType === 3) tb.firstChild.remove();
    }
    quickShown = qk;
    $('#ksPot .ic').replaceChildren(consCanvas(qk, 64));
    $('#ksPot').title = qk === 'torch' ? 'Torch: light one in your off hand' : 'Health potion';
    const tb = $('#bPot');
    if (tb.firstChild && tb.firstChild.nodeName === 'CANVAS') tb.firstChild.remove();
    tb.prepend(consCanvas(qk, 64));
  }
  $('#ptt2').textContent = qn;
  $('#ptt3').textContent = qn;
  for (const id of ['#ksPot', '#bPot']) {
    const b = $(id);
    b.style.setProperty(
      '--cd',
      (qk === 'pot' ? (Math.max(0, hero.potCd) / POT_CD) * 360 : 0) + 'deg',
    );
    b.classList.toggle('locked', qn <= 0);
  }
  const wp = heroWorldPos();
  $('#dgt').textContent = String(game.mode === 'dungeon' ? game.DG.lvl : dangerAt(wp.x, wp.y));
  buffChip();
  eventChip();
  drawPortrait();
  for (const n of [1, 2]) {
    const r = rank('s' + n),
      cdMax = SKILLCD[heroStyle()][n - 1] * (1 - game.ST.cdr / 100),
      cd = Math.max(0, hero.scd[n - 1]),
      f = r ? cd / cdMax : 1;
    for (const id of ['#bS' + n, '#ks' + n]) {
      const b = $(id);
      b.style.setProperty('--cd', f * 360 + 'deg');
      b.classList.toggle('locked', !r);
      b.querySelector('.ic').textContent = skillTree().nodes.find((o) => o.id === 's' + n).ic;
    }
  }
  const a = $('#bAct');
  // hidden while the person talked to answers in their own bubble (touch keeps its button)
  if (game.interact && (!game.interact.quiet || isTouch)) {
    a.style.display = 'block';
    a.textContent = game.interact.label + (isTouch ? '' : ' (E)');
  } else a.style.display = 'none';
  const bb = $('#bossbar');
  const boss = game.curBoss && !game.curBoss.dead && game.curBoss.dying <= 0 ? game.curBoss : null;
  if (boss && Math.hypot(boss.x - game.P.x, boss.y - game.P.y) < 700) {
    bb.style.display = 'block';
    $('#bossn').textContent = boss.name + '  Lv ' + boss.lvl;
    $('#bossf').style.width = clamp((boss.hp / boss.max) * 100, 0, 100) + '%';
  } else bb.style.display = 'none';
  // cave clearing progress
  const db = $('#dgbar'),
    D = game.mode === 'dungeon' ? game.DG : null,
    bossOn = bb.style.display === 'block';
  if (D && D.total) {
    const pct = Math.min(100, Math.floor((D.killed / D.total) * 100));
    db.style.display = 'block';
    db.classList.toggle('done', pct >= 100);
    db.classList.toggle('low', bossOn);
    const first = !game.P.dgClear[D.poiKey];
    $('#dgn').textContent =
      D.name +
      ' · Cleared ' +
      pct +
      '% · ' +
      (D.bonus
        ? (D.bonusXp ? '+' + D.bonusXp + ' xp earned · ' : '') +
          (resetLeft(D.poiKey)
            ? 'resets in ' + fmtClock(resetLeft(D.poiKey))
            : D.cave && D.cave.resetAt
              ? 'ready to reset: re-enter to respawn'
              : 'resets 5:00 after you leave')
        : 'Reward ' + clearBonusXp(D.lvl, first) + ' xp' + (first ? '' : ' (repeat)'));
    $('#dgf').style.width = pct + '%';
  } else db.style.display = 'none';
  const bars = (bossOn ? 1 : 0) + (db.style.display === 'block' ? 1 : 0);
  const q = $('#quests');
  q.style.top =
    bars && W <= 640 ? 'calc(env(safe-area-inset-top) + ' + (170 + bars * 50) + 'px)' : '';
  const tracked = trackedQuests(),
    active = activeQuests().length;
  q.innerHTML = tracked.length
    ? '<div class="qhdr">Quests <small>' +
      active +
      '/' +
      QMAX +
      ' · L</small></div>' +
      tracked
        .map(
          (o) =>
            '<div class="qt' +
            (o.done ? ' qd' : '') +
            '"><div class="qh"><span class="qi">' +
            (o.done ? '✓' : QICON[o.type] || QICON.kill) +
            '</span><span class="qn">' +
            o.name +
            '</span></div>' +
            (o.done ? '' : questProgress(o)) +
            '</div>',
        )
        .join('')
    : active
      ? '<div class="qhdr">Quests <small>' + active + ' untracked · L</small></div>'
      : '';
  $('#skillsBtn').classList.toggle('pulse', pointsNew());
}

/** Keep the interaction prompt floating over its target (called every frame). */
export function placeAct() {
  const a = $('#bAct'),
    it = game.state === 'play' ? game.interact : null;
  if (!it || it.ty == null || a.style.display === 'none') return;
  const z = zoom(),
    cx = game.camX + game.camKX + game.kickX,
    cy = game.camY + game.camKY + game.kickY,
    sx = W / 2 + (it.tx - cx) * z,
    sy = H / 2 + (it.ty - cy) * z;
  const x = clamp(sx, 70, W - 70),
    hw = a.offsetWidth / 2;
  let y = clamp(sy, 60, H - 20);
  // not over the zone banner's text while it shows ("Waystone (E)" over the village's name):
  // a small nudge above or below it; farther than that the prompt stays over its target, in
  // front of the banner, which fades within a few seconds
  const zb = $('#zone');
  if (+zb.style.opacity > 0) {
    const rg = document.createRange();
    rg.selectNodeContents(zb);
    const r = rg.getBoundingClientRect();
    if (y > r.top - 4 && y - 44 < r.bottom && x + hw > r.left && x - hw < r.right) {
      const upY = r.top - 4,
        downY = r.bottom + 48,
        best = Math.abs(upY - y) < Math.abs(downY - y) ? upY : downY;
      if (Math.abs(best - y) <= 30 && best >= 60) y = best;
    }
  }
  a.style.left = Math.round(x) + 'px';
  a.style.top = Math.round(y) + 'px';
}
