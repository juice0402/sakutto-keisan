import { parseNum } from '../lib/number.mjs';
import { hensachi, hsArea, hsX } from '../lib/hensachi.mjs';
import { $, enterToNext, numericOnly, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 偏差値の計算：偏差値の欄か、得点・平均点・標準偏差（あとから入れたほう）から、上位何％と100人中何番くらいか
let from = null; // 'dev' か 'score'
const ALL = ['dev', 'score', 'mean', 'sd'].map((id) => $(id));
const GROUP = ['score', 'mean', 'sd'];
const NAME = { score: '得点', mean: '平均点', sd: '標準偏差', dev: '偏差値' };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const v = (id) => parseNum($(id).value);
  const res = hensachi({ dev: from === 'dev' ? v('dev') : null, score: v('score'), mean: v('mean'), sd: v('sd'), from });
  ALL.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  $('f-dev').classList.toggle('is-out', res.ok && from === 'score');
  if (from === 'score') $('dev').value = res.ok ? res.dev.toFixed(1) : '';
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-unit').textContent = '％';
    $('r-say').textContent = '';
    $('hs-area').setAttribute('d', '');
    $('hs-me').setAttribute('visibility', 'hidden');
    ['d-dev', 'd-up', 'd-low'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? (res.missing === 'dev' ? '偏差値か得点を入れてください' : `${NAME[res.missing]}を入れてください`) : '';
    memo(null);
    return;
  }
  $('r-num').textContent = res.up.num;
  $('r-unit').textContent = res.up.unit;
  $('r-say').textContent = `100人中 ${res.rank}番くらい${res.score !== null ? `・この偏差値は${res.score}点` : ''}`;
  $('hs-area').setAttribute('d', hsArea(res.dev));
  const x = hsX(res.dev);
  $('hs-me').setAttribute('x1', x);
  $('hs-me').setAttribute('x2', x);
  $('hs-me').setAttribute('visibility', 'visible');
  $('d-dev').textContent = res.dev.toFixed(1);
  $('d-up').textContent = `${res.up.num}${res.up.unit}`;
  $('d-low').textContent = `${res.low.num}${res.low.unit}`;
  $('r-foot').textContent = '';
  memo({ q: from === 'dev' ? `偏差値${res.dev.toFixed(1)}` : `得点${$('score').value}点・平均点${$('mean').value}点・標準偏差${$('sd').value}`, a: `上位${res.up.num}${res.up.unit}（偏差値${res.dev.toFixed(1)}）` });
}

numericOnly(ALL);
ALL.forEach((el) => {
  el.addEventListener('input', (e) => {
    if (e.isTrusted) {
      if (el.id === 'dev') {
        if (el.value.trim() === '') { if (from === 'dev') from = null; } else from = 'dev';
      } else if (GROUP.some((id) => $(id).value.trim() !== '')) from = from === 'dev' && el.id !== 'score' && $('score').value.trim() === '' ? 'dev' : 'score';
      else if (from === 'score') { from = null; $('dev').value = ''; }
    }
    update();
  });
  el.addEventListener('focus', () => { if ($(`f-${el.id}`).classList.contains('is-out')) el.select(); });
});
enterToNext(ALL);
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  ALL.forEach((el) => { el.value = ''; });
  from = null;
  update();
});
update();
