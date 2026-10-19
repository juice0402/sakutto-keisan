import { parseNum, fmt } from '../lib/number.mjs';
import { fxPosition, yenText, cutPriceText, ratioText, rateDigits, FX_PAIRS } from '../lib/fx.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

// ロスカットの計算：ロスカットまで、あと何円の損か。基準より下のときは、足りないお金（追証の目安）
let side = 'buy'; // 買いか売りか
let tileQty = null; // えらんだマスの通貨の量（「その他」に入れたときは、そちらを使う）
const pair = () => FX_PAIRS.find((p) => p.id === $('pair').value) || FX_PAIRS[0];
const val = (id) => parseNum($(id).value);
const INPUTS = [...document.querySelectorAll('#calc input')]; // ページの上から順（Enter で次へ）
const GAUGE_MAX = 500; // メーターの右はし（維持率500％）

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

const emptyText = (res) => {
  if (!res.empty) return '';
  return res.missing === 'cut' ? 'ロスカットの基準を入れてください' : '通貨の量・口座のお金・レートを入れてください';
};

/* ---- メーターと「ロスカットまで あと◯円の損」 ---- */
function drawGauge(res) {
  const ratio = res ? Math.min(GAUGE_MAX, Math.max(0, res.ratio)) : 0;
  $('g-needle').style.transform = `rotate(${(ratio / GAUGE_MAX) * 180}deg)`;
  $('g-cut').setAttribute('stroke-dasharray', `${Math.min(GAUGE_MAX, val('cut') || 0)} 600`);
  $('r-ratio').textContent = res ? ratioText(res.ratio) : '？';
}

/** 取引に必要なお金（通貨ペアと量は上のマスで見えているので、金額だけ） */
const needText = (res) => `取引に必要なお金 ${yenText(res.need)}`;

function show(res) {
  drawGauge(res.ok ? res : null);
  $('r-price').textContent = '';
  if (!res.ok) {
    $('r-cap').textContent = 'ロスカットまで、あと';
    setBig('？', '円の損');
    $('r-need').textContent = emptyText(res);
    return;
  }
  $('r-need').textContent = needText(res);
  if (res.over || res.edge) {
    $('r-cap').textContent = 'ロスカットの基準まで';
    if (res.edge) setBig('ちょうど', '基準です', true);
    else setBig(fmt(Math.ceil(-res.room), 0), '円 足りません', true);
    return;
  }
  $('r-cap').textContent = 'ロスカットまで、あと';
  setBig(fmt(Math.floor(res.room), 0), '円の損');
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
fitQty();
setExamples();
update();
