import { rand } from '../core/math';
import { settings } from '../core/settings';
/* ================= AUDIO ================= */
export let AC = null,
  master = null,
  sfxG = null,
  musG = null,
  noiseBuf = null;
export function audioInit() {
  if (AC) {
    if (AC.state === 'suspended') AC.resume();
    return;
  }
  try {
    AC = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = AC.createGain();
    master.connect(AC.destination);
    sfxG = AC.createGain();
    sfxG.connect(master);
    musG = AC.createGain();
    musG.connect(master);
    const comp = AC.createDynamicsCompressor();
    master.disconnect();
    master.connect(comp);
    comp.connect(AC.destination);
    applyVolumes();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
    const a = noiseBuf.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  } catch (e) {
    AC = null;
  }
}
export function applyVolumes() {
  if (!AC) return;
  sfxG.gain.value = settings.sfx * 0.45;
  musG.gain.value = settings.music * 0.22;
}
function tone(f, d, type = 'square', v = 0.3, slide = 0, delay = 0, dest?) {
  if (!AC) return;
  const t = AC.currentTime + delay,
    o = AC.createOscillator(),
    gn = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  gn.gain.setValueAtTime(v, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(gn);
  gn.connect(dest || sfxG);
  o.start(t);
  o.stop(t + d + 0.02);
}
function noise(d, v = 0.3, f = 1200, delay = 0, q = 1, dest?) {
  if (!AC) return;
  const t = AC.currentTime + delay,
    s = AC.createBufferSource(),
    fl = AC.createBiquadFilter(),
    gn = AC.createGain();
  s.buffer = noiseBuf;
  fl.type = 'bandpass';
  fl.frequency.value = f;
  fl.Q.value = q;
  gn.gain.setValueAtTime(v, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(fl);
  fl.connect(gn);
  gn.connect(dest || sfxG);
  s.start(t, Math.random() * 0.3);
  s.stop(t + d);
}
const pv = () => rand(0.9, 1.12);
export const SFX = {
  swing: () => noise(0.13, 0.28, 2600 * pv(), 0, 1.5),
  swing3: () => {
    noise(0.2, 0.35, 1800, 0, 1.2);
    tone(160, 0.15, 'triangle', 0.12, 0.6);
  },
  shoot: () => {
    tone(720 * pv(), 0.08, 'triangle', 0.14, 0.5);
    noise(0.06, 0.15, 3200);
  },
  zap: () => {
    tone(900 * pv(), 0.18, 'sawtooth', 0.08, 0.3);
    tone(1400, 0.1, 'sine', 0.08, 0.5);
  },
  hit: () => {
    noise(0.08, 0.4, 900 * pv());
    tone(170 * pv(), 0.07, 'square', 0.12, 0.5);
  },
  crit: () => {
    noise(0.12, 0.45, 1400);
    tone(540, 0.14, 'square', 0.14, 1.6);
  },
  hurt: () => {
    tone(220, 0.18, 'sawtooth', 0.16, 0.4);
    noise(0.12, 0.3, 500);
  },
  die: () => {
    tone(300 * pv(), 0.3, 'triangle', 0.16, 0.25);
    noise(0.25, 0.25, 600);
  },
  coin: () => {
    tone(1320 * pv(), 0.06, 'square', 0.08);
    tone(1760, 0.12, 'square', 0.08, 1, 0.06);
  },
  pick: () => {
    tone(660, 0.08, 'triangle', 0.18);
    tone(990, 0.1, 'triangle', 0.18, 1, 0.07);
  },
  lvl: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, 1, i * 0.09));
  },
  roll: () => noise(0.2, 0.2, 700),
  pot: () => {
    tone(400, 0.3, 'sine', 0.25, 2);
  },
  rare: () => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, 1, i * 0.07));
  },
  boom: () => {
    noise(0.6, 0.6, 220, 0, 0.7);
    tone(90, 0.5, 'sine', 0.5, 0.4);
  },
  slam: () => {
    noise(0.4, 0.55, 300, 0, 0.8);
    tone(70, 0.35, 'sine', 0.45, 0.5);
  },
  frost: () => {
    noise(0.5, 0.3, 5000, 0, 0.6);
    [1500, 1900, 2400].forEach((f, i) => tone(f, 0.25, 'sine', 0.06, 1, i * 0.04));
  },
  whirl: () => {
    noise(0.5, 0.3, 1500, 0, 0.6);
  },
  buy: () => {
    tone(880, 0.08, 'square', 0.1);
    tone(1320, 0.1, 'square', 0.1, 1, 0.08);
    tone(1760, 0.14, 'square', 0.1, 1, 0.16);
  },
  anvil: () => {
    tone(1800 * pv(), 0.25, 'triangle', 0.12);
    tone(2700, 0.2, 'sine', 0.06);
    noise(0.05, 0.2, 4000);
  },
  warp: () => {
    tone(200, 0.8, 'sine', 0.2, 6);
    noise(0.8, 0.15, 2000, 0, 0.5);
  },
  quest: () => {
    [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.16, 1, i * 0.12));
  },
  roar: () => {
    tone(110, 0.9, 'sawtooth', 0.2, 0.5);
    noise(0.9, 0.3, 400, 0, 0.6);
  },
  tele: () => tone(440, 0.12, 'sine', 0.06, 1.5),
  chest: () => {
    noise(0.15, 0.3, 800);
    [523, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, 1, 0.1 + i * 0.08));
  },
  step: () => noise(0.04, 0.05, 1800 * pv(), 0, 2),
};
