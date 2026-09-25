import {SFX} from '../audio/sfx';
import {pick,rand} from '../core/math';
import {ET} from '../data/enemies';
import {damageEnemy,hurtHero} from './combat';
import {addLight,burst,ring} from './fx';
import {game} from './state';
import {terr} from '../world/terrain';
/* ================= PROJECTILES / ZONES / TELEGRAPHS ================= */
function projBlocked(p){if(game.mode==='dungeon')return!game.DG.isF(Math.floor(p.x/game.DG.T),Math.floor((p.y+14)/game.DG.T));const T=terr(p.x,p.y+14);return T.t===5}
export function updateProjs(dt){for(const p of game.projs){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.k==='bolt'||p.k==='orb'||p.k==='meteor')if(Math.random()<.7)game.parts.push({x:p.x,y:p.y,vx:rand(-20,20),vy:rand(-20,20),life:.3,max:.3,col:p.col||(p.k==='bolt'?'#9fd8ff':'#8ef7ff'),sz:p.big?5:3,g:0,glow:1});
  if(p.k==='bolt'||p.k==='orb')addLight(p.x,p.y,70,.7,p.col||'#9fd8ff');
  if(p.nohit)continue;
  if(projBlocked(p)){p.life=0;burst(p.x,p.y,'#ccc',4,80,2);if(p.k==='bolt')boltBurst(p);continue}
  if(p.own){for(const e of game.enemies){if(e.dying>0||p.hit.includes(e))continue;const fly=ET[e.type].fly?26:0;if(Math.hypot(e.x-p.x,e.y-(12+fly)*e.sc-p.y)<e.r+8){p.hit.push(e);
    if(p.k==='bolt'){boltBurst(p);p.life=0}else{damageEnemy(e,p.mul,p.vx*.35,p.vy*.35);if(p.pierce>0)p.pierce--;else p.life=0}break}}}
  else if(Math.hypot(game.P.x-p.x,game.P.y-16-p.y)<(p.big?18:13)){hurtHero(p.dmg,p.x-p.vx,p.y-p.vy,{slow:p.slow});p.life=0;burst(p.x,p.y,p.col||'#fff',8,100,2.5)}}
 game.projs=game.projs.filter(p=>p.life>0)}
function boltBurst(p){const R=58*game.ST.rad;let hits=0;for(const o of game.enemies){if(o.dying>0)continue;if(Math.hypot(o.x-p.x,o.y-10-p.y)<R+o.r)damageEnemy(o,p.mul,p.vx*.3,p.vy*.3,{quiet:hits++>0})}burst(p.x,p.y,'#9fd8ff',20,200,3.5,0,1);ring(p.x,p.y,'#d8f0ff',20,R*3.4,2.5);SFX.hit()}
export function updateZones(dt){for(const z of game.zones){z.t-=dt;
  if(z.type==='rain'){z.tick-=dt;if(Math.random()<.9)game.parts.push({x:z.x+rand(-z.r,z.r),y:z.y+rand(-z.r*.7,z.r*.7)-120,vx:40,vy:520,life:.22,max:.22,col:'#fff6e0',sz:2,g:0,streak:1});if(z.tick<=0){z.tick=.2;let n=0;for(const e of game.enemies)if(e.dying<=0&&Math.hypot(e.x-z.x,(e.y-z.y)*1.2)<z.r+e.r)damageEnemy(e,z.mul,0,0,{quiet:n++>0});if(n)SFX.hit()}}
  if(z.type==='burn'){z.tick-=dt;if(Math.random()<.5)game.parts.push({x:z.x+rand(-z.r,z.r)*.8,y:z.y+rand(-z.r,z.r)*.55,vx:0,vy:rand(-50,-20),life:.6,max:.6,col:pick(['#ff9a2e','#ffe27a','#e0483e']),sz:3,g:-20,glow:1});addLight(z.x,z.y,z.r*1.6,.8,'#ff7a2e');if(z.tick<=0){z.tick=.5;for(const e of game.enemies)if(e.dying<=0&&Math.hypot(e.x-z.x,(e.y-z.y)*1.2)<z.r+e.r)damageEnemy(e,z.mul,0,0,{quiet:true,col:'#ffb070'})}}}
 game.zones=game.zones.filter(z=>z.t>0)}
export function updateTeles(dt){for(const t of game.teles){t.t+=dt;if(t.t>=t.max&&!t.done){t.done=1;t.cb()}}game.teles=game.teles.filter(t=>!t.done)}
