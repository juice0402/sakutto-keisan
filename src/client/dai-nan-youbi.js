import { daiNanYoubi, ybGrid, ybAhead } from '../lib/dai-nan-youbi.mjs';
import { ymdValue, WEEKDAYS } from '../lib/hizuke.mjs';
import { $ } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 第何曜日の計算：日付（はじめは今日）→ 第何◯曜日か。その月のカレンダーと、これから12か月の同じ第n◯曜日
const now = new Date();
const TODAY = ymdValue({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
const CELLS = [...document.querySelectorAll('.yb-d')];

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const res = daiNanYoubi($('date').value);
  $('f-date').classList.toggle('has-error', !!res.error);
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    $('r-ym').textContent = '';
    $('r-cap').textContent = '？';
    $('r-num').textContent = '？';
    $('r-say').textContent = '';
    CELLS.forEach((c) => { c.textContent = ''; c.className = 'yb-d'; });
    $('r-foot').textContent = res.empty ? '日付を入れてください' : '';
    $('ah-rows').innerHTML = '<tr><td colspan="2">日付を入れると出ます。</td></tr>';
    memo(null);
    return;
  }
  const { date, w, n } = res;
  $('r-ym').textContent = `${date.y}年${date.m}月`;
  $('r-cap').textContent = `${date.m}月${date.d}日は`;
  $('r-num').textContent = res.text;
  memo({ q: `${date.y}年${date.m}月${date.d}日`, a: res.text });
  $('r-say').textContent = res.last ? `この月の最後の${res.youbi}曜日です` : `最後の${res.youbi}曜日は${res.lastDay}日`;
  const grid = ybGrid(date.y, date.m);
  CELLS.forEach((c, i) => {
    const d = grid[i];
    c.textContent = d ? String(d) : '';
    c.className = 'yb-d';
    if (i % 7 === w) c.classList.add('is-col');
    if (i % 7 === 0) c.classList.add('is-sun');
    if (i % 7 === 6) c.classList.add('is-sat');
    if (d === date.d) c.classList.add('is-on');
    if (!d) c.classList.add('is-none');
  });
  $('r-foot').textContent = '';
  $('ah-head').textContent = `第${n}${WEEKDAYS[w]}曜日`;
  $('ah-rows').innerHTML = ybAhead(date.y, date.m, n, w)
    .map((a) => `<tr><td>${a.y}年${a.m}月</td><td class="num">${a.d ? `${a.m}月${a.d}日` : 'なし'}</td></tr>`)
    .join('');
}

$('date').addEventListener('input', update);
$('date').addEventListener('change', update);
$('clear').addEventListener('click', () => {
  $('date').value = TODAY;
  update();
});
if (!$('date').value) $('date').value = TODAY;
update();
