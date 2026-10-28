import { parseNum, fmt } from '../lib/number.mjs';
import { calcDiscount, originalFrom } from '../lib/waribiki.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 率ごとの割引（/waribiki/30/ など）：元の値段か割引後の値段のあとから入れたほうから、もう片方を点線の答えの欄に
// 結果は値札（割引率のシールは決まっている）
const RATE = Number($('calc').dataset.rate);
const INPUTS = ['price', 'sale'].map((id) => $(id));
let from = null;
const yen = (x) => `${fmt(x)}円`;

function setNote(text = '', error = false) {
  $('t-note').hidden = !text;
  $('t-note').textContent = text;
  $('t-note').classList.toggle('is-error', error);
}

function update() {
  const out = from === 'price' ? 'sale' : from === 'sale' ? 'price' : null;
  let price = null;
  let sale = null;
  let res = { ok: false, empty: true };
  if (from === 'price') {
    const r = calcDiscount({ price: parseNum($('price').value), rate: RATE });
    res = r;
    if (r.ok) { price = parseNum($('price').value); sale = r.final; }
  } else if (from === 'sale') {
    const r = originalFrom(parseNum($('sale').value), RATE);
    res = r;
    if (r.ok) { price = r.price; sale = parseNum($('sale').value); res.exact = r.exact; }
  }
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', !!res.error && el.id === from);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? fmt(out === 'price' ? price : sale) : '';
  setNote(res.error || '', !!res.error);
  $('tag').classList.toggle('is-empty', !res.ok);
  if (!res.ok) {
    $('t-price').textContent = '？';
    $('t-was').hidden = true;
    $('t-save').textContent = res.empty ? '元の値段を入れてください' : '';
    memo(null);
    return;
  }
  $('t-price').textContent = fmt(sale);
  memo(from === 'sale' ? { q: `${RATE}％オフで${yen(sale)}`, a: `元の値段${from === 'sale' && !res.exact ? '約' : ''}${yen(price)}` } : { q: `${yen(price)}の${RATE}％オフ`, a: yen(sale) });
  $('t-was').hidden = false;
  $('t-was').innerHTML = `元の値段 <s>${from === 'sale' && !res.exact ? '約' : ''}${yen(price)}</s>`;
  $('t-save').textContent = price - sale > 0 ? `${yen(price - sale)} おトク！` : '';
}

numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    if (e.isTrusted) {
      if (el.value.trim() === '') {
        if (from === el.id) {
          from = null;
          INPUTS.forEach((x) => { x.value = ''; });
        }
      } else from = el.id;
    }
    update();
  });
  el.addEventListener('focus', () => { if ($(`f-${el.id}`).classList.contains('is-out')) el.select(); });
});
tidyOnBlur(INPUTS, true);
enterToNext(INPUTS);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((x) => { x.value = ''; });
  from = null;
  update();
});
update();
