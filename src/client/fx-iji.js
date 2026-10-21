import { parseNum } from '../lib/number.mjs';
import { fxRatio, yenText, ratioText, qtyText, levText, rateDigits, FX_PAIRS } from '../lib/fx.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// 証拠金維持率：口座のお金といまのレート（ロスカットの計算と同じ順）に、レバレッジか通貨の量のどちらかを入れる。入れた欄から、もう片方の欄と維持率を出す
let from = 'lev'; // いま入れている欄 lev：レバレッジ / qty：通貨の量（もう片方に答えを出す）
const OTHER = { lev: 'qty', qty: 'lev' };
const val = (id) => parseNum($(id).value);
const INPUTS = ['money', 'rate', 'lev', 'qty'].map((id) => $(id));
const GAUGE_MAX = 500; // メーターの右はし（維持率500％）

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 口座の画面のメーター：金の線が維持率（500％まで）、赤いところは100％より下（取引に必要なお金より口座のお金が少ない） */
function drawGauge(res) {
  const ratio = res ? Math.min(GAUGE_MAX, Math.max(0, res.ratio)) : 0;
  $('g-val').setAttribute('stroke-dasharray', `${ratio} 600`);
  $('g-val').classList.toggle('is-low', !!res && res.ratio < 100);
}

/** まだ入れていない欄のうち、いちばん上の欄を案内する */
function emptyText() {
  if (val('money') === null) return '口座のお金を入れてください';
  if (val('rate') === null) return 'いまのレートを入れてください';
  return 'レバレッジか通貨の量を入れてください';
}

function update() {
  const res = fxRatio({ money: val('money'), rate: val('rate'), lev: val('lev'), qty: val('qty'), from });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  // 答えの欄：点線の枠に赤い数字（さわると、まるごと書きかえられる）
  const out = OTHER[from];
  ['lev', 'qty'].forEach((id) => $(`f-${id}`).classList.toggle('is-out', res.ok && id === out));
  $(out).value = res.ok ? (out === 'qty' ? qtyText(res.qty) : levText(res.lev)) : '';
  // 25倍より大きいとき（取引に必要なお金に足りない）は、足りない分を赤い字で
  if (res.ok && res.short > 0) setNote(`口座のお金が ${yenText(Math.ceil(res.short))} 足りません`, true);
  else setNote(res.error || '', !!res.error);
  drawGauge(res.ok ? res : null);
  $('r-num').textContent = res.ok ? ratioText(res.ratio).replace('％', '') : '？';
  $('r-big').classList.toggle('is-error', res.ok && res.short > 0);
  if (!res.ok) {
    $('r-amount').textContent = '';
    $('r-need').textContent = res.empty ? emptyText() : '';
    return;
  }
  $('r-amount').textContent = `取引額 ${yenText(res.amount)}`;
  $('r-need').textContent = `取引に必要なお金 ${yenText(res.need)}`;
}

/* ---- 通貨ペア：レートの欄のうすい例を、その通貨ペアらしい数字にする ---- */
$('pair').addEventListener('change', () => {
  const p = FX_PAIRS.find((x) => x.id === $('pair').value) || FX_PAIRS[0];
  $('rate').placeholder = p.example.toFixed(rateDigits(p.example));
  $('c-pair').textContent = p.name;
  update();
});

/* ---- 入力 ---- */
numericOnly(INPUTS);
['rate', 'money'].forEach((id) => $(id).addEventListener('input', update));
['lev', 'qty'].forEach((id) => {
  const el = $(id);
  el.addEventListener('input', () => {
    from = id;
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur([$('money'), $('qty')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  from = 'lev';
  update();
});
enterToNext(INPUTS.slice(0, 3));
enterToNext([$('qty')]);
focusHints(document.querySelector('.fx-inputs'));
update();
