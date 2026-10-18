import { parseNum, fmt } from '../lib/number.mjs';
import { fxPosition, fxAddMoney, yenText, cutPriceText, qtyText, ratioText } from '../lib/fx.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

// 証拠金維持率（data-tool="iji"）と追証（data-tool="oisho"）。入力は同じで、答えの見せ方だけちがう
const TOOL = $('calc').dataset.tool;
let tileQty = null; // えらんだマスの通貨の量（「その他」に入れたときは、そちらを使う）
const val = (id) => parseNum($(id).value);
const INPUTS = [...document.querySelectorAll('#calc input')]; // ページの上から順（Enter で次へ）
const GAUGE_MAX = 500; // メーターの右はし（維持率500％）

function currentQty() {
  const custom = val('qty');
  if (custom !== null) return Number.isNaN(custom) ? NaN : custom * 10000; // その他は万通貨で入れる
  return tileQty;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function setBig(num, unit, error = false) {
  $('r-num').textContent = num;
  $('r-unit').textContent = unit;
  $('r-big').classList.toggle('is-error', error);
}

const EMPTY = '通貨の量・口座のお金・レートを入れてください';
const MISSING = { cut: 'ロスカットの基準を入れてください', level: '追証の基準を入れてください' };
const emptyText = (res) => (res.empty ? MISSING[res.missing] || EMPTY : '');

/* ---- 証拠金維持率：メーターと「ロスカットまで あと◯円の損」 ---- */
function drawGauge(res) {
  const ratio = res ? Math.min(GAUGE_MAX, Math.max(0, res.ratio)) : 0;
  $('g-needle').style.transform = `rotate(${(ratio / GAUGE_MAX) * 180}deg)`;
  $('g-cut').setAttribute('stroke-dasharray', `${Math.min(GAUGE_MAX, val('cut') || 0)} 600`);
  $('r-ratio').textContent = res ? ratioText(res.ratio) : '？';
}

function showIji(res) {
  drawGauge(res.ok ? res : null);
  ['r-buy', 'r-sell'].forEach((id) => { $(id).textContent = ''; });
  if (!res.ok) {
    $('r-cap').textContent = 'ロスカットまで、あと';
    setBig('？', '円の損');
    $('r-need').textContent = emptyText(res);
    return;
  }
  $('r-need').textContent = `取引に必要なお金 ${yenText(res.need)}（${qtyText(currentQty())}）`;
  if (res.over || res.edge) {
    $('r-cap').textContent = 'ロスカットの基準まで';
    if (res.edge) setBig('ちょうど', '基準です', true);
    else setBig(fmt(Math.ceil(-res.room), 0), '円 足りません', true);
    return;
  }
  $('r-cap').textContent = 'ロスカットまで、あと';
  setBig(fmt(Math.floor(res.room), 0), '円の損');
  $('r-buy').textContent = res.never ? '買いなら、0円まで下がってもロスカットになりません' : `買いなら${cutPriceText(res.buyPrice, 'buy')}まで下がると`;
  $('r-sell').textContent = `売りなら${cutPriceText(res.sellPrice, 'sell')}まで上がると`;
}

/* ---- 追証：足りないお金と、口座のお金のバー ---- */
function drawBar(have, need) {
  const scale = Math.max(have, need) || 1;
  const pct = (x) => `${(Math.max(0, x) / scale) * 100}%`;
  $('b-have').style.width = pct(Math.min(have, need));
  $('b-need').style.width = pct(need - have);
  $('b-line').style.left = pct(need);
  $('b-left').textContent = have || need ? `口座のお金 ${yenText(have)}` : '口座のお金';
}

function showOisho(res) {
  $('r-target').textContent = '';
  if (!res.ok) {
    $('r-cap').textContent = `維持率${fmt(val('level') || 100, 1)}％までに足りないお金`;
    setBig('？', '円');
    drawBar(0, 0);
    $('b-right').textContent = '基準';
    $('r-need').textContent = emptyText(res);
    return;
  }
  const level = `維持率${fmt(res.level, 1)}％`;
  $('r-need').textContent = `取引に必要なお金 ${yenText(res.need)}（${qtyText(currentQty())}）`;
  if (res.target === undefined) {
    $('r-cap').textContent = `${level}までに足りないお金`;
    setBig(fmt(Math.ceil(res.short), 0), '円');
    drawBar(val('money'), res.levelMoney);
    $('b-right').textContent = `${level} ${yenText(res.levelMoney)}`;
    $('r-target').textContent = res.short > 0 ? '' : `いまの維持率は${ratioText(res.ratio)}です`;
    return;
  }
  // 耐えたいレートがあるとき：いまより下なら買い、上なら売りとして、そこまで動いても維持率が基準を下回らない入金額
  const way = res.target < val('rate') ? '下がっても' : '上がっても';
  $('r-cap').textContent = `${fmt(res.target, 3)}円まで${way}${level}を保つには`;
  setBig(fmt(Math.ceil(res.deposit), 0), '円 入金');
  drawBar(val('money'), res.keep + res.loss);
  $('b-right').textContent = `必要 ${yenText(Math.ceil(res.keep + res.loss))}`;
  $('r-target').textContent = res.short > 0 ? `いまのままでも ${yenText(Math.ceil(res.short))} 足りません` : '';
}

function update() {
  const qty = currentQty();
  const res =
    TOOL === 'oisho'
      ? fxAddMoney({ money: val('money'), qty, rate: val('rate'), level: val('level'), cut: val('level'), target: val('target') === val('rate') ? null : val('target') })
      : fxPosition({ money: val('money'), qty, rate: val('rate'), cut: val('cut') });
  // 入力まちがいの印・えらんでいるマス
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  const custom = $('qty').value !== '';
  document.querySelectorAll('.tile[data-qty]').forEach((t) => t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.qty) === tileQty)));
  $('f-qty').classList.toggle('is-on', custom);
  setNote(res.error || '', !!res.error);
  if (TOOL === 'oisho') showOisho(res);
  else showIji(res);
}

/* ---- 入力 ---- */
function fitQty() {
  $('qty').style.width = `${Math.max(1, $('qty').value.length) + 0.2}ch`;
}
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-qty]');
  if (!t) return;
  tileQty = Number(t.dataset.qty);
  $('qty').value = '';
  fitQty();
  update();
});
$('f-qty').addEventListener('click', () => $('qty').focus());
numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
$('qty').addEventListener('input', fitQty);
tidyOnBlur([$('money')], true);
// クリア：はじめに入っていた値（ロスカットや追証の基準 100％）にもどす
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = el.defaultValue; });
  tileQty = null;
  fitQty();
  update();
});
enterToNext(INPUTS);
fitQty();
update();
