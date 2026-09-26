import { circ, shadow } from '../../core/dom';
import {
  carryPos,
  drawHumanoid,
  drawWeapon,
  handOver,
  handPos,
  restAng,
  weaponBehind,
} from '../humanoid';
/* ================= ART: humanoid enemies ================= */
/** Enemy humanoids (goblins, bandits, skeletons...): body, look and weapon from their type. */
export function drawHumanoidEnemy(c, e, t, D) {
  const L = Object.assign({}, D.look);
  if (e.tint) L.cloth = e.tint;
  if (e.boss && !L.crown && !L.horns) L.crown = true;
  const s = (D.scale || 1) * e.sc,
    z = e.air || 0;
  if (z) {
    c.save();
    shadow(c, e.x, e.y, 12 * s, 4.5 * s, 0.25);
    c.translate(0, -z);
  }
  const hp = handPos(e.dx, e.dy, e.moving, e.walk, t, '', s, L),
    // melee weapons are held on guard (blade up) unless winding up or swinging
    guard =
      (D.wep === 'sword' || D.wep === 'axe' || D.wep === 'club') && !(e.wind > 0) && !(e.swing > 0)
        ? carryPos(e.dx, e.dy, e.moving, e.walk, t, '', s, L)
        : null,
    wx = e.x + (guard ? guard.x : hp.x),
    wy = e.y + (guard ? guard.y : hp.y);
  let ang = restAng(
    hp,
    D.wep === 'bow' ? 'bow' : D.wep === 'orb' || D.wep === 'staff' ? 'staff' : 'sword',
  );
  if (e.wind > 0 && D.wep !== 'bow' && D.wep !== 'orb' && D.wep !== 'staff')
    ang = Math.atan2(e.dy, e.dx) - 1.5 * (1 - e.wind / 0.4);
  if (e.swing > 0 && D.wep !== 'bow') ang = Math.atan2(e.dy, e.dx) + 1.2;
  if (D.wep === 'bow') ang = e.aggro ? Math.atan2(e.dy, e.dx) : ang;
  if (guard) ang = guard.ang;
  const wcol = D.wcol,
    wd = () => {
      if (D.wep === 'orb') {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.85;
        circ(c, wx, wy - 6 * s, (4 + Math.sin(t * 7)) * s, D.orb || '#8ef7ff', false);
        c.globalAlpha = 0.3;
        circ(c, wx, wy - 6 * s, 9 * s, D.orb || '#8ef7ff', false);
        c.restore();
      } else if (D.wep)
        drawWeapon(
          c,
          wx,
          wy,
          ang,
          D.wep === 'staff' ? 'staff' : D.wep,
          D.wep === 'bow' && e.wind > 0 ? 1 - e.wind / 0.5 : 0,
          wcol,
          null,
          D.wstyle || 0,
          s,
        );
    };
  const behind = guard ? guard.behind : weaponBehind(hp, D.wep, e.wind > 0);
  if (behind) wd();
  drawHumanoid(c, e.x, e.y, {
    look: L,
    dx: e.dx,
    dy: e.dy,
    moving: e.moving,
    walk: e.walk,
    time: t,
    scale: s,
    flash: e.flash > 0,
    frozen: e.frozen > 0,
    float: D.float,
    alpha: D.float ? 0.9 : null,
    noShadow: !!z,
    squash: e.hitSq || 0,
    carry: guard ? guard.arm : null,
  });
  if (!behind) {
    wd();
    if (D.wep) handOver(c, wx, wy, L, s); // grip inside the fist
  }
  if (z) c.restore();
}
