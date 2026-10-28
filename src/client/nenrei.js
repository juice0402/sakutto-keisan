import { fmt } from '../lib/number.mjs';
import { nenrei } from '../lib/nenrei.mjs';
import { ymdValue, parseYmd, ETO } from '../lib/hizuke.mjs';
import { $, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgEto } from './share-img.mjs';

// 年齢の計算：生年月日と、計算する日（はじめは今日）。結果は干支の輪（生まれ年の干支に赤ペンの丸）と大きな満年齢
const now = new Date();
const TODAY = ymdValue({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
const memo = choiMemo('nenrei.png');

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawRing(eto) {
  for (let i = 0; i < 12; i++) $(`e-${i}`).classList.toggle('is-on', !!eto && eto.index === i);
  $('e-mark').toggleAttribute('hidden', !eto); // SVG の要素には hidden のプロパティがないので属性で
  $('e-center').textContent = eto ? eto.kanji : '';
  if (eto) {
    $('e-mark').setAttribute('cx', $(`e-${eto.index}`).dataset.x);
    $('e-mark').setAttribute('cy', $(`e-${eto.index}`).dataset.y);
  }
}

function update() {
  const res = nenrei({ birth: $('birth').value, on: $('on').value });
  ['birth', 'on'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', res.field === id));
  setNote(res.error || '', !!res.error);
  const on = parseYmd($('on').value);
  $('r-on').textContent = on ? `${on.y}年${on.m}月${on.d}日` : '';
  memo(null);
  if (!res.ok) {
    drawRing(null);
    $('r-num').textContent = '？';
    $('r-say').textContent = '';
    ['d-kazoe', 'd-grade', 'd-next'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? (res.missing === 'birth' ? '生年月日を入れてください' : '計算する日を入れてください') : '';
    return;
  }
  drawRing(res.eto);
  $('r-num').textContent = String(res.age);
  $('r-say').textContent = `${res.wareki ? `${res.wareki.text}生まれ\n` : ''}${res.eto.kanji}（${res.eto.yomi}）年`;
  $('d-kazoe').textContent = `${res.kazoe}歳`;
  $('d-grade').textContent = res.grade || '—';
  $('d-next').textContent = res.isBirthday ? '今日' : `あと${fmt(res.untilNext, 0)}日`;
  $('r-foot').textContent = '';
  const b = parseYmd($('birth').value);
  const bText = `${b.y}年${b.m}月${b.d}日生まれ`;
  memo({
    q: $('on').value === TODAY ? bText : `${bText}・${on.y}年${on.m}月${on.d}日`,
    a: `満${res.age}歳`,
    img: () => imgEto({ names: ETO, index: res.eto.index, kanji: res.eto.kanji, age: String(res.age), say: `${res.wareki ? `${res.wareki.text}生まれ・` : ''}${res.eto.kanji}（${res.eto.yomi}）年` }),
  });
}

['birth', 'on'].forEach((id) => {
  $(id).addEventListener('input', update);
  $(id).addEventListener('change', update);
});
$('clear').addEventListener('click', () => {
  $('birth').value = '';
  $('on').value = TODAY;
  update();
});
focusHints(document.querySelector('.box-rows'));
if (!$('on').value) $('on').value = TODAY;
update();
