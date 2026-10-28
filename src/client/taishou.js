import { parseNum, fmt } from '../lib/number.mjs';
import { countJudge } from '../lib/taishou.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 買いまわりの1店舗の判定：店の種類・商品の値段・クーポンの値引きから、1店舗に数えるか。棒は数える額（2,000円で右はし）と1,000円の線
const MIN = Number($('calc').dataset.min);
let kind = 'normal';
const ANSWER = { yes: '数える', no: '数えない', first: '初回だけ', maybe: '条件つき' };
const WHY = {
  furusato: '2025年10月1日からの寄付は数えません',
  kinken: '金券は、同じ注文のほかの商品も数えません',
  teiki: '期間中に申し込んだ初回のお届けだけ数えます',
  yoyaku: '数えるのは事前告知の予約アイテムなど4つです',
};

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  document.querySelectorAll('.tile[data-kind]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.kind === kind)));
  const res = countJudge({ kind, price: parseNum($('price').value), coupon: parseNum($('coupon').value) }, MIN);
  ['price', 'coupon'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  setNote(res.error || '', !!res.error);
  const fill = $('g-fill');
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-v').classList.remove('is-no');
    $('d-judge').textContent = '—';
    fill.style.width = '0%';
    $('r-foot').textContent = res.empty ? '商品の値段を入れてください' : '';
    memo(null);
    return;
  }
  $('r-num').textContent = ANSWER[res.status];
  memo({ q: `${$('price').value}円${$('coupon').value ? `・クーポン${$('coupon').value}円` : ''}`, a: ANSWER[res.status] });
  $('r-v').classList.toggle('is-no', res.status === 'no');
  $('d-judge').textContent = res.judge === null ? '—' : `${fmt(res.judge)}円`;
  fill.style.width = res.judge === null ? '0%' : `${Math.min(100, (res.judge / (MIN * 2)) * 100).toFixed(1)}%`;
  fill.classList.toggle('is-short', res.judge !== null && !res.enough);
  $('r-foot').textContent = WHY[kind] || (res.enough ? '' : `あと${fmt(res.short)}円で1店舗です`);
}

document.querySelector('.tiles-3').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-kind]');
  if (!t) return;
  kind = t.dataset.kind;
  update();
});
const inputs = [$('price'), $('coupon')];
numericOnly(inputs);
inputs.forEach((el) => el.addEventListener('input', update));
tidyOnBlur(inputs, true);
enterToNext(inputs);
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  inputs.forEach((el) => { el.value = ''; });
  kind = 'normal';
  update();
});
update();
