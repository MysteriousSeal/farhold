import {drawBoard,drawCave,drawChest,drawDPillar,drawForge,drawHouse,drawLamp,drawPillar,drawProp,drawStairs,drawStall,drawTorch,drawWaystone} from '../art/buildings';
import {drawEnemy} from '../art/creatures';
import {SPR,TREESET} from '../art/decor';
import {drawHumanoid,drawWeapon,handPos,restAng} from '../art/humanoid';
import {drawDrop,drawProj} from '../art/items';
import {DPR,H,W,g,mkCanvas,shadow} from '../core/dom';
import {TAU,clamp,lerp,rand} from '../core/math';
import {MATS,RAR} from '../data/classes';
import {addLight} from '../game/fx';
import {drawNpc} from '../game/npcs';
import {offers} from '../game/quests';
import {game,hero,lights,weather} from '../game/state';
import {joy} from '../input/input';
import {bgStep,getChunk} from '../world/chunks';
import {poisNear} from '../world/poi';
import {CH,corr} from '../world/terrain';
/* ================= RENDER ================= */
export const zoom=()=>clamp(Math.min(W,H)/370,1,2.1);
let lightC=null,lctx=null,vign=null;const WX={rain:[],snow:[]};
function drawTele(c,t){const k=clamp(t.t/t.max,0,1),hero=t.hero;const base=hero?'255,170,60':'255,60,40';c.save();
 if(t.type==='circle'){c.fillStyle='rgba('+base+','+(t.t<0?.05:.14)+')';c.beginPath();c.ellipse(t.x,t.y,t.r,t.r*.72,0,0,TAU);c.fill();c.strokeStyle='rgba('+base+',.8)';c.lineWidth=2.5;c.setLineDash([8,6]);c.lineDashOffset=-game.time*30;c.stroke();c.setLineDash([]);if(t.t>0){c.fillStyle='rgba('+base+',.28)';c.beginPath();c.ellipse(t.x,t.y,t.r*k,t.r*.72*k,0,0,TAU);c.fill()}}
 else{c.translate(t.x,t.y);c.rotate(t.ang);c.fillStyle='rgba('+base+',.14)';c.fillRect(0,-t.w/2,t.len,t.w);c.fillStyle='rgba('+base+',.3)';c.fillRect(0,-t.w/2,t.len*k,t.w);c.strokeStyle='rgba('+base+',.8)';c.lineWidth=2;c.setLineDash([8,6]);c.strokeRect(0,-t.w/2,t.len,t.w);c.setLineDash([])}c.restore()}
function drawZone(c,z){c.save();if(z.type==='burn'){c.globalCompositeOperation='lighter';const gr=c.createRadialGradient(z.x,z.y,4,z.x,z.y,z.r);gr.addColorStop(0,'rgba(255,120,40,'+(.35*Math.min(1,z.t))+')');gr.addColorStop(1,'rgba(255,60,20,0)');c.fillStyle=gr;c.beginPath();c.ellipse(z.x,z.y,z.r,z.r*.7,0,0,TAU);c.fill()}
 else if(z.type==='rain'){c.strokeStyle='rgba(255,246,224,.5)';c.lineWidth=2;c.setLineDash([6,6]);c.beginPath();c.ellipse(z.x,z.y,z.r,z.r*.72,0,0,TAU);c.stroke();c.setLineDash([])}
 else if(z.type==='nova'){const k=1-z.t/z.max;c.globalAlpha=1-k;c.strokeStyle='#dff4ff';c.lineWidth=8*(1-k)+1;c.beginPath();c.ellipse(z.x,z.y+10,z.r*k,z.r*.72*k,0,0,TAU);c.stroke();c.fillStyle='rgba(180,230,255,.15)';c.fill()}c.restore()}
function drawHero(c,t){const L=game.P.look,w=game.P.eq.weapon,wcol=w?MATS[w.mat][1]:null,glow=w&&w.r>=2?RAR[w.r].c:null,rolling=hero.roll>0,leap=hero.leap;
 let z=0;if(leap){const k=clamp(leap.t/leap.dur,0,1);z=Math.sin(k*Math.PI)*70}
 const hp=handPos(hero.dx,hero.dy,hero.moving&&!rolling,hero.walk,t,game.P.race),wx=game.P.x+hp.x,wy=game.P.y+hp.y-z;
 let ang=restAng(hp,game.P.cls),sw=0;
 if(game.P.cls==='warrior'){if(hero.whirl>0)ang=game.time*22;else if(hero.atk>0){const s=hero.comboSw;ang=hero.aim+s*lerp(-1.4,1.4,1-hero.atk)}}
 else if(game.P.cls==='ranger'){if(hero.atk>0){ang=hero.aim;sw=hero.atk}}
 else if(game.P.cls==='mage'&&hero.atk>0)ang=restAng(hp,'mage')+(hp.flip?-1:1)*.5*hero.atk;
 const wd=()=>{if(!rolling)drawWeapon(c,wx,wy,ang,game.P.cls,sw,wcol,glow,w?w.style:0)};
 if(z){shadow(c,game.P.x,game.P.y,12,4.5,.3)}
 if(hp.behind&&hero.whirl<=0)wd();
 const alpha=hero.inv>0&&!leap&&Math.sin(t*50)>0?.5:null;
 if(rolling&&Math.random()<.7)game.ghosts.push({x:game.P.x,y:game.P.y,dx:hero.dx,dy:hero.dy,walk:hero.walk,life:.18});
 c.save();if(rolling){c.translate(game.P.x,game.P.y-12);c.rotate((1-hero.roll/.3)*TAU*(hero.rdx<0?-1:1));c.translate(-game.P.x,-game.P.y+12)}
 drawHumanoid(c,game.P.x,game.P.y-z,{look:L,dx:hero.dx,dy:hero.dy,moving:hero.moving,walk:hero.walk,time:t,alpha,noShadow:!!z});c.restore();
 if(!hp.behind||hero.whirl>0)wd();
 if(game.P.cls==='warrior'&&hero.atk>0&&hero.whirl<=0){c.save();c.translate(game.P.x,game.P.y-18);c.rotate(hero.aim);const s=hero.comboSw,k=1-hero.atk,fin=hero.combo===0,R=(fin?74:64)*(1+(game.ST.arc-1)*.6),a0=-1.4*s,a1=lerp(-1.4,1.4,k)*s;c.globalAlpha=.55*hero.atk+.15;c.fillStyle=fin?'#ffe7a0':'#fff6e0';c.beginPath();c.arc(0,0,R,Math.min(a0,a1),Math.max(a0,a1));c.arc(0,0,R*.45,Math.max(a0,a1),Math.min(a0,a1),true);c.closePath();c.fill();c.restore()}
 if(hero.whirl>0){c.save();c.translate(game.P.x,game.P.y-14);c.globalAlpha=.4;c.strokeStyle='#fff6e0';c.lineWidth=10;for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,0,68*game.ST.arc,48*game.ST.arc,0,game.time*22+i*Math.PI,game.time*22+i*Math.PI+2);c.stroke()}c.restore()}}

export function render(){lights.length=0;const z=zoom();g.setTransform(DPR,0,0,DPR,0,0);g.fillStyle=game.mode==='dungeon'?'#120e1a':'#3a76be';g.fillRect(0,0,W,H);
 const sx=(Math.random()-.5)*game.shake,sy=(Math.random()-.5)*game.shake,cx=game.camX+game.camKX+game.kickX,cy=game.camY+game.camKY+game.kickY;g.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2-cx*z+sx),DPR*(H/2-cy*z+sy));
 const vw=W/z/2,vh=H/z/2,x0=cx-vw,x1=cx+vw,y0=cy-vh,y1=cy+vh;game.genBudget=game.state==='play'?1:2;const list=[];
 for(let i=Math.floor((x0-40)/CH);i<=Math.floor((x1+40)/CH);i++)for(let j=Math.floor((y0-40)/CH);j<=Math.floor((y1+130)/CH);j++){const ch=getChunk(i,j,true);if(!ch){continue}g.drawImage(ch.cvs,i*CH,j*CH,CH+.6,CH+.6);
  for(const w of ch.waves){if(w[0]<x0-20||w[0]>x1+20||w[1]<y0-20||w[1]>y1+20)continue;const a=(Math.sin(game.time*1.6+w[2])+1)/2;g.strokeStyle='rgba(255,255,255,'+(a*.45)+')';g.lineWidth=2;g.beginPath();g.arc(w[0]+Math.sin(game.time+w[2])*3,w[1],7+a*3,3.6,5.8);g.stroke()}
  for(const d of ch.decor)if(d.x>x0-60&&d.x<x1+60&&d.y>y0-10&&d.y<y1+130)list.push({y:d.y,d})}
 if(game.genBudget>0){if(game.mode==='world')bgStep(cx,cy);else{const ci=Math.floor(cx/CH),cj=Math.floor(cy/CH);outer:for(let r=1;r<=2;r++)for(let i=ci-r;i<=ci+r;i++)for(let j=cj-r;j<=cj+r;j++){if(!game.DG.ch.has(i+','+j)){getChunk(i,j,true);break outer}}}}
 const vis=(x,y,m=150)=>x>x0-m&&x<x1+m&&y>y0-m*.5&&y<y1+m*1.3;
 if(game.mode==='world'){for(const p of (game.state==='play'||game.state==='modal'||game.state==='inv'?game.activePois:poisNear(cx,cy,700))){if(!vis(p.x,p.y,p.r+200))continue;
   if(p.kind==='village'){for(const h of p.houses)if(vis(h.x,h.y))list.push({y:h.y,f:c=>drawHouse(c,h,game.time,game.dark)});list.push({y:p.stall.y,f:c=>drawStall(c,p,game.time)},{y:p.forge.y,f:c=>drawForge(c,p,game.time)},{y:p.board.y,f:c=>drawBoard(c,p,game.time,!offers.has(p.key)||offers.get(p.key).length>0)},{y:p.way.y,f:c=>drawWaystone(c,p,game.time,game.P?game.P.wps.includes(p.key):true)});
    for(const l of p.lamps)list.push({y:l.y,f:c=>drawLamp(c,l,game.time,game.dark)});for(const n of p.npcs)if(vis(n.x,n.y))list.push({y:n.y,f:c=>drawNpc(c,n,game.time)})}
   else if(p.kind==='lair'){const cl=game.P&&game.P.cleared[p.key];if(!cl){g.save();g.globalAlpha=.35+Math.sin(game.time*2)*.15;g.strokeStyle='#ff3a5a';g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y,100,72,0,0,TAU);g.stroke();g.restore();addLight(p.x,p.y,160,.5,'#ff3a5a')}for(const pl of p.pillars)list.push({y:pl.y,f:c=>drawPillar(c,pl,game.time)});list.push({y:p.y-40,f:c=>c.drawImage(SPR.bones.c,p.x-30,p.y-60,60,36)})}
   else if(p.kind==='cave')list.push({y:p.y,f:c=>drawCave(c,p,game.time)})}}
 else{for(const t of game.DG.torches)if(vis(t.x,t.y))list.push({y:t.y-40,f:c=>drawTorch(c,t,game.time)});for(const p of game.DG.props)if(vis(p.x,p.y))list.push({y:p.y,f:c=>drawProp(c,p,game.time)});for(const p of game.DG.pillars)if(vis(p.x,p.y))list.push({y:p.y,f:c=>drawDPillar(c,p)});
  list.push({y:game.DG.chest.y,f:c=>drawChest(c,game.DG.chest,game.time)});g.save();drawStairs(g,game.DG.exit,game.time);g.restore()}
 for(const t of game.teles)drawTele(g,t);for(const zz of game.zones)drawZone(g,zz);
 for(const d of game.drops)if(vis(d.x,d.y))list.push({y:d.y,f:c=>drawDrop(c,d,game.time)});
 for(const e of game.enemies)if(vis(e.x,e.y,200))list.push({y:e.y,f:c=>drawEnemy(c,e,game.time)});
 for(const gh of game.ghosts)list.push({y:gh.y-1,f:c=>drawHumanoid(c,gh.x,gh.y,{look:game.P.look,dx:gh.dx,dy:gh.dy,moving:true,walk:gh.walk,time:game.time,alpha:gh.life*2,noShadow:true})});
 if(game.P&&(game.state==='play'||game.state==='inv'||game.state==='modal'))list.push({y:game.P.y,f:c=>drawHero(c,game.time)});
 list.sort((a,b)=>a.y-b.y);
 const windK=1+weather.k*(weather.type==='rain'?2:0);
 for(const it of list){if(it.d){const d=it.d,s=SPR[d.k];if(!s)continue;let fade=false;if(game.P&&TREESET.has(d.k)&&game.P.y<d.y&&game.P.y>d.y-100&&Math.abs(game.P.x-d.x)<34)fade=true;if(fade)g.globalAlpha=.45;
   if(TREESET.has(d.k)){const sk=Math.sin(game.time*1.3+d.ph)*.035*windK;g.save();g.translate(d.x,d.y);g.transform(1,0,sk,1,0,0);g.drawImage(s.c,-s.ax,-s.ay,s.w,s.h);g.restore()}else g.drawImage(s.c,d.x-s.ax,d.y-s.ay,s.w,s.h);
   if(d.k==='crystal')addLight(d.x,d.y-20,90,.7,'#c060ff');if(d.k==='mushroom'&&game.dark>.3)addLight(d.x,d.y-8,40,.4,'#9aff9a');g.globalAlpha=1}else it.f(g,game.time)}
 for(const p of game.projs)drawProj(g,p);
 for(const p of game.parts){const a=clamp(p.life/p.max,0,1);g.globalAlpha=p.smoke?a*.6:a;if(p.glow)g.globalCompositeOperation='lighter';g.fillStyle=p.col;if(p.streak){g.fillRect(p.x,p.y,1.6,10)}else if(p.smoke){g.beginPath();g.arc(p.x,p.y,p.sz*(1.6-a),0,TAU);g.fill()}else g.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);g.globalCompositeOperation='source-over'}g.globalAlpha=1;
 if(game.dark>.25)for(const p of game.parts)if(p.glow&&p.life>p.max*.3&&lights.length<60)lights.push({x:p.x,y:p.y,r:20,i:.5});
 g.textAlign='center';g.lineJoin='round';for(const t of game.texts){const a=clamp(t.life/t.max*2,0,1),age=t.max-t.life,pop=age<.12?1+(.12-age)*5:1;g.globalAlpha=a;const s=(t.big?20:12+(t.s.endsWith('!')?5:0))*pop;g.font='700 '+s.toFixed(1)+'px Fredoka,sans-serif';g.lineWidth=3.5;g.strokeStyle='rgba(30,20,40,.9)';g.strokeText(t.s,t.x,t.y);g.fillStyle=t.col;g.fillText(t.s,t.x,t.y)}g.globalAlpha=1;
 // colored glow
 if(game.dark>.2){g.globalCompositeOperation='lighter';for(const l of lights){if(!l.col)continue;const gr=g.createRadialGradient(l.x,l.y,2,l.x,l.y,l.r*.7);gr.addColorStop(0,hexA(l.col,.22*l.i*game.dark));gr.addColorStop(1,hexA(l.col,0));g.fillStyle=gr;g.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2)}g.globalCompositeOperation='source-over'}
 // lighting overlay
 g.setTransform(DPR,0,0,DPR,0,0);
 if(game.dark>.02){const LW=Math.ceil(W/2),LH=Math.ceil(H/2);if(!lightC||lightC.width!==LW||lightC.height!==LH){lightC=mkCanvas(LW,LH);lctx=lightC.getContext('2d')}
  lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,LW,LH);lctx.fillStyle=game.mode==='dungeon'?'rgba(8,6,18,'+game.dark+')':'rgba(10,14,42,'+game.dark+')';lctx.fillRect(0,0,LW,LH);lctx.globalCompositeOperation='destination-out';
  const toS=(x,y)=>[(W/2+(x-cx)*z)/2,(H/2+(y-cy)*z)/2];const hl=game.P&&(game.state!=='menu'&&game.state!=='create'&&game.state!=='help')?[{x:game.P.x,y:game.P.y-20,r:game.mode==='dungeon'?165:140,i:1}]:[];
  for(const l of hl.concat(lights)){const[a,b]=toS(l.x,l.y),r=l.r*z/2;if(a<-r||b<-r||a>LW+r||b>LH+r)continue;const gr=lctx.createRadialGradient(a,b,0,a,b,r);const ii=clamp(l.i,0,1);gr.addColorStop(0,'rgba(0,0,0,'+ii+')');gr.addColorStop(.45,'rgba(0,0,0,'+(ii*.75)+')');gr.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=gr;lctx.fillRect(a-r,b-r,r*2,r*2)}
  g.drawImage(lightC,0,0,W,H)}
 if(game.dusk>.02){g.fillStyle='rgba(255,110,50,'+(game.dusk*.13)+')';g.fillRect(0,0,W,H)}
 if(game.mode==='world'&&game.P){const c2=corr(Math.hypot(game.camX,game.camY));if(c2>0){g.fillStyle='rgba(60,20,80,'+c2*.16+')';g.fillRect(0,0,W,H)}}
 drawWeather();
 if(!vign||vign.w!==W||vign.h!==H){const c=mkCanvas(W,H),x=c.getContext('2d'),gr=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);gr.addColorStop(0,'rgba(20,15,40,0)');gr.addColorStop(1,'rgba(20,15,40,.5)');x.fillStyle=gr;x.fillRect(0,0,W,H);vign={c,w:W,h:H}}
 g.drawImage(vign.c,0,0,W,H);
 if(game.state==='play'&&game.P&&game.P.hp<game.ST.hp*.3){g.fillStyle='rgba(200,30,30,'+(.1+Math.sin(game.time*6)*.06)+')';g.fillRect(0,0,W,H)}
 if(game.state==='menu'||game.state==='create'||game.state==='help'){g.fillStyle='rgba(20,18,45,.3)';g.fillRect(0,0,W,H)}
 if(joy.id!==null){g.globalAlpha=.45;g.strokeStyle='#fff6e0';g.lineWidth=3;g.beginPath();g.arc(joy.ox,joy.oy,52,0,TAU);g.stroke();g.globalAlpha=.8;g.fillStyle='#fff6e0';g.beginPath();g.arc(joy.ox+joy.x*52,joy.oy+joy.y*52,24,0,TAU);g.fill();g.globalAlpha=1}
 if(game.fade>0){g.fillStyle='rgba(10,8,20,'+game.fade+')';g.fillRect(0,0,W,H)}}
function hexA(h,a){const n=parseInt(h.slice(1),16);return'rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+a.toFixed(3)+')'}
function drawWeather(){const k=weather.k;if(k<.02)return;const type=weather.type;
 if(type==='rain'){const n=Math.round(170*k);while(WX.rain.length<n)WX.rain.push({x:Math.random()*W,y:Math.random()*H,s:rand(700,1000)});g.strokeStyle='rgba(190,210,240,'+(.35*k+.1)+')';g.lineWidth=1.3;g.beginPath();for(let i=0;i<n;i++){const d=WX.rain[i];g.moveTo(d.x,d.y);g.lineTo(d.x-4,d.y+14)}g.stroke();g.fillStyle='rgba(40,50,80,'+k*.18+')';g.fillRect(0,0,W,H)}
 else{const n=Math.round(110*k);while(WX.snow.length<n)WX.snow.push({x:Math.random()*W,y:Math.random()*H,s:rand(30,70),r:rand(1.2,3),ph:rand(0,9)});for(let i=0;i<n;i++){const d=WX.snow[i];g.fillStyle=type==='ash'?(i%7?'rgba(80,70,90,.7)':'rgba(255,120,60,.8)'):'rgba(255,255,255,.85)';g.beginPath();g.arc(d.x,d.y,d.r,0,TAU);g.fill()}if(type==='snow'){g.fillStyle='rgba(220,235,255,'+k*.08+')';g.fillRect(0,0,W,H)}}}
let wfxLX,wfxLY;
export function updateWeatherFx(dt){const cdx=(game.camX-(wfxLX||game.camX))*zoom(),cdy=(game.camY-(wfxLY||game.camY))*zoom();wfxLX=game.camX;wfxLY=game.camY;
 for(const d of WX.rain){d.y+=d.s*dt-cdy;d.x+=-d.s*.28*dt-cdx;if(d.y>H){d.y-=H+20;d.x=Math.random()*W}if(d.y<-20)d.y+=H;if(d.x<0)d.x+=W;if(d.x>W)d.x-=W}
 for(const d of WX.snow){d.y+=d.s*dt-cdy;d.x+=Math.sin(game.time+d.ph)*20*dt-cdx;if(d.y>H)d.y-=H;if(d.y<0)d.y+=H;if(d.x<0)d.x+=W;if(d.x>W)d.x-=W}}
