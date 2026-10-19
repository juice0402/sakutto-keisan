import { parseNum, fmt } from '../lib/number.mjs';
import { fxSwapEstimate, swapBars, swapText } from '../lib/fx.mjs';
import { $, numericOnly } from './ui.mjs';

// スワップポイントの目安：通貨ペア・買いか売りか・通貨の量から、金利の差で1日の額。1年でたまる（払う）額を棒グラフで
const DEFAULT_QTY = 10000; // はじめは1万通貨
let side = 'buy';
let tileQty = DEFAULT_QTY;

function currentQty() {
  const custom = parseNum($('qty').value);
  if (custom !== null) return Number.isNaN(custom) ? NaN : custom * 10000; // その他は万通貨で入れる
  return tileQty;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawBars(res) {
  const bars = res && res.day !== 0 ? swapBars(365, Math.abs(res.day)) : [];
  const max = bars.length ? bars.at(-1).value : 0;
  $('s-bars').innerHTML = bars.map((b) => `<span class="swap-bar" style="height:${max > 0 ? (b.value / max) * 100 : 0}%"></span>`).join('');
}

function update() {
  const pair = $('pair').value;
  const res = fxSwapEstimate({ pair, side, qty: currentQty() });
  $('f-qty').classList.toggle('has-error', res.field === 'qty');
  const custom = $('qty').value !== '';
  document.querySelectorAll('.tile[data-qty]').forEach((t) => t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.qty) === tileQty)));
  $('f-qty').classList.toggle('is-on', custom);
  setNote(res.error || '', !!res.error);
  const pay = res.ok && res.day < 0;
  $('r-big').classList.toggle('is-error', pay);
  $('s-bars').classList.toggle('is-pay', pay);
  drawBars(res.ok ? res : null);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-unit').textContent = '円';
    $('r-per').textContent = res.empty ? '通貨の量をえらんでください' : '';
    $('r-base').textContent = '';
    return;
  }
  $('r-cap').textContent = '1日に';
  $('r-num').textContent = res.day === 0 ? '0' : `約${swapText(res.day)}`;
  $('r-unit').textContent = res.day === 0 ? '円' : pay ? '円 払う' : '円 もらえる';
  $('r-per').textContent = res.day === 0 ? '金利の差がないので、ほとんどつきません' : `1か月 約${swapText(res.month)}円・1年 約${swapText(res.year)}円`;
  $('r-base').textContent = `金利の差 ${fmt(Math.abs(res.diff), 2)}％・1${res.pair.unit} ${fmt(res.rate, 3)}円で計算`;
}

/* ---- 通貨ペア・買いか売りか ---- */
$('pair').addEventListener('change', update);
document.querySelectorAll('.seg-btn[data-side]').forEach((b) =>
  b.addEventListener('click', () => {
    side = b.dataset.side;
    document.querySelectorAll('.seg-btn[data-side]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  }),
);

/* ---- 通貨の量 ---- */
function fitQty() {
  $('qty').style.width = `${Math.max(1, $('qty').value.length) + 0.2}ch`;
}
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-qty]');
  if (!t) return;
  tileQty = Number(t.dataset.qty);
  $('qty').value = '';
  fitQty();
  update();
});
$('f-qty').addEventListener('click', () => $('qty').focus());
numericOnly([$('qty')]);
$('qty').addEventListener('input', () => {
  fitQty();
  update();
});
$('qty').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    $('qty').blur();
  }
});
// クリア：はじめの1万通貨にもどす（通貨ペアと買い・売りはそのまま）
$('clear').addEventListener('click', () => {
  $('qty').value = '';
  tileQty = DEFAULT_QTY;
  fitQty();
  update();
});
fitQty();
update();
