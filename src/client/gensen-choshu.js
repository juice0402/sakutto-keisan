import { parseNum, fmt } from '../lib/number.mjs';
import { gensen, gensenParts, GENSEN_BORDER } from '../lib/gensen.mjs';
import { ymdValue } from '../lib/hizuke.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 源泉徴収の計算：報酬（税抜）か振り込まれる額のあとから入れたほう（もう片方は点線の答えの欄）と、請求書の消費税の書き方・支払う日
// 結果は請求書（大きな源泉徴収税額、報酬・消費税・源泉・差引ご請求額、内わけの率）
const now = new Date();
const GS_TODAY = ymdValue({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
let from = null; // 'fee' か 'net'（あとから入れたほう）
let mode = 'sep';
const INPUTS = ['fee', 'net'].map((id) => $(id));
const MODE_TILES = [...document.querySelectorAll('.tile[data-mode]')];
const yen = (x) => `${fmt(x)}円`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawParts(res) {
  const p = gensenParts($('day').value || GS_TODAY, res ? res.base > GENSEN_BORDER : false);
  $('r-parts').innerHTML = `<span>うち</span>${p.rows.map(([k, v]) => `<span>${k} ${v}</span>`).join('')}`;
}

function update() {
  const out = from === 'fee' ? 'net' : from === 'net' ? 'fee' : null;
  const res = from ? gensen({ amount: parseNum($(from).value), from, mode }) : { ok: false, empty: true };
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? fmt(res[out]) : '';
  MODE_TILES.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.mode === mode)));
  setNote(res.error || '', !!res.error);
  drawParts(res.ok ? res : null);
  $('d-fee').classList.toggle('is-out', res.ok && out === 'fee');
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? '報酬か振り込まれる額を入れてください' : '';
    ['d-fee', 'd-tax', 'd-gensen', 'd-net'].forEach((id) => { $(id).textContent = '—'; });
    memo(null);
    return;
  }
  $('r-num').textContent = fmt(res.gensen);
  memo({ q: `報酬${fmt(res.fee)}円`, a: `源泉徴収${fmt(res.gensen)}円・振り込み${fmt(res.net)}円` });
  $('d-fee').textContent = yen(res.fee);
  $('d-tax').textContent = mode === 'none' ? '—' : yen(res.tax);
  $('d-gensen').textContent = `−${yen(res.gensen)}`;
  $('d-net').textContent = yen(res.net);
  if (!res.exact) $('r-foot').textContent = `ちょうど${fmt(res.want)}円になる報酬はありません`;
  else $('r-foot').textContent = mode === 'incl' ? `税込${fmt(res.base)}円にかけています` : '1円未満は切り捨て';
}

/* ---- 消費税の書き方のマス ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-mode]');
  if (!t) return;
  mode = t.dataset.mode;
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
['input', 'change'].forEach((ev) => $('day').addEventListener(ev, update));
// クリア：額を空に、消費税は「分けて書く」、支払う日は今日に
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  from = null;
  mode = 'sep';
  $('day').value = GS_TODAY;
  update();
});
enterToNext(INPUTS);
focusHints(document.querySelector('.box-rows'));
if (!$('day').value) $('day').value = GS_TODAY;
update();
