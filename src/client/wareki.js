import { parseNum } from '../lib/number.mjs';
import { wareki, ERA_TABLE, nenpyoLayout, nenpyoY } from '../lib/wareki.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('wareki.png');

// 和暦・西暦の変換：元号のマスと、西暦か和暦のあとから入れたほう（もう片方は点線の答えの欄）
// はじめは西暦の欄に今年（ブラウザの日付）を入れておく。結果は元号の年表に赤い線と、大きな答え
const THIS_YEAR = new Date().getFullYear();
let from = null; // 'seireki' か 'wareki'（あとから入れたほう）
let era = null; // えらんだ元号（西暦を入れたときは、その年の元号）
const SEI = $('seireki');
const WA = $('wareki');
const INPUTS = [SEI, WA];
const TILES = [...document.querySelectorAll('.tile[data-era]')];

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/* 元号の年表：1868年から（今年＋6年か、入れた年の次の次の年）まで、元号ごとに区切る。入れた年に赤い線 */
function drawNenpyo(res) {
  const layout = nenpyoLayout(Math.min(2201, Math.max(THIS_YEAR + 6, res.ok ? res.y + 2 : 0)));
  layout.forEach((r, i) => {
    $(`np-${i}`).setAttribute('y', r.top.toFixed(1));
    $(`np-${i}`).setAttribute('height', r.h.toFixed(1));
    $(`nt-${i}`).setAttribute('y', (r.top + r.h / 2).toFixed(1));
    $(`np-${i}`).classList.toggle('is-on', res.ok && res.era === ERA_TABLE[i].name);
    $(`nt-${i}`).classList.toggle('is-on', res.ok && res.era === ERA_TABLE[i].name);
  });
  $('np-mark').toggleAttribute('hidden', !res.ok); // SVG の要素には hidden のプロパティがないので属性で
  if (res.ok) {
    const y = nenpyoY(layout, res.y).toFixed(1);
    $('np-line').setAttribute('y1', y);
    $('np-line').setAttribute('y2', y);
    $('np-dot').setAttribute('cy', y);
  }
}

function update() {
  const res = wareki({ from, seireki: parseNum(SEI.value), era, nen: parseNum(WA.value), thisYear: THIS_YEAR });
  const out = from === 'seireki' ? 'wareki' : from === 'wareki' ? 'seireki' : null;
  if (res.ok && from === 'seireki') era = res.era;
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out === 'wareki') WA.value = res.ok ? (res.nen === 1 ? '元' : String(res.nen)) : '';
  if (out === 'seireki') SEI.value = res.ok ? String(res.y) : '';
  TILES.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.era === era)));
  $('era-pre').textContent = era || '';
  setNote(res.error || '', !!res.error);
  drawNenpyo(res);
  if (!res.ok) {
    $('r-cap').textContent = '';
    $('r-num').textContent = '？';
    $('r-unit').textContent = '';
    $('r-say').textContent = '';
    $('d-ago').textContent = '—';
    $('d-age').textContent = '—';
    const FOOT = {
      era: '元号をえらんでください',
      nen: `${era}の年を入れてください`,
      digits: '西暦は4けたで入れてください',
    };
    $('r-foot').textContent = res.empty ? FOOT[res.missing] || '西暦か和暦を入れてください' : '';
    memo(null);
    return;
  }
  const isSei = from === 'seireki';
  $('r-cap').textContent = isSei ? `${res.y}年は` : `${res.text}は`;
  $('r-num').textContent = isSei ? res.text.slice(0, -1) : String(res.y);
  $('r-unit').textContent = '年';
  memo({
    ...(isSei ? { q: `西暦${res.y}年`, a: res.text } : { q: res.text, a: `西暦${res.y}年` }),
    img: () => imgCard({
      title: '和暦・西暦',
      cap: isSei ? `${res.y}年は` : `${res.text}は`,
      num: isSei ? res.text.slice(0, -1) : String(res.y),
      unit: '年',
      sub: `${res.kanshi.kanji}（${res.kanshi.yomi}）`,
      rows: [['西暦', `${res.y}年`], ['和暦', res.text], ['今年から', res.ago > 0 ? `${res.ago}年前` : res.ago === 0 ? '今年' : `${-res.ago}年後`], ...(res.ago >= 0 ? [['その年生まれは', `今年${res.ago}歳`]] : [])],
      notes: res.note ? [res.note] : [],
    }),
  });
  $('r-num').parentElement.classList.toggle('is-long', isSei && res.text.length > 5);
  $('r-say').textContent = `${res.kanshi.kanji}（${res.kanshi.yomi}）`;
  $('d-ago').textContent = res.ago > 0 ? `${res.ago}年前` : res.ago === 0 ? '今年' : `${-res.ago}年後`;
  $('d-age').textContent = res.ago >= 0 ? `今年${res.ago}歳` : '—';
  $('r-foot').textContent = res.note;
}

/* ---- 元号のマス：えらぶと和暦から計算する。和暦の欄に自分で入れた数があれば、そのままの数で元号だけかえる ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-era]');
  if (!t) return;
  era = t.dataset.era;
  if (from !== 'wareki') {
    WA.value = '';
    SEI.value = '';
  }
  from = 'wareki';
  update();
});

/* ---- 入力：入れたほうから、もう片方に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    if (e.isTrusted) {
      const id = el.id;
      if (el.value.trim() === '' && id === 'seireki' && from === 'seireki') {
        from = null;
        era = null;
        WA.value = '';
      } else if (el.value.trim() !== '' || id === 'wareki') {
        if (from !== id && id === 'seireki') era = null;
        from = id;
      }
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
tidyOnBlur(INPUTS, false);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  from = null;
  era = null;
  update();
});
// Enter は入れた欄のあと、キーボードを閉じる（もう片方は答えの欄）
enterToNext(INPUTS);
SEI.value = String(THIS_YEAR);
from = 'seireki';
update();
