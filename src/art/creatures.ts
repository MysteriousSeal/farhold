import {drawHumanoid,drawWeapon,handPos,restAng} from './humanoid';
import {circ,ell,rr,shadow} from '../core/dom';
import {OUT,TAU,clamp,mixCol,sh} from '../core/math';
import {ET} from '../data/enemies';
/* ================= ART: creatures ================= */
function fcol(e,col){return e.flash>0?'#ffffff':e.frozen>0?mixCol(col,'#9fe0ff',.55):col}
function drawSlime(c,e,t){const s=e.sc,hop=e.wind>0?-.25*(1-e.wind/.4):Math.sin(e.walk*1.3)*.12,z=e.air?e.air:0;c.save();c.translate(e.x,e.y);shadow(c,0,0,14*s,5*s,.28-z*.002);c.translate(0,-z);c.scale(s*(1+hop),s*(1-hop));c.lineWidth=2.2/Math.sqrt(s);c.strokeStyle=OUT;
 c.beginPath();c.moveTo(-15,0);c.quadraticCurveTo(-16,-22,0,-24);c.quadraticCurveTo(16,-22,15,0);c.closePath();c.fillStyle=fcol(e,e.col);c.fill();c.stroke();
 c.fillStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(-11,-2);c.quadraticCurveTo(-12,-16,-2,-19);c.quadraticCurveTo(-8,-12,-11,-2);c.fill();
 c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.ellipse(-6,-16,4,2.6,-.5,0,TAU);c.fill();
 const fx=clamp(e.dx,-1,1)*3;c.fillStyle=OUT;c.beginPath();c.ellipse(-4+fx,-10,2,3,0,0,TAU);c.ellipse(4+fx,-10,2,3,0,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-3.4+fx,-11,.8,0,TAU);c.arc(4.6+fx,-11,.8,0,TAU);c.fill();
 if(e.boss){c.fillStyle='#f5c451';c.beginPath();c.moveTo(-9,-21);c.lineTo(-10,-31);c.lineTo(-5,-26);c.lineTo(0,-33);c.lineTo(5,-26);c.lineTo(10,-31);c.lineTo(9,-21);c.closePath();c.fill();c.stroke()}
 c.restore()}
function drawQuad(c,e,t,v){const flip=e.dx<0,sw=Math.sin(e.walk)*(e.moving?1:0),s=e.sc;c.save();c.translate(e.x,e.y);shadow(c,0,0,17*s,5*s);c.scale(s*(flip?-1:1),s);c.lineWidth=2.2/Math.sqrt(s);c.strokeStyle=OUT;const col=fcol(e,e.col),lean=e.wind>0?-3:0;c.translate(lean,0);
 for(const[lx,k]of[[-9,1],[7,-1],[-5,-1],[11,1]])rr(c,lx+sw*3*k,-10,5,10,2,sh(col,-.2));
 if(v==='boar'){c.beginPath();c.moveTo(-16,-15);c.quadraticCurveTo(-22,-18,-20,-11);c.stroke();ell(c,0,-15,17,10,col);c.fillStyle=sh(col,-.25);for(let i=-3;i<3;i++){c.beginPath();c.moveTo(i*4,-24);c.lineTo(i*4+2,-29);c.lineTo(i*4+4,-24);c.fill()}
  ell(c,15,-14,9,8,col);rr(c,20,-16,8,7,3,sh(col,.2));c.fillStyle=OUT;c.beginPath();c.arc(25,-13,1,0,TAU);c.fill();c.fillStyle='#fffbe8';c.beginPath();c.moveTo(20,-10);c.quadraticCurveTo(26,-10,26,-17);c.lineTo(22,-11);c.fill();c.stroke();c.beginPath();c.moveTo(11,-22);c.lineTo(13,-27);c.lineTo(16,-21);c.fillStyle=col;c.fill();c.stroke();c.fillStyle=e.aggro?'#ff4030':OUT;c.beginPath();c.arc(16,-17,1.7,0,TAU);c.fill()}
 else{c.beginPath();c.moveTo(-16,-14);c.quadraticCurveTo(-27,-20-sw*2,-23,-9);c.fillStyle=col;c.fill();c.stroke();ell(c,0,-15,16,8,col);c.fillStyle=sh(col,.35);c.beginPath();c.ellipse(2,-12,10,4,0,0,TAU);c.fill();
  if(v==='icewolf'){c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(-8+i*5,-22);c.lineTo(-6+i*5,-27);c.lineTo(-4+i*5,-22);c.fill()}}
  c.beginPath();c.moveTo(12,-26);c.lineTo(15,-34);c.lineTo(18,-25);c.fillStyle=col;c.fill();c.stroke();ell(c,17,-21,8,7,col);c.beginPath();c.moveTo(22,-22);c.lineTo(31,-18);c.lineTo(22,-15);c.fill();c.stroke();c.fillStyle=OUT;c.beginPath();c.arc(30,-18.5,1.6,0,TAU);c.fill();c.fillStyle=v==='icewolf'?'#7ef0ff':'#ffd23a';c.beginPath();c.arc(19,-23,1.8,0,TAU);c.fill();
  if(e.wind>0){c.fillStyle='#fff';c.beginPath();c.moveTo(24,-17);c.lineTo(25,-14);c.lineTo(27,-17);c.fill()}}
 c.restore()}
function drawBat(c,e,t){const s=e.sc,fl=Math.sin(t*22+e.ph)*.9,z=26+Math.sin(t*4+e.ph)*5;c.save();c.translate(e.x,e.y);shadow(c,0,0,9*s,3*s,.2);c.translate(0,-z*s);c.scale(s*(e.dx<0?-1:1),s);c.lineWidth=2;c.strokeStyle=OUT;const col=fcol(e,e.col);
 for(const k of[-1,1]){c.save();c.scale(k,1);c.rotate(-fl*.5);c.beginPath();c.moveTo(4,-2);c.quadraticCurveTo(14,-14,22,-6);c.quadraticCurveTo(18,-2,17,2);c.quadraticCurveTo(13,-1,11,3);c.quadraticCurveTo(8,0,4,3);c.closePath();c.fillStyle=sh(col,-.15);c.fill();c.stroke();c.restore()}
 ell(c,0,0,7,8,col);c.fillStyle=col;c.beginPath();c.moveTo(-5,-5);c.lineTo(-6,-12);c.lineTo(-1,-7);c.moveTo(5,-5);c.lineTo(6,-12);c.lineTo(1,-7);c.fill();c.stroke();c.fillStyle='#ff5a4a';c.beginPath();c.arc(-2.5,-2,1.5,0,TAU);c.arc(2.5,-2,1.5,0,TAU);c.fill();c.fillStyle='#fff';c.fillRect(-2,2,1.3,2);c.fillRect(.8,2,1.3,2);c.restore()}
function drawSpider(c,e,t){const s=e.sc,flip=e.dx<0,z=e.air||0;c.save();c.translate(e.x,e.y);shadow(c,0,0,18*s,6*s);c.translate(0,-z);c.scale(s*(flip?-1:1),s*(e.wind>0?.85:1));c.lineWidth=2.4/Math.sqrt(s);c.strokeStyle=OUT;const col=fcol(e,e.col),w=e.moving?e.walk:0;
 for(let i=0;i<4;i++){for(const k of[-1,1]){const ph=Math.sin(w*1.4+i*1.6+(k>0?Math.PI:0))*3,bx=-4+i*4,kx=bx+(i-1.5)*6,ky=-18+k*2;c.beginPath();c.moveTo(bx,-10);c.lineTo(kx+ph,ky);c.lineTo(kx*1.5+ph,-1+k);c.lineWidth=4;c.strokeStyle=OUT;c.stroke();c.lineWidth=2;c.strokeStyle=sh(col,-.2);c.stroke()}}
 c.lineWidth=2.2;c.strokeStyle=OUT;ell(c,-10,-12,13,10,col);c.fillStyle=e.boss?'#e0483e':sh(col,.3);c.beginPath();c.moveTo(-10,-19);c.lineTo(-7,-12);c.lineTo(-10,-6);c.lineTo(-13,-12);c.fill();
 ell(c,6,-10,8,7,sh(col,.1));c.fillStyle='#ff4030';for(const[a,b]of[[9,-12],[12,-10],[8,-9],[11,-14]]){c.beginPath();c.arc(a,b,1.3,0,TAU);c.fill()}c.fillStyle='#e8dcc0';c.beginPath();c.moveTo(12,-7);c.lineTo(14,-3);c.lineTo(10,-6);c.fill();c.restore()}
function drawScorpion(c,e,t){const s=e.sc,flip=e.dx<0,w=e.moving?e.walk:0;c.save();c.translate(e.x,e.y);shadow(c,0,0,18*s,5*s);c.scale(s*(flip?-1:1),s);c.lineWidth=2.2/Math.sqrt(s);c.strokeStyle=OUT;const col=fcol(e,e.col);
 for(let i=0;i<3;i++)for(const k of[0,1]){const ph=Math.sin(w*1.5+i+k*3)*2.5;c.beginPath();c.moveTo(-4+i*5,-6);c.lineTo(-8+i*6+ph,k?1:-1);c.lineWidth=2.6;c.stroke()}
 c.lineWidth=2.2;const strike=e.wind>0?1-e.wind/.35:e.swing>0?1:0;let px=-10,py=-8;for(let i=0;i<5;i++){const a=-Math.PI*.15-i*.42-strike*.3;const nx=px+Math.cos(a+Math.PI)*6,ny=py+Math.sin(a+Math.PI)*6-(i>1?3:0);ell(c,nx,ny,5.5-i*.4,4.5-i*.3,sh(col,-.05*i));px=nx;py=ny}
 c.fillStyle=sh(col,-.35);c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+10,py-2,px+8+strike*6,py+8);c.lineTo(px+4,py+2);c.closePath();c.fill();c.stroke();
 ell(c,2,-8,12,7,col);c.fillStyle=OUT;c.beginPath();c.arc(12,-10,1.3,0,TAU);c.fill();
 for(const k of[-1,1]){c.save();c.translate(12,-8+k*3);c.rotate(k*.3+Math.sin(t*3)*.1);rr(c,0,-2,9,4,2,col);c.beginPath();c.moveTo(9,-3);c.quadraticCurveTo(17,-5,16,1);c.lineTo(11,0);c.lineTo(15,3);c.quadraticCurveTo(12,6,9,3);c.closePath();c.fillStyle=col;c.fill();c.stroke();c.restore()}c.restore()}
function drawGolem(c,e,t){const s=e.sc,flip=e.dx<0,sw=e.moving?Math.sin(e.walk):0,wind=e.wind>0?1-e.wind/.8:0;c.save();c.translate(e.x,e.y);shadow(c,0,0,20*s,6*s,.32);c.scale(s*(flip?-1:1),s);c.lineWidth=2.4/Math.sqrt(s);c.strokeStyle=OUT;const col=fcol(e,e.col),dk=sh(col,-.25),glow=e.glow||'#ffb13a';
 rr(c,-12+sw*3,-14,10,14,4,dk);rr(c,3-sw*3,-14,10,14,4,dk);
 c.beginPath();c.moveTo(-16,-14);c.lineTo(-18,-38);c.lineTo(-8,-46);c.lineTo(10,-46);c.lineTo(18,-36);c.lineTo(16,-14);c.closePath();c.fillStyle=col;c.fill();c.stroke();
 c.fillStyle=sh(col,.2);c.beginPath();c.moveTo(-14,-37);c.lineTo(-7,-43);c.lineTo(6,-43);c.lineTo(-2,-36);c.closePath();c.fill();
 c.strokeStyle=glow;c.lineWidth=2;c.globalAlpha=.8;c.beginPath();c.moveTo(-6,-28);c.lineTo(0,-22);c.lineTo(6,-30);c.stroke();c.globalAlpha=1;c.strokeStyle=OUT;c.lineWidth=2.2;
 rr(c,-7,-58-wind*4,16,13,4,col);c.fillStyle=glow;c.fillRect(-2,-53-wind*4,3,3);c.fillRect(4,-53-wind*4,3,3);
 const ay=-40-wind*22;rr(c,-26,ay,11,24,5,col);rr(c,16,ay,11,24,5,col);rr(c,-27,ay+18,13,11,4,dk);rr(c,15,ay+18,13,11,4,dk);c.restore()}
export function drawEnemy(c,e,t){const D=ET[e.type];
 if(e.dying>0){c.save();c.globalAlpha=clamp(e.dying/.4,0,1);c.translate(e.x,e.y);c.scale(1+(.4-e.dying)*1.2,1-(.4-e.dying)*1.8);c.translate(-e.x,-e.y)}
 if(e.boss&&e.enraged){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25+Math.sin(t*8)*.1;const gr=c.createRadialGradient(e.x,e.y-20*e.sc,5,e.x,e.y-20*e.sc,50*e.sc);gr.addColorStop(0,'#ff4a2a');gr.addColorStop(1,'rgba(255,40,20,0)');c.fillStyle=gr;c.fillRect(e.x-60*e.sc,e.y-80*e.sc,120*e.sc,110*e.sc);c.restore()}
 const k=D.kind;
 if(k==='slime')drawSlime(c,e,t);else if(k==='quad')drawQuad(c,e,t,D.variant);else if(k==='bat')drawBat(c,e,t);else if(k==='spider')drawSpider(c,e,t);else if(k==='scorp')drawScorpion(c,e,t);else if(k==='golem')drawGolem(c,e,t);
 else{const L=Object.assign({},D.look);if(e.tint)L.cloth=e.tint;if(e.boss&&!L.crown&&!L.horns)L.crown=true;const s=(D.scale||1)*e.sc,z=e.air||0;
  if(z){c.save();shadow(c,e.x,e.y,12*s,4.5*s,.25);c.translate(0,-z)}
  const hp=handPos(e.dx,e.dy,e.moving,e.walk,t,'',s),wx=e.x+hp.x,wy=e.y+hp.y;let ang=restAng(hp,D.wep==='bow'?'bow':D.wep==='orb'||D.wep==='staff'?'staff':'sword');
  if(e.wind>0&&D.wep!=='bow'&&D.wep!=='orb'&&D.wep!=='staff')ang=Math.atan2(e.dy,e.dx)-1.5*(1-e.wind/.4);if(e.swing>0&&D.wep!=='bow')ang=Math.atan2(e.dy,e.dx)+1.2;if(D.wep==='bow')ang=e.aggro?Math.atan2(e.dy,e.dx):ang;
  const wcol=D.wcol,wd=()=>{if(D.wep==='orb'){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.85;circ(c,wx,wy-6*s,(4+Math.sin(t*7))*s,D.orb||'#8ef7ff',false);c.globalAlpha=.3;circ(c,wx,wy-6*s,9*s,D.orb||'#8ef7ff',false);c.restore()}else if(D.wep)drawWeapon(c,wx,wy,ang,D.wep==='staff'?'staff':D.wep,D.wep==='bow'&&e.wind>0?1-e.wind/.5:0,wcol,null,D.wstyle||0,s)};
  if(hp.behind)wd();drawHumanoid(c,e.x,e.y,{look:L,dx:e.dx,dy:e.dy,moving:e.moving,walk:e.walk,time:t,scale:s,flash:e.flash>0,frozen:e.frozen>0,float:D.float,alpha:D.float?.9:null,noShadow:!!z,squash:e.hitSq||0});if(!hp.behind)wd();
  if(z)c.restore()}
 if(e.dying>0){c.restore();return}
 if(e.stun>0){c.save();c.translate(e.x,e.y-(e.hbY||40)*e.sc-8);for(let i=0;i<3;i++){const a=t*5+i*2.1;c.fillStyle='#ffe38a';c.font='700 9px sans-serif';c.fillText('✦',Math.cos(a)*9,Math.sin(a)*3)}c.restore()}
 if(!e.boss&&(e.hp<e.max||e.elite)){const w=34*Math.min(e.sc,1.4),y=e.y-(e.hbY||40)*e.sc;c.fillStyle='rgba(20,15,30,.85)';c.fillRect(e.x-w/2-1,y-1,w+2,6);c.fillStyle='#ffd0a0';c.fillRect(e.x-w/2,y,w*clamp(e.hpShow/e.max,0,1),4);c.fillStyle=e.elite?'#ffb13a':'#ff5a4a';c.fillRect(e.x-w/2,y,w*clamp(e.hp/e.max,0,1),4);
  c.font='600 9px Fredoka,sans-serif';c.textAlign='center';c.lineWidth=2.5;c.strokeStyle='rgba(0,0,0,.85)';const tx=(e.elite?e.elite+' ':'')+'Lv '+e.lvl;c.strokeText(tx,e.x,y-3);c.fillStyle=e.elite?'#ffd27a':'#fff';c.fillText(tx,e.x,y-3)}}
