import type { Rec } from './types';
import { clamp, pick, rand } from '../../core/math';
import { MATS, RAR } from '../data/classes';
import { game } from './state';
/* ---- items ---- */
/**
 * A piece of gear (or the lit torch held in the off hand, kind 'torch'). Saves keep items as
 * plain data; Item.from turns them back into items on load.
 */
export class Item {
  declare id?: number;
  declare slot?: string;
  /** rarity index into RAR (0 common … 4 legendary) */
  r = 0;
  lvl = 1;
  /** material index into MATS */
  declare mat?: number;
  declare style?: number;
  /** smith upgrades, 0..10 */
  declare plus?: number;
  /** weapon class: warrior, ranger or mage */
  declare wc?: string;
  st: Record<string, number> = {};
  declare name?: string;
  /** merchant value in gold */
  declare val?: number;
  /** a lit torch: 'torch', with the seconds it has left */
  declare kind?: string;
  declare left?: number;
  [extra: string]: any;
  constructor(data: Partial<Item> = {}) {
    Object.assign(this, data);
  }
  /** `o` as an Item (itself when it already is one; null stays null). */
  static from(o): Item | null {
    return o == null ? null : o instanceof Item ? o : new Item(o);
  }
  /** Stat `k` with the smith's upgrades: +10% health, attack and armor per level. */
  stat(k: string) {
    const v = this.st[k] || 0;
    return k === 'atk' || k === 'def' || k === 'hp'
      ? Math.round(v * (1 + 0.1 * (this.plus || 0)))
      : v;
  }
  /** "+3 Iron Sword of Kings" */
  get fullName() {
    return (this.plus ? '+' + this.plus + ' ' : '') + this.name;
  }
  /** What the smith asks for the next upgrade. */
  get upgradeCost() {
    return Math.round((20 + this.lvl * 12) * RAR[this.r].m * Math.pow(1.45, this.plus || 0));
  }
  /** Salvaging an item yields half its merchant value. */
  get salvageValue() {
    return Math.ceil((this.val || 0) / 2);
  }
  /** Item level times rarity, +10% per upgrade: how strong a piece is (gear score, rings). */
  get power() {
    return this.lvl * RAR[this.r].m * (1 + 0.1 * (this.plus || 0));
  }
}

export function genItem(lvl, bonus = 0, slot?, minR = 0) {
  slot =
    slot ||
    pick(['weapon', 'weapon', 'helm', 'armor', 'gloves', 'pants', 'boots', 'ring', 'amulet']);
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
  if (slot === 'gloves') {
    add('atk', (1.5 + k * 0.6) * R * v());
    add('aspd', (3 + k * 0.18) * R * v());
  }
  if (slot === 'pants') {
    add('def', (1.5 + k * 0.7) * R * v());
    add('hp', (6 + k * 3) * R * v());
  }
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
  // weapon family: melee (blades and axes) is the most common, then bows and staves
  const q = Math.random(),
    wc = q < 0.5 ? 'warrior' : q < 0.75 ? 'ranger' : 'mage',
    style = (Math.random() * 3) | 0;
  const B = {
    weapon: {
      warrior: ['Sword', 'Axe', 'Greatsword'],
      ranger: ['Shortbow', 'Longbow', 'Recurve'],
      mage: ['Staff', 'Wand', 'Crescent stave'],
    }[wc][style],
    helm: pick(['Cap', 'Helm']),
    armor: pick(['Tunic', 'Hauberk', 'Cuirass']),
    boots: pick(['Boots', 'Greaves', 'Treads']),
    gloves: pick(['Gloves', 'Gauntlets', 'Grips']),
    pants: pick(['Leggings', 'Breeches', 'Legplates']),
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
  return new Item({
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
  });
}
/**
 * One of every helmet look: each metal as a Cap and a Helm.
 * Helms are epic, which is what grows the plume; caps stay plain.
 */
export function helmSkins(lvl) {
  const k = Math.max(1, lvl | 0),
    out = [];
  for (let mat = 0; mat < MATS.length; mat++)
    for (const shape of ['Cap', 'Helm']) {
      const r = shape === 'Helm' ? 3 : 0,
        R = RAR[r].m;
      out.push(
        new Item({
          id: ++game.uidN,
          slot: 'helm',
          r,
          lvl: k,
          mat,
          style: 0,
          plus: 0,
          st: {
            def: Math.round((1 + k * 0.55) * R),
            hp: Math.round((4 + k * 2) * R),
          },
          name: MATS[mat][0] + ' ' + shape,
          val: Math.round(k * 3 * R * R + 2),
        }),
      );
    }
  return out;
}
/**
 * Gear score: one number that grows as you gear up. Each equipped item adds its item level
 * times a rarity factor (Common 1 … Legendary 2.2), +10% per blacksmith upgrade.
 */
export const gearScore = (eq) =>
  Object.values(eq).reduce(
    (a: number, it: any) => a + (it ? Math.round(it.power * 10) : 0),
    0,
  ) as number;
/**
 * Equipment slot an item goes into: its own slot, except rings, which fill an empty ring slot
 * first and otherwise replace the weaker ring.
 */
export function equipSlot(it, eq) {
  if (it.slot !== 'ring') return it.slot;
  if (!eq.ring) return 'ring';
  if (!eq.ring2) return 'ring2';
  return eq.ring.power <= eq.ring2.power ? 'ring' : 'ring2';
}
