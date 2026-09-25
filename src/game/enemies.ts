import { dungeonKill } from './dungeons';
import { inPlaceNow } from '../world/poi';
import { WADE, isPool } from '../world/terrain';
import type { Enemy, Rec } from './types';
import { CHEST_GOLD_SHARE, spawnBossChest } from './bossChest';
import { SFX } from '../audio/sfx';
import { TAU, clamp, lerp, pick, rand } from '../core/math';
import { settings } from '../core/settings';
import { BOSS } from '../data/bosses';
import { RACE } from '../data/classes';
import { ET, GOLEMCOL, TABLE, typesFor } from '../data/enemies';
import { bossAI } from './bossAI';
import { gainXp, hurtHero } from './combat';
import { banner, burst, ftext, ring } from './fx';
import { genItem } from './items';
import { questEvent } from './quests';
import { save } from './save';
import { game } from './state';
import { solidAt } from '../world/chunks';
import { poisNear } from '../world/poi';
import { dangerAt, terr, walkT } from '../world/terrain';
/* ================= ENEMIES ================= */
export const ELITES = ['Swift', 'Vampiric', 'Frenzied', 'Armored', 'Giant'];
export function makeEnemy(type, lvl, x, y, o: Rec = {}) {
  const D = ET[type];
  const e: Enemy = {
    type,
    lvl,
    x,
    y,
    sc: o.sc || 1,
    r: D.r,
    dx: 1,
    dy: 0,
    walk: rand(0, 6),
    moving: false,
    cd: rand(0.5, 1.5),
    wind: 0,
    swing: 0,
    flash: 0,
    kbx: 0,
    kby: 0,
    wt: 0,
    wx: 0,
    wy: 0,
    aggro: false,
    stun: 0,
    frozen: 0,
    slow: 0,
    dying: 0,
    hitSq: 0,
    ph: rand(0, 9),
    air: 0,
    hbY: D.hbY || 40,
    col: D.col,
    spd: D.spd * rand(0.92, 1.08),
  };
  let hpM = 1,
    dmM = 1;
  if (o.elite) {
    e.elite = o.elite;
    hpM = 2.8;
    dmM = 1.4;
    e.sc *= 1.25;
    if (o.elite === 'Swift') e.spd *= 1.45;
    if (o.elite === 'Giant') {
      e.sc *= 1.2;
      hpM = 4;
    }
  }
  e.max = Math.round(D.hp * (22 + lvl * 15) * hpM);
  e.hp = e.max;
  e.hpShow = e.max;
  e.dmg = D.dmg * (5 + lvl * 2.4) * dmM;
  e.r = D.r * e.sc;
  const b = game.mode === 'dungeon' ? (game.DG ? game.DG.b : 0) : terr(x, y).b;
  if (type === 'slime')
    e.col =
      b === 6
        ? '#b07ae0'
        : b === 4
          ? '#8ad8ff'
          : b === 5
            ? '#9ac05a'
            : b === 3
              ? '#e0b85a'
              : lvl > 8
                ? '#6ab8e6'
                : '#6fd66a';
  if (type === 'golem') {
    const gc = GOLEMCOL[b];
    e.col = gc[0];
    e.glow = gc[1];
  }
  if (type === 'wolf' && lvl > 8) e.col = '#5e5a6a';
  if (o.elite && D.kind === 'hum') e.tint = o.elite === 'Vampiric' ? '#6a1a3a' : '#8a2a6a';
  return e;
}
export function makeBoss(bt, lvl, x, y, src) {
  const B = BOSS[bt],
    e = makeEnemy(B.base, lvl, x, y);
  e.boss = B;
  e.bt = bt;
  e.sc = B.scale;
  e.r = ET[B.base].r * B.scale * 0.8;
  e.max = Math.round(B.hp * (40 + lvl * 26) * (src && src.mini ? 0.7 : 1));
  e.hp = e.max;
  e.hpShow = e.max;
  e.dmg = B.dmg * (6 + lvl * 2.6);
  e.spd = B.spd;
  e.aggro = true;
  e.abcd = 2.2;
  e.last = '';
  e.src = src;
  e.home = { x, y };
  if (B.col) e.col = B.col;
  if (B.tint) e.tint = B.tint;
  e.name = (src && src.bname ? src.bname + ', ' : '') + B.n;
  if (src && src.mini) e.name = B.n;
  return e;
}
export const DENS = {
  few: { cap: 3, night: 4, int: 4.5, grp: 0.15 },
  normal: { cap: 5, night: 7, int: 2.8, grp: 0.3 },
  many: { cap: 9, night: 12, int: 1.3, grp: 0.5 },
};
export function spawnEnemies() {
  if (game.mode !== 'world') return;
  const D0 = DENS[settings.density] || DENS.normal,
    night = game.dark > 0.3,
    cap = night ? D0.night : D0.cap;
  if (game.enemies.filter((e) => !e.minionOf && !e.boss && e.dying <= 0).length >= cap) return;
  for (let tries = 0; tries < 6; tries++) {
    const a = Math.random() * TAU,
      d = rand(440, 660),
      x = game.P.x + Math.cos(a) * d,
      y = game.P.y + Math.sin(a) * d;
    if (Math.hypot(x, y) < 700) continue; // Hearthfire and its walls
    const T = terr(x, y);
    if (!walkT(T)) continue;
    if (poisNear(x, y, 120).length) continue;
    if (game.enemies.some((o) => Math.hypot(o.x - x, o.y - y) < 260)) continue;
    const lv = Math.max(
      1,
      dangerAt(x, y) + (Math.random() < 0.2 ? 1 : 0) - (Math.random() < 0.25 ? 1 : 0),
    );
    let list = typesFor(TABLE[T.b], lv);
    if (night && lv >= 3)
      list = list.concat(
        T.b === 4 ? ['wraith'] : ['bat', 'wraith'].filter((k) => lv >= (k === 'wraith' ? 5 : 2)),
      );
    const type = pick(list),
      elite = Math.random() < 0.07 && lv > 1 ? pick(ELITES) : null;
    const group =
      ['wolf', 'icewolf', 'slime', 'goblin', 'bat', 'spider', 'bandit'].includes(type) &&
      Math.random() < D0.grp
        ? 2
        : 1;
    for (let k = 0; k < group; k++) {
      const ex = x + rand(-30, 30),
        ey = y + rand(-24, 24);
      if (!walkT(terr(ex, ey))) continue;
      game.enemies.push(makeEnemy(type, lv, ex, ey, { elite: k === 0 ? elite : null }));
    }
    break;
  }
}
export function killEnemy(e) {
  if (e.dying > 0) return;
  e.dying = 0.4;
  SFX.die();
  burst(e.x, e.y - 12, e.col || '#ccc', 16, 170, 4, 60);
  game.shake = Math.max(game.shake, 3);
  game.hitstop = Math.max(game.hitstop, 0.05);
  game.P.kills++;
  if (e.dg && game.mode === 'dungeon') dungeonKill(e);
  const D = ET[e.type];
  const xp = Math.round(
    D.xp * (8 + e.lvl * 6) * (e.elite ? 3 : 1) * (e.boss ? 12 : 1) * RACE[game.P.race].xp,
  );
  gainXp(xp);
  ftext(e.x, e.y - (e.hbY || 40) * e.sc - 10, '+' + xp + ' xp', '#ffe38a');
  const lairBoss = e.boss && e.src && !e.src.mini,
    total = Math.round(
      (rand(2, 5) + e.lvl * rand(1.2, 2.4)) * (e.elite ? 4 : 1) * (e.boss ? 14 : 1),
    ),
    // a lair boss keeps most of its gold (and all its items) in the chest it leaves behind
    gold = lairBoss ? Math.round(total * (1 - CHEST_GOLD_SHARE)) : total,
    coins = Math.min(e.boss ? 16 : 8, 2 + ((gold / 6) | 0));
  for (let i = 0; i < coins; i++)
    dropAt(e.x, e.y, { kind: 'gold', amt: Math.max(1, Math.round(gold / coins)) });
  if (lairBoss) spawnBossChest(e.src, e.lvl, total - gold);
  if (e.boss) {
    if (!lairBoss) {
      for (let i = 0; i < 2; i++)
        dropAt(e.x, e.y, { kind: 'item', item: genItem(e.lvl, 0.25, null, 2) });
      dropAt(e.x, e.y, { kind: 'item', item: genItem(e.lvl, 0.35, null, 1) });
      dropAt(e.x, e.y, { kind: 'pot' });
    }
    SFX.lvl();
    banner(e.name + ' defeated', 'Victory');
    game.shake = 12;
    game.hitstop = 0.2;
    ring(e.x, e.y - 20, '#ffd23a', 50, 300, 4);
    if (e.src && !e.src.mini) {
      game.P.cleared[e.src.key] = 1;
      questEvent('boss', e.src.key);
    }
    if (e.src && e.src.mini) game.DG.guardDead = true;
    game.curBoss = null;
    save();
  } else {
    if (Math.random() < (e.elite ? 1 : 0.28))
      dropAt(e.x, e.y, { kind: 'item', item: genItem(e.lvl, e.elite ? 0.12 : 0) });
    if (Math.random() < 0.07) dropAt(e.x, e.y, { kind: 'pot' });
  }
  if (D.split && !e.small && !e.boss) {
    for (let k = 0; k < 2; k++) {
      const s = makeEnemy(e.type, e.lvl, e.x + rand(-12, 12), e.y + rand(-8, 8), { sc: 0.62 });
      s.small = true;
      s.max = s.hp = Math.round(s.max * 0.35);
      s.hpShow = s.hp;
      s.col = e.col;
      s.kbx = rand(-200, 200);
      s.kby = rand(-120, 120);
      s.aggro = true;
      game.enemies.push(s);
    }
  }
  questEvent('kill', e.type);
}
export function dropAt(x, y, o) {
  const a = Math.random() * TAU,
    v = rand(40, 120);
  Object.assign(o, {
    x,
    y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v * 0.6,
    z: 0,
    vz: rand(140, 230),
    t: 0,
  });
  game.drops.push(o);
  if (o.kind === 'item' && o.item.r >= 3) SFX.rare();
}
export function eProj(e, a, sp, k, o: Rec = {}) {
  game.projs.push(
    Object.assign(
      {
        x: e.x + Math.cos(a) * 12,
        y: e.y - 20 * e.sc + Math.sin(a) * 8,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 2.2,
        own: 0,
        k,
        dmg: e.dmg * (o.m || 1),
        col: o.col,
      },
      o,
    ),
  );
}
export const PROJCOL = { fire: '#ff7a2e', ice: '#8ef7ff', necro: '#8ef7a0', rock: null };
export function unstick(o, r = 8) {
  if (!solidAt(o.x, o.y, r)) return;
  for (let k = 1; k < 80; k++) {
    const a = k * 2.4,
      d = k * 6,
      x = o.x + Math.cos(a) * d,
      y = o.y + Math.sin(a) * d;
    if (!solidAt(x, y, r)) {
      o.x = x;
      o.y = y;
      return;
    }
  }
}
export function moveEnt(o, dx, dy, r) {
  const nx = o.x + dx,
    ny = o.y + dy;
  let moved = false;
  if (!solidAt(nx, o.y, r)) {
    o.x = nx;
    moved = true;
  }
  if (!solidAt(o.x, ny, r)) {
    o.y = ny;
    moved = true;
  }
  return moved;
}
export function inVillage(x, y) {
  for (const p of game.activePois)
    if (p.kind === 'village' && Math.hypot(x - p.x, (y - p.y) * 1.15) < p.r + 30) return true;
  return false;
}
export function updateEnemies(dt) {
  const pVillage = inVillage(game.P.x, game.P.y);
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.dying > 0) {
      e.dying -= dt;
      if (e.dying <= 0) e.dead = true;
      continue;
    }
    const D = ET[e.type];
    e.flash -= dt;
    e.hitSq = Math.max(0, e.hitSq - dt);
    e.hpShow = lerp(e.hpShow, e.hp, 1 - Math.pow(0.02, dt));
    if (e.swing > 0) e.swing -= dt;
    const dx = game.P.x - e.x,
      dy = game.P.y - e.y,
      d = Math.hypot(dx, dy) || 1;
    // far-away world enemies despawn; cave enemies stay until killed (they count for clearing)
    if (d > 1150 && !e.boss && game.mode !== 'dungeon') {
      e.dead = true;
      continue;
    }
    if (
      e.boss &&
      e.src &&
      !e.src.mini &&
      Math.hypot(game.P.x - e.home.x, game.P.y - e.home.y) > 900
    ) {
      e.dead = true;
      game.curBoss = null;
      continue;
    }
    if (e.stun > 0 || e.frozen > 0) {
      e.stun -= dt;
      e.frozen -= dt;
      e.wind = 0;
      applyKB(e, dt);
      continue;
    }
    if (e.boss) {
      if (!e.dormant) bossAI(e, dt, dx, dy, d);
      continue;
    }
    e.cd -= dt;
    let mx = 0,
      my = 0;
    const sp =
      e.spd *
      (e.slow > 0 ? 0.5 : 1) *
      (game.mode === 'world' && !e.fly && isPool(terr(e.x, e.y)) && !inPlaceNow(e.x, e.y)
        ? WADE
        : 1);
    e.slow -= dt;
    const aggroR = game.mode === 'dungeon' ? 300 : 260;
    if ((d < aggroR || (e.aggro && d < 520)) && !pVillage && game.state === 'play') {
      e.aggro = true;
      const ai = D.ai;
      if (e.charge) {
        e.charge.t -= dt;
        const c = e.charge;
        if (c.t > 0) {
          moveEnt(e, c.vx * dt, c.vy * dt, e.r * 0.6);
          e.moving = true;
          e.walk += dt * 20;
          if (!c.hit && d < e.r + 16) {
            c.hit = 1;
            hurtHero(e.dmg * 1.3, e.x, e.y);
          }
          if (Math.random() < 0.5)
            game.parts.push({
              x: e.x,
              y: e.y,
              vx: rand(-30, 30),
              vy: rand(-30, -5),
              life: 0.4,
              max: 0.4,
              col: 'rgba(220,200,170,.7)',
              sz: 4,
              g: 0,
            });
        } else e.charge = null;
        continue;
      }
      if (e.leapT != null) {
        e.leapT += dt;
        const L = e.lp,
          k = clamp(e.leapT / 0.45, 0, 1);
        e.x = lerp(L.sx, L.tx, k);
        e.y = lerp(L.sy, L.ty, k);
        e.air = Math.sin(k * Math.PI) * 50;
        if (k >= 1) {
          e.leapT = null;
          e.air = 0;
          burst(e.x, e.y, '#8a7a6a', 8, 90, 3);
          if (Math.hypot(game.P.x - e.x, game.P.y - e.y) < e.r + 22) hurtHero(e.dmg, e.x, e.y);
        }
        continue;
      }
      if (e.wind > 0) {
        e.wind -= dt;
        e.dx = dx;
        e.dy = dy;
        if (e.wind <= 0) enemyStrike(e, d, dx, dy);
      } else if (ai === 'ranged' || ai === 'caster' || ai === 'summoner') {
        const R = D.range;
        if (d > R * 0.85) {
          mx = dx / d;
          my = dy / d;
        } else if (d < R * 0.45) {
          mx = -dx / d;
          my = -dy / d;
        } else {
          mx = (-dy / d) * 0.4 * Math.sin(game.time + e.ph);
          my = (dx / d) * 0.4 * Math.sin(game.time + e.ph);
        }
        if (e.cd <= 0 && d < R + 40) {
          e.wind = ai === 'ranged' ? 0.5 : 0.6;
          e.cd = rand(1.6, 2.4);
          if (
            ai === 'summoner' &&
            Math.random() < 0.4 &&
            game.enemies.filter((o) => o.minionOf === e).length < 3
          ) {
            e.summon = true;
            e.wind = 0.9;
          }
        }
      } else if (ai === 'charger' && e.cd <= 0 && d > 110 && d < 330) {
        const a = Math.atan2(dy, dx);
        e.cd = 3;
        game.teles.push({
          type: 'line',
          x: e.x,
          y: e.y,
          ang: a,
          len: 360,
          w: 34,
          t: 0,
          max: 0.7,
          cb: () => {
            if (e.dying > 0 || e.dead) return;
            e.charge = { t: 0.55, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, hit: 0 };
            SFX.roll();
          },
        });
        e.stunWait = 0.7;
      } else if (ai === 'lunger' && e.cd <= 0 && d < 210 && d > 50) {
        e.cd = 2.6;
        e.wind = 0.4;
        e.lunge = true;
      } else if (ai === 'swarm') {
        const a = Math.atan2(dy, dx) + Math.sin(game.time * 3 + e.ph) * 0.9;
        mx = Math.cos(a);
        my = Math.sin(a);
        if (e.flee > 0) {
          e.flee -= dt;
          mx = -mx;
          my = -my;
        }
        if (d < e.r + 14 && e.cd <= 0) {
          hurtHero(e.dmg, e.x, e.y);
          e.cd = 1;
          e.flee = 0.6;
        }
      } else if (ai === 'slam' && e.cd <= 0 && d < 100) {
        e.cd = 2.6;
        e.wind = 0.8;
        const R = 78 * e.sc;
        game.teles.push({
          type: 'circle',
          x: e.x,
          y: e.y,
          r: R,
          t: 0,
          max: 0.8,
          cb: () => {
            if (e.dying > 0 || e.dead || e.stun > 0 || e.frozen > 0) return;
            SFX.slam();
            game.shake = Math.max(game.shake, 6);
            ring(e.x, e.y, '#d8c8a8', 24, R * 2.2, 4);
            if (Math.hypot(game.P.x - e.x, (game.P.y - e.y) * 1.2) < R + 6)
              hurtHero(e.dmg * 1.4, e.x, e.y);
          },
        });
      } else {
        if (d > e.r + 14) {
          mx = dx / d;
          my = dy / d;
        }
        if (d < e.r + 24 && e.cd <= 0) {
          e.wind = D.kind === 'quad' ? 0.28 : 0.38;
          e.cd = 1.15;
          if (e.elite === 'Frenzied') e.cd *= 0.55;
        }
      }
      if (e.stunWait > 0) {
        e.stunWait -= dt;
        mx = my = 0;
      }
    } else {
      e.aggro = false;
      e.wt -= dt;
      if (e.wt <= 0) {
        e.wt = rand(1, 3);
        const a = Math.random() * TAU;
        e.wx = Math.random() < 0.4 ? 0 : Math.cos(a);
        e.wy = Math.random() < 0.4 ? 0 : Math.sin(a);
      }
      mx = e.wx * 0.45;
      my = e.wy * 0.45;
    }
    const speed = e.wind > 0 ? 0 : sp;
    const vx = mx * speed,
      vy = my * speed;
    const nx = e.x + (vx + e.kbx) * dt,
      ny = e.y + (vy + e.kby) * dt;
    if (game.mode === 'world' && inVillage(nx, ny)) {
      e.wx = -e.wx;
      e.wy = -e.wy;
      e.kbx = e.kby = 0;
    } else moveEnt(e, (vx + e.kbx) * dt, (vy + e.kby) * dt, e.r * 0.6);
    e.kbx *= Math.pow(0.002, dt);
    e.kby *= Math.pow(0.002, dt);
    e.moving = Math.abs(mx) + Math.abs(my) > 0.1;
    if (e.moving) {
      e.walk += dt * (D.kind === 'quad' ? 14 : 9) * (sp / 80);
      e.dx = mx;
      e.dy = my;
    } else if (e.aggro) {
      e.dx = dx;
      e.dy = dy;
    }
    if (D.kind === 'slime') e.walk += dt * 4;
    for (const o of game.enemies) {
      if (o === e || o.dying > 0) continue;
      const ax = e.x - o.x,
        ay = e.y - o.y,
        dd = ax * ax + ay * ay,
        r2 = (e.r + o.r) * 0.85;
      if (dd < r2 * r2 && dd > 0) {
        const q = Math.sqrt(dd);
        e.x += (ax / q) * 50 * dt;
        e.y += (ay / q) * 50 * dt;
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.dead);
}
function applyKB(e, dt) {
  moveEnt(e, e.kbx * dt, e.kby * dt, e.r * 0.6);
  e.kbx *= Math.pow(0.002, dt);
  e.kby *= Math.pow(0.002, dt);
}
function enemyStrike(e, d, dx, dy) {
  const D = ET[e.type],
    a = Math.atan2(dy - 10, dx);
  if (e.summon) {
    e.summon = false;
    for (let k = 0; k < 2; k++) {
      const s = makeEnemy(
        'skeleton',
        Math.max(1, e.lvl - 1),
        e.x + rand(-50, 50),
        e.y + rand(-30, 30),
      );
      s.minionOf = e;
      s.aggro = true;
      if (!solidAt(s.x, s.y, 8)) {
        game.enemies.push(s);
        burst(s.x, s.y, '#8ef7a0', 14, 80, 3, 40, 1);
      }
    }
    return;
  }
  if (e.lunge) {
    e.lunge = false;
    const tx = game.P.x,
      ty = game.P.y;
    e.lp = { sx: e.x, sy: e.y, tx: lerp(e.x, tx, 0.92), ty: lerp(e.y, ty, 0.92) };
    if (solidAt(e.lp.tx, e.lp.ty, 6)) {
      e.lp.tx = e.x;
      e.lp.ty = e.y;
    }
    e.leapT = 0;
    return;
  }
  if (D.ai === 'ranged') {
    SFX.shoot();
    eProj(e, a, 380, 'barrow');
    return;
  }
  if (D.ai === 'caster' || D.ai === 'summoner') {
    SFX.zap();
    const pk = D.proj || 'fire';
    eProj(e, a, 240, 'orb', {
      col: PROJCOL[pk],
      slow: pk === 'ice' ? 1.5 : 0,
      big: e.elite ? 1 : 0,
    });
    return;
  }
  e.swing = 0.2;
  if (d < e.r + 30) {
    hurtHero(e.dmg, e.x, e.y);
    if (e.elite === 'Vampiric') {
      e.hp = Math.min(e.max, e.hp + e.dmg * 0.8);
      burst(e.x, e.y - 20, '#ff4a6a', 6, 60, 3);
    }
  }
}
