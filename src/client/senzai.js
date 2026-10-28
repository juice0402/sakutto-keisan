import { parseNum, fmt } from '../lib/number.mjs';
import { senzai } from '../lib/senzai.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 洗濯洗剤の量の計算：洗剤のマスをえらぶと、表示の欄（水◯Lに◯mL）にメーカーの表示が入る（自分で書きかえてもよい。書きかえたらマスの印を外す）
// 水の量はマス（30・45・65L）か、最後のマスに自分で入れる。値段と内容量は入れたときだけ、1回いくらと1本で何回
// 結果は計量キャップの写真：中の洗剤の高さは、キャップ1杯（わからない洗剤は60mL）に対する1回の量
const BASE = [$('base-water'), $('base-amount')];
const EXTRA = [$('price'), $('content')];
const BRANDS = [...document.querySelectorAll('.tile[data-senzai]')];
const WATERS = [...document.querySelectorAll('.tile[data-wl]')];
const val = (el) => parseNum(el.value);
const CAP_SCALE = 60; // キャップ1杯がわからない洗剤の、絵のキャップの量（mL）
let brand = null; // えらんだ洗剤のマス（表示の欄を書きかえたら外す）
let waterTile = null; // えらんだ水の量のマス（自分で入れたら外す）
const EMPTY = { base: '洗剤をえらんでください', water: '水の量をえらんでください' };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

const tableOf = (t) => (t && t.dataset.table ? t.dataset.table.split(' ').map((r) => r.split(':').map(Number)) : null);
const waterVal = () => (waterTile ? Number(waterTile.dataset.wl) : val($('water')));

function show() {
  const res = senzai({
    baseWater: val(BASE[0]),
    baseAmount: val(BASE[1]),
    water: waterVal(),
    price: val(EXTRA[0]),
    content: val(EXTRA[1]),
    table: tableOf(brand),
    cap: brand && brand.dataset.cap ? Number(brand.dataset.cap) : null,
  });
  ['base-water', 'base-amount', 'water'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  BRANDS.forEach((t) => t.setAttribute('aria-pressed', String(t === brand)));
  WATERS.forEach((t) => t.setAttribute('aria-pressed', String(t === waterTile)));
  $('f-water').classList.toggle('is-on', !waterTile && $('water').value !== '');
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-caps').textContent = '';
    $('c-liq').style.height = '0%';
    ['d-water', 'd-yen', 'd-times'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? EMPTY[res.missing] : '';
    memo(null);
    return;
  }
  const amt = fmt(res.amount, 1);
  $('r-num').textContent = amt;
  memo({ q: `水${fmt(res.water, 1)}L${brand ? `・${brand.querySelector('b').textContent}` : ''}`, a: `洗剤${amt}mL` });
  $('r-num').parentElement.classList.toggle('is-long', amt.length > 5);
  $('r-caps').textContent = res.caps === null ? '' : `キャップ約${fmt(res.caps, 1)}杯`;
  const full = brand && brand.dataset.cap ? Number(brand.dataset.cap) : CAP_SCALE;
  $('c-liq').style.height = `${Math.min(100, (res.amount / full) * 100).toFixed(1)}%`;
  $('d-water').textContent = `${fmt(res.water, 1)}L`;
  $('d-yen').textContent = res.perWash === null ? '—' : `${fmt(res.perWash, 1)}円`;
  $('d-times').textContent = res.washes === null ? '—' : `${fmt(res.washes, 0)}回`;
  $('r-foot').textContent = res.perWash === null ? '値段と内容量で1回いくらが出ます' : 'ドラム式やすすぎ1回はボトルの表示を優先';
}

/* ---- 洗剤のマス：えらぶと表示の欄にメーカーの表示を入れる ---- */
document.querySelector('.sz-brands').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-senzai]');
  if (!t) return;
  brand = t;
  BASE[0].value = t.dataset.water;
  BASE[1].value = t.dataset.amount;
  show();
});

/* ---- 水の量のマス ---- */
document.querySelector('.tile[data-wl]').parentElement.addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-wl]');
  if (!t) return;
  waterTile = t;
  $('water').value = '';
  show();
});

/* ---- 入力 ---- */
numericOnly([...BASE, $('water'), ...EXTRA]);
BASE.forEach((el) =>
  el.addEventListener('input', (e) => {
    if (e.isTrusted) brand = null; // 表示を自分で書きかえたら、マスの印は外す
    show();
  }),
);
$('water').addEventListener('input', () => {
  waterTile = null;
  show();
});
EXTRA.forEach((el) => el.addEventListener('input', show));
tidyOnBlur([EXTRA[0], EXTRA[1]], true);
$('clear').addEventListener('click', () => {
  [...BASE, $('water'), ...EXTRA].forEach((el) => { el.value = ''; });
  brand = null;
  waterTile = null;
  show();
});
// Enter は表示の水 → 表示の洗剤 → 水の量、値段 → 内容量
enterToNext([BASE[0], BASE[1], $('water')]);
enterToNext([EXTRA[0], EXTRA[1]]);
focusHints(document.querySelector('.box-rows'));
show();
