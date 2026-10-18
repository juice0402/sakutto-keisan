import { parseNum, fmt } from '../lib/number.mjs';
import { fxSwap, swapBars, SWAP_PERIODS } from '../lib/fx.mjs';
import { $, enterToNext, numericOnly } from './ui.mjs';

// スワップポイント：1日の額 × 通貨の量 × 日数。たまっていく額を棒グラフで
let tileQty = null; // えらんだマスの通貨の量（「その他」に入れたときは、そちらを使う）
let tileDays = 365; // えらんだ期間（はじめは1年）
const val = (id) => parseNum($(id).value);
const INPUTS = [...document.querySelectorAll('#calc input')];

function currentQty() {
  const custom = val('qty');
  if (custom !== null) return Number.isNaN(custom) ? NaN : custom * 10000; // その他は万通貨で入れる
  return tileQty;
}

const currentDays = () => (val('days') !== null ? val('days') : tileDays);

/** 期間の呼び名：1か月・半年・1年。その他は「◯日」 */
function periodName(days) {
  const p = SWAP_PERIODS.find((x) => x.days === days);
  return p ? p.label : `${fmt(days, 0)}日`;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawBars(res) {
  const bars = res ? swapBars(res.days, res.day) : [];
  const max = bars.length ? bars.at(-1).value : 0;
  $('s-bars').innerHTML = bars.map((b) => `<span class="swap-bar" style="height:${max > 0 ? (b.value / max) * 100 : 0}%"></span>`).join('');
  $('s-end').textContent = `${fmt(res ? res.days : currentDays() || 0, 0)}日`;
}

function update() {
  const days = currentDays();
  const res = fxSwap({ perDay: val('swap'), qty: currentQty(), days });
  ['swap', 'qty', 'days'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  const customQty = $('qty').value !== '';
  document.querySelectorAll('.tile[data-qty]').forEach((t) => t.setAttribute('aria-pressed', String(!customQty && Number(t.dataset.qty) === tileQty)));
  $('f-qty').classList.toggle('is-on', customQty);
  const customDays = $('days').value !== '';
  document.querySelectorAll('.tile[data-days]').forEach((t) => t.setAttribute('aria-pressed', String(!customDays && Number(t.dataset.days) === tileDays)));
  $('f-days').classList.toggle('is-on', customDays);
  setNote(res.error || '', !!res.error);
  $('r-cap').textContent = Number.isInteger(days) && days > 0 ? `${periodName(days)}で` : '持つ期間で';
  if (!res.ok) {
    $('r-num').textContent = '？';
    drawBars(null);
    $('r-per').textContent = res.empty ? '通貨の量とスワップを入れてください' : '';
    return;
  }
  $('r-num').textContent = fmt(Math.floor(res.total), 0);
  drawBars(res);
  $('r-per').textContent = `1日 ${fmt(res.day, 2)}円・1か月 ${fmt(Math.floor(res.month), 0)}円・1年 ${fmt(Math.floor(res.year), 0)}円`;
}

/* ---- 入力 ---- */
function fitTile(id) {
  $(id).style.width = `${Math.max(1, $(id).value.length) + 0.2}ch`;
}
document.querySelectorAll('.tiles').forEach((box) =>
  box.addEventListener('click', (e) => {
    const t = e.target.closest('.tile[data-qty], .tile[data-days]');
    if (!t) return;
    if (t.dataset.qty) {
      tileQty = Number(t.dataset.qty);
      $('qty').value = '';
    } else {
      tileDays = Number(t.dataset.days);
      $('days').value = '';
    }
    fitTile('qty');
    fitTile('days');
    update();
  }),
);
['qty', 'days'].forEach((id) => {
  $(`f-${id}`).addEventListener('click', () => $(id).focus());
  $(id).addEventListener('input', () => fitTile(id));
});
numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  tileQty = null;
  tileDays = 365;
  fitTile('qty');
  fitTile('days');
  update();
});
enterToNext(INPUTS);
fitTile('qty');
fitTile('days');
update();
