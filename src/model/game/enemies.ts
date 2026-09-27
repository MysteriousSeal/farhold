import { dungeonKill } from './dungeons';
import { inPlaceNow } from '../world/poi';
import { WADE, isPool } from '../world/terrain';
import type { Rec } from './types';
import { CHEST_GOLD_SHARE, spawnBossChest } from './bossChest';
import { SFX } from '../../core/ports';
import { TAU, clamp, lerp, pick, rand } from '../../core/math';
import { settings } from '../../core/settings';
import { BOSS } from '../data/bosses';
import { ET, GOLEMCOL, TABLE, typesFor } from '../data/enemies';
import { bossAI } from './bossAI';
import { gainXp, hurtHero } from './combat';
import { banner, burst, ftext, ring, toast } from './fx';
import { genItem } from './items';
import { questEvent, wantedTypes } from './quests';
import { save } from './save';
import { game } from './state';
import { solidAt } from '../world/chunks';
import { poisNear } from '../world/poi';
import { dangerAt, terr, walkT } from '../world/terrain';
/* ================= ENEMIES ================= */
export const ELITES = ['Swift', 'Vampiric', 'Frenzied', 'Armored', 'Giant'];
/**
 * A monster, beast or humanoid foe (bosses too, made by Enemy.boss). It thinks, moves and
 * fights in update(); the AI keeps its timers and state on the enemy itself.
 */
export class Enemy {
  declare type: string;
  declare lvl: number;
  declare x: number;
  declare y: number;
  declare hp: number;
  declare max: number;
  declare dmg: number;
  declare spd: number;
  declare r: number;
  declare dx: number;
  declare dy: number;
  declare aggro: boolean;
  declare dead?: boolean;
  declare boss?: any;
  declare elite?: string;
  [extra: string]: any;
  constructor(type: string, lvl: number, x: number, y: number, o: Rec = {}) {
    const D = ET[type];
    Object.assign(this, {
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
      hp: 0, // health and damage come from the level below
      max: 0,
      dmg: 0,
    });
    let hpM = 1,
      dmM = 1;
    if (o.elite) {
      this.elite = o.elite;
      hpM = 2.8;
      dmM = 1.4;
      this.sc *= 1.25;
      if (o.elite === 'Swift') this.spd *= 1.45;
      if (o.elite === 'Giant') {
        this.sc *= 1.2;
        hpM = 4;
      }
    }
    this.max = Math.round(D.hp * (22 + lvl * 15) * hpM);
    this.hp = this.max;
    this.hpShow = this.max;
    this.dmg = D.dmg * (5 + lvl * 2.4) * dmM;
    this.r = D.r * this.sc;
    const b = game.mode === 'dungeon' ? (game.DG ? game.DG.b : 0) : terr(x, y).b;
    if (type === 'slime')
      this.col =
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
      this.col = gc[0];
      this.glow = gc[1];
    }
    if (type === 'wolf' && lvl > 8) this.col = '#5e5a6a';
    if (o.elite && D.kind === 'hum') this.tint = o.elite === 'Vampiric' ? '#6a1a3a' : '#8a2a6a';
  }
  /** A boss of kind `bt` (a lair's, or a cave guardian when `src` is mini). */
  static boss(bt, lvl: number, x: number, y: number, src): Enemy {
    const B = BOSS[bt],
      e = new Enemy(B.base, lvl, x, y);
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
  /** One frame of this enemy: dying, despawning, stuns, its AI, moving and keeping apart. */
  update(dt: number, pVillage: boolean) {
    if (this.dead) return;
    // one pack member noticing the hero alerts the whole pack
    if (this.pack != null && this.aggro && !this.packAlert) {
      this.packAlert = true;
      for (const o of game.enemies) if (o.pack === this.pack && !o.aggro) o.aggro = true;
    }
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.dead = true;
      return;
    }
    const D = ET[this.type];
    this.flash -= dt;
    this.hitSq = Math.max(0, this.hitSq - dt);
    this.hpShow = lerp(this.hpShow, this.hp, 1 - Math.pow(0.02, dt));
    if (this.swing > 0) this.swing -= dt;
    const dx = game.P.x - this.x,
      dy = game.P.y - this.y,
      d = Math.hypot(dx, dy) || 1;
    // far-away world enemies despawn; cave enemies stay until killed (they count for clearing)
    if (d > 1150 && !this.boss && game.mode !== 'dungeon') {
      this.dead = true;
      return;
    }
    if (
      this.boss &&
      this.src &&
      !this.src.mini &&
      Math.hypot(game.P.x - this.home.x, game.P.y - this.home.y) > 900
    ) {
      this.dead = true;
      game.curBoss = null;
      return;
    }
    if (this.stun > 0 || this.frozen > 0) {
      this.stun -= dt;
      this.frozen -= dt;
      this.wind = 0;
      this.knockback(dt);
      return;
    }
    if (this.boss) {
      if (!this.dormant) bossAI(this, dt, dx, dy, d);
      return;
    }
    this.cd -= dt;
    let mx = 0,
      my = 0;
    const sp =
      this.spd *
      (this.slow > 0 ? 0.5 : 1) *
      (game.mode === 'world' &&
      !this.fly &&
      isPool(terr(this.x, this.y)) &&
      !inPlaceNow(this.x, this.y)
        ? WADE
        : 1);
    this.slow -= dt;
    const inDg = game.mode === 'dungeon',
      aggroR = inDg ? 300 : 260,
      // underground, rock walls hide the hero: no noticing and no chasing through them
      seen = !inDg || (d < 560 && this.sees(dt));
    if (inDg && this.aggro && !seen) {
      // lost sight: go and look where the hero was last seen, then give up
      this.aggro = false;
      this.hunt = { x: this.seenX ?? game.P.x, y: this.seenY ?? game.P.y, t: 5 };
    }
    if (
      seen &&
      (d < aggroR + (this.hunt ? 120 : 0) || (this.aggro && d < 520)) &&
      (!pVillage || this.raid) &&
      game.state === 'play'
    ) {
      this.aggro = true;
      this.hunt = null;
      this.seenX = game.P.x;
      this.seenY = game.P.y;
      const ai = D.ai;
      if (this.charge) {
        this.charge.t -= dt;
        const c = this.charge;
        if (c.t > 0) {
          moveEnt(this, c.vx * dt, c.vy * dt, this.r * 0.6);
          this.moving = true;
          this.walk += dt * 20;
          if (!c.hit && d < this.r + 16) {
            c.hit = 1;
            hurtHero(this.dmg * 1.3, this.x, this.y);
          }
          if (Math.random() < 0.5)
            game.parts.push({
              x: this.x,
              y: this.y,
              vx: rand(-30, 30),
              vy: rand(-30, -5),
              life: 0.4,
              max: 0.4,
              col: 'rgba(220,200,170,.7)',
              sz: 4,
              g: 0,
            });
        } else this.charge = null;
        return;
      }
      if (this.leapT != null) {
        this.leapT += dt;
        const L = this.lp,
          k = clamp(this.leapT / 0.45, 0, 1);
        this.x = lerp(L.sx, L.tx, k);
        this.y = lerp(L.sy, L.ty, k);
        this.air = Math.sin(k * Math.PI) * 50;
        if (k >= 1) {
          this.leapT = null;
          this.air = 0;
          burst(this.x, this.y, '#8a7a6a', 8, 90, 3);
          if (Math.hypot(game.P.x - this.x, game.P.y - this.y) < this.r + 22)
            hurtHero(this.dmg, this.x, this.y);
        }
        return;
      }
      if (this.wind > 0) {
        this.wind -= dt;
        this.dx = dx;
        this.dy = dy;
        if (this.wind <= 0) this.strike(d, dx, dy);
      } else if (ai === 'ranged' || ai === 'caster' || ai === 'summoner') {
        const R = D.range;
        if (d > R * 0.85) {
          mx = dx / d;
          my = dy / d;
        } else if (d < R * 0.45) {
          mx = -dx / d;
          my = -dy / d;
        } else {
          mx = (-dy / d) * 0.4 * Math.sin(game.time + this.ph);
          my = (dx / d) * 0.4 * Math.sin(game.time + this.ph);
        }
        if (this.cd <= 0 && d < R + 40) {
          this.wind = ai === 'ranged' ? 0.5 : 0.6;
          this.cd = rand(1.6, 2.4);
          if (
            ai === 'summoner' &&
            Math.random() < 0.4 &&
            game.enemies.filter((o) => o.minionOf === this).length < 3
          ) {
            this.summon = true;
            this.wind = 0.9;
          }
        }
      } else if (ai === 'charger' && this.cd <= 0 && d > 110 && d < 330) {
        const a = Math.atan2(dy, dx);
        this.cd = 3;
        game.teles.push({
          type: 'line',
          x: this.x,
          y: this.y,
          ang: a,
          len: 360,
          w: 34,
          t: 0,
          max: 0.7,
          cb: () => {
            if (this.dying > 0 || this.dead) return;
            this.charge = { t: 0.55, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, hit: 0 };
            SFX.roll();
          },
        });
        this.stunWait = 0.7;
      } else if (ai === 'lunger' && this.cd <= 0 && d < 210 && d > 50) {
        this.cd = 2.6;
        this.wind = 0.4;
        this.lunge = true;
      } else if (ai === 'swarm') {
        const a = Math.atan2(dy, dx) + Math.sin(game.time * 3 + this.ph) * 0.9;
        mx = Math.cos(a);
        my = Math.sin(a);
        if (this.flee > 0) {
          this.flee -= dt;
          mx = -mx;
          my = -my;
        }
        if (d < this.r + 14 && this.cd <= 0) {
          hurtHero(this.dmg, this.x, this.y);
          this.cd = 1;
          this.flee = 0.6;
        }
      } else if (ai === 'slam' && this.cd <= 0 && d < 100) {
        this.cd = 2.6;
        this.wind = 0.8;
        const R = 78 * this.sc;
        game.teles.push({
          type: 'circle',
          x: this.x,
          y: this.y,
          r: R,
          t: 0,
          max: 0.8,
          cb: () => {
            if (this.dying > 0 || this.dead || this.stun > 0 || this.frozen > 0) return;
            SFX.slam();
            game.shake = Math.max(game.shake, 6);
            ring(this.x, this.y, '#d8c8a8', 24, R * 2.2, 4);
            if (Math.hypot(game.P.x - this.x, (game.P.y - this.y) * 1.2) < R + 6)
              hurtHero(this.dmg * 1.4, this.x, this.y);
          },
        });
      } else {
        if (d > this.r + 14) {
          mx = dx / d;
          my = dy / d;
        }
        if (d < this.r + 24 && this.cd <= 0) {
          this.wind = D.kind === 'quad' ? 0.28 : 0.38;
          this.cd = 1.15;
          if (this.elite === 'Frenzied') this.cd *= 0.55;
        }
      }
      if (this.stunWait > 0) {
        this.stunWait -= dt;
        mx = my = 0;
      }
    } else if (this.hunt) {
      this.aggro = false;
      const h = this.hunt,
        hx = h.x - this.x,
        hy = h.y - this.y,
        hd = Math.hypot(hx, hy);
      h.t -= dt;
      // walk to the spot, then stand and look around for a moment
      if (hd > 18 && h.t > 1.2) {
        mx = (hx / hd) * 0.8;
        my = (hy / hd) * 0.8;
      } else h.t = Math.min(h.t, 1.2);
      if (h.t <= 0) this.hunt = null;
    } else {
      this.aggro = false;
      this.wt -= dt;
      if (this.wt <= 0) {
        this.wt = rand(1, 3);
        const a = Math.random() * TAU;
        this.wx = Math.random() < 0.4 ? 0 : Math.cos(a);
        this.wy = Math.random() < 0.4 ? 0 : Math.sin(a);
      }
      mx = this.wx * 0.45;
      my = this.wy * 0.45;
    }
    const speed = this.wind > 0 ? 0 : sp;
    // walk around whatever stands in the way instead of pushing into it
    if (speed > 0 && (mx || my)) [mx, my] = this.steer(mx, my, dt);
    const vx = mx * speed,
      vy = my * speed,
      ox = this.x,
      oy = this.y;
    const nx = this.x + (vx + this.kbx) * dt,
      ny = this.y + (vy + this.kby) * dt;
    if (game.mode === 'world' && !this.raid && inVillage(nx, ny)) {
      this.wx = -this.wx;
      this.wy = -this.wy;
      this.kbx = this.kby = 0;
    } else moveEnt(this, (vx + this.kbx) * dt, (vy + this.kby) * dt, this.r * 0.6);
    this.kbx *= Math.pow(0.002, dt);
    this.kby *= Math.pow(0.002, dt);
    // only walk when actually getting somewhere; stuck for a moment: go round the other way
    const want = Math.hypot(vx, vy) * dt,
      got = Math.hypot(this.x - ox, this.y - oy);
    this.moving = Math.abs(mx) + Math.abs(my) > 0.1 && got > want * 0.25;
    if (want > 0.2 && got < want * 0.3) {
      this.stuckT = (this.stuckT || 0) + dt;
      if (this.stuckT > 0.5) {
        this.stuckT = 0;
        this.side = -(this.side || 1);
        this.detA = this.side * Math.PI * 0.5;
        this.detT = 1.3;
        if (!this.aggro) this.wt = 0; // a wanderer just picks a new way
      }
    } else this.stuckT = 0;
    if (this.moving) {
      this.walk += dt * (D.kind === 'quad' ? 14 : 9) * (sp / 80);
      this.dx = mx;
      this.dy = my;
    } else if (this.aggro) {
      this.dx = dx;
      this.dy = dy;
    }
    if (D.kind === 'slime') this.walk += dt * 4;
    for (const o of game.enemies) {
      if (o === this || o.dying > 0) continue;
      const ax = this.x - o.x,
        ay = this.y - o.y,
        dd = ax * ax + ay * ay,
        r2 = (this.r + o.r) * 0.85;
      if (dd < r2 * r2 && dd > 0) {
        const q = Math.sqrt(dd);
        this.x += (ax / q) * 50 * dt;
        this.y += (ay / q) * 50 * dt;
      }
    }
  }
  /**
   * Steer an enemy walking along (mx, my) around obstacles: look a little way ahead and, when
   * it is blocked, turn toward the nearest free heading (45° steps), keeping to the same side
   * for a moment so it goes round the obstacle instead of jittering against it.
   */
  steer(mx: number, my: number, dt: number): [number, number] {
    const m = Math.hypot(mx, my),
      a0 = Math.atan2(my, mx),
      r = this.r * 0.6,
      probe = r + 20,
      free = (a: number) =>
        !solidAt(this.x + Math.cos(a) * probe, this.y + Math.sin(a) * probe, r) &&
        !solidAt(this.x + Math.cos(a) * probe * 0.5, this.y + Math.sin(a) * probe * 0.5, r);
    if (this.detT > 0) {
      this.detT -= dt;
      const a = a0 + this.detA;
      if (free(a)) return [Math.cos(a) * m, Math.sin(a) * m];
    }
    if (free(a0)) return [mx, my];
    const side = this.side || (this.side = Math.random() < 0.5 ? 1 : -1);
    for (let k = 1; k <= 4; k++)
      for (const sd of [side, -side]) {
        const off = sd * k * (Math.PI / 4),
          a = a0 + off;
        if (!free(a)) continue;
        this.side = sd;
        this.detA = off;
        this.detT = 0.7;
        return [Math.cos(a) * m, Math.sin(a) * m];
      }
    return [mx, my];
  }
  /** Clear line from the enemy to the hero through dungeon floor, rechecked a few times a second. */
  sees(dt: number) {
    this.losT = (this.losT || 0) - dt;
    if (this.losT > 0) return this.los;
    this.losT = 0.15 + Math.random() * 0.1;
    this.los = clearLine(game.DG, this.x, this.y - 8, game.P.x, game.P.y - 8);
    return this.los;
  }
  knockback(dt: number) {
    moveEnt(this, this.kbx * dt, this.kby * dt, this.r * 0.6);
    this.kbx *= Math.pow(0.002, dt);
    this.kby *= Math.pow(0.002, dt);
  }
  strike(d: number, dx: number, dy: number) {
    const D = ET[this.type],
      a = Math.atan2(dy - 10, dx);
    if (this.summon) {
      this.summon = false;
      for (let k = 0; k < 2; k++) {
        const s = new Enemy(
          'skeleton',
          Math.max(1, this.lvl - 1),
          this.x + rand(-50, 50),
          this.y + rand(-30, 30),
        );
        s.minionOf = this;
        s.aggro = true;
        if (!solidAt(s.x, s.y, 8)) {
          game.enemies.push(s);
          burst(s.x, s.y, '#8ef7a0', 14, 80, 3, 40, 1);
        }
      }
      return;
    }
    if (this.lunge) {
      this.lunge = false;
      const tx = game.P.x,
        ty = game.P.y;
      this.lp = { sx: this.x, sy: this.y, tx: lerp(this.x, tx, 0.92), ty: lerp(this.y, ty, 0.92) };
      if (solidAt(this.lp.tx, this.lp.ty, 6)) {
        this.lp.tx = this.x;
        this.lp.ty = this.y;
      }
      this.leapT = 0;
      return;
    }
    if (D.ai === 'ranged') {
      SFX.shoot();
      eProj(this, a, 380, 'barrow');
      return;
    }
    if (D.ai === 'caster' || D.ai === 'summoner') {
      SFX.zap();
      const pk = D.proj || 'fire';
      eProj(this, a, 240, 'orb', {
        col: PROJCOL[pk],
        slow: pk === 'ice' ? 1.5 : 0,
        big: this.elite ? 1 : 0,
      });
      return;
    }
    this.swing = 0.2;
    if (d < this.r + 30) {
      hurtHero(this.dmg, this.x, this.y);
      if (this.elite === 'Vampiric') {
        this.hp = Math.min(this.max, this.hp + this.dmg * 0.8);
        burst(this.x, this.y - 20, '#ff4a6a', 6, 60, 3);
      }
    }
  }
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
    // about half the spawns are a monster an open quest wants, where it lives: this biome, and
    // up to one danger level early (bounty boards pick their targets one level up, too)
    const wanted = wantedTypes(),
      want = list
        .concat(typesFor(TABLE[T.b], lv + 1))
        .filter((t, i, a) => wanted.has(t) && a.indexOf(t) === i),
      type = want.length && Math.random() < 0.5 ? pick(want) : pick(list),
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
      game.enemies.push(new Enemy(type, lv, ex, ey, { elite: k === 0 ? elite : null }));
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
  const xp = Math.round(D.xp * (8 + e.lvl * 6) * (e.elite ? 3 : 1) * (e.boss ? 12 : 1));
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
    dropAt(e.x, e.y, {
      kind: 'gold',
      amt: Math.max(1, Math.round((gold * (game.ST.goldMul || 1)) / coins)),
    });
  // Bloodthirst: each kill heals a little
  if (game.ST.killHeal && game.P.hp > 0)
    game.P.hp = Math.min(game.ST.hp, game.P.hp + (game.ST.hp * game.ST.killHeal) / 100);
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
      // each lair boss's first defeat is worth a skill point
      game.P.bossDone = game.P.bossDone || [];
      if (!game.P.bossDone.includes(e.src.key)) {
        game.P.bossDone.push(e.src.key);
        setTimeout(() => toast('+1 skill point for defeating ' + e.name), 1600);
      }
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
      const s = new Enemy(e.type, e.lvl, e.x + rand(-12, 12), e.y + rand(-8, 8), { sc: 0.62 });
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
  for (const e of game.enemies) e.update(dt, pVillage);
  game.enemies = game.enemies.filter((e) => !e.dead);
}
/** Is the straight line from (ax, ay) to (bx, by) over dungeon floor all the way? */
export function clearLine(DG, ax: number, ay: number, bx: number, by: number) {
  const T = DG.T,
    n = Math.ceil(Math.hypot(bx - ax, by - ay) / 10);
  for (let k = 1; k < n; k++) {
    const x = ax + ((bx - ax) * k) / n,
      y = ay + ((by - ay) * k) / n;
    if (!DG.isF(Math.floor(x / T), Math.floor(y / T))) return false;
  }
  return true;
}
