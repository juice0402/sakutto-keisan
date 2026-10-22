import { parseNum, fmt } from '../lib/number.mjs';
import { furusatoIncomeFor } from '../lib/furusato.mjs';
import { FURUSATO_YEARS } from '../data/furusato.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// 寄付額から年収の目安：寄付したい額・配偶者・16歳以上の子から、上限がその額に届く年収（上限の目安の逆）
// 家族ははじめから「ひとり」「子なし」をえらんでおくので、額を入れればすぐ答えが出る
const YEAR = Number($('calc').dataset.year);
const CFG = FURUSATO_YEARS[YEAR];
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
  const target = parseNum($('target').value);
  const res = furusatoIncomeFor({ target, spouse, ...FAM[kids] }, CFG);
  document.querySelectorAll('.tile[data-spouse]').forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.spouse === '1') === spouse)));
  document.querySelectorAll('.tile[data-kids]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.kids === kids)));
  $('f-target').classList.toggle('has-error', res.field === 'target');
  setNote(res.error || '', !!res.error);
  $('r-flow').classList.toggle('is-empty', !res.ok);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-who').textContent = '';
    $('f-give').textContent = '—';
    $('f-back').textContent = '—';
    $('r-foot').textContent = res.empty ? '寄付したい額を入れてください' : '';
    $('r-how').textContent = '';
    return;
  }
  $('r-num').textContent = fmt(res.man);
  $('r-who').textContent = `${spouse ? '夫婦' : 'ひとり'}${KID_NAME[kids]}`;
  $('f-give').textContent = yen(res.target);
  $('f-back').textContent = yen(res.target - 2000);
  $('r-foot').textContent = `年収${fmt(res.man)}万円の上限は${yen(res.limit)}`;
  $('r-how').textContent = '';
  if (res.man > 1000) setNote('1,000万円をこえると社会保険料の割合が下がり、年収はもう少し低くてすむことがあります。');
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
numericOnly([$('target')]);
$('target').addEventListener('input', update);
tidyOnBlur([$('target')], true);
enterToNext([$('target')]); // 次はマスをえらぶ所なので、キーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('target').value = '';
  spouse = false;
  kids = 'none';
  update();
});
update();
