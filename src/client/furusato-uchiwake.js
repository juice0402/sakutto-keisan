import { parseNum, fmt } from '../lib/number.mjs';
import { furusatoBreakdown } from '../lib/furusato.mjs';
import { FURUSATO_YEARS } from '../data/furusato.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 控除の内わけ：寄付の合計・年収・配偶者・16歳以上の子から、所得税・住民税の基本分・特例分・自己負担の帯と表
// 家族ははじめから「ひとり」「子なし」をえらんでおく
const YEAR = Number($('calc').dataset.year);
const CFG = FURUSATO_YEARS[YEAR];
const FAM = { none: {}, koukou: { koukou: 1 }, daigaku: { daigaku: 1 }, both: { koukou: 1, daigaku: 1 } };
let spouse = false;
let kids = 'none';
const yen = (x) => `${fmt(x)}円`;
const SEGS = ['it', 'kihon', 'tokurei', 'self', 'over'];

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  document.querySelectorAll('.tile[data-spouse]').forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.spouse === '1') === spouse)));
  document.querySelectorAll('.tile[data-kids]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.kids === kids)));
  const man = parseNum($('income').value);
  const income = man === null ? null : Math.round(man * 10000);
  const res = furusatoBreakdown({ donation: parseNum($('donation').value), income, spouse, ...FAM[kids] }, CFG);
  ['donation', 'income'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    $('r-num').textContent = '？';
    ['it', 'kihon', 'tokurei', 'self'].forEach((k) => { $(`d-${k}`).textContent = '—'; });
    SEGS.forEach((k) => { $(`s-${k}`).style.width = '0%'; });
    $('r-foot').textContent = res.empty ? (res.missing === 'donation' ? '寄付の合計を入れてください' : '年収を入れてください') : '';
    $('r-how').textContent = '';
    memo(null);
    return;
  }
  const part = { it: res.it, kihon: res.kihon, tokurei: res.tokurei, self: res.self - res.over, over: res.over };
  SEGS.forEach((k) => { $(`s-${k}`).style.width = `${((part[k] / res.donation) * 100).toFixed(2)}%`; });
  $('r-num').textContent = fmt(res.self);
  memo({ q: `寄付${yen(res.donation)}・年収${fmt(man)}万円`, a: `自己負担${yen(res.self)}` });
  $('d-it').textContent = yen(res.it);
  $('d-kihon').textContent = yen(res.kihon);
  $('d-tokurei').textContent = yen(res.tokurei);
  $('d-self').textContent = yen(res.self);
  $('r-foot').textContent = res.none ? '住民税の所得割がかからない年収です' : res.over ? `上限${yen(res.limit)}をこえた分も自己負担です` : '';
  $('r-how').textContent = res.none ? '' : `上限 ${yen(res.limit)}`;
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
const inputs = [$('donation'), $('income')];
numericOnly(inputs);
inputs.forEach((el) => el.addEventListener('input', update));
tidyOnBlur(inputs, true);
enterToNext(inputs); // 最後の欄のあとは、マスをえらぶ所なのでキーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  inputs.forEach((el) => { el.value = ''; });
  spouse = false;
  kids = 'none';
  update();
});
update();
