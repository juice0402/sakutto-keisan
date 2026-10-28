import { yukyuFuyo, yukyuDateText, yukyuTenureText, YUKYU_TABLE } from '../lib/yukyu.mjs';
import { ymdValue } from '../lib/hizuke.mjs';
import { $, focusHints } from './ui.mjs';
import { memoOnly, cmYmd } from './choimemo.mjs';

const memo = memoOnly();

// 有給休暇の付与日数：週の日数のマス・入社日・計算する日（はじめは今日）から、いまの日数・次にもらう日・期限・年5日の義務
// 結果は書類の中の勤続の階段（段の高さは付与日数、いまの段に赤ペンの丸）
const now = new Date();
const YK_TODAY = ymdValue({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
let week = 5;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawSteps(n) {
  YUKYU_TABLE[week].forEach((d, i) => {
    const el = $(`yk-${i}`);
    el.style.setProperty('--h', `${(d / 20) * 100}%`);
    el.querySelector('b').textContent = String(d);
    const at = n === null ? -1 : Math.min(n, 6);
    el.classList.toggle('is-past', n !== null && i < at);
    el.classList.toggle('is-now', n !== null && i === at);
  });
}

function update() {
  document.querySelectorAll('.tile[data-week]').forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.week) === week)));
  const res = yukyuFuyo({ hire: $('hire').value, on: $('on').value, week });
  ['hire', 'on'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    drawSteps(null);
    $('r-num').textContent = '？';
    $('r-ten').textContent = '';
    ['d-next', 'd-until', 'd-duty'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? (res.missing === 'on' ? '計算する日を入れてください' : '入社日を入れてください') : '';
    memo(null);
    return;
  }
  drawSteps(res.n >= 0 ? res.n : null);
  $('r-num').textContent = String(res.days);
  $('r-ten').textContent = `勤続${yukyuTenureText(res)}`;
  memo({ q: `${cmYmd($('hire').value)}入社・週${week}日・${cmYmd($('on').value)}`, a: `有給${res.days}日（勤続${yukyuTenureText(res)}）` });
  $('d-next').textContent = `${yukyuDateText(res.next.date)}・${res.next.days}日`;
  $('d-until').textContent = res.cur ? `${yukyuDateText(res.cur.until)}まで` : '—';
  $('d-duty').textContent = res.cur ? (res.duty ? '対象（10日以上）' : '対象外') : '—';
  $('r-foot').textContent = week < 5 ? '週30時間以上なら「週5日」です' : '出勤率8割以上として計算';
}

document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-week]');
  if (!t) return;
  week = Number(t.dataset.week);
  update();
});
['hire', 'on'].forEach((id) => {
  $(id).addEventListener('input', update);
  $(id).addEventListener('change', update);
});
// クリア：入社日を空に、計算する日を今日に、週の日数を週5日以上に
$('clear').addEventListener('click', () => {
  $('hire').value = '';
  $('on').value = YK_TODAY;
  week = 5;
  update();
});
focusHints(document.querySelector('.box-rows'));
if (!$('on').value) $('on').value = YK_TODAY;
update();
