/* ================= APPEARANCE: hero look options for character creation ================= */
/** Hero skin tones (heroes are human). */
export const SKINS = [
  '#fdeee2', // ivory
  '#fbe4d2', // porcelain
  '#f7d4b2', // light
  '#f3c9a6', // peach
  '#eec39a', // warm beige
  '#e9b893', // sand
  '#e6b187', // tan
  '#dca678', // honey
  '#d4a276', // olive
  '#cc9463', // golden
  '#c4895c', // medium brown
  '#b87c52', // caramel
  '#a86f48', // bronze
  '#9a6440', // chestnut
  '#8a5838', // brown
  '#7a4c30', // umber
  '#6c4229', // cocoa
  '#5e3a24', // deep brown
  '#4e2f1d', // espresso
  '#3e2517', // ebony
];

/** Hair colours. */
export const HAIRC = [
  '#1a1210', // jet black
  '#2b1d14', // black
  '#4a2f1c', // dark brown
  '#6b3e1f', // brown
  '#8e3b1e', // auburn
  '#a8552a', // copper
  '#c9803a', // light brown
  '#b8905a', // dark blonde
  '#f0d27a', // blonde
  '#f6e6b0', // platinum
  '#9a948a', // ash grey
  '#c8c4bc', // silver
  '#e4e4e4', // white
  '#b83a3a', // red
  '#e0708a', // rose
  '#7a4ab8', // violet
  '#3a5bb8', // blue
  '#3aa0b8', // teal
  '#4e8a3a', // moss green
  '#2e3a6a', // midnight blue
];

/** Hair styles per gender: [look.hair code, label] (codes are drawn by art/humanoid*.ts). */
export const HAIRS = {
  m: [
    [0, 'Short'],
    [7, 'Buzz cut'],
    [1, 'Long'],
    [2, 'Ponytail'],
    [9, 'Curly'],
    [10, 'Topknot'],
    [8, 'Mohawk'],
    [3, 'Bald'],
  ],
  f: [
    [4, 'Bob'],
    [12, 'Pixie'],
    [1, 'Long'],
    [2, 'Ponytail'],
    [5, 'Braid'],
    [11, 'Pigtails'],
    [9, 'Curly'],
    [6, 'Bun'],
  ],
} as Record<string, [number, string][]>;

/** Facial hair options (male heroes): look.beard 0 none, 1 stubble, 2 full beard. */
export const BEARDS = ['None', 'Stubble', 'Full beard'];
