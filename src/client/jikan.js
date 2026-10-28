import { parseNum, fmt } from '../lib/number.mjs';
import { jikan, jikanDays, jikanText, JIKAN_MAX_ROWS } from '../lib/jikan.mjs';
import { $, enterToNext, numericOnly } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgBar } from './share-img.mjs';

// 時間の計算：行ごとの時間と分を足して、合計を大きく。結果は時間の帯（行ごとの時間を1本の帯に並べ、1時間ごとの目もり）
const IDX = Array.from({ length: JIKAN_MAX_ROWS }, (_, i) => i);
const INPUTS = IDX.flatMap((i) => [$(`h-${i}`), $(`m-${i}`)]);
const memo = choiMemo('jikan.png');

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 時間の帯：合計の長さを1本にして、行ごとに色を分ける。目もりは1時間ごと（24時間をこえたら6時間ごと） */
function drawBar(res) {
  const bar = $('jk-bar');
  if (!res || !res.minutes) {
    bar.innerHTML = '';
    $('jk-max').textContent = '';
    return;
  }
  const hours = Math.max(1, Math.ceil(res.minutes / 60));
  const step = hours > 24 ? 6 : 1;
  const span = Math.ceil(hours / step) * step * 60; // 帯の長さ（分）
  const segs = res.used
    .filter((u) => u.minutes > 0)
    .map((u, k) => `<span class="jk-seg ${k % 2 ? 'is-odd' : 'is-even'}" style="width:${(u.minutes / span) * 100}%">${u.minutes >= span / 12 ? u.index + 1 : ''}</span>`)
    .join('');
  const ticks = Array.from({ length: span / 60 / step - 1 }, (_, i) => {
    const x = (((i + 1) * step * 60) / span) * 100;
    return `<line x1="${x}" x2="${x}" y1="${(i + 1) % (step === 1 && span > 360 ? 6 : 1) ? 60 : 30}" y2="100" stroke="rgb(28 47 74 / .55)" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  bar.innerHTML = `${segs}<svg class="jk-ticks" viewBox="0 0 100 100" preserveAspectRatio="none">${ticks}</svg>`;
  $('jk-max').textContent = `${(span / 60).toLocaleString('ja-JP')}時間`;
}

function firstEmpty() {
  const i = IDX.find((k) => !$(`row-${k}`).hidden && $(`h-${k}`).value === '' && $(`m-${k}`).value === '');
  return i === undefined ? 0 : i;
}

function update() {
  const res = jikan(IDX.filter((i) => !$(`row-${i}`).hidden).map((i) => ({ h: parseNum($(`h-${i}`).value), m: parseNum($(`m-${i}`).value) })));
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  setNote(res.error || '', !!res.error);
  drawBar(res.ok ? res : null);
  memo(null);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-num').parentElement.classList.remove('is-long');
    ['d-hours', 'd-min', 'd-days'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? `${firstEmpty() + 1}つめの時間を入れてください` : '';
    return;
  }
  $('r-num').textContent = res.text;
  $('r-num').parentElement.classList.toggle('is-long', res.text.length > 5);
  $('d-hours').textContent = `${fmt(res.hours, 4)}時間`;
  $('d-min').textContent = `${fmt(res.minutes, 0)}分`;
  $('d-days').textContent = jikanDays(res.minutes) || '—';
  $('r-foot').textContent = res.used.length === 1 ? 'もう1つ入れると足せます' : '';
  const parts = res.used.map((u) => jikanText(Math.round(u.minutes)));
  const hours = Math.max(1, Math.ceil(res.minutes / 60));
  const step = hours > 24 ? 6 : 1;
  const span = Math.ceil(hours / step) * step * 60;
  memo({
    q: parts.length > 3 ? `${parts.slice(0, 3).join('＋')}ほか${parts.length - 3}つ` : parts.join('＋'),
    a: res.text,
    img: () => imgBar({ text: res.text, segs: res.used.filter((u) => u.minutes > 0).map((u) => ({ m: u.minutes, n: u.index + 1 })), span, step, max: `${(span / 60).toLocaleString('ja-JP')}時間` }),
  });
}

/* ---- 行を足す（10行まで） ---- */
$('to-add').addEventListener('click', () => {
  const next = IDX.find((i) => $(`row-${i}`).hidden);
  if (next === undefined) return;
  $(`row-${next}`).hidden = false;
  $(`h-${next}`).focus();
  $('to-add').disabled = !IDX.some((i) => $(`row-${i}`).hidden);
  update();
});

numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  IDX.forEach((i) => { $(`row-${i}`).hidden = i >= 3; });
  $('to-add').disabled = false;
  update();
});
enterToNext(INPUTS);
update();
