import { parseNum, fmt } from '../lib/number.mjs';
import { fxLot, fxLotLoss, yenText, cutPriceText, ratioText, rateDigits, qtyText, FX_PAIRS } from '../lib/fx.mjs';
import { cutChartShape } from '../lib/fx-chart.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// ロットの計算：許せる損 ÷ 損切りの幅 で、取引できる通貨の量（1,000通貨単位で切り捨て）
// 許せる損は、口座の何％かのマスでも入る（マスをえらぶと欄に円で入る。自分で入れたらマスは外す）
let pct = null; // えらんだマスの％
const pair = () => FX_PAIRS.find((p) => p.id === $('pair').value) || FX_PAIRS[0];
const val = (id) => parseNum($(id).value);
const INPUTS = [...document.querySelectorAll('#calc input')]; // ページの上から順（Enter で次へ）

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** まだ入れていない欄のうち、いちばん上の欄を案内する */
function emptyText() {
  if (val('money') === null) return '口座のお金を入れてください';
  if (val('rate') === null) return 'いまのレートを入れてください';
  if (val('loss') === null) return '許せる損を入れてください';
  return '損切りの幅を入れてください';
}

function tag(id, y, text) {
  const el = $(id);
  el.hidden = y === null;
  if (y === null) return;
  el.style.top = `${y}%`;
  el.textContent = text;
}

/* ---- チャート：いまのレート（金の点線）と損切りのライン（赤い点線）。あいだに損の額 ---- */
function drawChart(res) {
  $('c-pair').textContent = pair().name;
  $('c-ratio').textContent = res && res.ratio !== null ? `維持率 ${ratioText(res.ratio)}` : '';
  if (!res) {
    ['c-line', 'c-now', 'c-cut'].forEach((id) => $(id).setAttribute('d', ''));
    $('c-band').setAttribute('height', '0');
    $('c-dot').hidden = true;
    ['t-now', 't-cut', 't-loss'].forEach((id) => tag(id, null));
    return;
  }
  const rate = val('rate');
  const digits = rateDigits(rate);
  const shape = cutChartShape({ rate, price: res.stop });
  $('c-line').setAttribute('d', shape.line);
  $('c-now').setAttribute('d', `M0 ${shape.nowY}H100`);
  $('c-cut').setAttribute('d', `M0 ${shape.cutY}H100`);
  $('c-band').setAttribute('y', String(Math.min(shape.nowY, shape.cutY)));
  $('c-band').setAttribute('height', String(Math.abs(shape.cutY - shape.nowY)));
  $('c-dot').hidden = false;
  $('c-dot').style.left = `${shape.endX}%`;
  $('c-dot').style.top = `${shape.nowY}%`;
  tag('t-now', shape.nowY, `いま ${rate.toFixed(digits)}`);
  tag('t-cut', shape.cutY, `損切り ${cutPriceText(res.stop, 'buy', digits).replace('円', '')}`);
  // 損の額は、あいだが広いときはあいだに、せまいときは損切りのラインのすぐ下に
  const wide = Math.abs(shape.cutY - shape.nowY) >= 24;
  $('t-loss').classList.toggle('is-below', !wide);
  tag('t-loss', wide ? (shape.nowY + shape.cutY) / 2 : shape.cutY, `損 ${yenText(res.under ? 1000 * val('width') : res.lossAt)}`);
}

function update() {
  const res = fxLot({ money: val('money'), loss: val('loss'), width: val('width'), rate: val('rate') });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  document.querySelectorAll('.tile[data-pct]').forEach((t) => {
    t.setAttribute('aria-pressed', String(Number(t.dataset.pct) === pct));
    const m = val('money');
    t.querySelector('small').textContent = m !== null && m > 0 ? yenText(fxLotLoss(m, Number(t.dataset.pct))) : '口座の';
  });
  setNote(res.error || '', !!res.error);
  drawChart(res.ok ? res : null);
  $('r-need').classList.toggle('is-short', !!(res.ok && res.short > 0));
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-price').textContent = '';
    $('r-need').textContent = res.empty ? emptyText() : '';
    memo(null);
    return;
  }
  const digits = rateDigits(val('rate'));
  const stop = cutPriceText(res.stop, 'buy', digits);
  $('r-num').textContent = qtyText(res.qty);
  memo({ q: `口座${yenText(val('money'))}・許せる損${yenText(val('loss'))}・値幅${val('width')}円`, a: `${qtyText(res.qty)}通貨まで` });
  if (res.under) {
    $('r-price').textContent = `1,000通貨だと${yenText(1000 * val('width'))}の損`;
    $('r-need').textContent = '許せる損では1,000通貨に届きません';
    return;
  }
  $('r-price').textContent = `${stop}で損切り`;
  $('r-need').textContent = res.short > 0 ? `取引に必要なお金が${yenText(Math.ceil(res.short))}足りません` : `取引に必要なお金 ${yenText(res.need)}`;
}

/* ---- 許せる損のマス ---- */
function fillLoss() {
  const m = val('money');
  $('loss').value = pct !== null && m !== null && m > 0 ? fmt(fxLotLoss(m, pct), 0) : $('loss').value;
}
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-pct]');
  if (!t) return;
  pct = Number(t.dataset.pct);
  if (val('money') === null) $('loss').value = '';
  fillLoss();
  update();
});

/* ---- 通貨ペア：レートの欄のうすい例を、その通貨ペアらしい数字にする ---- */
$('pair').addEventListener('change', () => {
  const ex = pair().example;
  $('rate').placeholder = ex.toFixed(rateDigits(ex));
  update();
});

numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', (e) => {
  if (e.isTrusted && el.id === 'loss') pct = null; // 自分で入れたら、マスは外す
  if (el.id === 'money') fillLoss();
  update();
}));
tidyOnBlur([$('money'), $('loss')], true);
// クリア：欄を空に、マスを外す（通貨ペアはそのまま）
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = el.defaultValue; });
  pct = null;
  update();
});
enterToNext(INPUTS);
focusHints(document.querySelector('.fx-inputs'));
update();
