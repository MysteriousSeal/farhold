import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { saveSettings, settings } from '../core/settings';
import { loadSave, save } from '../game/save';
import { game } from '../game/state';
import { isTouch } from '../input/input';
import { setHud } from './hud';
import { drawPortrait } from './inventory';
import { btn, openModal } from './modal';
import { closeAll, showScreen } from './screens';
import { openSkillTree } from './skillTree';
/* skills: the skill tree (ui/skillTree.ts) */
export function openSkills() {
  openSkillTree();
}
/* ---- pause: a hero card beside big buttons, with Settings and Controls as sub-views ---- */
type PauseView = 'main' | 'settings' | 'controls';
const DENSITY = [
  ['few', 'Few'],
  ['normal', 'Normal'],
  ['many', 'Many'],
];
const KEYS: [string[], string][] = [
  [['W', 'A', 'S', 'D'], 'Move'],
  [['Space', 'Click'], 'Attack'],
  [['Shift'], 'Roll'],
  [['1', '2'], 'Skills'],
  [['Right click'], 'First skill'],
  [['Q'], 'Drink a potion'],
  [['E'], 'Interact'],
  [['B'], 'Bags'],
  [['C'], 'Character'],
  [['K'], 'Skill tree'],
  [['L'], 'Journal'],
  [['Esc'], 'Pause'],
];
const TOUCH: [string, string][] = [
  ['Drag left side', 'Move'],
  ['Hold Attack', 'Fight'],
  ['Roll', 'Dodge'],
  ['Skill buttons', 'Use skills'],
];
export function openPause() {
  if (game.state !== 'play') return;
  openModal('');
  $('#mp').classList.add('pause');
  pauseView('main');
}
/** Esc on a pause sub-view steps back to the main pause view; false when not on one. */
export function pauseBack() {
  if (game.state !== 'modal' || !$('#mp').classList.contains('pause') || !$('#pBack')) return false;
  pauseView('main');
  return true;
}
function pauseView(v: PauseView) {
  const mp = $('#mp');
  if (v === 'main') {
    const P = game.P;
    mp.innerHTML =
      '<h2 class="ptitle">Paused</h2><div class="pgrid"><div class="pcard"><div class="portrait"><canvas id="pHero" width="440" height="652"></canvas></div><div class="pname">' +
      P.name +
      '</div><div class="plv">Level ' +
      P.lvl +
      '</div><dl class="pfacts"><div><dt>Foes slain</dt><dd>' +
      P.kills.toLocaleString('en-US') +
      '</dd></div><div><dt>World seed</dt><dd>' +
      P.seed +
      '</dd></div></dl></div><div class="pbtns" id="pb"></div></div>';
    drawPortrait($('#pHero'));
    const pb = $('#pb');
    pb.appendChild(btn('Resume', closeAll));
    pb.appendChild(btn('Settings', () => pauseView('settings'), 'alt'));
    pb.appendChild(btn('Controls', () => pauseView('controls'), 'alt'));
    pb.appendChild(btn('Save and quit', quitToTitle, 'alt'));
    pb.querySelectorAll('.btn').forEach((b) => b.classList.remove('sm'));
    (pb.firstChild as HTMLElement).focus();
    return;
  }
  mp.innerHTML =
    '<div class="psub"><button class="btn sm alt" id="pBack" aria-label="Back">‹ Back</button><h2>' +
    (v === 'settings' ? 'Settings' : 'Controls') +
    '</h2></div>' +
    (v === 'settings' ? settingsHtml() : controlsHtml());
  $('#pBack').onclick = () => pauseView('main');
  $('#pBack').focus();
  if (v === 'settings') wireSettings();
}
function slider(id: string, label: string, val: number) {
  return (
    '<div class="prow"><label for="' +
    id +
    '">' +
    label +
    '</label><input class="prange" type="range" min="0" max="1" step="0.05" id="' +
    id +
    '" value="' +
    val +
    '"><output id="' +
    id +
    'V"></output></div>'
  );
}
function settingsHtml() {
  return (
    '<section class="crs"><h4>Audio</h4>' +
    slider('sMus', 'Music', settings.music) +
    slider('sSfx', 'Sound effects', settings.sfx) +
    '</section><section class="crs"><h4>Gameplay</h4><div class="prow"><span>Enemies</span><div class="seg" id="sDen"></div></div></section>'
  );
}
function controlsHtml() {
  const kb = KEYS.map(
    ([ks, what]) =>
      '<div class="pkey"><span>' +
      ks.map((k) => '<kbd>' + k + '</kbd>').join('') +
      '</span><b>' +
      what +
      '</b></div>',
  ).join('');
  const touch = TOUCH.map(
    ([how, what]) =>
      '<div class="pkey"><span><kbd>' + how + '</kbd></span><b>' + what + '</b></div>',
  ).join('');
  const kbSec =
      '<section class="crs"><h4>Keyboard</h4><div class="pkeys">' + kb + '</div></section>',
    touchSec =
      '<section class="crs"><h4>Touch</h4><div class="pkeys">' + touch + '</div></section>';
  return isTouch ? touchSec + kbSec : kbSec + touchSec;
}
function wireSettings() {
  const range = (id: string, key: 'music' | 'sfx', after?: () => void) => {
    const el = $('#' + id),
      out = $('#' + id + 'V'),
      paint = () => {
        const v = +el.value;
        out.textContent = Math.round(v * 100) + '%';
        el.style.setProperty('--fill', v * 100 + '%');
      };
    paint();
    el.oninput = () => {
      settings[key] = +el.value;
      saveSettings();
      paint();
      if (after) after();
    };
  };
  range('sMus', 'music');
  range('sSfx', 'sfx', () => SFX.coin());
  const den = () => {
    const el = $('#sDen');
    el.innerHTML = '';
    DENSITY.forEach(([k, l]) => {
      const b = document.createElement('button');
      b.className = 'chip' + ((settings.density || 'normal') === k ? ' on' : '');
      b.textContent = l;
      b.onclick = () => {
        settings.density = k;
        saveSettings();
        den();
      };
      el.appendChild(b);
    });
  };
  den();
}
function quitToTitle() {
  save();
  game.state = 'menu';
  setHud(false);
  showScreen('menu');
  refreshMenu();
}
/** Main menu: Continue with the most recent hero, Load game when any hero is saved. */
export function refreshMenu() {
  const s = loadSave();
  $('#mCont').style.display = s ? '' : 'none';
  $('#mLoad').style.display = s ? '' : 'none';
  if (s) $('#mCont').textContent = 'Continue as ' + s.p.name + ' (Lv ' + s.p.lvl + ')';
}
