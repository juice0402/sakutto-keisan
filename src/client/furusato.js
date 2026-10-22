import { parseNum, fmt } from '../lib/number.mjs';
import { furusatoLimit } from '../lib/furusato.mjs';
import { FURUSATO_YEARS } from '../data/furusato.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// はじめての3問：年収・配偶者・16歳以上の子から、上限の目安と、住民税から減る額（お金の流れ）と手続き
// 家族ははじめから「ひとり」「子なし」をえらんでおくので、年収を入れればすぐ答えが出る
const CFG = FURUSATO_YEARS[Number($('calc').dataset.year)];
const FAM = { none: {}, koukou: { koukou: 1 }, daigaku: { daigaku: 1 }, both: { koukou: 1, daigaku: 1 } };
const KID_NAME = { none: '', koukou: '・高校生', daigaku: '・大学生', both: '・高校生と大学生' };
let spouse = false;
let kids = 'none';
const yen = (x) => `${fmt(x)}円`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const man = parseNum($('income').value);
  const income = man === null ? null : Math.round(man * 10000); // 万円 → 円（数字でないときは NaN のまま）
  const res = furusatoLimit({ income, spouse, ...FAM[kids] }, CFG);
  document.querySelectorAll('.tile[data-spouse]').forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.spouse === '1') === spouse)));
  document.querySelectorAll('.tile[data-kids]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.kids === kids)));
  $('f-income').classList.toggle('has-error', res.field === 'income');
  setNote(res.error || '', !!res.error);
  $('r-flow').classList.toggle('is-empty', !res.ok || res.none);
  $('r-unit').hidden = res.ok && res.none;
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-who').textContent = '';
    $('f-give').textContent = '—';
    $('f-back').textContent = '—';
    $('r-foot').textContent = res.empty ? '年収を入れてください' : '';
    $('r-how').textContent = '';
    return;
  }
  $('r-who').textContent = `年収${fmt(man)}万円・${spouse ? '夫婦' : 'ひとり'}${KID_NAME[kids]}`;
  if (res.none) {
    $('r-num').textContent = '—';
    $('f-give').textContent = '—';
    $('f-back').textContent = '—';
    $('r-foot').textContent = '住民税の所得割がかからない年収です';
    $('r-how').textContent = '';
    return;
  }
  $('r-num').textContent = fmt(res.limit);
  $('f-give').textContent = yen(res.limit);
  $('f-back').textContent = yen(res.jumin);
  $('r-foot').textContent = '';
  $('r-how').textContent = '手続き：ワンストップ特例（5つまで）';
  if (res.income > 10000000) setNote('1,000万円をこえると社会保険料の割合が下がり、上限はもう少し大きいことがあります。');
}

document.querySelector('.tiles-2').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-spouse]');
  if (!t) return;
  spouse = t.dataset.spouse === '1';
  update();
});
document.querySelector('.tiles-4').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-kids]');
  if (!t) return;
  kids = t.dataset.kids;
  update();
});
numericOnly([$('income')]);
$('income').addEventListener('input', update);
tidyOnBlur([$('income')], true);
enterToNext([$('income')]); // 次はマスをえらぶ所なので、キーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('income').value = '';
  spouse = false;
  kids = 'none';
  update();
});
update();
