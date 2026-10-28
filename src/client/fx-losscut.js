import { parseNum, fmt } from '../lib/number.mjs';
import { fxPosition, yenText, cutPriceText, ratioText, rateDigits, FX_PAIRS } from '../lib/fx.mjs';
import { cutChartShape } from '../lib/fx-chart.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// ロスカットの計算：ロスカットまで、あと何円の損か。基準より下のときは、足りないお金（追証の目安）
let side = 'buy'; // 買いか売りか
let tileQty = null; // えらんだマスの通貨の量（「その他」に入れたときは、そちらを使う）
const pair = () => FX_PAIRS.find((p) => p.id === $('pair').value) || FX_PAIRS[0];
const val = (id) => parseNum($(id).value);
const INPUTS = [...document.querySelectorAll('#calc input')]; // ページの上から順（Enter で次へ）

function currentQty() {
  const custom = val('qty');
  if (custom !== null) return Number.isNaN(custom) ? NaN : custom * 10000; // その他は万通貨で入れる
  return tileQty;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function setBig(num, unit, error = false) {
  $('r-num').textContent = num;
  $('r-unit').textContent = unit;
  $('r-big').classList.toggle('is-error', error);
}

/** まだ入れていない欄のうち、いちばん上の欄を案内する */
const emptyText = (res) => {
  if (!res.empty) return '';
  if (currentQty() === null) return '通貨の量をえらんでください';
  if (val('money') === null) return '口座のお金を入れてください';
  if (val('rate') === null) return 'いまのレートを入れてください';
  return 'ロスカットの基準を入れてください';
};

/* ---- チャート：いまのレートの線（金の点線）とロスカットのライン（赤い点線）。あいだはうすい赤、右はしに2つのレート ---- */
function tag(id, y, text) {
  const el = $(id);
  el.hidden = y === null;
  if (y === null) return;
  el.style.top = `${y}%`;
  el.textContent = text;
}

function drawChart(res) {
  const rate = val('rate');
  $('c-pair').textContent = `${pair().name}・${side === 'sell' ? '売り' : '買い'}`;
  $('c-ratio').textContent = res ? `維持率 ${ratioText(res.ratio)}` : '';
  if (!res) {
    ['c-line', 'c-now', 'c-cut'].forEach((id) => $(id).setAttribute('d', ''));
    $('c-band').setAttribute('height', '0');
    $('c-dot').hidden = true;
    tag('t-now', null);
    tag('t-cut', null);
    return;
  }
  const shape = cutChartShape({ rate, price: res.price, never: res.never });
  const digits = rateDigits(rate);
  $('c-line').setAttribute('d', shape.line);
  $('c-now').setAttribute('d', `M0 ${shape.nowY}H100`);
  $('c-cut').setAttribute('d', shape.cutY === null ? '' : `M0 ${shape.cutY}H100`);
  $('c-band').setAttribute('y', String(shape.cutY === null ? 0 : Math.min(shape.nowY, shape.cutY)));
  $('c-band').setAttribute('height', String(shape.cutY === null ? 0 : Math.abs(shape.cutY - shape.nowY)));
  $('c-dot').hidden = false;
  $('c-dot').style.left = `${shape.endX}%`;
  $('c-dot').style.top = `${shape.nowY}%`;
  tag('t-now', shape.nowY, `いま ${rate.toFixed(digits)}`);
  tag('t-cut', shape.cutY, `ロスカット ${cutPriceText(res.price, side, digits).replace('円', '')}`);
}

/** 取引に必要なお金（通貨ペアと量は上のマスで見えているので、金額だけ） */
const needText = (res) => `取引に必要なお金 ${yenText(res.need)}`;

const fxCutQ = () => `${$('pair').selectedOptions[0].textContent}・${side === 'sell' ? '売り' : '買い'}・${fmt(currentQty(), 0)}通貨・口座${fmt(val('money'), 0)}円`;

function show(res) {
  drawChart(res.ok ? res : null);
  $('r-price').textContent = '';
  if (!res.ok) {
    $('r-cap').textContent = 'ロスカットまで、あと';
    setBig('？', '円の損');
    $('r-need').textContent = emptyText(res);
    memo(null);
    return;
  }
  $('r-need').textContent = needText(res);
  if (res.over || res.edge) {
    $('r-cap').textContent = 'ロスカットの基準まで';
    if (res.edge) setBig('ちょうど', '基準です', true);
    else setBig(fmt(Math.ceil(-res.room), 0), '円 足りません', true);
    memo({ q: fxCutQ(), a: res.edge ? 'ロスカットの基準ちょうど' : `基準まで${fmt(Math.ceil(-res.room), 0)}円足りない` });
    return;
  }
  $('r-cap').textContent = 'ロスカットまで、あと';
  setBig(fmt(Math.floor(res.room), 0), '円の損');
  memo({ q: fxCutQ(), a: `ロスカットまであと${fmt(Math.floor(res.room), 0)}円の損` });
  const digits = rateDigits(val('rate'));
  if (res.never) $('r-price').textContent = '0円まで下がってもロスカットになりません';
  else if (side === 'sell') $('r-price').textContent = `${cutPriceText(res.price, 'sell', digits)}まで上がるとロスカット`;
  else $('r-price').textContent = `${cutPriceText(res.price, 'buy', digits)}まで下がるとロスカット`;
}

function update() {
  const qty = currentQty();
  const res = fxPosition({ money: val('money'), qty, rate: val('rate'), cut: val('cut'), side });
  // 入力まちがいの印・えらんでいるマス
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  const custom = $('qty').value !== '';
  document.querySelectorAll('.tile[data-qty]').forEach((t) => t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.qty) === tileQty)));
  $('f-qty').classList.toggle('is-on', custom);
  setNote(res.error || '', !!res.error);
  show(res);
}

/* ---- 通貨ペア・買いか売りか：レートの欄のうすい例を、その通貨ペアらしい数字にする ---- */
function setExamples() {
  const ex = pair().example;
  $('rate').placeholder = ex.toFixed(rateDigits(ex));
}
$('pair').addEventListener('change', () => {
  setExamples();
  update();
});
document.querySelectorAll('.seg-btn[data-side]').forEach((b) =>
  b.addEventListener('click', () => {
    side = b.dataset.side;
    document.querySelectorAll('.seg-btn[data-side]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  }),
);

/* ---- 入力 ---- */
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
numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
$('qty').addEventListener('input', fitQty);
tidyOnBlur([$('money')], true);
// クリア：はじめに入っていた値（ロスカットの基準 100％）にもどす
// 通貨ペアと買い・売りはそのまま（続けて別の数字をためせるように）
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = el.defaultValue; });
  tileQty = null;
  fitQty();
  update();
});
enterToNext(INPUTS);
focusHints(document.querySelector('.fx-inputs'));
fitQty();
setExamples();
update();
