import { musicTick } from '../view/audio/music';
import { AC } from '../view/audio/sfx';
import { game } from '../model/game/state';
import { update } from './update';
import { drawMini } from '../view/render/minimap';
import { render } from '../view/render/render';
import { placeAct, updHud } from '../view/ui/hud';
import { drawPreview } from '../view/ui/screens';
/* ================= The game loop ================= */
// One frame: advance the game (while it runs), draw it, and keep the minimap, the HUD and the
// music up to date.
export class GameLoop {
  private last = performance.now();
  /** Start running frames. */
  start() {
    requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
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
    requestAnimationFrame(this.frame);
  };
}
