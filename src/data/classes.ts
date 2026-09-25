/* ================= DATA ================= */
/**
 * Heroes have no class: everyone starts the same and fights with whatever weapon they hold
 * (see game/style.ts). The outfit worn under armor is a traveller's tunic and cloak.
 */
export const OUTFIT = { cloth: '#8a5a3a', cloth2: '#5e3c22', cape: '#6b2a24' };
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
