import { parseNum, fmt } from '../lib/number.mjs';
import { dilute, ratioFromPercent, ratioFromParts, waterPart, volumeText, spoonText, mlValue, literText } from '../lib/kishaku.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

let how = 'times'; // 薄め方 times：何倍 / parts：何対何 / pct：何％
let basis = 'total'; // いま入れている量の欄 total：できあがり / conc：原液 / water：水（ほかの2つに答えを出す）
let tileRatio = null; // えらんだマスの倍率（「その他」に入れたときは、そちらを使う）
const AMOUNTS = ['total', 'conc', 'water'];
const AMOUNT_NAME = { total: 'できあがり', conc: '原液', water: '水' };
const FROM = { total: 'total', conc: 'concentrate', water: 'water' };
const BOTTLE_FULL = 82; // ボトルの何％まで液を入れて見せるか
const val = (id) => parseNum($(id).value);

function currentRatio() {
  if (how === 'pct') return ratioFromPercent(val('src'), val('target'));
  if (how === 'parts') return ratioFromParts(val('pc'), val('pw'));
  const custom = val('ratio');
  if (custom !== null) {
    if (Number.isNaN(custom) || custom < 1) return { ok: false, error: '何倍に薄めるかは、1以上の数字で入れてください。', field: 'ratio' };
    return { ok: true, ratio: custom };
  }
  return tileRatio === null ? { ok: false, empty: true } : { ok: true, ratio: tileRatio };
}

/** 「原液1：水9」。何対何で入れたときは、入れたままの割合（原液2：水3 など） */
function partsText(ratio) {
  return how === 'parts' ? `原液${fmt(val('pc'), 2)}：水${fmt(val('pw'), 2)}` : `原液1：水${waterPart(ratio)}`;
}

/** ボトルの絵：下に原液（黄色）、上に水（水色）。原液がとても少なくても見えるように少しだけ高さをつける */
function drawBottle(r) {
  if (!r) {
    $('b-conc').style.height = '0%';
    $('b-water').style.height = '0%';
    $('b-label').textContent = '？倍';
    return;
  }
  const conc = r.total > 0 ? Math.min(BOTTLE_FULL, Math.max((r.concentrate / r.total) * BOTTLE_FULL, r.concentrate > 0 ? 5 : 0)) : 0;
  $('b-conc').style.height = `${conc}%`;
  $('b-water').style.height = `${Math.max(0, BOTTLE_FULL - conc)}%`;
  $('b-label').textContent = `${fmt(r.ratio, 2)}倍`;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 入れていない2つの欄に答えを出す（res が null なら空にする）。計量スプーン・L の目安はボトルの下にまとめる */
function showAmounts(res) {
  const ml = res && { total: res.total, conc: res.concentrate, water: res.water };
  const hints = [];
  AMOUNTS.forEach((k) => {
    const out = k !== basis;
    $(`f-${k}`).classList.toggle('is-out', out && !!ml);
    if (out) $(`v-${k}`).value = ml ? mlValue(ml[k]) : '';
    if (!ml) return;
    const spoon = k === 'conc' ? spoonText(ml[k]) : '';
    const liter = literText(ml[k]);
    if (spoon) hints.push(`原液は計量スプーンで ${spoon}`);
    else if (liter) hints.push(`${AMOUNT_NAME[k]}${liter.startsWith('約') ? ' ' : ''}${liter}`);
  });
  $('r-hints').textContent = hints.join('・');
  $('r-sr').textContent = ml ? `原液${volumeText(ml.conc)}、水${volumeText(ml.water)}、できあがり${volumeText(ml.total)}` : '';
}

function update() {
  const rr = currentRatio();
  const amt = val(`v-${basis}`);
  // 入力まちがいの印・えらんでいるマス
  ['ratio', 'pc', 'pw', 'src', 'target'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', rr.field === id));
  AMOUNTS.forEach((k) => $(`f-${k}`).classList.toggle('has-error', k === basis && (Number.isNaN(amt) || amt === 0)));
  const custom = $('ratio').value !== '';
  document.querySelectorAll('.tile[data-ratio]').forEach((t) => t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.ratio) === tileRatio)));
  $('f-ratio').classList.toggle('is-on', custom);

  if (!rr.ok) {
    drawBottle(null);
    showAmounts(null);
    const hint = { times: '何倍に薄めるかをえらんでください', parts: '原液と水の割合を入れてください', pct: '原液の濃度と作りたい濃度を入れてください' };
    $('r-ratio').textContent = hint[how];
    return setNote(rr.error || '', !!rr.error);
  }
  $('r-ratio').textContent = `${fmt(rr.ratio, 2)}倍（${partsText(rr.ratio)}）`;
  const res = dilute({ ratio: rr.ratio, amount: amt, from: FROM[basis] });
  if (!res.ok) {
    drawBottle(dilute({ ratio: rr.ratio, amount: 1000 })); // 量がまだでも、原液と水の割合は見せる
    showAmounts(null);
    if (res.empty) $('r-hints').textContent = 'わかっている量を、どれか1つに入れてください';
    return setNote(res.empty ? '' : res.error, !res.empty);
  }
  drawBottle(res);
  showAmounts(res);
  const notes = [];
  if (res.concentrate < 1.25) notes.push('原液が少ないので、多めに作ると量りやすいです。');
  setNote(notes.join(''));
}

/* ---- 薄め方（3つのタブ） ---- */
function setHow(next) {
  how = next;
  document.querySelectorAll('.seg-btn[data-how]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.how === how)));
  $('f-tiles').hidden = how !== 'times';
  $('parts-fields').hidden = how !== 'parts';
  $('pct-fields').hidden = how !== 'pct';
  update();
}
document.querySelectorAll('.seg-btn[data-how]').forEach((b) => b.addEventListener('click', () => setHow(b.dataset.how)));

/* ---- 入力 ---- */
function fitRatio() {
  $('ratio').style.width = `${Math.max(1, $('ratio').value.length) + 0.2}ch`;
}
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-ratio]');
  if (!t) return;
  tileRatio = Number(t.dataset.ratio);
  $('ratio').value = '';
  fitRatio();
  update();
});
$('f-ratio').addEventListener('click', () => $('ratio').focus());
const ratioInputs = ['ratio', 'pc', 'pw', 'src', 'target'].map((id) => $(id));
const amountInputs = AMOUNTS.map((k) => $(`v-${k}`));
numericOnly([...ratioInputs, ...amountInputs]);
ratioInputs.forEach((el) => el.addEventListener('input', update));
$('ratio').addEventListener('input', fitRatio);
// 量の欄：入れた欄から、ほかの2つを出す。答えの出ている欄をさわったら、まるごと書きかえられるように選んでおく
AMOUNTS.forEach((k) => {
  const el = $(`v-${k}`);
  el.addEventListener('input', () => {
    basis = k;
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${k}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur(amountInputs, true);
$('clear').addEventListener('click', () => {
  [...ratioInputs, ...amountInputs].forEach((el) => { el.value = ''; });
  tileRatio = null;
  basis = 'total';
  fitRatio();
  update();
});
enterToNext([...ratioInputs, $('v-total')]);
enterToNext([$('v-conc')]);
enterToNext([$('v-water')]);
fitRatio();
update();
