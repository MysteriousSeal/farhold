import {SFX} from '../audio/sfx';
import {$} from '../core/dom';
import {saveSettings,settings} from '../core/settings';
import {CLS,RACE} from '../data/classes';
import {SKILLCD,TREES,nodeUnlocked,pointsFree,rank} from '../data/skills';
import {toast} from '../game/fx';
import {loadSave,save} from '../game/save';
import {game} from '../game/state';
import {calcStats} from '../game/stats';
import {setHud} from './hud';
import {btn,hdr,openModal,wireClose} from './modal';
import {closeAll,showScreen} from './screens';
/* skills */
let skSel=null;
export function openSkills(){if(game.state!=='play')return;skSel=null;renderSkills()}
function renderSkills(){const T=TREES[game.P.cls],free=pointsFree();openModal(hdr(CLS[game.P.cls].n+' skills',free+' point'+(free===1?'':'s')+' to spend. You earn one each level.')+'<div class="tree" id="tree"></div><div id="skd"></div>');wireClose();const tr=$('#tree');
 T.cols.forEach((cn,ci)=>{const col=document.createElement('div');col.className='tcol';col.innerHTML='<div class="tct">'+cn+'</div>';T.nodes.filter(n=>n.c===ci).sort((a,b)=>a.r-b.r).forEach(n=>{const r=rank(n.id),un=nodeUnlocked(n),b=document.createElement('button');b.className='node'+(r?' has':'')+(un?'':' lock')+(n.act?' act':'')+(skSel===n?' sel':'');b.innerHTML='<span class="ni">'+n.ic+'</span><span class="nr">'+r+'/'+n.max+'</span><span class="nn">'+n.n+'</span>';b.onclick=()=>{skSel=n;renderSkills()};col.appendChild(b)});tr.appendChild(col)});
 const d=$('#skd');if(!skSel){d.innerHTML='<div class="desc">Tap a skill. Active skills go on your skill buttons. The last row opens at level 6.</div>';}else{const n=skSel,r=rank(n.id),un=nodeUnlocked(n);d.innerHTML='<div class="nm">'+n.n+(n.act?' <span class="tag">Active skill '+n.act+'</span>':'')+'</div><div class="desc">'+(r?'Now: '+n.d(r):'Not learned')+'</div>'+(r<n.max?'<div class="desc" style="color:#ffe38a">Next: '+n.d(r+1)+'</div>':'')+(n.act?'<div class="desc">Cooldown '+SKILLCD[game.P.cls][n.act-1]+'s</div>':'')+'<div class="acts"></div>';
  const why=!un?(n.r===2&&game.P.lvl<6?'Requires level 6':'Learn the skill above first'):r>=n.max?'Maxed':free<=0?'No points left':'';d.querySelector('.acts').appendChild(btn(why||'Learn (1 point)',()=>{game.P.sp[n.id]=r+1;calcStats();SFX.lvl();renderSkills()},'',!!why))}
 const cost=game.P.lvl*25;d.appendChild(btn('Reset all for '+cost+' gold',()=>{if(game.P.gold<cost){toast('Not enough gold');return}if(!Object.keys(game.P.sp).length)return;game.P.gold-=cost;game.P.sp={};calcStats();renderSkills()},'alt',game.P.gold<cost))}
/* pause */
export function openPause(){if(game.state!=='play')return;openModal(hdr('Paused','')+'<div class="set"><label>Music <input type="range" min="0" max="1" step="0.05" id="sMus" value="'+settings.music+'"></label><label>Sound effects <input type="range" min="0" max="1" step="0.05" id="sSfx" value="'+settings.sfx+'"></label><label>Enemies <span class="chips" id="sDen"></span></label></div><div class="help" style="padding:0"><p><b>Keyboard:</b> WASD move, Space or click attack, Shift roll, 1 and 2 skills, Q potion, E interact, I bag, C skills.</p><p>Hero: '+game.P.name+', level '+game.P.lvl+' '+RACE[game.P.race].n+' '+CLS[game.P.cls].n+'. World seed '+game.P.seed+'. Foes slain: '+game.P.kills+'.</p></div><div class="acts" id="pa"></div>');wireClose();
 $('#sMus').oninput=e=>{settings.music=+e.target.value;saveSettings()};const den=()=>{const el=$('#sDen');el.innerHTML='';[['few','Few'],['normal','Normal'],['many','Many']].forEach(([k,l])=>{const b=document.createElement('button');b.className='chip'+((settings.density||'normal')===k?' on':'');b.textContent=l;b.onclick=()=>{settings.density=k;saveSettings();den()};el.appendChild(b)})};den();$('#sSfx').oninput=e=>{settings.sfx=+e.target.value;saveSettings();SFX.coin()};
 $('#pa').appendChild(btn('Resume',closeAll));$('#pa').appendChild(btn('Save and quit to title',()=>{save();game.state='menu';setHud(false);showScreen('menu');refreshMenu()},'alt'))}
export function refreshMenu(){const s=loadSave();if(s){$('#mCont').style.display='';$('#mCont').textContent='Continue as '+s.name+' (Lv '+s.lvl+')'}else $('#mCont').style.display='none'}
