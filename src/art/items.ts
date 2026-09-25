import {circ,rr,shadow} from '../core/dom';
import {OUT,TAU,rand,sh} from '../core/math';
import {MATS,RAR} from '../data/classes';
import {addLight} from '../game/fx';
import {game} from '../game/state';
/* ================= ART: items & fx ================= */
export function drawIcon(c,it,S){c.save();c.scale(S/40,S/40);c.translate(20,20);c.lineWidth=2.2;c.strokeStyle=OUT;c.lineJoin='round';c.lineCap='round';const m=MATS[it.mat][1],rc=RAR[it.r].c;
 if(it.r>0){const gr=c.createRadialGradient(0,0,2,0,0,19);gr.addColorStop(0,rc+'99');gr.addColorStop(1,rc+'00');c.fillStyle=gr;c.fillRect(-20,-20,40,40)}
 const s=it.slot;
 if(s==='weapon'){if(it.wc==='warrior'){c.rotate(-.8);if(it.style===1){rr(c,-16,-2,26,4,2,'#7a5230');c.beginPath();c.moveTo(4,-2);c.quadraticCurveTo(15,-13,13,-2);c.lineTo(13,2);c.quadraticCurveTo(15,13,4,2);c.closePath();c.fillStyle=m;c.fill();c.stroke()}else{const L2=it.style===2?19:15;rr(c,-16,-2.5,7,5,2,'#6b4423');rr(c,-10,-7,4,14,2,'#f5c451');c.beginPath();c.moveTo(-6,-3);c.lineTo(L2-4,-3);c.lineTo(L2,0);c.lineTo(L2-4,3);c.lineTo(-6,3);c.closePath();c.fillStyle=m;c.fill();c.stroke()}}
  else if(it.wc==='ranger'){c.rotate(-.8);c.beginPath();c.arc(-6,0,15,-1.2,1.2);c.lineWidth=5;c.stroke();c.lineWidth=3;c.strokeStyle=m;c.stroke();c.strokeStyle='#f3ead0';c.lineWidth=1.2;c.beginPath();c.moveTo(-6+15*Math.cos(1.2),15*Math.sin(1.2));c.lineTo(-6+15*Math.cos(-1.2),15*Math.sin(-1.2));c.stroke()}
  else{c.rotate(.6);rr(c,-2,-8,4,26,2,'#7a5230');if(it.style===1){c.beginPath();c.moveTo(0,-20);c.lineTo(5,-11);c.lineTo(0,-5);c.lineTo(-5,-11);c.closePath();c.fillStyle=m;c.fill();c.stroke()}else{circ(c,0,-11,6,m);c.fillStyle='#fff';c.beginPath();c.arc(-2,-13,1.8,0,TAU);c.fill()}}}
 else if(s==='helm'){c.beginPath();c.arc(0,4,13,Math.PI,0);c.lineTo(13,8);c.lineTo(-13,8);c.closePath();c.fillStyle=m;c.fill();c.stroke();rr(c,-2,2,4,10,1,m);c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.ellipse(-5,-3,3.5,2,-.5,0,TAU);c.fill()}
 else if(s==='armor'){c.beginPath();c.moveTo(-8,-13);c.lineTo(-16,-7);c.lineTo(-12,1);c.lineTo(-10,-2);c.lineTo(-10,14);c.lineTo(10,14);c.lineTo(10,-2);c.lineTo(12,1);c.lineTo(16,-7);c.lineTo(8,-13);c.quadraticCurveTo(0,-7,-8,-13);c.fillStyle=m;c.fill();c.stroke();c.fillStyle='rgba(0,0,0,.2)';c.fillRect(-9,5,18,3)}
 else if(s==='boots'){for(const k of[-1,1]){c.beginPath();c.moveTo(k*2-5,-12);c.lineTo(k*2+3,-12);c.lineTo(k*2+3,4);c.lineTo(k*2+(k>0?11:7),6);c.lineTo(k*2+(k>0?11:7),11);c.lineTo(k*2-5,11);c.closePath();c.fillStyle=k<0?sh(m,-.25):m;c.fill();c.stroke()}}
 else if(s==='amulet'){c.lineWidth=1.6;c.beginPath();c.moveTo(-10,-14);c.quadraticCurveTo(0,4,10,-14);c.strokeStyle='#f5c451';c.stroke();c.lineWidth=2.2;c.strokeStyle=OUT;c.beginPath();c.moveTo(0,-2);c.lineTo(8,6);c.lineTo(0,16);c.lineTo(-8,6);c.closePath();c.fillStyle=m;c.fill();c.stroke();c.fillStyle=rc;c.beginPath();c.arc(0,6,3,0,TAU);c.fill()}
 else{c.lineWidth=5;c.strokeStyle=OUT;c.beginPath();c.arc(0,3,10,0,TAU);c.stroke();c.lineWidth=3;c.strokeStyle=m;c.stroke();c.lineWidth=2;c.strokeStyle=OUT;c.beginPath();c.moveTo(0,-12);c.lineTo(6,-7);c.lineTo(0,-2);c.lineTo(-6,-7);c.closePath();c.fillStyle=rc;c.fill();c.stroke()}
 if(it.plus){c.font='800 11px Fredoka,sans-serif';c.textAlign='right';c.lineWidth=3;c.strokeStyle=OUT;c.strokeText('+'+it.plus,19,18);c.fillStyle='#ffe38a';c.fillText('+'+it.plus,19,18)}
 c.restore()}
export function drawDrop(c,d,t){const y=d.y-d.z,b=d.z>0?0:Math.sin(t*3+d.x)*2;c.save();shadow(c,d.x,d.y,7,2.5,.25);
 if(d.kind==='gold'){c.lineWidth=1.6;c.strokeStyle='#7a4a14';c.fillStyle='#f5c451';c.beginPath();c.ellipse(d.x,y-5+b,4.5*Math.abs(Math.cos(t*4+d.x))+1,4.5,0,0,TAU);c.fill();c.stroke();if(Math.random()<.01)game.parts.push({x:d.x+rand(-4,4),y:y-8,vx:0,vy:-10,life:.4,max:.4,col:'#fff',sz:2,g:0,glow:1})}
 else if(d.kind==='pot'){c.translate(d.x,y-9+b);c.lineWidth=1.8;c.strokeStyle=OUT;circ(c,0,2,6,'#ff4f73');rr(c,-2.5,-8,5,5,1,'#e8dcc0');c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.arc(-2,0,1.6,0,TAU);c.fill()}
 else{const rc=RAR[d.item.r].c;if(d.item.r>=1){c.globalCompositeOperation='lighter';c.globalAlpha=.35+Math.sin(t*4)*.1;const gr=c.createLinearGradient(0,y-80,0,y);gr.addColorStop(0,rc+'00');gr.addColorStop(1,rc);c.fillStyle=gr;c.fillRect(d.x-4-d.item.r,y-80,8+d.item.r*2,78);c.globalAlpha=1;c.globalCompositeOperation='source-over';if(d.item.r>=3)addLight(d.x,y-10,70,.6,rc)}c.translate(d.x-12,y-24+b);drawIcon(c,d.item,24)}
 c.restore()}
export function drawProj(c,p){c.save();c.translate(p.x,p.y);const a=Math.atan2(p.vy,p.vx);c.rotate(a);c.lineWidth=2;c.strokeStyle=OUT;
 if(p.k==='arrow'||p.k==='barrow'){c.strokeStyle=p.k==='arrow'?'#6b4423':'#d8d0bc';c.lineWidth=2.5;c.beginPath();c.moveTo(-14,0);c.lineTo(8,0);c.stroke();c.fillStyle='#cbd5e0';c.beginPath();c.moveTo(12,0);c.lineTo(6,-3.5);c.lineTo(6,3.5);c.fill();c.fillStyle=p.k==='arrow'?'#fff6e0':'#c8423a';c.beginPath();c.moveTo(-14,0);c.lineTo(-18,-4);c.lineTo(-10,0);c.lineTo(-18,4);c.fill();if(p.k==='arrow'){c.globalAlpha=.3;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(-30,0);c.lineTo(-16,0);c.stroke()}}
 else if(p.k==='rock'){c.rotate(performance.now()/100);circ(c,0,0,9,'#9a8a78');c.fillStyle='#bba998';c.beginPath();c.arc(-2,-3,3,0,TAU);c.fill()}
 else{const col=p.col||(p.k==='bolt'?'#9fd8ff':'#8ef7ff');c.globalCompositeOperation='lighter';c.fillStyle=col+'55';c.beginPath();c.arc(0,0,(p.big?16:11),0,TAU);c.fill();c.fillStyle=col;c.beginPath();c.ellipse(-2,0,p.big?12:8,p.big?8:5,0,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(1,0,p.big?4.5:3,0,TAU);c.fill()}
 c.restore()}
