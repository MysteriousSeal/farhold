import { AC, musG, noiseBuf } from './sfx';
import { clamp, pick } from '../core/math';
import { settings } from '../core/settings';
/* ---- generative music ---- */
const MUS = { mode: 'day', next: 0, step: 0, melo: 0 };
const SCALES = {
  day: [0, 2, 4, 7, 9],
  night: [0, 3, 5, 7, 10],
  dungeon: [0, 1, 3, 7, 8],
  boss: [0, 3, 5, 6, 7, 10],
  menu: [0, 2, 4, 7, 9],
};
const ROOT = { day: 57, night: 52, dungeon: 45, boss: 45, menu: 55 },
  BPM = { day: 88, night: 64, dungeon: 56, boss: 132, menu: 72 };
const PROG = {
  day: [0, 3, 4, 2],
  night: [0, 2, 3, 1],
  dungeon: [0, 1, 0, 3],
  boss: [0, 0, 1, 2],
  menu: [0, 3, 1, 4],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function pluck(f, t, v, dur = 0.6) {
  const o = AC.createOscillator(),
    o2 = AC.createOscillator(),
    gn = AC.createGain(),
    lp = AC.createBiquadFilter();
  o.type = 'triangle';
  o2.type = 'sawtooth';
  o.frequency.value = f;
  o2.frequency.value = f * 1.003;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(f * 6, t);
  lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur);
  gn.gain.setValueAtTime(0, t);
  gn.gain.linearRampToValueAtTime(v, t + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const g2 = AC.createGain();
  g2.gain.value = 0.25;
  o.connect(gn);
  o2.connect(g2);
  g2.connect(gn);
  gn.connect(lp);
  lp.connect(musG);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}
function pad(f, t, dur, v) {
  for (const d of [0.996, 1.004]) {
    const o = AC.createOscillator(),
      gn = AC.createGain(),
      lp = AC.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = f * d;
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(v, t + dur * 0.35);
    gn.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp);
    lp.connect(gn);
    gn.connect(musG);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
function kick(t, v = 0.5) {
  const o = AC.createOscillator(),
    gn = AC.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  gn.gain.setValueAtTime(v, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(gn);
  gn.connect(musG);
  o.start(t);
  o.stop(t + 0.22);
}
function hat(t, v = 0.08, f = 7000, d = 0.05) {
  const s = AC.createBufferSource(),
    fl = AC.createBiquadFilter(),
    gn = AC.createGain();
  s.buffer = noiseBuf;
  fl.type = 'highpass';
  fl.frequency.value = f;
  gn.gain.setValueAtTime(v, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(fl);
  fl.connect(gn);
  gn.connect(musG);
  s.start(t, Math.random() * 0.3);
  s.stop(t + d + 0.01);
}
export function musicTick(mode) {
  if (!AC || settings.music <= 0) return;
  if (mode !== MUS.mode) {
    MUS.mode = mode;
    MUS.step = Math.ceil(MUS.step / 16) * 16;
  }
  const now = AC.currentTime;
  if (MUS.next < now) MUS.next = now + 0.08;
  const spb = 60 / BPM[MUS.mode] / 2;
  while (MUS.next < now + 0.3) {
    musicStep(MUS.next, spb);
    MUS.next += spb;
    MUS.step++;
  }
}
function musicStep(t, spb) {
  const m = MUS.mode,
    sc = SCALES[m],
    root = ROOT[m],
    st = MUS.step % 16,
    bar = Math.floor(MUS.step / 16),
    deg = PROG[m][bar % 4];
  const note = (d, oct = 0) =>
    root + sc[((d % sc.length) + sc.length) % sc.length] + 12 * (oct + Math.floor(d / sc.length));
  if (st === 0) {
    pad(mtof(note(deg, -1)), t, spb * 16, m === 'boss' ? 0.05 : 0.07);
    pad(mtof(note(deg + 2, -1)), t, spb * 16, 0.05);
    if (m !== 'boss') pad(mtof(note(deg + 4, -1)), t, spb * 16, 0.035);
  }
  if (m === 'boss') {
    if (st % 4 === 0) kick(t, 0.55);
    if (st % 4 === 2) hat(t, 0.1, 5000, 0.04);
    if (st === 4 || st === 12) hat(t, 0.2, 1500, 0.12);
    pluck(mtof(note(deg + (st % 3 ? 0 : 2), -1)), t, 0.13, 0.18);
    if (st % 2 === 0 && Math.random() < 0.6)
      pluck(mtof(note(deg + [0, 2, 4, 5][((st / 2) % 4) | 0], 1)), t, 0.09, 0.25);
  } else if (m === 'dungeon') {
    if (st === 0 || st === 10) pluck(mtof(note(deg, -2)), t, 0.2, 1.8);
    if (Math.random() < 0.18) pluck(mtof(note(Math.floor(Math.random() * 7), 1)), t, 0.06, 1.4);
    if (st % 8 === 4) hat(t, 0.03, 3000, 0.2);
  } else {
    const dens = m === 'night' ? 0.35 : m === 'menu' ? 0.45 : 0.55;
    if (st % 4 === 0) pluck(mtof(note(deg, -1)), t, 0.14, 1);
    if (st % 2 === 0 && Math.random() < dens) {
      MUS.melo = clamp(MUS.melo + pick([-2, -1, 1, 1, 2, 0]), -2, 8);
      pluck(mtof(note(deg + MUS.melo, 1)), t, 0.1, 0.7);
    }
    if (m === 'day' && st % 4 === 2) hat(t, 0.025, 8000, 0.03);
  }
}
