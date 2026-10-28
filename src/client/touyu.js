import { parseNum, fmt } from '../lib/number.mjs';
import { touyu } from '../lib/touyu.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 灯油代の計算：ファンヒーターの大きさのマスをえらぶと、1時間に使う灯油（メーカーの燃料消費量）が入る（自分で入れてもよい）。1日に使う時間と灯油の値段から、1か月の灯油代と18Lが何日もつか
// 結果はポリタンクの絵：タンクのラベルに「18Lで何日」、横にいちばん大きな1か月の灯油代と、1か月に使うポリタンクの数
const INPUTS = ['lph', 'hours', 'price'].map((id) => $(id));
const TILES = [...document.querySelectorAll('.tile[data-lph]')];
const val = (id) => parseNum($(id).value);
let picked = null; // えらんだマス（1時間の灯油の欄を書きかえたら外す）
const EMPTY = { lph: 'ヒーターの大きさをえらんでください', price: '灯油の値段を入れてください' };
const MAX_CANS = 10; // 絵に出すポリタンクの数

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 1か月に使うポリタンク（18L）。最後の1つは使う分だけ色をぬる */
function drawCans(cans) {
  if (cans === null) {
    $('t-cans').innerHTML = '';
    $('t-liters').textContent = '';
    return;
  }
  const n = Math.min(MAX_CANS, Math.ceil(cans));
  $('t-cans').innerHTML = Array.from({ length: n }, (_, i) => {
    const f = Math.min(1, cans - i);
    return `<span class="tk-can"${f < 1 ? ` style="--f:${Math.round(f * 100)}%"` : ''}></span>`;
  }).join('') + (cans > MAX_CANS ? '<span class="tk-more">…</span>' : '');
}

/** ラベルといちばん大きな数字 */
function setBig(cap, yen, label, unit) {
  $('r-cap').textContent = cap;
  $('r-num').textContent = yen;
  $('r-num').parentElement.classList.toggle('is-long', yen.length > 5);
  $('t-days').textContent = label;
  $('t-unit').textContent = unit;
}

const yenText = (x) => fmt(x, x < 100 ? 1 : 0);

function update() {
  const res = touyu({ lph: val('lph'), hours: val('hours'), price: val('price') });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  TILES.forEach((t) => t.setAttribute('aria-pressed', String(t === picked)));
  setNote(res.error || '', !!res.error);
  if (!res.ok) {
    setBig('1か月', '？', '？', '日');
    $('r-foot').textContent = res.empty ? EMPTY[res.missing] : '';
    ['d-hour', 'd-day', 'd-liter'].forEach((id) => { $(id).textContent = '—'; });
    drawCans(null);
    memo(null);
    return;
  }
  $('d-hour').textContent = `${fmt(res.hour, 1)}円`;
  $('d-day').textContent = res.day === null ? '—' : `${yenText(res.day)}円`;
  $('d-liter').textContent = `${fmt(res.liter, 1)}円`;
  if (res.hours === null) {
    setBig('1時間', fmt(res.hour, 1), fmt(res.canHours, 0), '時間');
    $('r-foot').textContent = '1日に使う時間を入れてください';
    drawCans(null);
    memo({ q: `1時間${fmt(val('lph'), 3)}L・1L${fmt(val('price'), 1)}円`, a: `1時間 約${fmt(res.hour, 1)}円` });
    return;
  }
  if (res.canDays === null) setBig('1か月', '0', '—', '日');
  else setBig('1か月', yenText(res.month), fmt(res.canDays, res.canDays < 10 ? 1 : 0), '日');
  drawCans(res.cans);
  memo({ q: `1時間${fmt(val('lph'), 3)}L・1日${fmt(res.hours, 2)}時間`, a: res.canDays === null ? '1か月 0円' : `1か月 約${yenText(res.month)}円` });
  $('t-liters').textContent = `${fmt(res.litersMonth, 1)}L（${fmt(res.cans, 1)}缶）`;
  $('r-foot').textContent = '';
}

/* ---- 大きさのマス：えらぶと、1時間に使う灯油の欄に目安の数字を入れる ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-lph]');
  if (!t) return;
  picked = t;
  $('lph').value = t.dataset.lph;
  update();
});

/* ---- 入力 ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) =>
  el.addEventListener('input', (e) => {
    if (e.isTrusted && el.id === 'lph') picked = null; // 自分で入れたら、マスの印は外す
    update();
  }),
);
tidyOnBlur([$('price')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = el.defaultValue; }); // 値段は、はじめの値にもどす
  picked = null;
  update();
});
// Enter は1時間の灯油 → 1日の時間まで（値段は、はじめの値が入っているので、とばす）
enterToNext([$('lph'), $('hours')]);
enterToNext([$('price')]);
focusHints(document.querySelector('.box-rows'));
update();
