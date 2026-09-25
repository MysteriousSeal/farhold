import { clamp } from '../../core/math';
import { ET } from '../../data/enemies';
import { drawBat } from './bat';
import { drawBoar } from './boar';
import { drawGolem } from './golem';
import { drawHumanoidEnemy } from './humanoid';
import { eliteAura, enemyPlate } from './plate';
import { drawScorpion } from './scorpion';
import { fcol } from './shared';
import { drawSlime } from './slime';
import { drawSpider } from './spider';
import { drawWolf } from './wolf';
export { levelColor } from './plate';
/* ================= ART: enemies =================
 * One file per creature in this folder; drawEnemy picks the drawer for the enemy's kind and
 * adds the shared effects (death squash, boss rage glow, stun stars, health bar). */
/** Draw one enemy with its effects and health bar. */
export function drawEnemy(c, e, t) {
  const D = ET[e.type];
  if (e.elite && !(e.dying > 0)) eliteAura(c, e, t);
  if (e.dying > 0) {
    c.save();
    c.globalAlpha = clamp(e.dying / 0.4, 0, 1);
    c.translate(e.x, e.y);
    c.scale(1 + (0.4 - e.dying) * 1.2, 1 - (0.4 - e.dying) * 1.8);
    c.translate(-e.x, -e.y);
  }
  if (e.boss && e.enraged) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.25 + Math.sin(t * 8) * 0.1;
    const gr = c.createRadialGradient(e.x, e.y - 20 * e.sc, 5, e.x, e.y - 20 * e.sc, 50 * e.sc);
    gr.addColorStop(0, '#ff4a2a');
    gr.addColorStop(1, 'rgba(255,40,20,0)');
    c.fillStyle = gr;
    c.fillRect(e.x - 60 * e.sc, e.y - 80 * e.sc, 120 * e.sc, 110 * e.sc);
    c.restore();
  }
  const k = D.kind;
  if (k === 'slime') drawSlime(c, e, t);
  else if (k === 'quad' && D.variant === 'boar') drawBoar(c, e, t, fcol(e, e.col));
  else if (k === 'quad') drawWolf(c, e, t, D.variant, fcol(e, e.col));
  else if (k === 'bat') drawBat(c, e, t);
  else if (k === 'spider') drawSpider(c, e, t);
  else if (k === 'scorp') drawScorpion(c, e, t, fcol(e, e.col));
  else if (k === 'golem') drawGolem(c, e, t);
  else drawHumanoidEnemy(c, e, t, D);
  if (e.dying > 0) {
    c.restore();
    return;
  }
  if (e.stun > 0) {
    c.save();
    c.translate(e.x, e.y - (e.hbY || 40) * e.sc - 8);
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1;
      c.fillStyle = '#ffe38a';
      c.font = '700 9px sans-serif';
      c.fillText('✦', Math.cos(a) * 9, Math.sin(a) * 3);
    }
    c.restore();
  }
  enemyPlate(c, e);
}
