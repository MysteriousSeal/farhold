import { drawHumanoid } from '../art/humanoid';
import { zoom } from '../render/render';
import { clearBonusXp, fmtClock, resetLeft } from '../game/dungeons';
import { $, H, W } from '../core/dom';
import { clamp } from '../core/math';
import { SKILLCD, TREES, pointsFree, rank } from '../data/skills';
import { game, hero } from '../game/state';
import { xpNeed } from '../game/stats';
import { isTouch } from '../input/input';
import { mini } from '../render/minimap';
import { QMAX, activeQuests, trackedQuests } from '../game/quests';
import { QICON, questProgress } from './questUi';
import { dangerAt } from '../world/terrain';
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
    k = 4.3; // head (radius ≈ 10.5, centred ≈ 35 above the feet) fills the circle
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, cv.width, cv.height);
  x.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2 + 32 * k);
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

export function setHud(on) {
  $('#hud').classList.toggle('on', on);
  mini.style.display = on ? 'block' : 'none';
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
  $('#xpt').textContent = Math.floor(xpK * 100) + '%';
  $('#xpbar').title = 'Experience: ' + fmt(Math.floor(game.P.xp)) + ' / ' + fmt(need);
  $('#lvt').textContent = String(game.P.lvl);
  $('#nmt').textContent = game.P.name;
  $('#gdt').textContent = fmt(game.P.gold);
  $('#ptt').textContent = game.P.pot;
  $('#ptt2').textContent = game.P.pot;
  $('#dgt').textContent = String(
    game.mode === 'dungeon' ? game.DG.lvl : dangerAt(game.P.x, game.P.y),
  );
  drawPortrait();
  for (const n of [1, 2]) {
    const r = rank('s' + n),
      cdMax = SKILLCD[game.P.cls][n - 1] * (1 - game.ST.cdr / 100),
      cd = Math.max(0, hero.scd[n - 1]),
      f = r ? cd / cdMax : 1;
    for (const id of ['#bS' + n, '#ks' + n]) {
      const b = $(id);
      b.style.setProperty('--cd', f * 360 + 'deg');
      b.classList.toggle('locked', !r);
      b.querySelector('.ic').textContent = TREES[game.P.cls].nodes.find((o) => o.id === 's' + n).ic;
    }
  }
  const a = $('#bAct');
  if (game.interact) {
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
    bars && W <= 640 ? 'calc(env(safe-area-inset-top) + ' + (154 + bars * 50) + 'px)' : '';
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
  $('#skillsBtn').classList.toggle('pulse', pointsFree() > 0);
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
  a.style.left = Math.round(clamp(sx, 70, W - 70)) + 'px';
  a.style.top = Math.round(clamp(sy, 60, H - 20)) + 'px';
}
