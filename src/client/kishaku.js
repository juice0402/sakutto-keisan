import { parseNum, fmt } from '../lib/number.mjs';
import { dilute, ratioFromPercent, waterPart, volumeText, spoonText } from '../lib/kishaku.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

let mode = 'total'; // total：作りたい量から / concentrate：原液の量から / water：水の量から / pct：％で作る
let tileRatio = null; // えらんだマスの倍率（「その他」に入れたときは、そちらを使う）
// 量の欄の見出しと、うすい例
const AMOUNT_LABEL = { total: ['作りたい量', '500'], concentrate: ['原液の量', '10'], water: ['水の量', '1000'], pct: ['作りたい量', '1000'] };
const BOTTLE_FULL = 82; // ボトルの何％まで液を入れて見せるか
const val = (id) => parseNum($(id).value);

function currentRatio() {
  if (mode === 'pct') return ratioFromPercent(val('src'), val('target'));
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
  $('f-target').classList.toggle('has-error', rr.field === 'target');
  $('f-amount').classList.toggle('has-error', Number.isNaN(amt) || amt === 0);
  const custom = $('ratio').value !== '';
  document.querySelectorAll('.tile[data-ratio]').forEach((t) => t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.ratio) === tileRatio)));
  $('f-ratio').classList.toggle('is-on', custom);

  if (!rr.ok) {
    drawBottle(null);
    return showEmpty(mode === 'pct' ? '原液の濃度と作りたい濃度を入れると、何倍に薄めるかがわかります' : '何倍に薄めるかをえらぶと、原液と水の量が出ます', rr.error);
  }
  const from = mode === 'pct' ? 'total' : mode;
  const res = dilute({ ratio: rr.ratio, amount: amt, from });
  if (!res.ok) {
    drawBottle(dilute({ ratio: rr.ratio, amount: 1000 })); // 量がまだでも、原液と水の割合は見せる
    if (res.empty) return showEmpty(`${AMOUNT_LABEL[mode][0]}を入れると、原液と水の量が出ます（${fmt(rr.ratio, 2)}倍＝原液1：水${waterPart(rr.ratio)}）`);
    return showEmpty('', res.error);
  }
  $('calc').classList.remove('is-empty');
  drawBottle(res);
  $('r-conc').textContent = volumeText(res.concentrate);
  const spoon = spoonText(res.concentrate);
  $('r-conc-sub').textContent = spoon ? `（${spoon}）` : '';
  $('r-water').textContent = volumeText(res.water);
  $('r-total').textContent = `できる量 ${volumeText(res.total)}`;
  $('r-ratio').textContent = `${fmt(res.ratio, 2)}倍（原液1：水${waterPart(res.ratio)}）`;
  const notes = [];
  if (mode === 'pct') notes.push(`${fmt(val('src'), 4)}％の原液を${fmt(val('target'), 4)}％にするには、${fmt(res.ratio, 2)}倍に薄めます。`);
  if (res.concentrate < 1.25) notes.push('原液がとても少ないので、作る量をふやすと量りやすくなります。');
  setNote(notes.join(''));
}

/* ---- 下の3つのボタン（もう一度押すと「作りたい量から」にもどる） ---- */
function setMode(next) {
  mode = mode === next ? 'total' : next;
  [['to-conc', 'concentrate'], ['to-water', 'water'], ['to-pct', 'pct']].forEach(([id, m]) => $(id).setAttribute('aria-pressed', String(mode === m)));
  $('f-tiles').hidden = mode === 'pct';
  $('pct-fields').hidden = mode !== 'pct';
  const [label, ph] = AMOUNT_LABEL[mode];
  $('l-amount').textContent = label;
  $('amount').placeholder = ph;
  $('unit-amount').setAttribute('aria-label', `${label}の単位`);
  update();
  if (mode === 'pct') $('src').focus();
  else if (mode !== 'total') $('amount').focus();
}
$('to-conc').addEventListener('click', () => setMode('concentrate'));
$('to-water').addEventListener('click', () => setMode('water'));
$('to-pct').addEventListener('click', () => setMode('pct'));

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
const inputs = ['ratio', 'src', 'target', 'amount'].map((id) => $(id));
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
enterToNext([$('ratio'), $('src'), $('target'), $('amount')]);
fitRatio();
update();
