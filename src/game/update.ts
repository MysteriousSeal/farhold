import { cancelWarp, updateWarp } from './warp';
import { heroStyle } from './style';
import { inPlaceNow } from '../world/poi';
import { WADE, isPool } from '../world/terrain';
import { SFX } from '../audio/sfx';
import { H, W } from '../core/dom';
import { angDiff, clamp, lerp, rand } from '../core/math';
import { settings } from '../core/settings';
import { rank } from '../data/skills';
import { damageEnemy, heroAttack } from './combat';
import { updateDrops } from './drops';
import { DENS, inVillage, moveEnt, spawnEnemies, unstick, updateEnemies } from './enemies';
import { banner, burst, ring, toast } from './fx';
import { calcStats } from './stats';
import { taskFindTick } from './tavernQuests';
import { raidAt, updateEvents } from './events';
import { DRINKS } from '../data/tavern';
import { findInteract, visitPois } from './interactions';
import { houseCam, updateHouse } from './houses';
import { updateNpcs } from './npcs';
import { updateProjs, updateTeles, updateZones } from './projectiles';
import { save } from './save';
import { game, hero } from './state';
import { updateDay, updateWeather } from './worldTick';
import { mouseAim, mouseAtk, moveInput } from '../input/input';
import { updateWeatherFx, zoom } from '../render/render';
import { regionName, solidAt } from '../world/chunks';
import { poisNear } from '../world/poi';
import { BIOMES, dangerAt, terr } from '../world/terrain';
/* ================= UPDATE ================= */
/** Seconds a new facing must be held before the hero turns (diagonal release grace). */
const FACE_HOLD = 0.1;
function updateHero(dt) {
  let [mx, my] = moveInput();
  const l = Math.hypot(mx, my);
  if (l > 1) {
    mx /= l;
    my /= l;
  }
  hero.vx = mx;
  hero.vy = my;
  hero.moving = l > 0.15;
  if (hero.moving && hero.warp) cancelWarp();
  updateWarp(dt);
  if (hero.moving && hero.atk <= 0) {
    // a new facing must hold for a moment before it sticks, so releasing a diagonal (two keys
    // never lift in the same frame) keeps the diagonal instead of snapping to one axis
    const want = Math.atan2(my, mx);
    if (Math.abs(angDiff(want, Math.atan2(hero.dy, hero.dx))) < 0.2) hero.faceT = 0;
    else if ((hero.faceT = (hero.faceT || 0) + dt) > FACE_HOLD) {
      hero.faceT = 0;
      hero.face = want;
    }
    if (hero.faceT === 0) {
      const f = hero.face ?? want;
      hero.dx = Math.cos(f);
      hero.dy = Math.sin(f);
      hero.aim = f;
      hero.face = undefined;
    }
  }
  if (hero.moving) hero.walk += dt * 10 * (game.ST.spd / 150) * Math.min(1, l + 0.3);
  if (mouseAim && mouseAtk && game.atkHeld) {
    const z = zoom(),
      wx = (mouseAim.x - W / 2) / z + game.camX + game.camKX,
      wy = (mouseAim.y - H / 2) / z + game.camY + game.camKY;
    hero.aim = Math.atan2(wy - (game.P.y - 18), wx - game.P.x);
    hero.dx = Math.cos(hero.aim);
    hero.dy = Math.sin(hero.aim);
  }
  hero.cd -= dt;
  hero.rollCd -= dt;
  hero.inv -= dt;
  hero.slow -= dt;
  hero.scd[0] -= dt;
  hero.potCd -= dt;
  hero.scd[1] -= dt;
  if (hero.atk > 0) hero.atk -= dt / (heroStyle() === 'warrior' ? 0.2 : 0.18);
  if (hero.leap) {
    const L = hero.leap;
    L.t += dt;
    const k = clamp(L.t / L.dur, 0, 1);
    game.P.x = lerp(L.sx, L.tx, k);
    game.P.y = lerp(L.sy, L.ty, k);
    hero.walk += dt * 12;
    if (k >= 1) {
      hero.leap = null;
      SFX.slam();
      game.shake = 11;
      game.hitstop = 0.08;
      const R = 105 * game.ST.arc;
      ring(game.P.x, game.P.y, '#e8dcc0', 30, R * 2.4, 4);
      burst(game.P.x, game.P.y, '#a89a88', 20, 200, 5, 60);
      for (const e of game.enemies)
        if (e.dying <= 0 && Math.hypot(e.x - game.P.x, (e.y - game.P.y) * 1.2) < R + e.r)
          damageEnemy(e, L.mul, (e.x - game.P.x) * 4, (e.y - game.P.y) * 4, {
            stun: 1.1,
            quiet: true,
          });
      hero.inv = 0.3;
    }
    return;
  }
  let vx, vy;
  const wading =
      game.mode === 'world' && isPool(terr(game.P.x, game.P.y)) && !inPlaceNow(game.P.x, game.P.y),
    spd = game.ST.spd * (hero.slow > 0 ? 0.55 : 1) * (wading && hero.roll <= 0 ? WADE : 1);
  if (wading && hero.moving && Math.random() < 0.12)
    burst(game.P.x + rand(-6, 6), game.P.y + 2, 'rgba(215,235,200,.8)', 3, 50, 2.4, 30);
  if (hero.roll > 0) {
    hero.roll -= dt;
    vx = hero.rdx * spd * 2.7;
    vy = hero.rdy * spd * 2.7;
    hero.walk += dt * 20;
    if (Math.random() < 0.5)
      game.parts.push({
        x: game.P.x,
        y: game.P.y,
        vx: rand(-30, 30),
        vy: rand(-40, -10),
        life: 0.4,
        max: 0.4,
        col: '#e8dcc0',
        sz: 3,
        g: 0,
      });
  } else {
    vx = mx * spd;
    vy = my * spd;
    if (hero.whirl > 0) {
      hero.whirl -= dt;
      vx *= 0.75;
      vy *= 0.75;
      hero.whirlTick -= dt;
      if (hero.whirlTick <= 0) {
        hero.whirlTick = 0.14;
        const R = 74 * game.ST.arc;
        let n = 0;
        for (const e of game.enemies)
          if (e.dying <= 0 && Math.hypot(e.x - game.P.x, e.y - game.P.y + 10) < R + e.r)
            damageEnemy(
              e,
              0.55 + 0.15 * rank('s1'),
              (e.x - game.P.x) * 2.5,
              (e.y - game.P.y) * 2.5,
              { quiet: n++ > 0 },
            );
        if (n) SFX.hit();
      }
    } else if (game.atkHeld) heroAttack();
    if (hero.atk > 0 && heroStyle() !== 'warrior') {
      vx *= 0.55;
      vy *= 0.55;
    }
  }
  vx += hero.kbx;
  vy += hero.kby;
  hero.kbx *= Math.pow(0.001, dt);
  hero.kby *= Math.pow(0.001, dt);
  if (solidAt(game.P.x, game.P.y, 8)) unstick(game.P);
  moveEnt(game.P, vx * dt, vy * dt, 8);
  if (hero.moving && hero.roll <= 0) {
    hero.stepT -= dt;
    if (hero.stepT <= 0) {
      hero.stepT = 0.32;
      SFX.step();
      game.parts.push({
        x: game.P.x + rand(-4, 4),
        y: game.P.y,
        vx: rand(-15, 15),
        vy: rand(-25, -5),
        life: 0.35,
        max: 0.35,
        col:
          terr(game.P.x, game.P.y).b === 4 && game.mode === 'world'
            ? 'rgba(255,255,255,.8)'
            : 'rgba(235,225,200,.7)',
        sz: 2.5,
        g: 0,
      });
    }
  }
  // the tavern drink wears off after its time (counted in play time)
  const bf = game.P.buff;
  if (bf) {
    bf.t -= dt;
    if (bf.t <= 0) {
      game.P.buff = null;
      calcStats();
      toast(
        'Your ' +
          (DRINKS.find((d) => d.k === bf.k) || { n: 'drink' }).n.toLowerCase() +
          ' wears off',
      );
    }
  }
  hero.regen += dt;
  if (hero.regen > 1) {
    hero.regen = 0;
    const safe =
      game.mode === 'house' ||
      (game.mode === 'world' && inVillage(game.P.x, game.P.y) && !raidAt(game.P.x, game.P.y));
    if (game.P.hp < game.ST.hp)
      game.P.hp = Math.min(
        game.ST.hp,
        game.P.hp +
          (safe
            ? game.ST.hp * 0.1
            : game.ST.hp * (0.006 + (game.ST.regenPct || 0) / 100) + game.ST.regen + 0.5),
      );
  }
}
export function update(dt) {
  game.time += dt;
  if (game.fadeDir) {
    game.fade += game.fadeDir * dt * 3;
    if (game.fade >= 1 && game.fadeDir > 0) {
      game.fade = 1;
      game.fadeDir = -1;
      const cb = game.fadeCb;
      game.fadeCb = null;
      cb && cb();
      SFX.warp();
    }
    if (game.fade <= 0 && game.fadeDir < 0) {
      game.fade = 0;
      game.fadeDir = 0;
    }
  }
  if (game.state === 'play') {
    let wdt = dt;
    if (game.hitstop > 0) {
      game.hitstop -= dt;
      wdt = dt * 0.06;
    }
    updateDay(dt);
    updateWeather(dt);
    if (game.fadeDir <= 0 || game.fade < 0.9) {
      updateHero(wdt);
    }
    game.poiT -= dt;
    if (game.poiT <= 0) {
      game.poiT = 0.4;
      if (game.mode === 'world') {
        game.activePois = poisNear(game.P.x, game.P.y, 900);
      } else game.activePois = [];
      visitPois();
      taskFindTick();
    }
    game.spawnT -= dt;
    if (game.spawnT <= 0) {
      game.spawnT = (DENS[settings.density] || DENS.normal).int * rand(0.8, 1.2);
      spawnEnemies();
    }
    updateEnemies(wdt);
    updateEvents(wdt);
    updateProjs(wdt);
    updateZones(wdt);
    updateTeles(wdt);
    updateDrops(dt);
    updateNpcs(dt);
    updateHouse(dt);
    game.interact = findInteract();
    const zn = regionName(game.P.x, game.P.y);
    if (zn !== game.zoneName && game.mode === 'world') {
      game.zoneName = zn;
      game.P.region = zn; // shown on the save card
      const T = terr(game.P.x, game.P.y);
      banner(zn, BIOMES[T.b] + ', danger level ' + dangerAt(game.P.x, game.P.y));
    }
    game.P.play = (game.P.play || 0) + dt; // play time (seconds), for the save card
    game.saveT += dt;
    if (game.saveT > 8) {
      game.saveT = 0;
      save();
    }
    const lead = hero.moving && game.mode !== 'house' ? 40 : 0;
    game.camKX = lerp(game.camKX, Math.cos(hero.aim) * lead * 0.6, 1 - Math.pow(0.1, dt));
    game.camKY = lerp(game.camKY, Math.sin(hero.aim) * lead * 0.45, 1 - Math.pow(0.1, dt));
    const [ctx, cty] =
      game.mode === 'house' ? houseCam(game.P.x, game.P.y - 16) : [game.P.x, game.P.y - 16];
    game.camX = lerp(game.camX, ctx, 1 - Math.pow(0.0008, dt));
    game.camY = lerp(game.camY, cty, 1 - Math.pow(0.0008, dt));
    game.kickX *= Math.pow(0.001, dt);
    game.kickY *= Math.pow(0.001, dt);
  } else if (game.state === 'menu' || game.state === 'create' || game.state === 'help') {
    game.camX = Math.cos(game.time * 0.03) * 900 + game.time * 16;
    game.camY = Math.sin(game.time * 0.041) * 700;
    game.dark = 0;
    game.dusk = 0;
    if (game.time % 2 < dt) {
      game.activePois = poisNear(game.camX, game.camY, 900);
    }
  }
  for (const p of game.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.g * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }
  game.parts = game.parts.filter((p) => p.life > 0);
  if (game.parts.length > 600) game.parts.splice(0, game.parts.length - 600);
  for (const gh of game.ghosts) gh.life -= dt;
  game.ghosts = game.ghosts.filter((g2) => g2.life > 0);
  for (const t of game.texts) {
    t.life -= dt;
    t.y -= (t.big ? 30 : 45) * dt;
    t.x += t.vx * dt;
  }
  game.texts = game.texts.filter((t) => t.life > 0);
  game.shake = Math.max(0, game.shake - dt * 22);
  updateWeatherFx(dt);
}
