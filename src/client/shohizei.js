import { parseNum, fmt } from '../lib/number.mjs';
import { shohizei } from '../lib/shohizei.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

// 消費税の計算：税率のマス（はじめは10％）と、税抜か税込のあとから入れたほう。もう片方は点線の答えの欄
// 結果はお店のレシート。消費税に1円未満の端数があるときだけ、レシートの下に「切り捨て・四捨五入・切り上げ」を出す
let from = null; // 'net' か 'gross'（あとから入れたほう）
let rate = 10;
let mode = 'floor';
const INPUTS = ['net', 'gross'].map((id) => $(id));
const TILES = [...document.querySelectorAll('.tile[data-rate]')];
const MODES = [...document.querySelectorAll('.seg-btn[data-mode]')];
const NAME = { net: '税抜', gross: '税込' };
const yen = (x) => fmt(x, 2);

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const out = from === 'net' ? 'gross' : from === 'gross' ? 'net' : null;
  const res = from ? shohizei({ amount: parseNum($(from).value), from, rate, mode }) : { ok: false, empty: true };
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? yen(res[out]) : '';
  TILES.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.rate) === rate)));
  MODES.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  $('f-mode').hidden = !(res.ok && res.frac);
  $('r-reduced').hidden = rate !== 8;
  $('d-tax-k').textContent = `消費税（${rate}%）`;
  setNote(res.error || '', !!res.error);
  $('r-cap').textContent = NAME[out] || NAME.gross;
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? '税抜か税込の値段を入れてください' : '';
    ['d-net', 'd-tax', 'd-gross'].forEach((id) => { $(id).textContent = '—'; });
    return;
  }
  $('r-num').textContent = yen(res[out]);
  $('d-net').textContent = `${yen(res.net)}円`;
  $('d-tax').textContent = `${yen(res.tax)}円`;
  $('d-gross').textContent = `${yen(res.gross)}円`;
  $('r-foot').textContent = '';
}

/* ---- 税率のマスと、1円未満のえらび方 ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-rate]');
  if (!t) return;
  rate = Number(t.dataset.rate);
  update();
});
$('f-mode').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn[data-mode]');
  if (!b) return;
  mode = b.dataset.mode;
  update();
});

/* ---- 入力：入れたほうから、もう片方に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
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
  from = null;
  mode = 'floor';
  update();
});
// Enter は入れた欄のあと、キーボードを閉じる（もう片方は答えの欄）
enterToNext(INPUTS);
update();
