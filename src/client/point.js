import { parseNum, fmt } from '../lib/number.mjs';
import { marathonPoints } from '../lib/point.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// お買い物マラソンのポイント計算：合計（税込）・店舗の数・上限から、買いまわりの特典の目安。結果は10マスのスタンプカード
// 回の期間と上限は #calc の data-events（src/data/point.mjs。公式で確かめたものだけ）。見た人のブラウザの時刻で、開催中・これから・終わったを分ける
const CALC = $('calc');
const EVENTS = JSON.parse(CALC.dataset.events);
const MIN = Number(CALC.dataset.min);
const MAX = Number(CALC.dataset.max);
const STEP_MAX = 20;
const at = (s) => Date.parse(`${s}:00+09:00`);
const md = (s) => `${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const hm = (s) => `${Number(s.slice(11, 13))}:${s.slice(14, 16)}`;
const val = (id) => parseNum($(id).value);
let cap = null;

/** いまの回（開催中 → いちばん近いこれからの回 → 最後に終わった回） */
function eventNow() {
  const t = Date.now();
  const running = EVENTS.find((e) => at(e.start) <= t && t <= at(e.end));
  if (running) return { e: running, when: 'now' };
  const next = EVENTS.filter((e) => at(e.start) > t).sort((a, b) => at(a.start) - at(b.start))[0];
  if (next) return { e: next, when: 'next' };
  return EVENTS.length ? { e: EVENTS[EVENTS.length - 1], when: 'past' } : null;
}

function showEvent() {
  const ev = eventNow();
  const box = $('pt-event');
  if (!ev) return;
  const { e, when } = ev;
  const span = `${md(e.start)}${hm(e.start)}〜${md(e.end)}${hm(e.end)}`;
  box.textContent = when === 'now' ? `開催中 ${span}` : when === 'next' ? `次の回 ${span}` : `${md(e.end)}に終わりました。次の回は発表待ちです`;
  box.classList.toggle('is-past', when === 'past');
  box.hidden = false;
  if (when !== 'past' && e.cap) cap = e.cap;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function stamps(n) {
  for (let i = 0; i < MAX; i++) $(`st-${i}`).classList.toggle('is-on', i < n);
}

function update() {
  const shops = val('shops');
  document.querySelectorAll('.tile[data-cap]').forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.cap) === cap)));
  $('shops-minus').disabled = !(shops > 1);
  const res = cap === null && val('total') !== null && shops !== null ? { ok: false, empty: true, missing: 'cap' } : marathonPoints({ total: val('total'), shops, cap: cap ?? Infinity, minYen: MIN, maxShops: MAX });
  ['total', 'shops'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  setNote(res.error || '', !!res.error);
  stamps(Number.isInteger(shops) && shops > 0 ? Math.min(shops, MAX) : 0);
  if (!res.ok) {
    $('r-cap').textContent = '特典';
    $('r-num').textContent = '？';
    $('r-rate').textContent = '';
    ['d-base', 'd-left', 'd-reach', 'd-next'].forEach((id) => { $(id).textContent = '—'; });
    $('d-reach-k').textContent = '上限に届く合計';
    $('r-foot').textContent = res.empty ? { total: '合計を入れてください', shops: '店舗の数を入れてください', cap: '上限をえらんでください' }[res.missing] : '';
    return;
  }
  $('r-rate').textContent = res.shops > MAX ? `${res.shops}店舗でも${res.rate}倍` : `${res.rate}倍`;
  $('r-cap').textContent = res.capped ? '特典（上限）' : '特典';
  $('r-num').textContent = fmt(res.bonus);
  $('d-base').textContent = `${fmt(res.base)}ポイント`;
  $('d-left').textContent = res.capped ? '届いています' : `あと${fmt(res.left)}ポイント`;
  $('d-reach-k').textContent = `${res.counted}店舗で上限に届く`;
  $('d-reach').textContent = res.reach ? `${fmt(res.reach)}円` : '2店舗から';
  $('d-next').textContent = res.next > 0 ? `+${fmt(res.next)}ポイント` : res.counted >= MAX ? `${MAX}店舗で最大` : '上限に届いています';
  $('r-foot').textContent = res.counted === 1 ? '2店舗目から特典がつきます' : '';
}

/* ---- 店舗の数の －／＋ ---- */
function step(d) {
  const v = val('shops');
  const now = v === null || Number.isNaN(v) ? (d > 0 ? 0 : 2) : Math.round(v);
  $('shops').value = String(Math.min(STEP_MAX, Math.max(1, now + d)));
  update();
}
$('shops-minus').addEventListener('click', () => step(-1));
$('shops-plus').addEventListener('click', () => step(1));
document.querySelector('.tiles-3').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-cap]');
  if (!t) return;
  cap = Number(t.dataset.cap);
  update();
});

const INPUTS = [$('total'), $('shops')];
numericOnly(INPUTS);
tidyOnBlur([$('total')], true);
INPUTS.forEach((el) => el.addEventListener('input', update));
enterToNext(INPUTS);
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  update();
});
showEvent();
update();
