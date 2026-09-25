import {SFX} from '../audio/sfx';
import {H,W} from '../core/dom';
import {clamp,lerp,rand} from '../core/math';
import {settings} from '../core/settings';
import {rank} from '../data/skills';
import {damageEnemy,heroAttack} from './combat';
import {updateDrops} from './drops';
import {DENS,inVillage,moveEnt,spawnEnemies,unstick,updateEnemies} from './enemies';
import {banner,burst,ring} from './fx';
import {findInteract,visitPois} from './interactions';
import {updateNpcs} from './npcs';
import {updateProjs,updateTeles,updateZones} from './projectiles';
import {save} from './save';
import {game,hero} from './state';
import {updateDay,updateWeather} from './worldTick';
import {joy,keys,mouseAim,mouseAtk} from '../input/input';
import {updateWeatherFx,zoom} from '../render/render';
import {regionName,solidAt} from '../world/chunks';
import {poisNear} from '../world/poi';
import {BIOMES,dangerAt,terr} from '../world/terrain';
/* ================= UPDATE ================= */
function updateHero(dt){let mx=0,my=0;if(keys.KeyW||keys.ArrowUp)my--;if(keys.KeyS||keys.ArrowDown)my++;if(keys.KeyA||keys.ArrowLeft)mx--;if(keys.KeyD||keys.ArrowRight)mx++;
 if(joy.id!==null){mx=joy.x;my=joy.y}const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}hero.vx=mx;hero.vy=my;hero.moving=l>.15;
 if(hero.moving&&hero.atk<=0){hero.dx=mx;hero.dy=my;hero.aim=Math.atan2(my,mx)}if(hero.moving)hero.walk+=dt*10*(game.ST.spd/150)*Math.min(1,l+.3);
 if(mouseAim&&mouseAtk&&game.atkHeld){const z=zoom(),wx=(mouseAim.x-W/2)/z+game.camX+game.camKX,wy=(mouseAim.y-H/2)/z+game.camY+game.camKY;hero.aim=Math.atan2(wy-(game.P.y-18),wx-game.P.x);hero.dx=Math.cos(hero.aim);hero.dy=Math.sin(hero.aim)}
 hero.cd-=dt;hero.rollCd-=dt;hero.inv-=dt;hero.slow-=dt;hero.scd[0]-=dt;hero.scd[1]-=dt;if(hero.atk>0)hero.atk-=dt/(game.P.cls==='warrior'?.2:.18);
 if(hero.leap){const L=hero.leap;L.t+=dt;const k=clamp(L.t/L.dur,0,1);game.P.x=lerp(L.sx,L.tx,k);game.P.y=lerp(L.sy,L.ty,k);hero.walk+=dt*12;
  if(k>=1){hero.leap=null;SFX.slam();game.shake=11;game.hitstop=.08;const R=105*game.ST.arc;ring(game.P.x,game.P.y,'#e8dcc0',30,R*2.4,4);burst(game.P.x,game.P.y,'#a89a88',20,200,5,60);for(const e of game.enemies)if(e.dying<=0&&Math.hypot(e.x-game.P.x,(e.y-game.P.y)*1.2)<R+e.r)damageEnemy(e,L.mul,(e.x-game.P.x)*4,(e.y-game.P.y)*4,{stun:1.1,quiet:true});hero.inv=.3}return}
 let vx,vy;const spd=game.ST.spd*(hero.slow>0?.55:1);
 if(hero.roll>0){hero.roll-=dt;vx=hero.rdx*spd*2.7;vy=hero.rdy*spd*2.7;hero.walk+=dt*20;if(Math.random()<.5)game.parts.push({x:game.P.x,y:game.P.y,vx:rand(-30,30),vy:rand(-40,-10),life:.4,max:.4,col:'#e8dcc0',sz:3,g:0})}
 else{vx=mx*spd;vy=my*spd;if(hero.whirl>0){hero.whirl-=dt;vx*=.75;vy*=.75;hero.whirlTick-=dt;if(hero.whirlTick<=0){hero.whirlTick=.14;const R=74*game.ST.arc;let n=0;for(const e of game.enemies)if(e.dying<=0&&Math.hypot(e.x-game.P.x,(e.y-game.P.y+10))<R+e.r)damageEnemy(e,.55+.15*rank('s1'),(e.x-game.P.x)*2.5,(e.y-game.P.y)*2.5,{quiet:n++>0});if(n)SFX.hit()}}
  else if(game.atkHeld)heroAttack();if(hero.atk>0&&game.P.cls!=='warrior'){vx*=.55;vy*=.55}}
 vx+=hero.kbx;vy+=hero.kby;hero.kbx*=Math.pow(.001,dt);hero.kby*=Math.pow(.001,dt);if(solidAt(game.P.x,game.P.y,8))unstick(game.P);moveEnt(game.P,vx*dt,vy*dt,8);
 if(hero.moving&&hero.roll<=0){hero.stepT-=dt;if(hero.stepT<=0){hero.stepT=.32;SFX.step();game.parts.push({x:game.P.x+rand(-4,4),y:game.P.y,vx:rand(-15,15),vy:rand(-25,-5),life:.35,max:.35,col:terr(game.P.x,game.P.y).b===4&&game.mode==='world'?'rgba(255,255,255,.8)':'rgba(235,225,200,.7)',sz:2.5,g:0})}}
 hero.regen+=dt;if(hero.regen>1){hero.regen=0;const safe=game.mode==='world'&&inVillage(game.P.x,game.P.y);if(game.P.hp<game.ST.hp)game.P.hp=Math.min(game.ST.hp,game.P.hp+(safe?game.ST.hp*.1:game.ST.hp*(.006+(game.ST.regenPct||0)/100)+game.ST.regen+.5))}}
export function update(dt){game.time+=dt;
 if(game.fadeDir){game.fade+=game.fadeDir*dt*3;if(game.fade>=1&&game.fadeDir>0){game.fade=1;game.fadeDir=-1;const cb=game.fadeCb;game.fadeCb=null;cb&&cb();SFX.warp()}if(game.fade<=0&&game.fadeDir<0){game.fade=0;game.fadeDir=0}}
 if(game.state==='play'){let wdt=dt;if(game.hitstop>0){game.hitstop-=dt;wdt=dt*.06}
  updateDay(dt);updateWeather(dt);if(game.fadeDir<=0||game.fade<.9){updateHero(wdt)}
  game.poiT-=dt;if(game.poiT<=0){game.poiT=.4;if(game.mode==='world'){game.activePois=poisNear(game.P.x,game.P.y,900)}else game.activePois=[];visitPois()}
  game.spawnT-=dt;if(game.spawnT<=0){game.spawnT=(DENS[settings.density]||DENS.normal).int*rand(.8,1.2);spawnEnemies()}
  updateEnemies(wdt);updateProjs(wdt);updateZones(wdt);updateTeles(wdt);updateDrops(dt);updateNpcs(dt);
  game.interact=findInteract();
  const zn=regionName(game.P.x,game.P.y);if(zn!==game.zoneName&&game.mode==='world'){game.zoneName=zn;const T=terr(game.P.x,game.P.y);banner(zn,BIOMES[T.b]+', danger level '+dangerAt(game.P.x,game.P.y))}
  game.saveT+=dt;if(game.saveT>8){game.saveT=0;save()}
  const lead=hero.moving?40:0;game.camKX=lerp(game.camKX,Math.cos(hero.aim)*lead*.6,1-Math.pow(.1,dt));game.camKY=lerp(game.camKY,Math.sin(hero.aim)*lead*.45,1-Math.pow(.1,dt));
  game.camX=lerp(game.camX,game.P.x,1-Math.pow(.0008,dt));game.camY=lerp(game.camY,game.P.y-16,1-Math.pow(.0008,dt));game.kickX*=Math.pow(.001,dt);game.kickY*=Math.pow(.001,dt)}
 else if(game.state==='menu'||game.state==='create'||game.state==='help'){game.camX=Math.cos(game.time*.03)*900+game.time*16;game.camY=Math.sin(game.time*.041)*700;game.dark=0;game.dusk=0;
  if(game.time%2<dt){game.activePois=poisNear(game.camX,game.camY,900)}}
 for(const p of game.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.vx*=.96;p.vy*=.96}game.parts=game.parts.filter(p=>p.life>0);if(game.parts.length>600)game.parts.splice(0,game.parts.length-600);
 for(const gh of game.ghosts)gh.life-=dt;game.ghosts=game.ghosts.filter(g2=>g2.life>0);
 for(const t of game.texts){t.life-=dt;t.y-=(t.big?30:45)*dt;t.x+=t.vx*dt}game.texts=game.texts.filter(t=>t.life>0);
 game.shake=Math.max(0,game.shake-dt*22);updateWeatherFx(dt)}
