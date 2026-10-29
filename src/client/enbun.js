import { parseNum, fmt } from '../lib/number.mjs';
import { enbun, spoonText, spoonParts, ENBUN_FIELDS } from '../lib/enbun.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('enbun-noudo.png');

// 塩分濃度の計算：水や食材の重さ・濃度・塩のうち2つから残りの1つ（答えの欄は点線の枠に赤い数字）
// 水や食材の重さはわかっていることが多いので、入っていれば塩か濃度のどちらかを答えにする（あとからさわったほうを残す）。
// 重さを入れずに濃度と塩を入れたときだけ、重さを答えにする。濃度は用途のマスでもえらべる（濃度の欄に入れたのと同じ）
// 結果はボウルの絵と、塩の量（大きな数字とスプーンの絵）
const typed = new Set(); // 自分で入れた欄（答えになった欄は外す）
let lastPS = 'pct'; // 濃度と塩のうち、あとからさわったほう
const INPUTS = ENBUN_FIELDS.map((id) => $(id));
const TILES = [...document.querySelectorAll('.tile[data-pct]')];
const CARD = $('calc').dataset;
const TSP = Number(CARD.tsp);
const TBSP = Number(CARD.tbsp);
const val = (id) => parseNum($(id).value);
const NAME = { base: '水や食材の重さ', pct: '濃度', salt: '塩' };
const SPOON_MAX = 8; // 絵に出すスプーンの数

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function remember(id, empty) {
  if (empty) typed.delete(id);
  else typed.add(id);
  if (!empty && id !== 'base') lastPS = id;
}

function answerField() {
  if (!typed.has('base')) return typed.has('pct') && typed.has('salt') ? 'base' : null;
  if (typed.has('pct') && typed.has('salt')) return lastPS === 'pct' ? 'salt' : 'pct';
  if (typed.has('pct')) return 'salt';
  return typed.has('salt') ? 'pct' : null;
}

function enbunEmpty() {
  if (!typed.size) return '水や食材の重さを入れてください';
  if (typed.has('base')) return '濃度か塩を入れてください';
  return `${ENBUN_FIELDS.filter((f) => !typed.has(f)).map((f) => NAME[f]).join('か')}を入れてください`;
}

const gText = (x) => fmt(x, x < 10 ? 2 : 1);

/** 塩のスプーンの絵（大さじと小さじ。最後の小さじは入る分だけぬる）。多すぎるときは出さない */
function drawSpoons(salt) {
  const box = $('s-spoons');
  if (salt === null) {
    box.innerHTML = '';
    $('s-text').textContent = '';
    return;
  }
  const { big, quarters } = spoonParts(salt, TSP, TBSP);
  const small = Math.ceil(quarters / 4);
  const many = big + small > SPOON_MAX;
  box.innerHTML = many
    ? ''
    : '<span class="en-sp is-big"></span>'.repeat(big) +
      Array.from({ length: small }, (_, i) => {
        const f = Math.min(4, quarters - i * 4);
        return `<span class="en-sp"${f < 4 ? ` style="--f:${f * 25}%"` : ''}></span>`;
      }).join('');
  $('s-text').textContent = many ? `大さじ約${fmt(salt / TBSP, 1)}杯` : spoonText(salt, TSP, TBSP);
}

function update() {
  const out = answerField();
  if (out) typed.delete(out);
  // 前に答えを出していた欄は、答えでなくなったら空にする（自分で入れた数字に見えないように）
  ENBUN_FIELDS.forEach((f) => { if (f !== out && !typed.has(f)) $(f).value = ''; });
  const res = out ? enbun({ base: val('base'), pct: val('pct'), salt: val('salt'), out }) : { ok: false, empty: true };
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? (out === 'pct' ? fmt(res.pct, 2) : gText(res[out])) : '';
  const pct = res.ok ? res.pct : val('pct');
  TILES.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.pct) === pct)));
  setNote(res.error || '', !!res.error);
  const big = out === 'base' ? '水や食材' : out === 'pct' ? '濃度' : '塩';
  $('r-cap').textContent = big;
  $('r-unit').textContent = out === 'pct' ? '%' : 'g';
  $('b-base').textContent = res.ok ? `${gText(res.base)}g` : '';
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-num').parentElement.classList.remove('is-long');
    $('r-foot').textContent = res.empty ? enbunEmpty() : '';
    ['d-salt', 'd-pct', 'd-whole'].forEach((id) => { $(id).textContent = '—'; });
    drawSpoons(null);
    memo(null);
    return;
  }
  $('r-num').textContent = out === 'pct' ? fmt(res.pct, 2) : gText(res[out]);
  $('r-num').parentElement.classList.toggle('is-long', $('r-num').textContent.length > 5);
  $('d-salt').textContent = `${gText(res.salt)}g`;
  $('d-pct').textContent = `${fmt(res.pct, 2)}%`;
  $('d-whole').textContent = `${fmt(res.whole, 2)}%`;
  drawSpoons(res.salt);
  $('r-foot').textContent = '';
  memo({
    q: `${gText(res.base)}gで${fmt(res.pct, 2)}%`,
    a: `塩${gText(res.salt)}g`,
    img: () => imgCard({
      title: '塩分濃度',
      cap: big,
      num: $('r-num').textContent,
      unit: out === 'pct' ? '%' : 'g',
      sub: out === 'salt' ? $('s-text').textContent : `塩${gText(res.salt)}g＝${$('s-text').textContent}`,
      rows: [['水や食材', `${gText(res.base)}g`], ['濃度', `${fmt(res.pct, 2)}%`], ['塩', `${gText(res.salt)}g`], ['塩水全体に対して', `${fmt(res.whole, 2)}%`]],
      notes: ['水は1ml＝1gで計算'],
    }),
  });
}

/* ---- 用途のマス：えらぶと、濃度の欄に入れたのと同じ ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-pct]');
  if (!t) return;
  $('pct').value = t.dataset.pct;
  remember('pct', false);
  update();
});

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
