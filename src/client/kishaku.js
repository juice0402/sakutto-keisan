import { parseNum, fmt } from '../lib/number.mjs';
import { dilute, ratioFromPercent, ratioFromParts, waterPart, volumeText, spoonText } from '../lib/kishaku.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

let how = 'times'; // 薄め方 times：何倍 / parts：何対何 / pct：何％
let basis = 'total'; // わかっている量 total：作りたい量 / concentrate：原液の量 / water：水の量
let tileRatio = null; // えらんだマスの倍率（「その他」に入れたときは、そちらを使う）
// 量の欄の見出しと、うすい例
const AMOUNT_LABEL = { total: ['作りたい量', '500'], concentrate: ['原液の量', '10'], water: ['水の量', '1000'] };
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

function amountMl() {
  const v = val('amount');
  if (v === null || Number.isNaN(v)) return v;
  return $('unit-amount').value === 'L' ? v * 1000 : v;
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

function showEmpty(message, error) {
  $('r-conc').textContent = '？';
  $('r-conc-sub').textContent = '';
  $('r-water').textContent = '？';
  $('r-total').textContent = message;
  $('r-ratio').textContent = '';
  $('calc').classList.add('is-empty');
  setNote(error || '', !!error);
}

function update() {
  const rr = currentRatio();
  const amt = amountMl();
  // 入力まちがいの印・えらんでいるマス
  $('f-ratio').classList.toggle('has-error', rr.field === 'ratio');
  $('f-src').classList.toggle('has-error', rr.field === 'src');
  $('f-pc').classList.toggle('has-error', rr.field === 'pc');
  $('f-pw').classList.toggle('has-error', rr.field === 'pw');
  $('f-target').classList.toggle('has-error', rr.field === 'target');
  $('f-amount').classList.toggle('has-error', Number.isNaN(amt) || amt === 0);
  const custom = $('ratio').value !== '';
  document.querySelectorAll('.tile[data-ratio]').forEach((t) => t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.ratio) === tileRatio)));
  $('f-ratio').classList.toggle('is-on', custom);

  if (!rr.ok) {
    drawBottle(null);
    const hint = { times: '何倍に薄めるかをえらぶと、原液と水の量が出ます', parts: '原液と水の割合を入れると、原液と水の量が出ます', pct: '原液の濃度と作りたい濃度を入れると、何倍に薄めるかがわかります' };
    return showEmpty(hint[how], rr.error);
  }
  const res = dilute({ ratio: rr.ratio, amount: amt, from: basis });
  if (!res.ok) {
    drawBottle(dilute({ ratio: rr.ratio, amount: 1000 })); // 量がまだでも、原液と水の割合は見せる
    if (res.empty) return showEmpty(`${AMOUNT_LABEL[basis][0]}を入れると、原液と水の量が出ます（${fmt(rr.ratio, 2)}倍＝${partsText(rr.ratio)}）`);
    return showEmpty('', res.error);
  }
  $('calc').classList.remove('is-empty');
  drawBottle(res);
  $('r-conc').textContent = volumeText(res.concentrate);
  const spoon = spoonText(res.concentrate);
  $('r-conc-sub').textContent = spoon ? `（${spoon}）` : '';
  $('r-water').textContent = volumeText(res.water);
  $('r-total').textContent = `できる量 ${volumeText(res.total)}`;
  $('r-ratio').textContent = `${fmt(res.ratio, 2)}倍（${partsText(res.ratio)}）`;
  const notes = [];
  if (how === 'pct') notes.push(`${fmt(val('src'), 4)}％の原液を${fmt(val('target'), 4)}％にするには、${fmt(res.ratio, 2)}倍に薄めます。`);
  if (res.concentrate < 1.25) notes.push('原液がとても少ないので、作る量をふやすと量りやすくなります。');
  setNote(notes.join(''));
}

/* ---- 薄め方・わかっている量（大きな3つの切り替えボタン） ---- */
function setHow(next) {
  how = next;
  document.querySelectorAll('.seg-btn[data-how]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.how === how)));
  $('f-tiles').hidden = how !== 'times';
  $('parts-fields').hidden = how !== 'parts';
  $('pct-fields').hidden = how !== 'pct';
  update();
}
function setBasis(next) {
  basis = next;
  document.querySelectorAll('.seg-btn[data-basis]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.basis === basis)));
  const [label, ph] = AMOUNT_LABEL[basis];
  $('l-amount').textContent = label;
  $('amount').placeholder = ph;
  $('unit-amount').setAttribute('aria-label', `${label}の単位`);
  update();
}
document.querySelectorAll('.seg-btn[data-how]').forEach((b) => b.addEventListener('click', () => setHow(b.dataset.how)));
document.querySelectorAll('.seg-btn[data-basis]').forEach((b) => b.addEventListener('click', () => setBasis(b.dataset.basis)));

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
const inputs = ['ratio', 'pc', 'pw', 'src', 'target', 'amount'].map((id) => $(id));
numericOnly(inputs);
inputs.forEach((el) => el.addEventListener('input', update));
$('ratio').addEventListener('input', fitRatio);
$('unit-amount').addEventListener('change', update);
tidyOnBlur([$('amount')], true);
$('clear').addEventListener('click', () => {
  inputs.forEach((el) => { el.value = ''; });
  tileRatio = null;
  fitRatio();
  update();
});
enterToNext([$('ratio'), $('pc'), $('pw'), $('src'), $('target'), $('amount')]);
fitRatio();
update();
