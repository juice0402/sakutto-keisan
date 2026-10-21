import { parseNum, fmt } from '../lib/number.mjs';
import { nissu } from '../lib/nissu.mjs';
import { weekdayOf, warekiOf, ymdValue } from '../lib/hizuke.mjs';
import { $, enterToNext, numericOnly, focusHints } from './ui.mjs';

// 日数の計算：はじめの日（はじめは今日）と、何日後かおわりの日のあとから入れたほう。もう片方は点線の答えの欄
// 結果は日めくりカレンダー（おわりの日）と、大きな「◯日後」「◯日前」
const now = new Date();
const TODAY = ymdValue({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
let last = null; // 'days' か 'end'（あとから入れたほう）
const md = (d) => `${d.m}月${d.d}日`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawCal(d) {
  $('c-ym').textContent = d ? `${d.y}年${d.m}月` : '—';
  $('c-d').textContent = d ? String(d.d) : '？';
  const w = d ? weekdayOf(d) : '';
  $('c-w').textContent = d ? `${w}曜日` : '';
  $('c-w').classList.toggle('is-sun', w === '日');
  $('c-w').classList.toggle('is-sat', w === '土');
}

function update() {
  const out = last === 'days' ? 'end' : last === 'end' ? 'days' : null;
  const res = nissu({ start: $('start').value, days: parseNum($('days').value), end: $('end').value, out });
  ['start', 'days', 'end'].forEach((id) => {
    $(`f-${id}`).classList.toggle('has-error', res.field === id);
    $(`f-${id}`).classList.toggle('is-out', res.ok && id === out);
  });
  if (out === 'end') $('end').value = res.ok ? ymdValue(res.end) : '';
  if (out === 'days') $('days').value = res.ok && res.days >= 0 ? String(res.days) : '';
  setNote(res.error || '', !!res.error);
  $('r-start').textContent = res.ok ? `${md(res.start)}（${weekdayOf(res.start)}）から` : '';
  if (!res.ok) {
    drawCal(null);
    $('r-num').textContent = '？';
    $('r-unit').textContent = '日後';
    $('r-say').textContent = '';
    ['d-week', 'd-incl', 'd-wareki'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? (res.missing === 'start' ? 'はじめの日を入れてください' : '何日後かおわりの日を入れてください') : '';
    return;
  }
  drawCal(res.end);
  const before = res.days < 0;
  $('r-num').textContent = fmt(Math.abs(res.days), 0);
  $('r-unit').textContent = res.days === 0 ? '日（同じ日）' : before ? '日前' : '日後';
  $('r-say').textContent = `${res.end.y}年${md(res.end)}（${weekdayOf(res.end)}）`;
  $('d-week').textContent = res.weeks ? `${res.weeks}週${res.weekRest ? `${res.weekRest}日` : ''}` : `${res.weekRest}日`;
  $('d-incl').textContent = `${fmt(res.inclusive, 0)}日`;
  const w = warekiOf(res.end);
  $('d-wareki').textContent = w ? w.text : '—';
  $('r-foot').textContent = '';
}

/* ---- 入力：何日後とおわりの日は、あとから入れたほうから、もう片方を出す ---- */
numericOnly([$('days')]);
$('days').addEventListener('input', (e) => {
  if (e.isTrusted) {
    if ($('days').value.trim() === '') {
      if (last === 'days') { last = null; $('end').value = ''; }
    } else last = 'days';
  }
  update();
});
const onDate = (id) => () => {
  if (id === 'end') {
    if ($('end').value) last = 'end';
    else if (last === 'end') { last = null; $('days').value = ''; }
  }
  update();
};
['start', 'end'].forEach((id) => {
  $(id).addEventListener('input', onDate(id));
  $(id).addEventListener('change', onDate(id));
});
$('clear').addEventListener('click', () => {
  $('start').value = TODAY;
  $('days').value = '';
  $('end').value = '';
  last = null;
  update();
});
enterToNext([$('days')]);
focusHints(document.querySelector('.box-rows'));
if (!$('start').value) $('start').value = TODAY;
update();
