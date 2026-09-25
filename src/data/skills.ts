import {game} from '../game/state';
/* ---- skill trees ---- */
export const TREES={
 warrior:{cols:['Blade','Iron','Techniques'],nodes:[
  {id:'a0',c:0,r:0,n:'Sharpened steel',ic:'⚔',max:5,d:r=>'+'+6*r+'% damage'},
  {id:'a1',c:0,r:1,n:'Cleave',ic:'◗',max:3,d:r=>'+'+15*r+'% swing reach and arc'},
  {id:'a2',c:0,r:2,n:'Executioner',ic:'✖',max:3,d:r=>'+'+25*r+'% critical damage'},
  {id:'b0',c:1,r:0,n:'Toughness',ic:'♥',max:5,d:r=>'+'+7*r+'% health'},
  {id:'b1',c:1,r:1,n:'Plate training',ic:'⛨',max:3,d:r=>'+'+12*r+'% armor'},
  {id:'b2',c:1,r:2,n:'Second wind',ic:'✚',max:3,d:r=>'Regenerate '+(.4*r).toFixed(1)+'% health per second'},
  {id:'s1',c:2,r:0,n:'Whirlwind',ic:'🌀',max:4,act:1,d:r=>'Spin for 0.7s, striking all nearby foes. '+(55+15*r)+'% damage per hit'},
  {id:'c1',c:2,r:1,n:'Battle rhythm',ic:'⟳',max:3,d:r=>'-'+10*r+'% skill cooldowns'},
  {id:'s2',c:2,r:2,n:'Leap slam',ic:'⤓',max:4,act:2,d:r=>'Leap onto a foe, stunning all around. '+(170+30*r)+'% damage'}]},
 ranger:{cols:['Marksman','Survival','Techniques'],nodes:[
  {id:'a0',c:0,r:0,n:'Deadeye',ic:'◎',max:5,d:r=>'+'+4*r+'% crit chance'},
  {id:'a1',c:0,r:1,n:'Piercing arrows',ic:'➶',max:2,d:r=>'Arrows pierce '+r+' more '+(r>1?'foes':'foe')},
  {id:'a2',c:0,r:2,n:'Hunter\'s focus',ic:'⚔',max:3,d:r=>'+'+10*r+'% damage'},
  {id:'b0',c:1,r:0,n:'Fleet foot',ic:'»',max:4,d:r=>'+'+5*r+'% movement speed'},
  {id:'b1',c:1,r:1,n:'Tumble',ic:'↻',max:3,d:r=>'-'+15*r+'% roll cooldown'},
  {id:'b2',c:1,r:2,n:'Vitality',ic:'♥',max:3,d:r=>'+'+8*r+'% health'},
  {id:'s1',c:2,r:0,n:'Volley',ic:'⋔',max:4,act:1,d:r=>'Loose a fan of '+(6+r)+' arrows, '+(60+10*r)+'% damage each'},
  {id:'c1',c:2,r:1,n:'Quickdraw',ic:'⟳',max:3,d:r=>'-'+10*r+'% skill cooldowns, +'+5*r+'% attack speed'},
  {id:'s2',c:2,r:2,n:'Rain of arrows',ic:'☔',max:4,act:2,d:r=>'Arrows rain on an area for 1.2s. '+(45+10*r)+'% damage per volley'}]},
 mage:{cols:['Arcana','Ward','Techniques'],nodes:[
  {id:'a0',c:0,r:0,n:'Potency',ic:'✦',max:5,d:r=>'+'+6*r+'% damage'},
  {id:'a1',c:0,r:1,n:'Unstable magic',ic:'✺',max:3,d:r=>'+'+15*r+'% blast radius'},
  {id:'a2',c:0,r:2,n:'Twin cast',ic:'⁂',max:3,d:r=>r*10+'% chance to cast bolts twice'},
  {id:'b0',c:1,r:0,n:'Arcane ward',ic:'⛨',max:3,d:r=>'+'+10*r+'% armor, +'+4*r+'% health'},
  {id:'b1',c:1,r:1,n:'Soul leech',ic:'❦',max:3,d:r=>'Heal for '+(1.5*r).toFixed(1)+'% of damage dealt'},
  {id:'b2',c:1,r:2,n:'Vitality',ic:'♥',max:3,d:r=>'+'+8*r+'% health'},
  {id:'s1',c:2,r:0,n:'Frost nova',ic:'❄',max:4,act:1,d:r=>'Freeze all nearby foes for '+(1.6+.2*r).toFixed(1)+'s. '+(90+20*r)+'% damage'},
  {id:'c1',c:2,r:1,n:'Focus',ic:'⟳',max:3,d:r=>'-'+10*r+'% skill cooldowns'},
  {id:'s2',c:2,r:2,n:'Meteor',ic:'☄',max:4,act:2,d:r=>'Call a meteor that scorches the ground. '+(260+40*r)+'% damage'}]}};
export const SKILLCD={warrior:[7,10],ranger:[5,11],mage:[7,12]};
export const SKILLN={warrior:['Whirlwind','Leap slam'],ranger:['Volley','Rain of arrows'],mage:['Frost nova','Meteor']};
export const rank=id=>(game.P.sp&&game.P.sp[id])||0;
export function nodeUnlocked(n){if(n.r===0)return true;const prev=TREES[game.P.cls].nodes.find(o=>o.c===n.c&&o.r===n.r-1);return rank(prev.id)>0&&(n.r<2||game.P.lvl>=6)}
export function pointsFree(){let used=0;for(const k in game.P.sp)used+=game.P.sp[k];return(game.P.lvl-1)-used}
