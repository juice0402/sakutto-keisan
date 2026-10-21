import { parseNum, fmt } from '../lib/number.mjs';
import { loan } from '../lib/loan.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';

// ローンの計算：借りる額（万円）・金利（年）・返済の年数。結果は返済予定表
const INPUTS = ['man', 'rate', 'years'].map((id) => $(id));
const EMPTY = { man: '借りる額を入れてください', rate: '金利を入れてください', years: '返済の年数を入れてください' };
const man = (x) => `${fmt(x / 10000, 1)}万円`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 何年後にいくら残っているか（1年・5年・10年・20年・30年のうち返済の年数より前と、さいご） */
function drawRows(res) {
  if (!res) {
    $('r-rows').innerHTML = '<tr class="is-zero"><td>—</td><td>—</td><td>—</td></tr>';
    return;
  }
  const marks = [12, 60, 120, 240, 360].filter((k) => k < res.n);
  const rows = [...marks, res.n].map((k) => {
    const y = k / 12;
    const label = k === res.n ? '完済' : `${Number.isInteger(y) ? y : fmt(y, 1)}年後`;
    return `<tr><td>${label}</td><td>${man(Math.min(res.total, res.monthly * k))}</td><td>${man(res.balanceAfter(k))}</td></tr>`;
  });
  $('r-rows').innerHTML = rows.join('');
}

function update() {
  const res = loan({ man: parseNum($('man').value), rate: parseNum($('rate').value), years: parseNum($('years').value) });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  setNote(res.error || '', !!res.error);
  drawRows(res.ok ? res : null);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-total').textContent = '';
    $('r-interest').textContent = '';
    $('b-cost').style.width = '0%';
    $('b-profit').style.width = '0%';
    $('b-left').textContent = '元金';
    $('b-right').textContent = '利息';
    $('r-foot').textContent = res.empty ? EMPTY[res.missing] : '';
    return;
  }
  $('r-num').textContent = fmt(res.monthly, 0);
  $('r-total').textContent = `返済総額 ${man(res.total)}`;
  $('r-interest').textContent = `${res.n}回`;
  const cost = (res.principal / res.total) * 100;
  $('b-cost').style.width = `${cost}%`;
  $('b-profit').style.width = `${100 - cost}%`;
  $('b-left').textContent = `元金 ${man(res.principal)}`;
  $('b-right').textContent = `利息 ${man(res.interest)}`;
  $('r-foot').textContent = '';
}

numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
tidyOnBlur([$('man')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  update();
});
enterToNext(INPUTS);
focusHints(document.querySelector('.box-rows'));
update();
