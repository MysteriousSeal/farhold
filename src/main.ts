import './view/styles/styles.css';
import './view/styles/shop.css';
import './view/styles/skilltree.css';
import './view/styles/pause.css';
import './view/dom';
import './controller/wiring';
import './core/settings';
import './controller/input';
import './view/ui/screens';
import { buildSprites } from './view/art/decor';
import { musicTick } from './view/audio/music';
import { AC, applyVolumes } from './view/audio/sfx';
import { strSeed } from './core/math';
import { save } from './model/game/save';
import { game } from './model/game/state';
import { update } from './controller/update';
import { drawMini } from './view/render/minimap';
import { render } from './view/render/render';
import { placeAct, updHud } from './view/ui/hud';
import { refreshMenu } from './view/ui/menus';
import { drawPreview } from './view/ui/screens';
/* ================= LOOP ================= */
buildSprites();
// cheat panel: dev server only, left out of production builds
if (import.meta.env.DEV) import('./view/ui/cheats');
refreshMenu();
game.SEED = strSeed('menu-' + ((Math.random() * 1e9) | 0));
applyVolumes();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (
    game.state === 'play' ||
    game.state === 'menu' ||
    game.state === 'create' ||
    game.state === 'help'
  )
    update(dt);
  else {
    game.time += dt;
    if (game.fadeDir) update(0);
  }
  render();
  drawPreview(game.time);
  if (game.state === 'play' || game.state === 'modal' || game.state === 'inv') {
    if (game.state === 'play') {
      drawMini(dt);
      placeAct();
    }
    game.hudT -= dt;
    if (game.hudT <= 0 && game.state === 'play') {
      game.hudT = 0.1;
      updHud();
    }
  }
  if (AC)
    musicTick(
      game.state === 'play'
        ? game.mode === 'dungeon'
          ? game.curBoss
            ? 'boss'
            : 'dungeon'
          : game.curBoss && game.curBoss.dying <= 0
            ? 'boss'
            : game.dark > 0.35
              ? 'night'
              : 'day'
        : 'menu',
    );
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.P && game.state !== 'menu') save();
});
