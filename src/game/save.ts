import {SLOTS} from '../data/classes';
import {game} from './state';
const KEY='farhold_save_v2',OLDKEY='farhold_save_v1';
export function migrate(p){p.sp=p.sp||{};p.wps=p.wps||['v0,0'];p.wpInfo=p.wpInfo||{'v0,0':{name:'Hearthfire',x:0,y:0,lvl:1}};p.home=p.home||'v0,0';p.quests=p.quests||[];p.cleared=p.cleared||{};p.tod=p.tod||.1;p.eq=p.eq||{};for(const k of SLOTS)if(!(k in p.eq))p.eq[k]=null;
 for(const it of[...p.inv,...Object.values(p.eq)])if(it){it.plus=it.plus||0;it.style=it.style||0}p.kills=p.kills||0;return p}
export function save(){if(!game.P)return;try{const s=Object.assign({},game.P);if(game.mode==='dungeon'&&game.P.ret){s.x=game.P.ret.x;s.y=game.P.ret.y}delete s.look;localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
export function loadSave(){try{const s=localStorage.getItem(KEY)||localStorage.getItem(OLDKEY);return s?migrate(JSON.parse(s)):null}catch(e){return null}}
