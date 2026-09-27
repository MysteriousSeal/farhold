/* ================= PORTS ================= */
// What the game model asks of the outside world: sounds, on-screen messages, windows, input
// and the camera. The model only talks to these ports; the controller (controller/wiring.ts)
// plugs the real views in at startup. Until then every port does nothing, which is what the
// unit tests run with.

/** Every sound effect the model can ask for. */
export const SOUNDS = [
  'swing',
  'swing3',
  'shoot',
  'zap',
  'hit',
  'crit',
  'hurt',
  'die',
  'coin',
  'pick',
  'lvl',
  'roll',
  'pot',
  'rare',
  'boom',
  'slam',
  'frost',
  'whirl',
  'buy',
  'anvil',
  'warp',
  'quest',
  'roar',
  'tele',
  'chest',
  'step',
] as const;
export type Sound = (typeof SOUNDS)[number];

const none = () => {};
export const ports = {
  sfx: none as (s: Sound) => void,
  /** a short message at the bottom of the screen */
  toast: none as (msg: string) => void,
  /** the big title across the screen (a zone name, "LEVEL UP"…) */
  banner: none as (big: string, small?: string) => void,
  /** show a full screen ('dead', or '' for none) and the in-game HUD */
  screen: none as (name: string) => void,
  hud: none as (on: boolean) => void,
  /** the movement the player is asking for, as a direction (0, 0 when idle) */
  moveInput: (() => [0, 0]) as () => [number, number],
  /** paint the ground around the hero right away (after arriving somewhere) */
  warmChunks: none as () => void,
  /** the camera zoom (world units to screen pixels) */
  zoom: (() => 1) as () => number,
  /** the screen size in CSS pixels */
  viewSize: (() => [1280, 720]) as () => [number, number],
  /** make a HUD button pulse to draw the eye ('bags' after loot, 'skills' after a level) */
  pulse: none as (button: 'bags' | 'skills') => void,
  /** the red flash when the hero is hurt */
  hurtFlash: none as () => void,
  /** the line under "You died" */
  deathText: none as (text: string) => void,
  /** apply the music and sound volumes from the settings */
  volumes: none as () => void,
  /** windows the model opens when the hero acts on something */
  open: {
    shop: none as (shop, merchant?: boolean) => void,
    smith: none as (village) => void,
    tavern: none as (interior) => void,
    job: none as (interior, idx: number) => void,
  },
};
/** Sound effects by name, as SFX.pick() and so on (they go through ports.sfx). */
export const SFX = Object.fromEntries(SOUNDS.map((s) => [s, () => ports.sfx(s)])) as Record<
  Sound,
  () => void
>;
export const toast = (msg: string) => ports.toast(msg);
export const banner = (big: string, small?: string) => ports.banner(big, small);
