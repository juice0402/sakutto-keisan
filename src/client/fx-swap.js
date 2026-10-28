import { parseNum, fmt } from '../lib/number.mjs';
import { fxSwapEstimate, swapBars, swapText } from '../lib/fx.mjs';
import { swapChartShape } from '../lib/fx-chart.mjs';
import { $, numericOnly } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// スワップポイントの目安：通貨ペア・買いか売りか・通貨の量から、金利の差で1日の額。1年でたまる（払う）額をチャートの階段の線で
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

/** 点と札（1か月・1年）。札は点の右か左、線のあいた側に */
function mark(dot, label, p, text, right, below) {
  $(dot).hidden = !p;
  $(label).hidden = !p;
  if (!p) return;
  $(dot).style.left = `${p.x}%`;
  $(dot).style.top = `${p.y}%`;
  const el = $(label);
  el.textContent = text;
  el.style.top = `${p.y + (below ? 11 : -11)}%`;
  el.style.left = right ? `calc(${p.x}% + 8px)` : 'auto';
  el.style.right = right ? 'auto' : '6px';
}

function drawChart(res) {
  const pay = !!res && res.day < 0;
  const bars = res && res.day !== 0 ? swapBars(365, Math.abs(res.day)) : [];
  const shape = swapChartShape(bars, pay);
  $('s-line').setAttribute('d', bars.length ? shape.line : '');
  $('s-area').setAttribute('d', bars.length ? shape.area : '');
  document.querySelector('.chart').classList.toggle('is-pay', pay);
  $('c-ans').classList.toggle('is-bottom', pay); // 払うときは線が右下へ下がるので、答えは左下に
  // もらえるときは線が右上へ。1か月の札は点の上、1年の札は点の下（払うときは反対）
  mark('d-month', 't-month', bars.length ? shape.points[0] : null, res ? `1か月 約${swapText(res.month)}円` : '', true, pay);
  mark('d-year', 't-year', bars.length ? shape.points.at(-1) : null, res ? `1年 約${swapText(res.year)}円` : '', false, !pay);
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
  drawChart(res.ok ? res : null);
  $('c-pair').textContent = `${(res.ok ? res.pair : { name: $('pair').selectedOptions[0].textContent }).name}・${side === 'sell' ? '売り' : '買い'}`;
  $('c-diff').textContent = res.ok ? `金利の差 ${fmt(Math.abs(res.diff), 3)}％` : '';
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-unit').textContent = '円';
    $('r-per').textContent = res.empty ? '通貨の量をえらんでください' : '';
    $('r-base').textContent = '';
    memo(null);
    return;
  }
  $('r-cap').textContent = '1日に';
  $('r-num').textContent = res.day === 0 ? '0' : `約${swapText(res.day)}`;
  $('r-unit').textContent = res.day === 0 ? '円' : pay ? '円 払う' : '円 もらえる';
  $('r-per').textContent = res.day === 0 ? '金利の差がないので、ほとんどつきません' : '';
  $('r-base').textContent = `1${res.pair.unit} ${fmt(res.rate, 3)}円で計算`;
  memo({ q: `${res.pair.name}・${side === 'sell' ? '売り' : '買い'}・${fmt(currentQty(), 0)}通貨`, a: res.day === 0 ? '1日0円' : `1日 約${swapText(res.day)}円${pay ? '払う' : 'もらえる'}` });
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
