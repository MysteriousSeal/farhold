import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { RAR } from '../data/classes';
import { toast } from '../game/fx';
import { QMAX, TRACK_MAX, abandonQuest, activeQuests, setTracked } from '../game/quests';
import { game } from '../game/state';
import { hdr, openModal, wireClose } from './modal';
import { QICON, questProgress } from './questUi';
/* ================= QUEST JOURNAL (L) ================= */
// Every accepted bounty (up to QMAX), filterable by type, with a Track toggle (up to
// TRACK_MAX shown on the left side of the screen and on the minimap), Abandon, and the most
// recently completed bounties.
type Tab = 'all' | 'kill' | 'boss' | 'cave' | 'done';
const TABS: [Tab, string][] = [
  ['all', 'All'],
  ['kill', 'Hunts'],
  ['boss', 'Bosses'],
  ['cave', 'Caves'],
  ['done', 'Completed'],
];
let tab: Tab = 'all';

const reward = (q) =>
  '<span class="jrw"><b>' +
  q.gold.toLocaleString('en-US') +
  '</b> gold · <b>' +
  q.xp.toLocaleString('en-US') +
  '</b> xp' +
  (q.item ? ' · ' + RAR[q.item].n.toLowerCase() + '+ item' : '') +
  '</span>';
function ago(t: number) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  return h < 24 ? h + ' h ago' : Math.floor(h / 24) + ' d ago';
}

export function openJournal() {
  const act = activeQuests(),
    tracked = act.filter((q) => q.tracked).length;
  openModal(
    hdr(
      'Quest journal',
      act.length +
        ' / ' +
        QMAX +
        ' bounties · ' +
        tracked +
        ' / ' +
        TRACK_MAX +
        ' tracked on screen. Take more at any village bounty board.',
    ) +
      '<div class="jtabs">' +
      TABS.map(
        ([k, n]) =>
          '<button class="jtab' +
          (k === tab ? ' on' : '') +
          '" data-tab="' +
          k +
          '">' +
          n +
          (k === 'done'
            ? ''
            : ' <small>' +
              (k === 'all' ? act.length : act.filter((q) => q.type === k).length) +
              '</small>') +
          '</button>',
      ).join('') +
      '</div><div id="jlist" class="jlist"></div>',
  );
  wireClose();
  document.querySelectorAll<HTMLElement>('.jtab').forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab as Tab;
        openJournal();
      }),
  );
  const list = $('#jlist');
  if (tab === 'done') {
    const log = game.P.questLog;
    list.innerHTML = log.length
      ? log
          .map(
            (q) =>
              '<div class="jq jdone"><span class="jic">' +
              (QICON[q.type] || QICON.kill) +
              '</span><div class="jb"><div class="jn">' +
              q.name +
              ' <span class="jok">✓</span></div><div class="jmeta">' +
              reward(q) +
              '<span class="jago">' +
              ago(q.at) +
              '</span></div></div></div>',
          )
          .join('')
      : '<div class="desc">No bounties completed yet.</div>';
    return;
  }
  const shown = act.filter((q) => tab === 'all' || q.type === tab);
  if (!shown.length) {
    list.innerHTML =
      '<div class="desc">' +
      (act.length
        ? 'No bounties of this kind.'
        : 'Your journal is empty. Visit a village bounty board to take bounties.') +
      '</div>';
    return;
  }
  for (const q of shown) {
    const row = document.createElement('div');
    row.className = 'jq' + (q.tracked ? ' jtracked' : '');
    row.innerHTML =
      '<span class="jic">' +
      (QICON[q.type] || QICON.kill) +
      '</span><div class="jb"><div class="jn">' +
      q.name +
      '</div><div class="desc">' +
      q.desc +
      '</div>' +
      questProgress(q) +
      '<div class="jmeta">' +
      reward(q) +
      '</div></div><div class="jact"></div>';
    const acts = row.querySelector('.jact');
    // track toggle
    const tr = document.createElement('label');
    tr.className = 'jtrack';
    tr.innerHTML = '<input type="checkbox"' + (q.tracked ? ' checked' : '') + '><span>Track</span>';
    tr.querySelector('input').onchange = (e) => {
      const on = (e.target as HTMLInputElement).checked;
      if (!setTracked(q, on)) {
        toast('You can track up to ' + TRACK_MAX + ' bounties');
        (e.target as HTMLInputElement).checked = false;
        return;
      }
      SFX.pick();
      openJournal();
    };
    acts.appendChild(tr);
    // abandon, with a second click to confirm
    const ab = document.createElement('button');
    ab.className = 'btn sm alt';
    ab.textContent = 'Abandon';
    ab.onclick = () => {
      if (ab.dataset.sure) {
        abandonQuest(q);
        openJournal();
      } else {
        ab.dataset.sure = '1';
        ab.textContent = 'Sure?';
        setTimeout(() => {
          if (ab.isConnected) {
            delete ab.dataset.sure;
            ab.textContent = 'Abandon';
          }
        }, 2500);
      }
    };
    acts.appendChild(ab);
    list.appendChild(row);
  }
}
