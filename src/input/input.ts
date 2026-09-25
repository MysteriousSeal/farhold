import {audioInit} from '../audio/sfx';
import {$,W,cv} from '../core/dom';
import {drinkPot,heroRoll,useSkill} from '../game/combat';
import {game} from '../game/state';
import {openInv} from '../ui/inventory';
import {openPause,openSkills} from '../ui/menus';
import {closeAll} from '../ui/screens';
/* ================= INPUT ================= */
export const keys:Record<string,boolean>={};export let mouseAim=null,mouseAtk=false;export const joy={id:null,ox:0,oy:0,x:0,y:0};
export const isTouch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
addEventListener('keydown',e=>{keys[e.code]=true;audioInit();
 if(game.state==='play'){if(e.code==='Space'||e.code==='KeyJ'){game.atkHeld=true;e.preventDefault()}if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK')heroRoll();if(e.code==='KeyQ')drinkPot();
  if(e.code==='Digit1'||e.code==='KeyU')useSkill(1);if(e.code==='Digit2'||e.code==='KeyO')useSkill(2);if(e.code==='KeyE'||e.code==='KeyF'){if(game.interact)game.interact.act()}
  if(e.code==='KeyI'||e.code==='Tab'){e.preventDefault();openInv()}if(e.code==='KeyC'||e.code==='KeyT'){openSkills()}if(e.code==='Escape')openPause()}
 else if((game.state==='inv'||game.state==='modal')&&(e.code==='Escape'||e.code==='KeyI'||e.code==='Tab'||e.code==='KeyC')){e.preventDefault();closeAll()}});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space'||e.code==='KeyJ')game.atkHeld=false});
cv.addEventListener('pointerdown',e=>{audioInit();if(game.state!=='play')return;if(e.pointerType==='mouse'){if(e.button===2){useSkill(1);return}game.atkHeld=true;mouseAtk=true;mouseAim={x:e.clientX,y:e.clientY};return}
 if(joy.id===null&&e.clientX<W*.6){joy.id=e.pointerId;joy.ox=e.clientX;joy.oy=e.clientY;joy.x=joy.y=0;try{cv.setPointerCapture(e.pointerId)}catch(_){}}});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouseAim={x:e.clientX,y:e.clientY};return}if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),m=52;if(l>m){joy.ox+=dx/l*(l-m);joy.oy+=dy/l*(l-m);dx=dx/l*m;dy=dy/l*m}joy.x=dx/m;joy.y=dy/m});
const endJoy=e=>{if(e.pointerType==='mouse'){if(mouseAtk){game.atkHeld=false;mouseAtk=false}return}if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0}};
cv.addEventListener('pointerup',endJoy);cv.addEventListener('pointercancel',endJoy);
function tbtn(id,down,up?){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audioInit();b.classList.add('dn');down()});const u=()=>{b.classList.remove('dn');up&&up()};b.addEventListener('pointerup',u);b.addEventListener('pointercancel',u);b.addEventListener('pointerleave',u)}
tbtn('#bAtk',()=>game.atkHeld=true,()=>game.atkHeld=false);tbtn('#bRoll',heroRoll);tbtn('#bPot',drinkPot);tbtn('#bS1',()=>useSkill(1));tbtn('#bS2',()=>useSkill(2));tbtn('#bAct',()=>{if(game.interact)game.interact.act()});
$('#bagBtn').onclick=()=>openInv();$('#skillsBtn').onclick=()=>openSkills();$('#menuBtn').onclick=()=>openPause();
