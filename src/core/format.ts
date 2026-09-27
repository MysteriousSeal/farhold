/* ================= Formatting ================= */
// Numbers, clocks and text for the screen, shared by the model (toasts) and the views.

/** 12,345 */
export const fmt = (n: number) => n.toLocaleString('en-US');
/** A countdown or duration in milliseconds as m:ss (never negative). */
export const fmtClock = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};
/** How long ago timestamp `t` was: "just now", "5 min ago", "3 h ago", "2 d ago". */
export function ago(t: number) {
  if (!t) return 'long ago';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  return h < 24 ? h + ' h ago' : Math.floor(h / 24) + ' d ago';
}
/** Text made safe to put in HTML. */
export const esc = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
