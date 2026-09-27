import { audioInit } from '../view/audio/sfx';
import { $, W, cv } from '../view/dom';
import { heroRoll, useSkill } from '../model/game/combat';
import { useQuick } from '../model/game/consumables';
import { game } from '../model/game/state';
import { toggleBags, toggleChar } from '../view/ui/inventory';
import { openJournal } from '../view/ui/journal';
import { openPause, openSkills, pauseBack } from '../view/ui/menus';
import { closeAll } from '../view/ui/screens';
import { isTouch, joy } from '../core/device';
/* ================= INPUT ================= */
export { isTouch, joy };
/**
 * The keyboard, the mouse on the canvas and the touch controls: what is held, where the mouse
 * aims, and the actions they trigger. One instance, `input`, listens from startup.
 */
export class InputController {
  /** keys held, by KeyboardEvent.code */
  readonly keys: Record<string, boolean> = {};
  /** where the mouse points (screen pixels), and whether its button is attacking */
  mouseAim: { x: number; y: number } | null = null;
  mouseAtk = false;
  constructor() {
    this.listen();
  }
  /** The movement direction held right now: WASD / arrow keys, or the touch stick. */
  moveInput(): [number, number] {
    let mx = 0,
      my = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) my--;
    if (this.keys.KeyS || this.keys.ArrowDown) my++;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx--;
    if (this.keys.KeyD || this.keys.ArrowRight) mx++;
    if (joy.id !== null) {
      mx = joy.x;
      my = joy.y;
    }
    return [mx, my];
  }
  /** Hook up the keyboard, the canvas pointer (mouse and touch stick) and the HUD buttons. */
  private listen() {
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      audioInit();
      if (game.state === 'play') {
        if (e.code === 'Space' || e.code === 'KeyJ') {
          game.atkHeld = true;
          e.preventDefault();
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') heroRoll();
        if (e.code === 'KeyQ') useQuick();
        if (e.code === 'Digit1' || e.code === 'KeyU') useSkill(1);
        if (e.code === 'Digit2' || e.code === 'KeyO') useSkill(2);
        if (e.code === 'KeyE' || e.code === 'KeyF') {
          if (game.interact) game.interact.act();
        }
        if (e.code === 'KeyB' || e.code === 'KeyI' || e.code === 'Tab') {
          e.preventDefault();
          toggleBags();
        }
        if (e.code === 'KeyC') toggleChar();
        if (e.code === 'KeyK' || e.code === 'KeyT') openSkills();
        if (e.code === 'KeyL') openJournal();
        if (e.code === 'Escape') openPause();
      } else if (game.state === 'inv' && ['KeyB', 'KeyI', 'Tab', 'KeyC'].includes(e.code)) {
        // bags and character sheet toggle independently while either is open
        e.preventDefault();
        if (e.code === 'KeyC') toggleChar();
        else toggleBags();
      } else if (
        (game.state === 'inv' || game.state === 'modal') &&
        ['Escape', 'KeyB', 'KeyI', 'Tab', 'KeyC', 'KeyK', 'KeyT', 'KeyL'].includes(e.code)
      ) {
        e.preventDefault();
        if (!(e.code === 'Escape' && pauseBack())) closeAll();
      }
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'KeyJ') game.atkHeld = false;
    });
    cv.addEventListener('pointerdown', (e) => {
      audioInit();
      if (game.state !== 'play') return;
      if (e.pointerType === 'mouse') {
        if (e.button === 2) {
          useSkill(1);
          return;
        }
        game.atkHeld = true;
        this.mouseAtk = true;
        this.mouseAim = { x: e.clientX, y: e.clientY };
        return;
      }
      if (joy.id === null && e.clientX < W * 0.6) {
        joy.id = e.pointerId;
        joy.ox = e.clientX;
        joy.oy = e.clientY;
        joy.x = joy.y = 0;
        try {
          cv.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.mouseAim = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.pointerId !== joy.id) return;
      let dx = e.clientX - joy.ox,
        dy = e.clientY - joy.oy;
      const l = Math.hypot(dx, dy),
        m = 52;
      if (l > m) {
        joy.ox += (dx / l) * (l - m);
        joy.oy += (dy / l) * (l - m);
        dx = (dx / l) * m;
        dy = (dy / l) * m;
      }
      joy.x = dx / m;
      joy.y = dy / m;
    });
    const endJoy = (e) => {
      if (e.pointerType === 'mouse') {
        if (this.mouseAtk) {
          game.atkHeld = false;
          this.mouseAtk = false;
        }
        return;
      }
      if (e.pointerId === joy.id) {
        joy.id = null;
        joy.x = joy.y = 0;
      }
    };
    cv.addEventListener('pointerup', endJoy);
    cv.addEventListener('pointercancel', endJoy);
    const tbtn = (id: string, down: () => void, up?: () => void) => {
      const b = $(id);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        audioInit();
        b.classList.add('dn');
        down();
      });
      const u = () => {
        b.classList.remove('dn');
        up && up();
      };
      b.addEventListener('pointerup', u);
      b.addEventListener('pointercancel', u);
      b.addEventListener('pointerleave', u);
    };
    tbtn(
      '#bAtk',
      () => (game.atkHeld = true),
      () => (game.atkHeld = false),
    );
    tbtn('#bRoll', heroRoll);
    tbtn('#bPot', useQuick);
    tbtn('#bS1', () => useSkill(1));
    tbtn('#bS2', () => useSkill(2));
    tbtn('#bAct', () => {
      if (game.interact) game.interact.act();
    });
    $('#bagBtn').onclick = () => toggleBags();
    $('#charBtn').onclick = () => toggleChar();
    $('#skillsBtn').onclick = () => openSkills();
    $('#questBtn').onclick = () => openJournal();
    $('#ksPot').onclick = () => useQuick();
    $('#menuBtn').onclick = () => openPause();
  }
}
export const input = new InputController();
