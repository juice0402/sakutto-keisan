import { parseNum, fmt } from '../lib/number.mjs';
import { denki } from '../lib/denki.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// 電気代の計算：家電のマスをえらぶと消費電力の欄に目安が入る（自分で入れてもよい）。1日に使う時間と単価から、1時間・1日・1か月・1年
// 結果は電気代のお知らせ（検針票のような紙）：1か月の使用量のメーターの数字と、大きな1か月の電気代
const INPUTS = ['watt', 'hours', 'price'].map((id) => $(id));
const TILES = [...document.querySelectorAll('.tile[data-watt]')];
const val = (id) => parseNum($(id).value);
let picked = null; // えらんだマス（消費電力の欄を書きかえたら外す）
const EMPTY = { watt: $('calc').dataset.empty, price: '1kWhの単価を入れてください' };
const BASE = $('calc').dataset.name || ''; // 家電別のページは家電の名前（結果の紙に「こたつ 強 180W」）
const DIGITS = 4; // メーターの整数のけた（小数は1けた）

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** メーターの数字（1か月の使用量 kWh。整数4けた（多いときはふやす）と小数1けた） */
function drawMeter(kwh) {
  const ok = kwh !== null;
  const t = ok ? kwh.toFixed(1).replace('.', '') : '';
  const n = Math.max(DIGITS, t.length - 1); // 整数のけた
  const s = ok ? t.padStart(n + 1, '0') : '0'.repeat(n + 1);
  $('m-digits').innerHTML = [...s].map((c, i) => `${i === n ? '<span class="m-dot">.</span>' : ''}<span class="m-d${i === n ? ' is-dec' : ''}">${c}</span>`).join('');
  $('m-digits').classList.toggle('is-off', !ok);
}

const yen = (x) => fmt(x, x < 100 ? 1 : 0);

/** いちばん大きな数字。けたが多いときは小さく（「円」が次の行にいかないように） */
function setBig(cap, text) {
  $('r-cap').textContent = cap;
  $('r-num').textContent = text;
  $('r-num').parentElement.classList.toggle('is-long', text.length > 6);
}

function update() {
  const res = denki({ watt: val('watt'), hours: val('hours'), price: val('price') });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  TILES.forEach((t) => t.setAttribute('aria-pressed', String(t === picked)));
  setNote(res.error || '', !!res.error);
  const name = [BASE, picked ? picked.querySelector('b').textContent : ''].filter(Boolean).join(' ');
  if (!res.ok) {
    setBig('1か月', '？');
    $('r-foot').textContent = res.empty ? EMPTY[res.missing] : '';
    $('m-what').textContent = '';
    ['d-hour', 'd-day', 'd-year'].forEach((id) => { $(id).textContent = '—'; });
    drawMeter(null);
    return;
  }
  $('m-what').textContent = `${name ? `${name} ` : ''}${fmt(res.watt, 1)}W${res.hours !== null ? `・1日${fmt(res.hours, 2)}時間` : ''}`;
  $('d-hour').textContent = `${fmt(res.hour, 1)}円`;
  $('d-day').textContent = res.day === null ? '—' : `${yen(res.day)}円`;
  $('d-year').textContent = res.year === null ? '—' : `${fmt(res.year, 0)}円`;
  drawMeter(res.kwhMonth);
  if (res.hours === null) {
    setBig('1時間', fmt(res.hour, 1));
    $('r-foot').textContent = '1日に使う時間を入れてください';
    return;
  }
  setBig('1か月', yen(res.month));
  $('r-foot').textContent = '';
}

/* ---- 家電のマス：えらぶと、消費電力の欄に目安の数字を入れる ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-watt]');
  if (!t) return;
  picked = t;
  $('watt').value = t.dataset.watt;
  update();
});

/* ---- 入力 ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) =>
  el.addEventListener('input', (e) => {
    if (e.isTrusted && el.id === 'watt') picked = null; // 自分で入れたら、マスの印は外す
    update();
  }),
);
tidyOnBlur([$('watt')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = el.defaultValue; }); // 単価は、はじめの値にもどす
  picked = null;
  update();
});
// Enter は消費電力 → 1日の時間まで（単価は、はじめの値が入っているので、とばす）
enterToNext([$('watt'), $('hours')]);
enterToNext([$('price')]);
focusHints(document.querySelector('.box-rows'));
update();
