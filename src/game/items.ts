import type { Rec } from './types';
import { clamp, pick, rand } from '../core/math';
import { MATS, RAR } from '../data/classes';
import { game } from './state';
/* ---- items ---- */

export function genItem(lvl, bonus = 0, slot?, minR = 0) {
  slot = slot || pick(['weapon', 'weapon', 'helm', 'armor', 'boots', 'ring', 'amulet']);
  let r = 0;
  const x = Math.random() - bonus;
  if (x < 0.012) r = 4;
  else if (x < 0.05) r = 3;
  else if (x < 0.16) r = 2;
  else if (x < 0.42) r = 1;
  r = Math.max(r, minR);
  const R = RAR[r].m,
    mat = clamp(Math.floor((lvl - 1) / 4) + (Math.random() < 0.2 ? 1 : 0), 0, MATS.length - 1),
    st: Rec = {},
    k = lvl,
    v = () => rand(0.88, 1.12),
    add = (n, val) => {
      st[n] = (st[n] || 0) + val;
    };
  if (slot === 'weapon') add('atk', (4 + k * 1.7) * R * v());
  if (slot === 'armor') {
    add('def', (2 + k * 0.9) * R * v());
    add('hp', (8 + k * 4) * R * v());
  }
  if (slot === 'helm') {
    add('def', (1 + k * 0.55) * R * v());
    add('hp', (4 + k * 2) * R * v());
  }
  if (slot === 'boots') {
    add('spd', (6 + k * 0.25) * R * v());
    add('def', (1 + k * 0.3) * R * v());
  }
  if (slot === 'ring') {
    add('crit', (2 + k * 0.12) * R * v());
    add('atk', (1 + k * 0.5) * R * v());
  }
  if (slot === 'amulet') add('hp', (6 + k * 3) * R * v());
  const pool = {
    hp: 6 + k * 3,
    atk: 1 + k * 0.6,
    def: 1 + k * 0.4,
    crit: 1 + k * 0.08,
    spd: 4,
    aspd: 3 + k * 0.25,
    critd: 6 + k * 0.4,
    leech: 0.6 + k * 0.03,
    regen: 0.3 + k * 0.1,
    cdr: 3,
  };
  if (slot === 'amulet') {
    const n = pick(['critd', 'regen', 'cdr']);
    add(n, pool[n] * R * v());
  }
  for (let i = 0; i < r; i++) {
    const n = pick(Object.keys(pool));
    add(n, pool[n] * R * v());
  }
  for (const n in st)
    st[n] = ['crit', 'aspd', 'leech', 'regen', 'cdr', 'critd'].includes(n)
      ? Math.round(st[n] * 10) / 10
      : Math.round(st[n]);
  if (st.cdr) st.cdr = Math.min(st.cdr, 20);
  if (st.leech) st.leech = Math.min(st.leech, 6);
  const wc = game.P ? game.P.cls : 'warrior',
    style = (Math.random() * 3) | 0;
  const B = {
    weapon: {
      warrior: ['Sword', 'Axe', 'Greatsword'],
      ranger: ['Shortbow', 'Longbow', 'Recurve'],
      mage: ['Staff', 'Wand', 'Crescent stave'],
    }[wc][style],
    helm: pick(['Cap', 'Helm', 'Coif']),
    armor: pick(['Tunic', 'Hauberk', 'Cuirass']),
    boots: pick(['Boots', 'Greaves', 'Treads']),
    ring: pick(['Ring', 'Band', 'Signet']),
    amulet: pick(['Amulet', 'Pendant', 'Talisman']),
  }[slot];
  const pre =
    r >= 2
      ? pick([
          'Gleaming',
          'Savage',
          'Ancient',
          'Blessed',
          'Radiant',
          'Grim',
          'Storm-forged',
          'Whispering',
          "Kingslayer's",
        ]) + ' '
      : '';
  const suf =
    r >= 1 && Math.random() < 0.65
      ? ' ' +
        pick([
          'of the Bear',
          'of the Fox',
          'of Embers',
          'of the Owl',
          'of Thorns',
          'of the Wolf',
          'of Dawn',
          'of Kings',
          'of the Deep',
          'of Frost',
        ])
      : '';
  return {
    id: ++game.uidN,
    slot,
    r,
    lvl,
    mat,
    style,
    plus: 0,
    wc: slot === 'weapon' ? wc : undefined,
    st,
    name: pre + MATS[mat][0] + ' ' + B + suf,
    val: Math.round(lvl * 3 * R * R + 2),
  };
}
export const itemStat = (it, k) => {
  const v = it.st[k] || 0;
  return k === 'atk' || k === 'def' || k === 'hp' ? Math.round(v * (1 + 0.1 * (it.plus || 0))) : v;
};
export const itemName = (it) => (it.plus ? '+' + it.plus + ' ' : '') + it.name;
export const upCost = (it) =>
  Math.round((20 + it.lvl * 12) * RAR[it.r].m * Math.pow(1.45, it.plus || 0));
/** Salvaging an item yields half its merchant value. */
export const salvageValue = (it) => Math.ceil(it.val / 2);
/** Rarity at and above which bulk salvage keeps items (Epic, Legendary). */
export const SALVAGE_KEEP_R = 3;
/** Bag items that "salvage all" would remove (equipped gear is never included). */
export const salvageable = (inv) => inv.filter((it) => it.r < SALVAGE_KEEP_R);
/** Salvage every bag item below Epic; returns how many items went and the gold gained. */
export function salvageAll(p) {
  const junk = salvageable(p.inv),
    gold = junk.reduce((a, it) => a + salvageValue(it), 0);
  p.inv = p.inv.filter((it) => it.r >= SALVAGE_KEEP_R);
  p.gold += gold;
  return { count: junk.length, gold };
}
