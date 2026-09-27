import { $ } from '../core/dom';
/* ================= On-screen messages ================= */
// The toast at the bottom of the screen and the zone banner across it (the model asks for
// them through ports.toast and ports.banner).
let toastT;
export function showToast(m) {
  const t = $('#toast');
  if (!t) return; // no page (tests)
  t.textContent = m;
  t.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.opacity = 0), 2200);
}
export function showBanner(big, small?) {
  const z = $('#zone');
  z.innerHTML = big + (small ? '<small>' + small + '</small>' : '');
  z.style.opacity = 1;
  clearTimeout(z.t);
  z.t = setTimeout(() => (z.style.opacity = 0), 2800);
}
