import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { BARMAID_LINES, DRINKS, DRINK_TIME } from '../data/tavern';
import { toast } from '../game/fx';
import { save } from '../game/save';
import { game } from '../game/state';
import { calcStats } from '../game/stats';
import { acceptTask, declineTask, patronJob, taskDeliver } from '../game/tavernQuests';
import type { Interior } from '../world/interior';
import { poisNear } from '../world/poi';
import { btn, goldPill, hdr, openModal, wireClose } from './modal';
import { QICON } from './questUi';
import { closeAll } from './screens';
/* ================= UI: the tavern (talking to the barmaid) ================= */
// Drinks give one buff at a time for DRINK_TIME seconds of play (see game/stats.ts), resting
// by the fire restores all health, and rumours pin the nearest unexplored lair or cave on the
// minimap, once per tavern every 10 minutes.

const OUTL = 'stroke="#241a2e" stroke-width="1.8" stroke-linejoin="round"';
/** Drink icons, outlined like the HUD icons. */
export const DRINK_ICON = {
  ale:
    '<svg viewBox="0 0 24 24"><path d="M17 8 Q21.5 8 21.5 12.5 Q21.5 17 17 17" fill="none" stroke="#241a2e" stroke-width="4.2"/><path d="M17 8 Q21.5 8 21.5 12.5 Q21.5 17 17 17" fill="none" stroke="#a8744a" stroke-width="2"/><rect x="4" y="6" width="13" height="16" rx="2.5" fill="#a8744a" ' +
    OUTL +
    '/><rect x="6.5" y="9" width="8" height="10.5" rx="1" fill="#f0a830"/><path d="M4 11 H17 M4 17 H17" stroke="#6b4a32" stroke-width="1.4"/><path d="M3.5 7 Q3.5 2.6 7 3.4 Q9 1.4 11.6 2.8 Q14.5 1.6 16 4 Q18.4 4.6 17.4 7.4 Z" fill="#fff6e0" ' +
    OUTL +
    '/></svg>',
  mead:
    '<svg viewBox="0 0 24 24"><path d="M5 3 H19 L17.5 11 Q16.5 15 12 15 Q7.5 15 6.5 11 Z" fill="#e3b24a" ' +
    OUTL +
    '/><path d="M7 5.6 H17 L16 10.6 Q15.2 13 12 13 Q8.8 13 8 10.6 Z" fill="#f5c451"/><rect x="10.6" y="14.6" width="2.8" height="5" fill="#c9912c" ' +
    OUTL +
    '/><rect x="7" y="19.4" width="10" height="2.6" rx="1.2" fill="#c9912c" ' +
    OUTL +
    '/><path d="M8.4 6.6 Q9 9.5 10.2 10.6" stroke="#fff6c8" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>',
  stew:
    '<svg viewBox="0 0 24 24"><path d="M8 7 Q7 4.5 8.6 3 M12 7 Q11 4 12.8 2.4 M16 7 Q15 4.5 16.6 3" stroke="#e8e4f0" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85"/><ellipse cx="12" cy="11" rx="9.5" ry="3" fill="#c0643a" ' +
    OUTL +
    '/><path d="M2.5 11 Q3 20 12 20 Q21 20 21.5 11 Z" fill="#8a5a36" ' +
    OUTL +
    '/><circle cx="9" cy="10.6" r="1.4" fill="#e8a040"/><circle cx="14" cy="11.2" r="1.2" fill="#62a44a"/><path d="M5 13.5 Q12 16.5 19 13.5" stroke="#6b4a32" stroke-width="1.2" fill="none"/></svg>',
};
const FIRE_ICON =
  '<svg viewBox="0 0 24 24"><path d="M12 2.5 Q17 8 17 13 Q17 19 12 19 Q7 19 7 13 Q7 10 9.5 7.5 Q10 10.5 11.6 11 Q10.6 6.4 12 2.5 Z" fill="#ff7a2a" ' +
  OUTL +
  '/><path d="M12 10 Q14.6 13 14.6 15.4 Q14.6 18 12 18 Q9.4 18 9.4 15.6 Q9.4 13.6 12 10 Z" fill="#ffd24a"/><path d="M4 19.5 L20 22 M4 22 L20 19.5" stroke="#241a2e" stroke-width="4" stroke-linecap="round"/><path d="M4 19.5 L20 22 M4 22 L20 19.5" stroke="#8a5a36" stroke-width="2" stroke-linecap="round"/></svg>';
const EAR_ICON =
  '<svg viewBox="0 0 24 24"><path d="M3 5 Q3 3 5 3 H19 Q21 3 21 5 V14 Q21 16 19 16 H10 L5.5 20.5 V16 H5 Q3 16 3 14 Z" fill="#f4e6c4" ' +
  OUTL +
  '/><circle cx="8" cy="9.5" r="1.4" fill="#6b4a32"/><circle cx="12" cy="9.5" r="1.4" fill="#6b4a32"/><circle cx="16" cy="9.5" r="1.4" fill="#6b4a32"/></svg>';

export const RUMOUR_MS = 10 * 60 * 1000;
const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};
const DIRS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
];
/** "north-east" etc. from a world offset (y grows southward). */
const dirOf = (dx: number, dy: number) =>
  DIRS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];

let greet = '',
  rumourSay = '';
/** A patron's job offer: what they ask, the rewards, and Accept / Decline. */
export function openJob(I: Interior, idx: number) {
  const job = patronJob(I, idx);
  if (!job || job.mark !== '!') return;
  const q = job.q,
    n = I.npcs[idx];
  openModal(
    hdr(q.giver.name, 'A patron at ' + I.name) +
      '<div class="tvquote">“' +
      q.say +
      '”</div><div class="tvrow tvjob">' +
      QICON.task +
      '<div class="tvinf"><b>' +
      q.name +
      '</b><span class="desc">' +
      q.desc +
      '</span></div></div><div class="jrwd tvrwd"><span class="chip"><i class="rc gold"></i>' +
      q.gold +
      '</span><span class="chip"><i class="rc xp"></i>' +
      q.xp +
      ' xp</span>' +
      (q.pot ? '<span class="chip">+1 potion</span>' : '') +
      '</div><div class="acts" id="tvJob"></div>',
  );
  wireClose();
  const a = $('#tvJob');
  a.appendChild(
    btn('Accept', () => {
      if (acceptTask(I, idx)) {
        n.say = 'Much obliged!';
        n.sayT = 2.5;
        closeAll();
      }
    }),
  );
  a.appendChild(
    btn(
      'Decline',
      () => {
        declineTask(I, idx);
        closeAll();
      },
      'alt',
    ),
  );
}
/** Open the barmaid's menu in tavern `I`. */
export function openTavern(I: Interior) {
  taskDeliver(I.key);
  greet = BARMAID_LINES[Math.floor(Math.random() * BARMAID_LINES.length)];
  rumourSay = '';
  renderTavern(I);
}
function renderTavern(I: Interior) {
  const v = I.village,
    lvl = Math.max(1, v.lvl || 1),
    base = 8 + lvl * 3,
    restCost = 10 + lvl * 4,
    P = game.P,
    buff = P.buff;
  openModal(
    hdr(I.name, goldPill(P.gold)) +
      '<div class="tvquote">“' +
      (rumourSay || greet) +
      '”</div><div class="tvsec">Drinks <span class="desc">one at a time, ' +
      DRINK_TIME / 60 +
      ' minutes</span></div><div class="tvdrinks" id="tvDrinks"></div><div class="tvsec">Services</div><div class="tvrows" id="tvRows"></div>',
  );
  wireClose();
  const dr = $('#tvDrinks');
  for (const d of DRINKS) {
    const cost = Math.round(base * d.cost),
      on = buff && buff.k === d.k,
      el = document.createElement('div');
    el.className = 'tvcard' + (on ? ' on' : '');
    el.innerHTML =
      DRINK_ICON[d.k] +
      '<b>' +
      d.n +
      '</b><span class="desc">' +
      d.desc +
      '</span>' +
      (on ? '<span class="tvon">Active · ' + mmss(buff.t) + ' left</span>' : '');
    el.appendChild(
      btn(
        (on ? 'Refill · ' : 'Buy · ') + cost,
        () => {
          P.gold -= cost;
          if (buff && buff.k !== d.k)
            toast('Your ' + DRINKS.find((q) => q.k === buff.k).n.toLowerCase() + ' wears off');
          P.buff = { k: d.k, t: DRINK_TIME };
          calcStats();
          SFX.buy();
          toast(d.n + ': ' + d.desc.toLowerCase() + ' for ' + DRINK_TIME / 60 + ' minutes');
          save();
          renderTavern(I);
        },
        on ? 'alt' : '',
        P.gold < cost,
      ),
    );
    dr.appendChild(el);
  }
  const rows = $('#tvRows'),
    row = (ico: string, name: string, desc: string, b: HTMLElement) => {
      const r = document.createElement('div');
      r.className = 'tvrow';
      r.innerHTML =
        ico + '<div class="tvinf"><b>' + name + '</b><span class="desc">' + desc + '</span></div>';
      r.appendChild(b);
      rows.appendChild(r);
    };
  const full = P.hp >= game.ST.hp;
  row(
    FIRE_ICON,
    'Rest by the fire',
    full ? 'You are already rested.' : 'Restore all your health.',
    btn(
      'Rest · ' + restCost,
      () => {
        P.gold -= restCost;
        P.hp = game.ST.hp;
        SFX.buy();
        toast('You rest by the fire and feel restored');
        renderTavern(I);
      },
      'alt',
      full || P.gold < restCost,
    ),
  );
  P.rumourT = P.rumourT || {};
  const wait = (RUMOUR_MS - (Date.now() - (P.rumourT[I.key] || 0))) / 1000;
  row(
    EAR_ICON,
    'Ask about rumours',
    wait > 0
      ? 'No new gossip yet. Ask again in ' + mmss(wait) + '.'
      : 'Hear of a lair or cave nearby. It is marked on your minimap.',
    btn('Ask', () => askRumour(I), 'alt', wait > 0),
  );
}
/** Pin the nearest uncleared, not yet rumoured lair or cave on the minimap. */
function askRumour(I: Interior) {
  const v = I.village,
    P = game.P;
  P.rumours = P.rumours || [];
  const known = new Set(P.rumours.map((r) => r.key)),
    near = poisNear(v.x, v.y, 3600)
      .filter(
        (p) => (p.kind === 'lair' || p.kind === 'cave') && !P.cleared[p.key] && !known.has(p.key),
      )
      .sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
  P.rumourT[I.key] = Date.now();
  if (!near) {
    rumourSay = 'Quiet times. Nothing out there worth the walk that you have not heard of already.';
  } else {
    const d = Math.hypot(near.x - v.x, near.y - v.y),
      how = d < 1500 ? 'not far' : d < 2600 ? 'a fair walk' : 'a long way',
      dir = dirOf(near.x - v.x, near.y - v.y);
    P.rumours.push({ key: near.key, kind: near.kind, x: near.x, y: near.y });
    rumourSay =
      near.kind === 'lair'
        ? 'They say ' +
          (near.bname || 'something big') +
          ' has made a lair ' +
          how +
          ' to the ' +
          dir +
          '. Travellers go missing near it.'
        : 'There is a cave, ' +
          near.name +
          ', ' +
          how +
          ' to the ' +
          dir +
          '. Nobody who goes in comes out poor, or at all.';
    toast('Rumour marked on your minimap');
  }
  SFX.pick();
  save();
  renderTavern(I);
}
