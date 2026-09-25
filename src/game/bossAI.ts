import {SFX} from '../audio/sfx';
import {TAU,clamp,lerp,pick,rand} from '../core/math';
import {hurtHero} from './combat';
import {PROJCOL,eProj,makeEnemy,moveEnt} from './enemies';
import {banner,burst,ring} from './fx';
import {game} from './state';
import {solidAt} from '../world/chunks';
/* ---- boss AI ---- */
export function bossAI(e,dt,dx,dy,d){const B=e.boss;e.cd-=dt;e.abcd-=dt;
 if(!e.enraged&&e.hp<e.max*.4){e.enraged=true;e.spd*=1.25;banner(e.name+' is enraged','');SFX.roar();game.shake=10}
 if(e.act){const A=e.act;A.t+=dt;
  if(A.k==='jump'){const k=clamp(A.t/A.dur,0,1);e.x=lerp(A.sx,A.tx,k);e.y=lerp(A.sy,A.ty,k);e.air=Math.sin(k*Math.PI)*110;if(k>=1){e.air=0;e.act=null;SFX.slam();game.shake=12;ring(e.x,e.y,'#e8dcc0',30,260,4);if(Math.hypot(game.P.x-e.x,(game.P.y-e.y)*1.2)<A.r)hurtHero(e.dmg*1.5,e.x,e.y);if(B.minion==='slime'&&Math.random()<.5)for(let k2=0;k2<2;k2++)game.enemies.push(Object.assign(makeEnemy('slime',e.lvl,e.x+rand(-40,40),e.y+rand(-30,30)),{aggro:true,col:e.col}))}return}
  if(A.k==='charge'){if(A.t<A.wait){e.dx=Math.cos(A.a);e.dy=Math.sin(A.a);return}if(A.t<A.wait+.65){moveEnt(e,Math.cos(A.a)*560*dt,Math.sin(A.a)*560*dt,e.r*.5);e.moving=true;e.walk+=dt*20;if(!A.hit&&Math.hypot(game.P.x-e.x,game.P.y-e.y)<e.r+18){A.hit=1;hurtHero(e.dmg*1.6,e.x,e.y)}if(Math.random()<.6)game.parts.push({x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-40,-10),life:.5,max:.5,col:'rgba(220,200,170,.7)',sz:6,g:0});return}e.act=null;return}
  if(A.t>=A.dur)e.act=null;return}
 if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.swing=.25;if(d<e.r+40)hurtHero(e.dmg,e.x,e.y)}return}
 if(e.abcd<=0){e.abcd=(e.enraged?2.2:3.2)+rand(0,1);const opts=B.abil.filter(a=>a!==e.last);const a=pick(opts);e.last=a;bossAbility(e,a,dx,dy,d);return}
 let mx=0,my=0;if(d>e.r+20){mx=dx/d;my=dy/d}if(d<e.r+34&&e.cd<=0){e.wind=.45;e.cd=1.3}
 moveEnt(e,(mx*e.spd+e.kbx)*dt,(my*e.spd+e.kby)*dt,e.r*.5);e.kbx*=Math.pow(.002,dt);e.kby*=Math.pow(.002,dt);e.moving=!!(mx||my);if(e.moving){e.walk+=dt*8;e.dx=mx;e.dy=my}else{e.dx=dx;e.dy=dy}}
function bossAbility(e,a,dx,dy,d){const B=e.boss,pk=B.base==='necro'?'necro':B.base==='yeti'?'ice':B.base==='golem'?'rock':'fire';
 if(a==='slam'){const R=62*e.sc;e.act={k:'slam',t:0,dur:1};game.teles.push({type:'circle',x:e.x,y:e.y,r:R,t:0,max:.85,cb:()=>{if(e.dying>0||e.dead)return;SFX.slam();game.shake=10;ring(e.x,e.y,'#e8dcc0',30,R*2.4,4);if(Math.hypot(game.P.x-e.x,(game.P.y-e.y)*1.2)<R+6)hurtHero(e.dmg*1.5,e.x,e.y)}})}
 else if(a==='jump'){const tx=game.P.x,ty=game.P.y;e.act={k:'jump',t:0,dur:.95,sx:e.x,sy:e.y,tx,ty,r:95};game.teles.push({type:'circle',x:tx,y:ty,r:95,t:0,max:.95,cb:()=>{}});SFX.roll()}
 else if(a==='charge'){const ang=Math.atan2(dy,dx);e.act={k:'charge',t:0,a:ang,wait:.75};game.teles.push({type:'line',x:e.x,y:e.y,ang,len:380,w:e.r*1.6,t:0,max:.75,cb:()=>{}});SFX.roar()}
 else if(a==='ring'){const n=e.enraged?20:14;e.act={k:'ring',t:0,dur:.6};const off=Math.random();for(let i=0;i<n;i++)eProj(e,(i+off)/n*TAU,210,pk==='rock'?'rock':'orb',{col:PROJCOL[pk],slow:pk==='ice'?1.5:0,m:.8});if(e.enraged)setTimeout(()=>{if(!e.dead)for(let i=0;i<n;i++)eProj(e,(i+off+.5)/n*TAU,180,pk==='rock'?'rock':'orb',{col:PROJCOL[pk],m:.8})},450);SFX.zap()}
 else if(a==='volley'){const b=Math.atan2(dy,dx);e.act={k:'volley',t:0,dur:.6};for(let i=0;i<5;i++)eProj(e,b+(i-2)*.22,300,pk==='rock'?'rock':'orb',{col:PROJCOL[pk],m:.9});SFX.shoot()}
 else if(a==='summon'){e.act={k:'summon',t:0,dur:.8};const n=e.enraged?4:3;let have=game.enemies.filter(o=>o.minionOf===e).length;for(let i=0;i<n&&have<6;i++,have++){const s=makeEnemy(B.minion,Math.max(1,e.lvl-2),e.x+rand(-80,80),e.y+rand(-60,60));if(solidAt(s.x,s.y,8))continue;s.minionOf=e;s.aggro=true;game.enemies.push(s);burst(s.x,s.y,'#c8a8ff',14,90,3,40,1)}SFX.roar()}
 else if(a==='quake'){e.act={k:'quake',t:0,dur:1.4};for(let i=0;i<3;i++){const tx=game.P.x+rand(-60,60),ty=game.P.y+rand(-40,40);game.teles.push({type:'circle',x:tx,y:ty,r:72,t:-i*.25,max:.9,cb:()=>{SFX.slam();game.shake=7;burst(tx,ty,'#c8a878',20,200,5,60);if(Math.hypot(game.P.x-tx,(game.P.y-ty)*1.2)<76)hurtHero(e.dmg*1.2,tx,ty)}})}}
 else if(a==='blink'){burst(e.x,e.y-30,'#c8a8ff',24,160,3,0,1);const ang=Math.random()*TAU;const nx=game.P.x+Math.cos(ang)*220,ny=game.P.y+Math.sin(ang)*170;if(!solidAt(nx,ny,10)){e.x=nx;e.y=ny}burst(e.x,e.y-30,'#c8a8ff',24,160,3,0,1);SFX.warp();e.act={k:'blink',t:0,dur:.4}}}
