import { SFX } from '../audio/sfx';
import { $ } from '../core/dom';
import { mulberry, strSeed } from '../core/math';
import { RAR } from '../data/classes';
import { ET } from '../data/enemies';
import { toast } from '../game/fx';
import { QMAX, TRACK_MAX, abandonQuest, activeQuests, setTracked } from '../game/quests';
import { game } from '../game/state';
import { hdr, openModal, wireClose } from './modal';
import { QICON, questProgress, questWhere } from './questUi';
/* ================= QUEST JOURNAL (L) ================= */
// Two panes: on the left every accepted bounty (up to QMAX) grouped by type under collapsible
// headers, plus the recently completed ones; on the right the selected bounty's details:
// flavour, target, progress, direction, rewards and the Track (up to TRACK_MAX shown on the
// left side of the screen and on the minimap) and Abandon buttons. On narrow screens the list
// and the details are shown one at a time.

const GROUPS: [string, string][] = [
  ['kill', 'Hunts'],
  ['boss', 'Bosses'],
  ['cave', 'Caves'],
];
const collapsed = new Set<string>(['done']);
let selId: number | string | null = null,
  showDetail = false; // narrow screens: details pane instead of the list

const fmt = (n: number) => n.toLocaleString('en-US');
function ago(t: number) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  return h < 24 ? h + ' h ago' : Math.floor(h / 24) + ' d ago';
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---------- flavour: a seeded line from whoever posted the bounty ---------- */
const FLAVOUR = {
  kill: [
    'The farmers are desperate: their flocks vanish night after night.',
    'Travellers refuse to take the road until something is done.',
    'The hunters of the village are wounded or gone. Someone must step in.',
    'A merchant lost a whole caravan. He pays well to see them thinned out.',
  ],
  boss: [
    'Its shadow has fallen over the region for too long. End it.',
    'Many have tried. The bounty board is covered in their names.',
    'The elders say it will not stop until it is stopped.',
    'Bring back proof, and the village will sing of you.',
  ],
  cave: [
    'Old maps speak of a treasure at the bottom. Nobody has returned to confirm it.',
    'Miners broke into it by accident and fled. Their tools are still down there.',
    'Strange lights flicker at the entrance at night.',
    'Whatever guards the treasure does not like visitors.',
  ],
};
const flavourOf = (q) => {
  const l = FLAVOUR[q.type] || FLAVOUR.kill;
  return l[Math.floor(mulberry(strSeed(String(q.id) + q.name))() * l.length)];
};

/* ---------- panes ---------- */
function row(q, sel: boolean) {
  const prog =
    q.type === 'kill'
      ? Math.min(q.have, q.need) + '/' + q.need
      : q.x != null
        ? '<span class="jdist">' + questWhere(q) + '</span>'
        : '';
  return (
    '<div class="jrow' +
    (sel ? ' sel' : '') +
    (q.done ? ' done' : '') +
    '" data-q="' +
    q.id +
    '"><span class="jic sm">' +
    (QICON[q.type] || QICON.kill) +
    '</span><span class="jrn">' +
    esc(q.name) +
    '</span><span class="jrp">' +
    prog +
    '</span>' +
    (q.done
      ? ''
      : '<label class="jtrk" title="Track on screen"><input type="checkbox" data-t="' +
        q.id +
        '"' +
        (q.tracked ? ' checked' : '') +
        '></label>') +
    '</div>'
  );
}
function listPane(act) {
  let h = '';
  for (const [k, n] of GROUPS) {
    const qs = act.filter((q) => q.type === k);
    if (!qs.length) continue;
    const open = !collapsed.has(k);
    h +=
      '<div class="jgrp" data-g="' +
      k +
      '">' +
      (open ? '▾ ' : '▸ ') +
      n +
      ' <small>' +
      qs.length +
      '</small></div>';
    if (open) h += qs.map((q) => row(q, q.id === selId)).join('');
  }
  if (!act.length)
    h +=
      '<div class="desc jempty">Your journal is empty. Visit a village bounty board to take bounties.</div>';
  const log = game.P.questLog;
  if (log.length) {
    const open = !collapsed.has('done');
    h +=
      '<div class="jgrp" data-g="done">' +
      (open ? '▾ ' : '▸ ') +
      'Completed <small>' +
      log.length +
      '</small></div>';
    if (open)
      h += log
        .map((q, i) => row({ ...q, id: 'log' + i, done: true }, 'log' + i === selId))
        .join('');
  }
  return h;
}
function target(q) {
  if (q.type === 'kill') {
    const D = ET[q.target],
      left = Math.max(0, q.need - q.have);
    return (
      '<div class="jtg"><b>' +
      (D ? D.n : q.target) +
      '</b> · anywhere in the realm · ' +
      (left ? left + ' left to slay' : 'done') +
      '</div>'
    );
  }
  return (
    '<div class="jtg">' +
    (q.x != null ? questWhere(q) + ' away · ' : '') +
    '<b>Danger ' +
    q.lvl +
    '</b></div>'
  );
}
function rewards(q) {
  const it = q.item ? RAR[q.item] : null;
  return (
    '<div class="jrwd"><span class="chip" title="Gold"><i class="rc gold"></i>' +
    fmt(q.gold) +
    '</span><span class="chip" title="Experience"><i class="rc xp"></i>' +
    fmt(q.xp) +
    ' xp</span>' +
    (it
      ? '<span class="chip" title="Item reward"><i class="rc gem" style="background:' +
        it.c +
        '"></i><span style="color:' +
        it.c +
        '">' +
        it.n +
        '+ item</span></span>'
      : '') +
    '</div>'
  );
}
function detailPane(q) {
  if (!q) return '<div class="desc jnone">Select a bounty to see its details.</div>';
  if (q.done)
    return (
      '<div class="jdh"><span class="jic">' +
      (QICON[q.type] || QICON.kill) +
      '</span><div><h3>' +
      esc(q.name) +
      '</h3><div class="jok">✓ Completed ' +
      ago(q.at) +
      '</div></div></div><h4>Rewards received</h4>' +
      rewards(q)
    );
  return (
    '<div class="jdh"><span class="jic">' +
    (QICON[q.type] || QICON.kill) +
    '</span><div><h3>' +
    esc(q.name) +
    '</h3>' +
    target(q) +
    '</div></div><p class="jflav">“' +
    flavourOf(q) +
    '”</p><p class="desc">' +
    esc(q.desc) +
    '</p>' +
    questProgress(q) +
    '<h4>Rewards</h4>' +
    rewards(q) +
    '<div class="jbtns"><button class="btn sm" id="jTrack">' +
    (q.tracked ? 'Untrack' : 'Track') +
    '</button><button class="btn sm alt" id="jAbandon">Abandon</button></div>'
  );
}

export function openJournal() {
  const act = activeQuests(),
    order = GROUPS.flatMap(([k]) => act.filter((q) => q.type === k)),
    log = game.P.questLog.map((q, i) => ({ ...q, id: 'log' + i, done: true }));
  // keep the selection valid: default to the first bounty
  let sel = order.find((q) => q.id === selId) || log.find((q) => q.id === selId) || null;
  if (!sel) {
    sel = order[0] || log[0] || null;
    selId = sel ? sel.id : null;
  }
  const tracked = act.filter((q) => q.tracked).length;
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
        ' tracked on screen',
    ) +
      '<div class="jwrap' +
      (showDetail ? ' det' : '') +
      '"><div class="jlist">' +
      listPane(order) +
      '</div><div class="jdet">' +
      '<button class="btn sm alt jback">‹ Back</button>' +
      detailPane(sel) +
      '</div></div>',
  );
  wireClose();
  const root = document.getElementById('modal');
  root.querySelectorAll<HTMLElement>('.jgrp').forEach(
    (g) =>
      (g.onclick = () => {
        const k = g.dataset.g;
        if (collapsed.has(k)) collapsed.delete(k);
        else collapsed.add(k);
        openJournal();
      }),
  );
  root.querySelectorAll<HTMLElement>('.jrow').forEach(
    (r) =>
      (r.onclick = (e) => {
        if ((e.target as HTMLElement).closest('.jtrk')) return;
        const id = r.dataset.q;
        selId = id.startsWith('log') ? id : Number(id);
        showDetail = true;
        openJournal();
      }),
  );
  root.querySelectorAll<HTMLInputElement>('.jtrk input').forEach(
    (cb) =>
      (cb.onchange = () => {
        const q = act.find((o) => String(o.id) === cb.dataset.t);
        if (!q) return;
        if (!setTracked(q, cb.checked)) {
          toast('You can track up to ' + TRACK_MAX + ' bounties');
          cb.checked = false;
          return;
        }
        SFX.pick();
        openJournal();
      }),
  );
  const back = root.querySelector<HTMLElement>('.jback');
  if (back)
    back.onclick = () => {
      showDetail = false;
      openJournal();
    };
  if (sel && !sel.done) {
    $('#jTrack').onclick = () => {
      if (!setTracked(sel, !sel.tracked)) {
        toast('You can track up to ' + TRACK_MAX + ' bounties');
        return;
      }
      SFX.pick();
      openJournal();
    };
    const ab = $('#jAbandon');
    ab.onclick = () => {
      if (ab.dataset.sure) {
        abandonQuest(sel);
        selId = null;
        showDetail = false;
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
  }
}
