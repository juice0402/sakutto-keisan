import { parseNum, fmt } from '../lib/number.mjs';
import { bmi } from '../lib/bmi.mjs';
import { $, enterToNext, numericOnly } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// BMI の計算：身長と体重。結果は体重計のような目もりに針と、大きな BMI と判定
const INPUTS = ['cm', 'kg'].map((id) => $(id));
const LO = 15;
const HI = 40;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const res = bmi({ cm: parseNum($('cm').value), kg: parseNum($('kg').value) });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  setNote(res.error || '', !!res.error);
  const hasStd = res.std !== undefined;
  $('d-std').textContent = hasStd ? `${fmt(res.std, 1)}kg` : '—';
  $('d-range').textContent = hasStd ? `${fmt(res.range[0], 1)}〜${fmt(res.range[1], 1)}kg` : '—';
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-level').textContent = '？';
    $('bm-needle').hidden = true;
    $('r-foot').textContent = res.empty ? (res.missing === 'cm' ? '身長を入れてください' : '体重を入れてください') : '';
    memo(null);
    return;
  }
  $('r-num').textContent = fmt(res.value, 1);
  $('r-level').textContent = res.level;
  const p = ((Math.min(HI, Math.max(LO, res.value)) - LO) / (HI - LO)) * 100;
  $('bm-needle').style.left = `${p}%`;
  $('bm-needle').hidden = false;
  $('r-foot').textContent = '';
  memo({ q: `身長${$('cm').value}cm・体重${$('kg').value}kg`, a: `BMI ${fmt(res.value, 1)}（${res.level}）` });
}

numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  update();
});
enterToNext(INPUTS);
update();
