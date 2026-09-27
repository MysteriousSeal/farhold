/* ================= Device ================= */
// What the controls look like on this device, shared by the input controller (which writes
// the touch stick) and the views (which draw the stick and adapt to touch screens).
/** A touch screen (no mouse): on-screen buttons and a stick instead of keys. */
export const isTouch =
  typeof matchMedia !== 'undefined' &&
  (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
/** The touch stick: the touch holding it (null when idle), its origin and its direction. */
export const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
