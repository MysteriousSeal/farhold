import {rand} from '../core/math';
import {settings} from '../core/settings';
/* ================= AUDIO ================= */
export let AC=null,master=null,sfxG=null,musG=null,noiseBuf=null;
export function audioInit(){if(AC){if(AC.state==='suspended')AC.resume();return}try{AC=new(window.AudioContext||(window as any).webkitAudioContext)();master=AC.createGain();master.connect(AC.destination);sfxG=AC.createGain();sfxG.connect(master);musG=AC.createGain();musG.connect(master);
 const comp=AC.createDynamicsCompressor();master.disconnect();master.connect(comp);comp.connect(AC.destination);applyVolumes();
 noiseBuf=AC.createBuffer(1,AC.sampleRate*.6,AC.sampleRate);const a=noiseBuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}catch(e){AC=null}}
export function applyVolumes(){if(!AC)return;sfxG.gain.value=settings.sfx*.45;musG.gain.value=settings.music*.22}
function tone(f,d,type='square',v=.3,slide=0,delay=0,dest?){if(!AC)return;const t=AC.currentTime+delay,o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gn);gn.connect(dest||sfxG);o.start(t);o.stop(t+d+.02)}
function noise(d,v=.3,f=1200,delay=0,q=1,dest?){if(!AC)return;const t=AC.currentTime+delay,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=noiseBuf;fl.type='bandpass';fl.frequency.value=f;fl.Q.value=q;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(gn);gn.connect(dest||sfxG);s.start(t,Math.random()*.3);s.stop(t+d)}
const pv=()=>rand(.9,1.12);
export const SFX={
 swing:()=>noise(.13,.28,2600*pv(),0,1.5),swing3:()=>{noise(.2,.35,1800,0,1.2);tone(160,.15,'triangle',.12,.6)},
 shoot:()=>{tone(720*pv(),.08,'triangle',.14,.5);noise(.06,.15,3200)},zap:()=>{tone(900*pv(),.18,'sawtooth',.08,.3);tone(1400,.1,'sine',.08,.5)},
 hit:()=>{noise(.08,.4,900*pv());tone(170*pv(),.07,'square',.12,.5)},crit:()=>{noise(.12,.45,1400);tone(540,.14,'square',.14,1.6)},
 hurt:()=>{tone(220,.18,'sawtooth',.16,.4);noise(.12,.3,500)},die:()=>{tone(300*pv(),.3,'triangle',.16,.25);noise(.25,.25,600)},
 coin:()=>{tone(1320*pv(),.06,'square',.08);tone(1760,.12,'square',.08,1,.06)},pick:()=>{tone(660,.08,'triangle',.18);tone(990,.1,'triangle',.18,1,.07)},
 lvl:()=>{[523,659,784,1046,1318].forEach((f,i)=>tone(f,.3,'triangle',.18,1,i*.09))},roll:()=>noise(.2,.2,700),pot:()=>{tone(400,.3,'sine',.25,2)},
 rare:()=>{[784,988,1175,1568].forEach((f,i)=>tone(f,.2,'triangle',.15,1,i*.07))},
 boom:()=>{noise(.6,.6,220,0,.7);tone(90,.5,'sine',.5,.4)},slam:()=>{noise(.4,.55,300,0,.8);tone(70,.35,'sine',.45,.5)},
 frost:()=>{noise(.5,.3,5000,0,.6);[1500,1900,2400].forEach((f,i)=>tone(f,.25,'sine',.06,1,i*.04))},
 whirl:()=>{noise(.5,.3,1500,0,.6)},buy:()=>{tone(880,.08,'square',.1);tone(1320,.1,'square',.1,1,.08);tone(1760,.14,'square',.1,1,.16)},
 anvil:()=>{tone(1800*pv(),.25,'triangle',.12);tone(2700,.2,'sine',.06);noise(.05,.2,4000)},
 warp:()=>{tone(200,.8,'sine',.2,6);noise(.8,.15,2000,0,.5)},quest:()=>{[659,784,988,1318].forEach((f,i)=>tone(f,.35,'triangle',.16,1,i*.12))},
 roar:()=>{tone(110,.9,'sawtooth',.2,.5);noise(.9,.3,400,0,.6)},tele:()=>tone(440,.12,'sine',.06,1.5),chest:()=>{noise(.15,.3,800);[523,784,1046].forEach((f,i)=>tone(f,.25,'triangle',.14,1,.1+i*.08))},
 step:()=>noise(.04,.05,1800*pv(),0,2)};
