import {clamp,fbm,lerp,vn} from '../core/math';
/* ================= WORLD ================= */
export const CH=512,RES=4,N=CH/RES;
export const BIOMES=['Meadow','Forest','Autumn wood','Desert','Tundra','Swamp','Blightlands'];
export const corr=d=>clamp((d-5200)/7000,0,1);
export function hField(x,y,d){let h=fbm(x*.0011,y*.0011,4,1)+Math.max(0,1-d/520)*.3;const k=clamp(1-(d-250)/450,0,1);if(k>0)h=lerp(h,clamp(h,.47,.64),k);return h}
export function classify(h,m,tp,c,bl,sw){let b;if(c>.35&&bl+c*.5>.72)b=6;else if(tp<.39)b=4;else if(tp>.605&&m<.49)b=3;else if(m>.59&&tp>.43)b=5;else if(m>.53)b=(tp>.5&&tp<.585)?2:1;else b=0;
 let t;if(h<.36)t=0;else if(h<.40)t=1;else if(h<.425)t=2;else if(h>.745)t=5;else if(h>.675)t=4;else t=3;
 if(b===5&&t===3&&h<.6&&sw>.66)t=1;return t*8+b}
export function terr(x,y){const d=Math.hypot(x,y);
 const h=hField(x,y,d);
 const k=clamp((d-350)/1300,0,1);
 const m=lerp(.47,fbm(x*.0015+40,y*.0015,3,9),k),tp=lerp(.5,fbm(x*.00052-90,y*.00052+30,3,17),k),c=corr(d);
 const bl=c>.35?fbm(x*.0009,y*.0009,2,41):0,sw=vn(x*.009,y*.009,23),q=classify(h,m,tp,c,bl,sw);
 return{h,m,tp,d,t:q>>3,b:q&7,c}}
export const walkT=T=>T.t===2||T.t===3||T.t===4||(T.t===1&&T.b===4);
export const dangerAt=(x,y)=>1+Math.floor(Math.hypot(x,y)/420);
export const COL={
 3:[[120,198,86],[82,160,78],[178,168,84],[232,198,124],[236,242,250],[104,126,76],[108,88,122]],
 2:[[240,218,150],[236,214,150],[234,208,146],[244,218,158],[210,224,238],[130,122,86],[146,122,134]],
 4:[[164,162,152],[150,152,146],[168,156,140],[200,154,112],[198,208,222],[120,122,110],[98,86,112]],
 5:[[118,112,110],[104,100,100],[120,104,96],[170,118,86],[232,238,248],[92,96,88],[70,58,86]],
 1:[[88,170,224],[84,160,214],[90,164,212],[92,176,226],[182,222,242],[90,112,70],[86,70,124]],
 0:[[58,120,192],[54,110,180],[58,112,178],[58,124,196],[92,142,196],[60,82,58],[48,38,86]]};
const _gc=[0,0,0];
export function groundF(t,b,h,c,s1,s2,s3,s4,s5,sw){const a=COL[t][b];let r=a[0],gg=a[1],bb=a[2],s=0;
 if(b!==6&&c>0){const q=c*.35;r=lerp(r,110,q);gg=lerp(gg,92,q);bb=lerp(bb,124,q)}
 if(t===3){s=(Math.floor(s1*3.2)/3-.4)*(b===4?10:20);if(h<.431)s-=7}
 else if(t===2){if(h<.4032)s=-44;else if(h<.407)s=-18}
 else if(t===4){s=(Math.floor(s2*3)/3-.4)*18;if(h<.68)s-=10}
 else if(t===5){s=(Math.floor(h*60)%2?-8:6);if(h<.752)s=-30}
 else if(t===1){if(b===4){s=(s5-.5)*14;if(h>.396)s-=18}else if(b===5){s=(Math.floor(s3*3)/3-.5)*10;if(sw>.655&&h>.425){r=lerp(r,60,.5);gg=lerp(gg,70,.5);bb=lerp(bb,40,.5)}}
  else if(h>.3915){const f=h>.3965?.85:.55;r=lerp(r,222,f);gg=lerp(gg,244,f);bb=lerp(bb,252,f)}else if(h>.384){r=lerp(r,190,.25);gg=lerp(gg,228,.25);bb=lerp(bb,245,.25)}else s=(Math.floor(s3*3)/3-.5)*12}
 else{s=(s4-.5)*10;if(h>.352){r=lerp(r,COL[1][b][0],.35);gg=lerp(gg,COL[1][b][1],.35);bb=lerp(bb,COL[1][b][2],.35)}}
 _gc[0]=r+s;_gc[1]=gg+s;_gc[2]=bb+s;return _gc}
