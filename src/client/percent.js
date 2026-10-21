import { parseNum, fmt } from '../lib/number.mjs';
import { percent, wariOf, decimalOf, PERCENT_FIELDS } from '../lib/percent.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// パーセントの計算：もとの数・割合・その数のうち2つから残りの1つ（答えの欄は点線の枠に赤い数字）
// もとの数が入っていれば、割合かその数のどちらかを答えにする（あとからさわったほうを残す）。もとの数を入れずに割合とその数を入れたときだけ、もとの数を答えにする
// 結果は方眼の100マス（割合の分を赤ペンでぬる）と、大きな答え、「200の15％は30」の1行
const typed = new Set(); // 自分で入れた欄（答えになった欄は外す）
let lastPQ = 'pct'; // 割合とその数のうち、あとからさわったほう
const INPUTS = PERCENT_FIELDS.map((id) => $(id));
const val = (id) => parseNum($(id).value);
const NAME = { base: 'もとの数', pct: '割合', part: 'その数' };
const num = (x) => fmt(x, 4);

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function remember(id, empty) {
  if (empty) typed.delete(id);
  else typed.add(id);
  if (!empty && id !== 'base') lastPQ = id;
}

function answerField() {
  if (!typed.has('base')) return typed.has('pct') && typed.has('part') ? 'base' : null;
  if (typed.has('pct') && typed.has('part')) return lastPQ === 'pct' ? 'part' : 'pct';
  if (typed.has('pct')) return 'part';
  return typed.has('part') ? 'pct' : null;
}

function percentEmpty() {
  if (!typed.size) return 'もとの数を入れてください';
  if (typed.has('base')) return '割合かその数を入れてください';
  return `${PERCENT_FIELDS.filter((f) => !typed.has(f)).map((f) => NAME[f]).join('か')}を入れてください`;
}

/** 100マスのうち、割合の分をぬる（左上から1行ずつ。はんぱの分は1マスの中を左から） */
function drawGrid(pct) {
  if (pct === null) {
    $('pc-fill').setAttribute('d', '');
    return;
  }
  const p = Math.min(100, Math.max(0, pct));
  const rows = Math.floor(p / 10);
  const cells = Math.floor(p - rows * 10);
  const part = p - rows * 10 - cells;
  let d = rows ? `M0 0H100V${rows * 10}H0Z` : '';
  if (cells) d += `M0 ${rows * 10}H${cells * 10}V${rows * 10 + 10}H0Z`;
  if (part > 0.001) d += `M${cells * 10} ${rows * 10}H${cells * 10 + part * 10}V${rows * 10 + 10}H${cells * 10}Z`;
  $('pc-fill').setAttribute('d', d);
}

function update() {
  const out = answerField();
  if (out) typed.delete(out);
  // 前に答えを出していた欄は、答えでなくなったら空にする（自分で入れた数字に見えないように）
  PERCENT_FIELDS.forEach((f) => { if (f !== out && !typed.has(f)) $(f).value = ''; });
  const res = out ? percent({ base: val('base'), pct: val('pct'), part: val('part'), out }) : { ok: false, empty: true };
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? num(res[out]) : '';
  setNote(res.error || '', !!res.error);
  $('r-cap').textContent = NAME[out] || NAME.part;
  $('r-unit').textContent = out === 'pct' ? '％' : '';
  const pct = res.ok ? res.pct : val('pct');
  drawGrid(pct === null || Number.isNaN(pct) ? null : pct);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-num').parentElement.classList.remove('is-long');
    $('r-say').textContent = '';
    $('r-foot').textContent = res.empty ? percentEmpty() : '';
    ['d-pct', 'd-wari', 'd-dec'].forEach((id) => { $(id).textContent = '—'; });
    return;
  }
  const big = num(res[out]);
  $('r-num').textContent = big;
  $('r-num').parentElement.classList.toggle('is-long', big.length > 6);
  $('r-say').textContent = `${num(res.base)}の${num(res.pct)}％は${num(res.part)}${res.pct > 100 ? `（${fmt(res.pct / 100, 2)}倍）` : ''}`;
  $('d-pct').textContent = `${num(res.pct)}％`;
  $('d-wari').textContent = `${fmt(wariOf(res.pct), 3)}割`;
  $('d-dec').textContent = fmt(decimalOf(res.pct), 6);
  $('r-foot').textContent = '';
}

/* ---- 入力：入れた欄を覚えて、残りの欄に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    if (e.isTrusted) remember(el.id, el.value.trim() === '');
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${el.id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur([$('base')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  typed.clear();
  update();
});
enterToNext(INPUTS);
focusHints(document.querySelector('.box-rows'));
update();
