/* ================= DATA ================= */
export const CLS = {
  warrior: {
    n: 'Warrior',
    st: { hp: 40, def: 4 },
    cd: 0.36,
    cloth: '#c8423a',
    cloth2: '#8a2a24',
    cape: '#8a2a24',
    desc: 'Blade and grit. Three-hit combos that cleave everything in reach.',
  },
  ranger: {
    n: 'Ranger',
    st: { atk: 1, crit: 6, spd: 14 },
    cd: 0.42,
    cloth: '#3f9150',
    cloth2: '#2a6538',
    cape: '#2a6538',
    desc: 'Bow and speed. Fast arrows that strike from a safe distance.',
  },
  mage: {
    n: 'Mage',
    st: { atk: 4, hp: -10 },
    cd: 0.55,
    cloth: '#4d59c2',
    cloth2: '#323b8a',
    robe: true,
    cape: null,
    desc: 'Arcane staff. Bolts that burst and hit every foe nearby.',
  },
};
/** Hero skin tones (heroes are human). */
export const SKINS = ['#f7d4b2', '#e6b187', '#c4895c', '#8a5838'];
export const HAIRC = ['#2b1d14', '#6b3e1f', '#c9803a', '#f0d27a', '#e4e4e4', '#b83a3a', '#3a5bb8'];
export const HAIRS = ['Short', 'Long', 'Ponytail', 'Bald'];
export const MATS = [
  ['Rusty', '#a07a58'],
  ['Iron', '#9aa3ad'],
  ['Steel', '#cbd5e0'],
  ['Silver', '#eef3f8'],
  ['Mithril', '#8fe3ea'],
  ['Runic', '#86a8ff'],
  ['Obsidian', '#6a5a8a'],
  ['Dragon', '#e25a4a'],
  ['Celestial', '#ffe38a'],
];
export const RAR = [
  { n: 'Common', c: '#e0dccf', m: 1 },
  { n: 'Uncommon', c: '#62d86a', m: 1.2 },
  { n: 'Rare', c: '#4fa6ff', m: 1.45 },
  { n: 'Epic', c: '#c872ff', m: 1.75 },
  { n: 'Legendary', c: '#ffa63a', m: 2.2 },
];
/** Equipment slots (keys of P.eq); both ring slots take items of type 'ring'. */
export const SLOTS = [
  'weapon',
  'helm',
  'armor',
  'gloves',
  'pants',
  'boots',
  'ring',
  'ring2',
  'amulet',
];
/** Display names for equipment slots. */
export const SLOT_NAME = {
  weapon: 'Weapon',
  helm: 'Helm',
  armor: 'Armor',
  gloves: 'Gloves',
  pants: 'Pants',
  boots: 'Boots',
  ring: 'Ring',
  ring2: 'Ring',
  amulet: 'Amulet',
};
export const STATN = {
  hp: 'Health',
  atk: 'Attack',
  def: 'Armor',
  crit: 'Crit chance %',
  critd: 'Crit damage %',
  spd: 'Speed',
  aspd: 'Attack speed %',
  leech: 'Life steal %',
  regen: 'Health regen /s',
  cdr: 'Skill cooldown %',
};
