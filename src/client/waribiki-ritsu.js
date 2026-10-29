import { parseNum, fmt } from '../lib/number.mjs';
import { calcRate, rateFromOff, wariLabel } from '../lib/waribiki.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgTag } from './share-img.mjs';

const memo = choiMemo('waribiki-ritsu.png');

// 割引率の計算：元の値段と、割引後の値段か値引きの額（あとから入れたほう）から何％オフか。もう片方の欄に答え（点線の枠に赤い数字）
let from = 'sale';
const INPUTS = ['price', 'sale', 'off'].map((id) => $(id));
const val = (id) => parseNum($(id).value);
const yen = (x) => `${fmt(x)}円`;
let lastKey = '';

function setNote(text = '', error = false) {
  $('t-note').hidden = !text;
  $('t-note').textContent = text;
  $('t-note').classList.toggle('is-error', error);
}

/** 元の値段の帯を、払う分と値引きの分に分ける（高くなったときは、元の値段と高い分） */
function drawBar(r, price) {
  const w = (id, x) => { $(id).style.width = `${Math.max(0, x) * 100}%`; };
  if (!r) {
    ['b-pay', 'b-off', 'b-up'].forEach((id) => w(id, 0));
    $('b-left').textContent = '払う';
    $('b-right').textContent = '値引き';
    return;
  }
  if (r.increase) {
    w('b-pay', price / r.sale);
    w('b-off', 0);
    w('b-up', -r.off / r.sale);
    $('b-left').textContent = `元の値段 ${yen(price)}`;
    $('b-right').textContent = `高い分 ${yen(-r.off)}`;
    return;
  }
  w('b-pay', r.sale / price);
  w('b-off', r.off / price);
  w('b-up', 0);
  $('b-left').textContent = `払う ${yen(r.sale)}`;
  $('b-right').textContent = `値引き ${yen(r.off)}`;
}

function update() {
  const price = val('price');
  const res = from === 'off' ? rateFromOff({ price, off: val('off') }) : calcRate({ price, sale: val('sale') });
  const out = from === 'off' ? 'sale' : 'off';
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  $(`f-${from}`).classList.remove('is-out');
  $(`f-${out}`).classList.toggle('is-out', res.ok && !res.increase);
  $(out).value = res.ok && !res.increase ? fmt(out === 'off' ? res.off : res.sale) : '';
  drawBar(res.ok ? res : null, price);
  const tag = $('tag');
  tag.classList.toggle('is-empty', !res.ok);
  $('t-was').hidden = !res.ok;
  $('t-conv').hidden = true;
  $('t-save').classList.remove('is-strong');
  if (!res.ok) {
    $('t-price').textContent = '？';
    $('t-unit').textContent = '％オフ';
    $('t-save').textContent = res.empty ? (price === null ? '元の値段を入れてください' : '割引後の値段を入れてください') : '';
    setNote(res.error || '', !!res.error);
    lastKey = '';
    memo(null);
    return;
  }
  $('t-was').innerHTML = `元の値段 <s>${yen(price)}</s>`;
  const exactRate = Math.abs(res.rate * 10 - Math.round(res.rate * 10)) < 1e-9;
  memo({
    q: `${yen(price)} → ${yen(res.sale)}`,
    a: res.increase ? `${fmt(-res.rate, 1)}％高い` : `${fmt(res.rate, 1)}％オフ`,
    img: () => imgTag({
      was: yen(price),
      price: `${exactRate ? '' : '約'}${fmt(res.increase ? -res.rate : res.rate, 1)}`,
      unit: res.increase ? '％高い' : '％オフ',
      rate: '',
      save: res.increase ? `${yen(-res.off)} 高い` : res.off > 0 ? `${yen(res.off)} おトク` : '割引なし',
      conv: res.increase ? `いまの値段 ${yen(res.sale)}` : res.off > 0 && exactRate ? `${wariLabel(res.rate)}・いまの値段 ${yen(res.sale)}` : `いまの値段 ${yen(res.sale)}`,
    }),
  });
  if (res.increase) {
    $('t-price').textContent = fmt(-res.rate, 1);
    $('t-unit').textContent = '％高い';
    $('t-save').textContent = `${yen(-res.off)} 高くなっています`;
    setNote('');
  } else {
    const exact = Math.abs(res.rate * 10 - Math.round(res.rate * 10)) < 1e-9;
    $('t-price').textContent = fmt(res.rate, 1);
    $('t-unit').textContent = '％オフ';
    $('t-save').textContent = res.off > 0 ? `${yen(res.off)} おトク！` : '割引なし';
    $('t-save').classList.toggle('is-strong', res.off > 0);
    const w = res.off > 0 && exact ? wariLabel(res.rate) : '';
    $('t-conv').hidden = !w;
    $('t-conv').textContent = w;
    setNote(exact ? '' : `正確には${fmt(res.rate, 4)}％オフです。`);
  }
  // 答えが変わったら値札をゆらす
  const key = `${res.rate}|${res.sale}`;
  if (key !== lastKey) {
    tag.classList.remove('swing');
    void tag.offsetWidth;
    tag.classList.add('swing');
  }
  lastKey = key;
}

/* ---- 入力：割引後の値段と値引きの額は、あとから入れたほうを使う。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    // 自分で入れたときだけ切りかえる（離れたときの3桁区切りの整え直しでは、切りかえない）
    if (e.isTrusted && el.id !== 'price') from = el.id;
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${el.id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur(INPUTS, true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  from = 'sale';
  update();
  $('price').focus();
});
enterToNext(INPUTS);
update();
