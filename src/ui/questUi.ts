import { game } from '../game/state';
/* ================= QUEST UI helpers (tracker and journal) ================= */
const O = 'stroke="#241a2e" stroke-width="2.2" stroke-linejoin="round"';
/** Quest type icons in the menu-button style: bold outlines and full colour, shown on a cream tile. */
export const QICON = {
  // a tavern job: a tankard on a rolled note
  task: `<svg viewBox="0 0 32 32"><path d="M4 21 Q4 17 8 17 H26 Q29 17 29 20 V26 Q29 29 26 29 H8 Q4 29 4 25 Z" fill="#f4e6c4" ${O}/><path d="M9 22 H24 M9 25.4 H20" stroke="#8a6a4a" stroke-width="1.6" stroke-linecap="round"/><path d="M20 6 Q26 6 26 11 Q26 16 20 16" fill="none" stroke="#241a2e" stroke-width="4.6"/><path d="M20 6 Q26 6 26 11 Q26 16 20 16" fill="none" stroke="#a8744a" stroke-width="2.2"/><rect x="7" y="4" width="14" height="15" rx="2.6" fill="#a8744a" ${O}/><rect x="9.6" y="7" width="8.8" height="9.4" rx="1.2" fill="#f0a830"/><path d="M6.4 5.4 Q6.4 1.4 10 2.2 Q12.4 0.4 15 1.8 Q18.6 0.8 20.4 3.6 Q22.4 4.6 21.2 6.6 Z" fill="#fff6e0" ${O}/></svg>`,
  // a sword with a gold hilt
  kill: `<svg viewBox="0 0 32 32"><path d="M24 3.6 L28.4 8 L13 23.4 L8.6 19 Z" fill="#dfe5f0" ${O}/><path d="M24.2 6.2 L11.4 19" stroke="#fff" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/><path d="M6.4 16.4 L15.6 25.6" stroke="#241a2e" stroke-width="5.6" stroke-linecap="round"/><path d="M6.4 16.4 L15.6 25.6" stroke="#e3b24a" stroke-width="3" stroke-linecap="round"/><path d="M10.6 21.4 L5.6 26.4" stroke="#241a2e" stroke-width="4.8" stroke-linecap="round"/><path d="M10.6 21.4 L5.6 26.4" stroke="#8a5a36" stroke-width="2.4" stroke-linecap="round"/><circle cx="4.6" cy="27.4" r="2.7" fill="#f5c451" ${O}/></svg>`,
  // a horned skull with glowing eyes
  boss: `<svg viewBox="0 0 32 32"><path d="M9.4 11.6 Q2.4 10.4 3 2.6 Q6.4 8 11.6 8.6 Z" fill="#e8dcc0" ${O}/><path d="M22.6 11.6 Q29.6 10.4 29 2.6 Q25.6 8 20.4 8.6 Z" fill="#e8dcc0" ${O}/><path d="M16 6 C23.6 6 26.2 11 25.4 16 C25 18.6 23.2 19.4 22.6 21 V26 H9.4 V21 C8.8 19.4 7 18.6 6.6 16 C5.8 11 8.4 6 16 6 Z" fill="#f5ecd6" ${O}/><ellipse cx="12.4" cy="9.6" rx="3" ry="1.3" fill="#fff" transform="rotate(-20 12.4 9.6)"/><ellipse cx="12" cy="15.6" rx="2.9" ry="3.2" fill="#241a2e"/><ellipse cx="20" cy="15.6" rx="2.9" ry="3.2" fill="#241a2e"/><circle cx="12.3" cy="16" r="1.1" fill="#ff5a3a"/><circle cx="19.7" cy="16" r="1.1" fill="#ff5a3a"/><path d="M16 18.4 L14.6 20.8 H17.4 Z" fill="#241a2e"/><path d="M12.8 22.2 V26 M16 22.2 V26 M19.2 22.2 V26" stroke="#241a2e" stroke-width="1.5"/></svg>`,
  // an open treasure chest full of gold
  cave: `<svg viewBox="0 0 32 32"><path d="M6 13 L7.6 5.4 Q16 2.2 24.4 5.4 L26 13 Z" fill="#c07a3a" ${O}/><path d="M9.6 12.4 L10.6 4.6 M22.4 12.4 L21.4 4.6" stroke="#e3b24a" stroke-width="2"/><path d="M6.6 14.6 Q9.4 9.2 12.6 11.2 Q16 7.6 19.4 11.2 Q22.6 9.2 25.4 14.6 Z" fill="#f5c451" stroke="#241a2e" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12.4" cy="12.4" r="1.1" fill="#fff6c8"/><circle cx="18.6" cy="11.4" r="1" fill="#fff6c8"/><rect x="5" y="13.4" width="22" height="14" rx="3" fill="#9a5a2a" ${O}/><path d="M6.2 21.6 H25.8" stroke="#241a2e" stroke-opacity=".35" stroke-width="1.4"/><rect x="8.4" y="13.4" width="3" height="14" fill="#e3b24a" stroke="#241a2e" stroke-width="1.6"/><rect x="20.6" y="13.4" width="3" height="14" fill="#e3b24a" stroke="#241a2e" stroke-width="1.6"/><rect x="13.4" y="16" width="5.2" height="6.2" rx="1.3" fill="#f5c451" stroke="#241a2e" stroke-width="1.6"/><circle cx="16" cy="18.6" r="1" fill="#241a2e"/></svg>`,
};
/** Where the hero is on the overworld (in a cave or a house: outside its entrance). */
export function heroWorldPos() {
  return game.mode !== 'world' && game.P.ret ? game.P.ret : game.P;
}
/** Compass arrow and distance to a located bounty, e.g. "➤ 1.2k". */
export function questWhere(q) {
  if (q.x == null) return '';
  const h = heroWorldPos(),
    dx = q.x - h.x,
    dy = q.y - h.y,
    d = Math.hypot(dx, dy),
    deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  return (
    '<span class="qdir" style="transform:rotate(' +
    deg +
    'deg)">➤</span>' +
    (d < 120 ? 'here' : d >= 1000 ? (d / 1000).toFixed(1) + 'k' : Math.round(d / 10) * 10)
  );
}
/** Progress line of a bounty: a bar for kill counts, direction and distance otherwise. */
/** Does this quest show a count (kills, or items to collect for a tavern job)? */
export const counted = (q) =>
  q.type === 'kill' ||
  (q.type === 'task' && !q.ready && (q.task === 'hunt' || q.task === 'collect'));
export function questProgress(q) {
  if (q.type === 'task' && !counted(q))
    return (
      '<div class="qsub">' +
      questWhere(q) +
      '<span class="qlv">' +
      (q.ready ? 'Return to ' + q.giver.name : q.task === 'deliver' ? 'Deliver' : 'Search') +
      '</span></div>'
    );
  if (counted(q)) {
    const k = Math.min(1, q.have / q.need);
    return (
      '<div class="qbar"><i style="width:' +
      Math.round(k * 100) +
      '%"></i><b>' +
      Math.min(q.have, q.need) +
      ' / ' +
      q.need +
      '</b></div>'
    );
  }
  return (
    '<div class="qsub">' + questWhere(q) + '<span class="qlv">Danger ' + q.lvl + '</span></div>'
  );
}
