/* ---- enemies ---- */
const HUM=(o)=>Object.assign({kind:'hum',hbY:48},o);
export const ET={
 slime:{n:'Slime',hp:.8,dmg:.7,spd:50,r:13,xp:.8,kind:'slime',ai:'melee',col:'#6fd66a',hbY:30,split:true},
 wolf:{n:'Wolf',hp:.85,dmg:.9,spd:120,r:14,xp:1,kind:'quad',variant:'wolf',ai:'melee',col:'#9a948c',hbY:40},
 icewolf:{n:'Frost wolf',hp:1,dmg:1,spd:125,r:14,xp:1.1,kind:'quad',variant:'icewolf',ai:'melee',col:'#cfe3f0',hbY:40},
 boar:{n:'Boar',hp:1.2,dmg:1.1,spd:70,r:15,xp:1.1,kind:'quad',variant:'boar',ai:'charger',col:'#8a5a3a',hbY:36},
 bat:{n:'Bat',hp:.45,dmg:.6,spd:130,r:10,xp:.6,kind:'bat',ai:'swarm',col:'#5a4670',hbY:48,fly:true},
 spider:{n:'Spider',hp:.8,dmg:1,spd:95,r:14,xp:1,kind:'spider',ai:'lunger',col:'#4a3a4a',hbY:34},
 scorpion:{n:'Scorpion',hp:1,dmg:1.1,spd:75,r:15,xp:1,kind:'scorp',ai:'melee',col:'#c8904a',hbY:34},
 golem:{n:'Golem',hp:2.8,dmg:1.8,spd:42,r:20,xp:2.4,kind:'golem',ai:'slam',col:'#9a9488',hbY:66},
 goblin:HUM({n:'Goblin',hp:1,dmg:1,spd:84,r:12,xp:1,scale:.85,look:{skin:'#86be4e',race:'goblin',cloth:'#7a5a3c',hair:3,pants:'#4a3a2a',eyes:'#ffe14a',angry:true},wep:'club',ai:'melee'}),
 bandit:HUM({n:'Bandit',hp:1.05,dmg:1.1,spd:86,r:12,xp:1.1,look:{skin:'#e6b187',cloth:'#6a5a4a',cowl:'#8a2a24',hair:3,pants:'#3a3030',angry:true},wep:'sword',wcol:'#b8c0c8',ai:'melee'}),
 archer:HUM({n:'Bandit archer',hp:.85,dmg:1.05,spd:70,r:12,xp:1.1,look:{skin:'#c4895c',cloth:'#5a6a4a',cowl:'#4a5a3a',hair:3,pants:'#3a3030',angry:true},wep:'bow',ai:'ranged',range:230}),
 skeleton:HUM({n:'Skeleton',hp:.9,dmg:1.1,spd:74,r:12,xp:1.1,look:{skin:'#ece6d6',cloth:'#d8d0bc',bones:true,pants:'#cfc7b3',boots:'#b3aa94',hair:3,eyes:'#ff5a4a'},wep:'sword',wcol:'#8a8a80',ai:'melee'}),
 skelarcher:HUM({n:'Skeleton archer',hp:.8,dmg:1.1,spd:60,r:12,xp:1.2,look:{skin:'#ece6d6',cloth:'#d8d0bc',bones:true,pants:'#cfc7b3',boots:'#b3aa94',hair:3,eyes:'#ff5a4a'},wep:'bow',ai:'ranged',range:240}),
 orc:HUM({n:'Orc brute',hp:2.3,dmg:1.6,spd:64,r:17,xp:2,scale:1.3,look:{skin:'#5f9150',cloth:'#6a4e36',hair:3,tusks:true,helm:'#7c7f86',pants:'#3f3026',eyes:'#ff4030',bulk:1.1},wep:'axe',ai:'melee'}),
 cultist:HUM({n:'Cultist',hp:.9,dmg:1.2,spd:66,r:12,xp:1.2,look:{skin:'#e6d0c0',cloth:'#6a1a2a',cloth2:'#4a0a1a',robe:true,trim:'#1a0a0a',cowl:'#4a0a1a',hair:3,eyes:'#ffb040'},wep:'orb',orb:'#ff6a2a',ai:'caster',range:220,proj:'fire'}),
 necro:HUM({n:'Necromancer',hp:1.2,dmg:1.2,spd:60,r:12,xp:1.8,look:{skin:'#c8d0c0',cloth:'#3a2a5a',cloth2:'#2a1a4a',robe:true,trim:'#8ef7a0',cowl:'#2a1a4a',hair:3,eyes:'#8ef7a0'},wep:'staff',wcol:'#8ef7a0',ai:'summoner',range:240,proj:'necro'}),
 mummy:HUM({n:'Mummy',hp:1.6,dmg:1.2,spd:52,r:13,xp:1.4,look:{skin:'#d8c8a0',cloth:'#d8c8a0',pants:'#c8b890',boots:'#b8a880',wraps:true,hair:3,eyes:'#6af0ff'},ai:'melee'}),
 yeti:HUM({n:'Yeti',hp:2.4,dmg:1.6,spd:62,r:18,xp:2,scale:1.35,look:{skin:'#9ab8d8',cloth:'#eef4fa',pants:'#dde8f2',boots:'#c8d8e8',fur:true,hair:0,hairC:'#ffffff',eyes:'#1a2a4a',bulk:1.2,gloves:'#eef4fa'},ai:'slam'}),
 wraith:HUM({n:'Wraith',hp:1.3,dmg:1.3,spd:88,r:13,xp:1.5,scale:1.05,float:true,look:{skin:'#2a2140',cloth:'#3b2d5c',noLegs:true,hood:'#2d2248',eyes:'#8ef7ff'},wep:'orb',ai:'caster',range:200,proj:'ice'}),
 demon:HUM({n:'Demon',hp:1.5,dmg:1.5,spd:92,r:14,xp:1.7,scale:1.1,look:{skin:'#c8403a',cloth:'#3a1a1a',pants:'#2a1414',horns:true,hair:3,eyes:'#ffe14a',angry:true,tusks:true},wep:'axe',wcol:'#3a3a42',ai:'melee'}),
};
export const TABLE=[
 [['slime',1],['wolf',1],['goblin',1],['boar',2],['bandit',3],['archer',4],['orc',7]],
 [['wolf',1],['spider',1],['goblin',1],['boar',2],['bandit',3],['archer',4],['orc',6]],
 [['wolf',1],['spider',1],['bandit',1],['boar',2],['archer',3],['orc',6]],
 [['scorpion',1],['bandit',1],['archer',2],['mummy',3],['skelarcher',4],['golem',6]],
 [['icewolf',1],['skeleton',2],['yeti',4],['wraith',5],['golem',7]],
 [['slime',1],['spider',1],['bat',2],['mummy',3],['cultist',4],['necro',5]],
 [['demon',1],['wraith',1],['cultist',1],['bat',1],['golem',2],['necro',2]]];
export const DTABLE=[['skeleton',1],['skelarcher',1],['bat',1],['spider',1],['slime',1],['cultist',3],['mummy',4],['necro',5]];
export function typesFor(tab,l){return tab.filter(e=>e[1]<=l).map(e=>e[0])}
export const GOLEMCOL=[['#9a9488','#ffb13a'],['#8a8a7a','#9aff7a'],['#9a8a78','#ffb13a'],['#c8a070','#ffe06a'],['#a8c8e8','#7ef0ff'],['#6a7a5a','#9aff7a'],['#3a2a40','#ff5a2a']];
