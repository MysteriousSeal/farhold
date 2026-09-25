import { cancelWarp } from './warp';
import type { Rec } from './types';
import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { angDiff, rand } from '../core/math';
import { CLS } from '../data/classes';
import { SKILLCD, SKILLN, rank } from '../data/skills';
import { leaveDungeon } from './dungeons';
import { killEnemy, unstick } from './enemies';
import { banner, burst, ftext, ring, toast } from './fx';
import { save } from './save';
import { leaveHouse } from './houses';
import { game, hero } from './state';
import { calcStats, xpNeed } from './stats';
import { setHud } from '../ui/hud';
import { showScreen } from '../ui/screens';
import { regionName, solidAt } from '../world/chunks';
/* ================= COMBAT: hero ================= */
function nearestEnemy(x, y, maxd, cone?, coneW = 1.3) {
  let best = null,
    bd = maxd;
  for (const e of game.enemies) {
    if (e.dying > 0) continue;
    const dx = e.x - x,
      dy = e.y - y,
      d = Math.hypot(dx, dy) - e.r;
    if (d < bd) {
      if (cone != null && Math.abs(angDiff(Math.atan2(dy, dx), cone)) > coneW && d > 30) continue;
      bd = d;
      best = e;
    }
  }
  return best;
}
function rollDmg(mul = 1) {
  let d = game.ST.atk * mul * rand(0.9, 1.1);
  const crit = Math.random() * 100 < game.ST.crit;
  if (crit) d *= 1 + game.ST.critd / 100;
  return { d: Math.max(1, Math.round(d)), crit };
}
export function damageEnemy(e, mul, kx, ky, o: Rec = {}) {
  if (e.dying > 0 || e.dead) return;
  const r = rollDmg(mul);
  let d = r.d;
  if (e.elite === 'Armored') d = Math.round(d * 0.65);
  if (e.boss) d = Math.round(d * 0.9);
  e.hp -= d;
  e.flash = 0.12;
  e.hitSq = 0.18;
  const kb = e.boss ? 0.15 : e.kbRes || 1;
  e.kbx += kx * kb;
  e.kby += ky * kb;
  e.aggro = true;
  if (o.stun && !e.boss) e.stun = Math.max(e.stun, o.stun);
  if (o.freeze) e.frozen = Math.max(e.frozen, e.boss ? o.freeze * 0.4 : o.freeze);
  ftext(
    e.x + rand(-6, 6),
    e.y - (e.hbY || 40) * e.sc * 0.7,
    d + (r.crit ? '!' : ''),
    r.crit ? '#ffd23a' : o.col || '#fff',
    r.crit,
  );
  burst(e.x, e.y - 14 * e.sc, r.crit ? '#ffd23a' : '#fff6e0', r.crit ? 10 : 5, 150, 2.5);
  if (!o.quiet) {
    r.crit ? SFX.crit() : SFX.hit();
  }
  if (r.crit) {
    game.shake = Math.max(game.shake, 4);
    game.hitstop = Math.max(game.hitstop, 0.045);
  } else game.hitstop = Math.max(game.hitstop, 0.02);
  if (game.ST.leech > 0 && game.P.hp < game.ST.hp)
    game.P.hp = Math.min(game.ST.hp, game.P.hp + (d * game.ST.leech) / 100);
  if (e.hp <= 0) killEnemy(e);
}
export function heroAttack() {
  if (hero.cd > 0 || hero.roll > 0 || hero.leap || hero.whirl > 0) return;
  cancelWarp();
  const c = game.P.cls,
    ox = game.P.x,
    oy = game.P.y - 18;
  let ang = hero.aim;
  const tg = nearestEnemy(ox, oy, c === 'warrior' ? 95 : 320, ang);
  if (tg) {
    ang = Math.atan2(tg.y - 12 * tg.sc - oy, tg.x - ox);
    hero.aim = ang;
    hero.dx = Math.cos(ang);
    hero.dy = Math.sin(ang);
  }
  hero.cd = CLS[c].cd / (1 + game.ST.aspd / 100);
  hero.atk = 1;
  game.kickX = Math.cos(ang) * 4;
  game.kickY = Math.sin(ang) * 4;
  if (c === 'warrior') {
    if (game.time - hero.lastAtk > 0.8) hero.combo = 0;
    hero.lastAtk = game.time;
    const k = hero.combo,
      fin = k === 2;
    hero.comboSw = k % 2 ? -1 : 1;
    hero.combo = (k + 1) % 3;
    if (fin) {
      hero.cd *= 1.5;
      hero.kbx += Math.cos(ang) * 260;
      hero.kby += Math.sin(ang) * 260;
      SFX.swing3();
    } else SFX.swing();
    const reach = (66 + (fin ? 10 : 0)) * (1 + (game.ST.arc - 1) * 0.6),
      arc = 1.15 * game.ST.arc * (fin ? 1.3 : 1);
    let hits = 0;
    for (const e of game.enemies) {
      if (e.dying > 0) continue;
      const dx = e.x - ox,
        dy = e.y - 10 * e.sc - oy,
        d = Math.hypot(dx, dy);
      if (d > reach + e.r) continue;
      if (Math.abs(angDiff(Math.atan2(dy, dx), ang)) > arc && d > 22) continue;
      damageEnemy(
        e,
        fin ? 1.6 : 1,
        Math.cos(ang) * (fin ? 420 : 240),
        Math.sin(ang) * (fin ? 420 : 240),
        { quiet: hits++ > 1 },
      );
    }
    if (fin && hits) {
      game.shake = Math.max(game.shake, 5);
      game.hitstop = Math.max(game.hitstop, 0.06);
    }
  } else if (c === 'ranger') {
    SFX.shoot();
    game.projs.push({
      x: ox + Math.cos(ang) * 14,
      y: oy + Math.sin(ang) * 14,
      vx: Math.cos(ang) * 680,
      vy: Math.sin(ang) * 680,
      life: 0.7,
      own: 1,
      k: 'arrow',
      pierce: game.ST.pierce,
      hit: [],
      mul: 1,
    });
  } else {
    SFX.zap();
    const shoot = (a) =>
      game.projs.push({
        x: ox + Math.cos(a) * 16,
        y: oy - 8 + Math.sin(a) * 16,
        vx: Math.cos(a) * 440,
        vy: Math.sin(a) * 440,
        life: 0.85,
        own: 1,
        k: 'bolt',
        hit: [],
        mul: 1,
      });
    shoot(ang);
    if (Math.random() < game.ST.twin) setTimeout(() => shoot(ang + rand(-0.12, 0.12)), 90);
  }
}
export function heroRoll() {
  if (hero.rollCd > 0 || hero.roll > 0 || hero.leap) return;
  cancelWarp();
  let dx = hero.vx,
    dy = hero.vy;
  if (!dx && !dy) {
    dx = hero.dx;
    dy = hero.dy;
  }
  const l = Math.hypot(dx, dy) || 1;
  hero.rdx = dx / l;
  hero.rdy = dy / l;
  hero.roll = 0.3;
  hero.rollCd = 0.75 * game.ST.rollCd;
  hero.whirl = 0;
  SFX.roll();
  burst(game.P.x, game.P.y, '#e8dcc0', 8, 80, 3);
}
function skillTarget(max) {
  const e = nearestEnemy(game.P.x, game.P.y - 12, max);
  return e
    ? { x: e.x, y: e.y }
    : { x: game.P.x + Math.cos(hero.aim) * 180, y: game.P.y + Math.sin(hero.aim) * 180 };
}
export function useSkill(n) {
  cancelWarp();
  const r = rank('s' + n);
  if (!r) {
    toast('Unlock ' + SKILLN[game.P.cls][n - 1] + ' in the skill tree');
    return;
  }
  if (hero.scd[n - 1] > 0 || hero.roll > 0 || hero.leap) return;
  hero.scd[n - 1] = SKILLCD[game.P.cls][n - 1] * (1 - game.ST.cdr / 100);
  const c = game.P.cls;
  if (c === 'warrior' && n === 1) {
    hero.whirl = 0.7;
    hero.whirlTick = 0;
    SFX.whirl();
  } else if (c === 'warrior' && n === 2) {
    let t = skillTarget(290);
    const d = Math.hypot(t.x - game.P.x, t.y - game.P.y);
    if (d > 240) {
      t = {
        x: game.P.x + ((t.x - game.P.x) / d) * 240,
        y: game.P.y + ((t.y - game.P.y) / d) * 240,
      };
    }
    if (solidAt(t.x, t.y, 8)) t = { x: game.P.x, y: game.P.y };
    hero.leap = {
      sx: game.P.x,
      sy: game.P.y,
      tx: t.x,
      ty: t.y,
      t: 0,
      dur: 0.42,
      mul: 1.7 + 0.3 * r,
    };
    SFX.roll();
  } else if (c === 'ranger' && n === 1) {
    const tg = nearestEnemy(game.P.x, game.P.y - 12, 340);
    const a0 = tg ? Math.atan2(tg.y - game.P.y, tg.x - game.P.x) : hero.aim,
      cnt = 6 + r;
    SFX.shoot();
    setTimeout(SFX.shoot, 50);
    for (let i = 0; i < cnt; i++) {
      const a = a0 + (i / (cnt - 1) - 0.5) * 1.2;
      game.projs.push({
        x: game.P.x + Math.cos(a) * 14,
        y: game.P.y - 18 + Math.sin(a) * 14,
        vx: Math.cos(a) * 640,
        vy: Math.sin(a) * 640,
        life: 0.6,
        own: 1,
        k: 'arrow',
        pierce: game.ST.pierce,
        hit: [],
        mul: 0.6 + 0.1 * r,
      });
    }
    hero.atk = 1;
  } else if (c === 'ranger' && n === 2) {
    const t = skillTarget(340);
    game.zones.push({ type: 'rain', x: t.x, y: t.y, r: 105, t: 1.2, tick: 0, mul: 0.45 + 0.1 * r });
    SFX.shoot();
    hero.atk = 1;
  } else if (c === 'mage' && n === 1) {
    const R = 150 * game.ST.rad;
    SFX.frost();
    ring(game.P.x, game.P.y - 10, '#bfe9ff', 40, R * 2.2, 3.5);
    game.zones.push({ type: 'nova', x: game.P.x, y: game.P.y - 10, r: R, t: 0.4, max: 0.4 });
    for (const e of game.enemies) {
      if (Math.hypot(e.x - game.P.x, e.y - game.P.y) < R + e.r)
        damageEnemy(e, 0.9 + 0.2 * r, (e.x - game.P.x) * 2, (e.y - game.P.y) * 2, {
          freeze: 1.6 + 0.2 * r,
          col: '#bfe9ff',
          quiet: true,
        });
    }
    game.shake = Math.max(game.shake, 4);
  } else if (c === 'mage' && n === 2) {
    const t = skillTarget(360),
      R = 120 * game.ST.rad;
    game.teles.push({
      type: 'circle',
      x: t.x,
      y: t.y,
      r: R,
      t: 0,
      max: 0.75,
      hero: 1,
      cb: () => {
        SFX.boom();
        game.shake = Math.max(game.shake, 9);
        game.hitstop = 0.08;
        burst(t.x, t.y, '#ff9a2e', 40, 320, 5, 80, 1);
        ring(t.x, t.y, '#ffe27a', 36, R * 2.5, 4);
        for (const e of game.enemies)
          if (Math.hypot(e.x - t.x, (e.y - t.y) * 1.2) < R + e.r)
            damageEnemy(e, 2.6 + 0.4 * r, (e.x - t.x) * 3, (e.y - t.y) * 3, { quiet: true });
        game.zones.push({ type: 'burn', x: t.x, y: t.y, r: R * 0.85, t: 3, tick: 0, mul: 0.25 });
      },
    });
    game.projs.push({
      x: t.x - 120,
      y: t.y - 420,
      vx: 120 / 0.75,
      vy: 420 / 0.75,
      life: 0.75,
      own: 1,
      k: 'meteor',
      hit: [],
      big: true,
      col: '#ff8a2e',
      nohit: 1,
    });
    SFX.zap();
  }
}
export function drinkPot() {
  if (game.P.pot <= 0) {
    toast('No potions left');
    return;
  }
  if (game.P.hp >= game.ST.hp) {
    toast('Already at full health');
    return;
  }
  game.P.pot--;
  const h = Math.round(game.ST.hp * 0.45);
  game.P.hp = Math.min(game.ST.hp, game.P.hp + h);
  SFX.pot();
  burst(game.P.x, game.P.y - 20, '#ff6a8a', 14, 90, 3, 40);
  ftext(game.P.x, game.P.y - 50, '+' + h, '#7ee37a');
}
export function hurtHero(d, sx, sy, o: Rec = {}) {
  if (hero.roll > 0 || hero.inv > 0 || hero.leap || game.state !== 'play') return;
  const dm = Math.max(1, Math.round((d * 100) / (100 + game.ST.def * 4)));
  cancelWarp();
  game.P.hp -= dm;
  hero.inv = 0.5;
  game.shake = Math.max(game.shake, 7);
  game.hitstop = Math.max(game.hitstop, 0.05);
  SFX.hurt();
  ftext(game.P.x, game.P.y - 44, '-' + dm, '#ff6a5a');
  burst(game.P.x, game.P.y - 16, '#ff6a5a', 8, 120, 3);
  $('#hurt').style.opacity = 0.7;
  setTimeout(() => ($('#hurt').style.opacity = 0), 120);
  if (o.slow) hero.slow = o.slow;
  const l = Math.hypot(game.P.x - sx, game.P.y - sy) || 1;
  hero.kbx = ((game.P.x - sx) / l) * 240;
  hero.kby = ((game.P.y - sy) / l) * 240;
  if (game.P.hp <= 0) heroDie();
}
function heroDie() {
  game.P.hp = 0;
  game.state = 'dead';
  const lost = Math.floor(game.P.gold * 0.1);
  game.P.gold -= lost;
  SFX.die();
  $('#deadt').textContent =
    'Slain in ' + regionName(game.P.x, game.P.y) + '. You lost ' + lost + ' gold.';
  showScreen('dead');
  setHud(false);
}
export function respawn() {
  const w = game.P.wpInfo[game.P.home] || { x: 0, y: 0 };
  if (game.mode === 'dungeon') leaveDungeon(true);
  if (game.mode === 'house') leaveHouse(true);
  game.P.x = w.x;
  game.P.y = w.y + 70;
  unstick(game.P);
  game.P.hp = game.ST.hp;
  game.enemies = [];
  game.projs = [];
  game.teles = [];
  game.zones = [];
  game.curBoss = null;
  hero.inv = 2;
  game.camX = game.P.x;
  game.camY = game.P.y;
  game.state = 'play';
  showScreen('');
  setHud(true);
  save();
}
export function gainXp(n) {
  game.P.xp += n;
  while (game.P.xp >= xpNeed(game.P.lvl)) {
    game.P.xp -= xpNeed(game.P.lvl);
    game.P.lvl++;
    calcStats();
    game.P.hp = game.ST.hp;
    SFX.lvl();
    ftext(game.P.x, game.P.y - 64, 'LEVEL UP!', '#ffd23a', true);
    ring(game.P.x, game.P.y - 10, '#ffd23a', 40, 190, 3.5);
    ring(game.P.x, game.P.y - 10, '#fff6e0', 24, 120, 2.5);
    banner('Level ' + game.P.lvl, 'A skill point awaits. Open Skills.');
    $('#skillsBtn').classList.add('pulse');
    save();
  }
}
