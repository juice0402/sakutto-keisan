import { parseNum, fmt } from '../lib/number.mjs';
import { furusatoCouple } from '../lib/furusato.mjs';
import { FURUSATO_YEARS } from '../data/furusato.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 共働き・夫婦の上限：2人の年収・扶養している16歳以上の子・子を扶養する人から、それぞれの上限と合計
// 子を扶養する人のマスは、子をえらんだときだけ出す（はじめは「あなた」）
const YEAR = Number($('calc').dataset.year);
const CFG = FURUSATO_YEARS[YEAR];
const FAM = { none: {}, koukou: { koukou: 1 }, daigaku: { daigaku: 1 }, both: { koukou: 1, daigaku: 1 } };
const HAIGU = { koujo: '配偶者控除', tokubetsu: '配偶者特別控除' };
let kids = 'none';
let who = 1;
const yen = (x) => `${fmt(x)}円`;
const toYen = (id) => {
  const man = parseNum($(id).value);
  return man === null ? null : Math.round(man * 10000); // 万円 → 円（数字でないときは NaN のまま）
};

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  document.querySelectorAll('.tile[data-kids]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.kids === kids)));
  document.querySelectorAll('.tile[data-who]').forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.who) === who)));
  $('who').hidden = kids === 'none';
  const res = furusatoCouple({ income1: toYen('income1'), income2: toYen('income2'), ...FAM[kids], kidsWith: who }, CFG);
  ['income1', 'income2'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('d-a').textContent = '—';
    $('d-b').textContent = '—';
    $('b-a').style.width = '0%';
    $('b-b').style.width = '0%';
    $('r-foot').textContent = res.empty ? (res.missing === 'income1' ? 'あなたの年収を入れてください' : '配偶者の年収を入れてください') : '';
    $('r-how').textContent = '';
    memo(null);
    return;
  }
  const lim = (r) => (r.none ? '—' : yen(r.limit));
  $('r-num').textContent = res.total ? fmt(res.total) : '—';
  memo(res.total ? { q: `年収${$('income1').value}万円と${$('income2').value}万円`, a: `2人の上限${yen(res.total)}` } : null);
  $('d-a').textContent = lim(res.a);
  $('d-b').textContent = lim(res.b);
  $('b-a').style.width = res.total ? `${((res.a.limit / res.total) * 100).toFixed(1)}%` : '0%';
  $('b-b').style.width = res.total ? `${((res.b.limit / res.total) * 100).toFixed(1)}%` : '0%';
  const h = res.a.haigu ? `あなたが${HAIGU[res.a.haigu]}` : res.b.haigu ? `配偶者が${HAIGU[res.b.haigu]}` : '';
  $('r-foot').textContent = res.total ? '' : '2人とも住民税の所得割がかからない年収です';
  $('r-how').textContent = h;
}

document.querySelector('.tiles-4').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-kids]');
  if (!t) return;
  kids = t.dataset.kids;
  update();
});
$('who').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-who]');
  if (!t) return;
  who = Number(t.dataset.who);
  update();
});
const inputs = [$('income1'), $('income2')];
numericOnly(inputs);
inputs.forEach((el) => el.addEventListener('input', update));
tidyOnBlur(inputs, true);
enterToNext(inputs); // 最後の欄のあとは、マスをえらぶ所なのでキーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  inputs.forEach((el) => { el.value = ''; });
  kids = 'none';
  who = 1;
  update();
});
update();
