import { parseNum, fmt } from '../lib/number.mjs';
import { mitsumori, mitsuMonths, mitsuYearCheck, MITSU_FIELDS } from '../lib/mitsumori.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// 清掃の見積もり計算：回数（マスか1年の回数）と、面積・㎡単価・1か月の料金のうち2つから、残りの1つを出す（答えの欄は点線の枠に赤い数字）
// 面積は現場で決まっていることが多いので、面積が入っていれば㎡単価か1か月の料金のどちらかを答えにする（あとからさわったほうを残す）。
// 面積を入れずに㎡単価と1か月の料金を入れたときだけ、面積を答えにする。作業のマスをえらぶと、㎡単価の欄に目安が入る。結果は見積書
const mitsuTyped = new Set(); // 自分で入れた欄（答えになった欄は外す）
let lastPM = 'price'; // ㎡単価と1か月の料金のうち、あとからさわったほう
let tileYear = null; // 回数のマスでえらんだ1年の回数
const MITSU_INPUTS = MITSU_FIELDS.map((id) => $(id));
const WORK_TILES = [...document.querySelectorAll('.tile[data-price]')];
const YEAR_TILES = [...document.querySelectorAll('.tile[data-year]')];
const inYear = $('year');
const mval = (id) => parseNum($(id).value);
const FIELD_NAME = { area: '面積', price: '㎡単価', month: '1か月の料金' };
const SUM_CAP = { area: '面積', price: '㎡単価（1回）', month: '1か月の料金' };
const yen = (x) => `${fmt(x, 0)}円`;
const priceText = (p) => fmt(p, 2);
const areaText = (a) => fmt(a, 1);

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** いまの1年の回数（自分で入れた数があればそちら） */
function currentYear() {
  const typedYear = parseNum(inYear.value);
  return typedYear !== null ? typedYear : tileYear;
}

/** 入れた欄を覚える（空にした欄は外す） */
function rememberField(id, empty) {
  if (empty) mitsuTyped.delete(id);
  else mitsuTyped.add(id);
  if (!empty && id !== 'area') lastPM = id;
}

function mitsuAnswer() {
  if (!mitsuTyped.has('area')) return mitsuTyped.has('price') && mitsuTyped.has('month') ? 'area' : null;
  if (mitsuTyped.has('price') && mitsuTyped.has('month')) return lastPM === 'price' ? 'month' : 'price';
  if (mitsuTyped.has('price')) return 'month';
  return mitsuTyped.has('month') ? 'price' : null;
}

function mitsuEmpty(year) {
  if (year === null) return '回数をえらんでください';
  if (!mitsuTyped.size) return '面積を入れてください';
  if (mitsuTyped.has('area')) return '㎡単価か1か月の料金を入れてください';
  return `${MITSU_FIELDS.filter((f) => !mitsuTyped.has(f)).map((f) => FIELD_NAME[f]).join('か')}を入れてください`;
}

/** 回数の言い方（マスの名前か、年◯回） */
function kaisuName(year) {
  const t = YEAR_TILES.find((x) => Number(x.dataset.year) === year && x.getAttribute('aria-pressed') === 'true');
  return t ? t.querySelector('b').textContent : `年${fmt(year, 0)}回`;
}

/** 1年の帯：清掃する月に赤ペンの丸 */
function drawMonths(year) {
  const on = year !== null ? mitsuMonths(year) : Array(12).fill(0);
  document.querySelectorAll('#s-months .mt-m').forEach((m, i) => m.classList.toggle('is-on', on[i] > 0));
}

/** 見積書の表：1回・1か月・1年の回数と料金 */
function drawSheet(res) {
  const set = (id, text) => { $(id).textContent = text; };
  if (!res) {
    ['k-month', 'k-year', 'm-once', 'm-month', 'm-year'].forEach((id) => set(id, '—'));
    set('r-info', '');
    set('r-tax', '');
    return;
  }
  const pm = res.perMonth;
  set('k-month', Number.isInteger(pm) ? `${fmt(pm, 0)}回` : `約${fmt(pm, 1)}回`);
  set('k-year', `${fmt(res.year, 0)}回`);
  set('m-once', yen(res.once));
  set('m-month', yen(res.month));
  set('m-year', yen(res.yearly));
  set('r-info', `${areaText(res.area)}㎡ × ${priceText(res.price)}円 × ${kaisuName(res.year)}`);
  set('r-tax', `1か月 税込${yen(Math.round(res.month * 1.1))}`);
}

function update() {
  const out = mitsuAnswer();
  if (out) mitsuTyped.delete(out);
  // 前に答えを出していた欄は、答えでなくなったら空にする（自分で入れた数字に見えないように）
  MITSU_FIELDS.forEach((f) => { if (f !== out && !mitsuTyped.has(f)) $(f).value = ''; });
  const year = currentYear();
  const res = out ? mitsumori({ area: mval('area'), price: mval('price'), month: mval('month'), year, out }) : { ok: false, empty: true };
  const yearError = year !== null ? mitsuYearCheck(year) : null; // 回数のまちがいは、ほかの欄がそろう前から出す
  const shown = yearError || res;
  MITSU_INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', shown.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  $('f-year').classList.toggle('has-error', shown.field === 'year');
  $('f-year').classList.toggle('is-on', inYear.value.trim() !== '');
  YEAR_TILES.forEach((t) => t.setAttribute('aria-pressed', String(inYear.value.trim() === '' && Number(t.dataset.year) === tileYear)));
  if (out) $(out).value = res.ok ? (out === 'price' ? priceText(res.price) : out === 'area' ? areaText(res.area) : fmt(res.month, 0)) : '';
  const price = res.ok ? res.price : mval('price');
  WORK_TILES.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.price) === price)));
  setNote(shown.error || '', !!shown.error);
  drawMonths(yearError ? null : year);
  drawSheet(res.ok ? res : null);
  $('r-cap').textContent = SUM_CAP[out] || SUM_CAP.month;
  $('r-unit').textContent = out === 'area' ? '㎡' : '円';
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = shown.error ? '' : mitsuEmpty(year);
    return;
  }
  $('r-num').textContent = out === 'price' ? priceText(res.price) : out === 'area' ? areaText(res.area) : fmt(res.month, 0);
  $('r-foot').textContent = '';
}

/* ---- 作業のマス：えらぶと、㎡単価の欄に目安が入る（自分で入れたのと同じ） ---- */
WORK_TILES.forEach((t) => t.addEventListener('click', () => {
  $('price').value = t.dataset.price;
  rememberField('price', false);
  update();
}));

/* ---- 回数のマス：えらぶと、自分で入れた1年の回数は消す ---- */
YEAR_TILES.forEach((t) => t.addEventListener('click', () => {
  tileYear = Number(t.dataset.year);
  inYear.value = '';
  update();
}));
$('f-year').addEventListener('click', () => inYear.focus());
inYear.addEventListener('input', update);

/* ---- 入力：入れた欄を覚えて、残りの欄に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly([...MITSU_INPUTS, inYear]);
MITSU_INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    // 自分で入れたときだけ覚える（離れたときの整え直しでは、入れた順を変えない）
    if (e.isTrusted) rememberField(el.id, el.value.trim() === '');
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${el.id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur([$('area'), $('month')], true);
$('clear').addEventListener('click', () => {
  MITSU_INPUTS.forEach((el) => { el.value = ''; });
  inYear.value = '';
  tileYear = null;
  mitsuTyped.clear();
  update();
});
enterToNext(MITSU_INPUTS);
focusHints(document.querySelector('.box-rows'));
update();
