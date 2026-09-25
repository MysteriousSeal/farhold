import { zoom } from '../render/render';
import { clearBonusXp } from '../game/dungeons';
import { $, H, W } from '../core/dom';
import { clamp } from '../core/math';
import { SKILLCD, TREES, pointsFree, rank } from '../data/skills';
import { game, hero } from '../game/state';
import { xpNeed } from '../game/stats';
import { isTouch } from '../input/input';
import { mini } from '../render/minimap';
import { dangerAt } from '../world/terrain';
/* ================= HUD ================= */

export function setHud(on) {
  $('#hud').classList.toggle('on', on);
  mini.style.display = on ? 'block' : 'none';
  $('#touch').classList.toggle('on', on && isTouch);
  $('#topbtns').style.display = on ? 'flex' : 'none';
  $('#skillbar').style.display = on && !isTouch ? 'flex' : 'none';
  $('#quests').style.display = on ? 'block' : 'none';
  if (!on) {
    $('#bossbar').style.display = 'none';
    $('#dgbar').style.display = 'none';
    $('#bAct').style.display = 'none';
  }
}
export function updHud() {
  $('#hpb').style.width = clamp((game.P.hp / game.ST.hp) * 100, 0, 100) + '%';
  $('#hpt').textContent = Math.ceil(game.P.hp) + ' / ' + game.ST.hp;
  $('#xpb').style.width = (game.P.xp / xpNeed(game.P.lvl)) * 100 + '%';
  $('#lvt').textContent = 'Lv ' + game.P.lvl;
  $('#nmt').textContent = game.P.name;
  $('#gdt').textContent = game.P.gold;
  $('#ptt').textContent = game.P.pot;
  $('#ptt2').textContent = game.P.pot;
  $('#dgt').textContent =
    '⚔ ' + (game.mode === 'dungeon' ? game.DG.lvl : dangerAt(game.P.x, game.P.y));
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
        ? '+' + D.bonusXp + ' xp earned'
        : 'Reward ' + clearBonusXp(D.lvl, first) + ' xp' + (first ? '' : ' (repeat)'));
    $('#dgf').style.width = pct + '%';
  } else db.style.display = 'none';
  const bars = (bossOn ? 1 : 0) + (db.style.display === 'block' ? 1 : 0);
  const q = $('#quests');
  q.style.top =
    bars && W <= 640 ? 'calc(env(safe-area-inset-top) + ' + (100 + bars * 50) + 'px)' : '';
  q.innerHTML = game.P.quests
    .map(
      (o) =>
        '<div class="' +
        (o.done ? 'qd' : '') +
        '">' +
        (o.done ? '✓ ' : '★ ') +
        o.name +
        (o.type === 'kill' ? ' <b>' + Math.min(o.have, o.need) + '/' + o.need + '</b>' : '') +
        '</div>',
    )
    .join('');
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
