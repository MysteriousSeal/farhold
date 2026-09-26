import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { saveSettings, settings } from '../core/settings';
import { loadSave, save } from '../game/save';
import { game } from '../game/state';
import { setHud } from './hud';
import { btn, hdr, openModal, wireClose } from './modal';
import { closeAll, showScreen } from './screens';
import { openSkillTree } from './skillTree';
/* skills: the skill tree (ui/skillTree.ts) */
export function openSkills() {
  openSkillTree();
}
/* pause */
export function openPause() {
  if (game.state !== 'play') return;
  openModal(
    hdr('Paused', '') +
      '<div class="set"><label>Music <input type="range" min="0" max="1" step="0.05" id="sMus" value="' +
      settings.music +
      '"></label><label>Sound effects <input type="range" min="0" max="1" step="0.05" id="sSfx" value="' +
      settings.sfx +
      '"></label><label>Enemies <span class="chips" id="sDen"></span></label></div><div class="help" style="padding:0"><p><b>Keyboard:</b> WASD move, Space or click attack, Shift roll, 1 and 2 skills, Q potion, E interact, I bag, C skills.</p><p>Hero: ' +
      game.P.name +
      ', level ' +
      game.P.lvl +
      '. World seed ' +
      game.P.seed +
      '. Foes slain: ' +
      game.P.kills +
      '.</p></div><div class="acts" id="pa"></div>',
  );
  wireClose();
  $('#sMus').oninput = (e) => {
    settings.music = +e.target.value;
    saveSettings();
  };
  const den = () => {
    const el = $('#sDen');
    el.innerHTML = '';
    [
      ['few', 'Few'],
      ['normal', 'Normal'],
      ['many', 'Many'],
    ].forEach(([k, l]) => {
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
  $('#sSfx').oninput = (e) => {
    settings.sfx = +e.target.value;
    saveSettings();
    SFX.coin();
  };
  $('#pa').appendChild(btn('Resume', closeAll));
  $('#pa').appendChild(
    btn(
      'Save and quit to title',
      () => {
        save();
        game.state = 'menu';
        setHud(false);
        showScreen('menu');
        refreshMenu();
      },
      'alt',
    ),
  );
}
/** Main menu: Continue with the most recent hero, Load game when any hero is saved. */
export function refreshMenu() {
  const s = loadSave();
  $('#mCont').style.display = s ? '' : 'none';
  $('#mLoad').style.display = s ? '' : 'none';
  if (s) $('#mCont').textContent = 'Continue as ' + s.p.name + ' (Lv ' + s.p.lvl + ')';
}
