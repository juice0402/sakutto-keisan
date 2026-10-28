import { parseNum, fmt } from '../lib/number.mjs';
import { furusatoFromNotice } from '../lib/furusato.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 控除上限額の計算：住民税の決定通知書の所得割と、所得税率のマスから
let rate = null;
const pct = (x) => `${fmt(x * 100, 3)}%`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const res = furusatoFromNotice({ shotokuwari: parseNum($('shotokuwari').value), rate });
  document.querySelectorAll('.tile[data-rate]').forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.rate) === rate)));
  $('f-shotokuwari').classList.toggle('has-error', res.field === 'shotokuwari');
  setNote(res.error || '', !!res.error);
  $('d-ratio-k').textContent = rate === null ? '特例控除の割合' : `特例控除の割合（${fmt(rate * 100)}%）`;
  if (!res.ok || res.none) {
    $('r-num').textContent = res.none ? '—' : '？';
    ['d-cap', 'd-ratio', 'd-back'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.none ? '所得割がないので、控除はありません' : res.empty ? (res.missing === 'rate' ? '所得税の税率をえらんでください' : '住民税の所得割を入れてください') : '';
    memo(null);
    return;
  }
  $('r-num').textContent = fmt(res.limit);
  memo({ q: `所得割${$('shotokuwari').value}円・所得税率${fmt(rate * 100)}%`, a: `上限${fmt(res.limit)}円` });
  $('d-cap').textContent = `${fmt(res.cap)}円`;
  $('d-ratio').textContent = pct(res.ratio);
  $('d-back').textContent = `${fmt(res.jumin)}円`;
  $('r-foot').textContent = '';
}

document.querySelector('.tiles-4').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-rate]');
  if (!t) return;
  rate = Number(t.dataset.rate);
  update();
});
numericOnly([$('shotokuwari')]);
$('shotokuwari').addEventListener('input', update);
tidyOnBlur([$('shotokuwari')], true);
enterToNext([$('shotokuwari')]); // 次は税率のマスなので、キーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('shotokuwari').value = '';
  rate = null;
  update();
});
update();
