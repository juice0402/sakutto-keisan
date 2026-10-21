import { parseNum, fmt } from '../lib/number.mjs';
import { kakeritsu, kakePct, kakeText, kakePctText, KAKE_FIELDS } from '../lib/kakeritsu.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// 掛け率の計算：上代・掛け率・下代のうち2つから残りの1つを出す（答えの欄は点線の枠に赤い数字）
// 上代（定価）はわかっていることが多いので、上代が入っていれば掛け率か下代のどちらかを答えにする（あとからさわったほうを残す）。
// 上代を入れずに掛け率と下代を入れたときだけ、上代を答えにする。掛け率は5〜8掛けのマスでもえらべる（掛け率の欄に入れたのと同じ）。結果は納品書
const typed = new Set(); // 自分で入れた欄（答えになった欄は外す）
let lastRG = 'rate'; // 掛け率と下代のうち、あとからさわったほう
const INPUTS = KAKE_FIELDS.map((id) => $(id));
const TILES = [...document.querySelectorAll('.tile[data-rate]')];
const val = (id) => parseNum($(id).value);
const NAME = { jodai: '上代', rate: '掛け率', gedai: '下代' };
const CAP = { jodai: '上代', rate: '掛け率', gedai: '下代' };
const yen = (x) => fmt(x, 2);

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 入れた欄を覚える（空にした欄は外す） */
function remember(id, empty) {
  if (empty) typed.delete(id);
  else typed.add(id);
  if (!empty && id !== 'jodai') lastRG = id;
}

function answerField() {
  if (!typed.has('jodai')) return typed.has('rate') && typed.has('gedai') ? 'jodai' : null;
  if (typed.has('rate') && typed.has('gedai')) return lastRG === 'rate' ? 'gedai' : 'rate';
  if (typed.has('rate')) return 'gedai';
  return typed.has('gedai') ? 'rate' : null;
}

/** 上代の帯を、下代と粗利に分ける。下代が上代より高いときは下代の長さにそろえて、足りない分をしまで */
function drawBar(res) {
  const pct = (x) => `${Math.max(0, x) * 100}%`;
  if (!res) {
    ['b-cost', 'b-profit', 'b-loss'].forEach((id) => { $(id).style.width = '0%'; });
    $('b-left').textContent = '下代';
    $('b-right').textContent = '粗利';
    return;
  }
  const loss = res.profit < 0;
  const scale = loss ? res.gedai : res.jodai;
  $('b-cost').style.width = pct((loss ? res.jodai : res.gedai) / scale);
  $('b-profit').style.width = pct(loss ? 0 : res.profit / scale);
  $('b-loss').style.width = pct(loss ? -res.profit / scale : 0);
  $('b-left').textContent = `下代 ${yen(res.gedai)}円`;
  $('b-right').textContent = `粗利 ${res.profit < 0 ? '−' : ''}${yen(Math.abs(res.profit))}円（${kakePctText(res.profitPct)}%）`;
}

/** 納品書の表：上代・掛率・下代・粗利。計算で出した値（点線の答えの欄と同じもの）は赤 */
function drawRow(res, out) {
  const cell = (text, red) => `<td${red ? ' class="is-out"' : ''}>${text}</td>`;
  $('r-row').innerHTML = res
    ? cell(yen(res.jodai), out === 'jodai') + cell(`${kakePctText(res.pct)}%`, out === 'rate') + cell(yen(res.gedai), out === 'gedai') + cell(`${res.profit < 0 ? '−' : ''}${yen(Math.abs(res.profit))}`, false)
    : cell('—') + cell('—') + cell('—') + cell('—');
}

function kakeEmpty() {
  if (typed.has('jodai') || !typed.size) return typed.size ? '掛け率か下代を入れてください' : '上代を入れてください';
  return `${KAKE_FIELDS.filter((f) => !typed.has(f)).map((f) => NAME[f]).join('か')}を入れてください`;
}

function update() {
  const out = answerField();
  if (out) typed.delete(out);
  // 前に答えを出していた欄は、答えでなくなったら空にする（自分で入れた数字に見えないように）
  KAKE_FIELDS.forEach((f) => { if (f !== out && !typed.has(f)) $(f).value = ''; });
  const res = out ? kakeritsu({ jodai: val('jodai'), rate: val('rate'), gedai: val('gedai'), out }) : { ok: false, empty: true };
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? (out === 'rate' ? kakePctText(res.pct) : yen(res[out])) : '';
  const pct = res.ok ? res.pct : kakePct(val('rate'));
  TILES.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.rate) === pct)));
  setNote(res.error || '', !!res.error);
  drawBar(res.ok ? res : null);
  drawRow(res.ok ? res : null, out);
  $('r-cap').textContent = CAP[out] || CAP.gedai;
  $('r-unit').textContent = out === 'rate' ? '%' : '円';
  $('r-stamp').hidden = !res.ok;
  $('r-sum').classList.toggle('is-error', res.ok && res.profit < 0);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? kakeEmpty() : '';
    return;
  }
  $('r-num').textContent = out === 'rate' ? kakePctText(res.pct) : yen(res[out]);
  $('r-kake').textContent = kakeText(Math.round(res.pct * 100) / 100);
  $('r-foot').textContent = res.profit < 0 ? '下代が上代より高くなっています' : '';
}

/* ---- 掛け率のマス：えらぶと、掛け率の欄に入れたのと同じ ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-rate]');
  if (!t) return;
  $('rate').value = t.dataset.rate;
  remember('rate', false);
  update();
});

/* ---- 入力：入れた欄を覚えて、残りの欄に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    // 自分で入れたときだけ覚える（離れたときの整え直しでは、入れた順を変えない）
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
tidyOnBlur([$('jodai'), $('gedai')], true);
// 「6」や「0.6」と入れた掛け率は、離れたら60（％）に書き直す（どう読んだかがわかるように）
$('rate').addEventListener('blur', () => {
  const v = val('rate');
  if (v === null || Number.isNaN(v) || $('f-rate').classList.contains('is-out')) return;
  const p = kakePct(v);
  if (p !== v) {
    $('rate').value = String(p);
    $('rate').dispatchEvent(new Event('input', { bubbles: true }));
  }
});
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  typed.clear();
  update();
});
enterToNext(INPUTS);
focusHints(document.querySelector('.box-rows'));
update();
