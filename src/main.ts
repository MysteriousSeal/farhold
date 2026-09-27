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
import { applyVolumes } from './view/audio/sfx';
import { strSeed } from './core/math';
import { save } from './model/game/save';
import { game } from './model/game/state';
import { refreshMenu } from './view/ui/menus';
import { GameLoop } from './controller/loop';
/* ================= START ================= */
buildSprites();
// cheat panel: dev server only, left out of production builds
if (import.meta.env.DEV) import('./view/ui/cheats');
refreshMenu();
game.SEED = strSeed('menu-' + ((Math.random() * 1e9) | 0));
applyVolumes();
new GameLoop().start();
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.P && game.state !== 'menu') save();
});
