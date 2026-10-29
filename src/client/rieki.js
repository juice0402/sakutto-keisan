import { parseNum } from '../lib/number.mjs';
import { rieki, pctText, moneyText, RIEKI_FIELDS } from '../lib/rieki.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard, figSegs, SEGS_H } from './share-img.mjs';

const memo = choiMemo('rieki-ritsu.png');

// 利益率の計算：売値・原価・利益率のうち、あとから入れた2つから残りの1つを出す（答えの欄は点線の枠に赤い数字）
let order = []; // 入れた欄（新しいものが後ろ。2つまで）
const INPUTS = RIEKI_FIELDS.map((id) => $(id));
const val = (id) => parseNum($(id).value);
const NAME = { price: '売値', cost: '原価', rate: '利益率' };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 売値の帯を、原価と利益に分ける。赤字のときは原価の長さにそろえて、足りない分をしまで */
function drawBar(res) {
  const pct = (x) => `${Math.max(0, x) * 100}%`;
  if (!res) {
    ['b-cost', 'b-profit', 'b-loss'].forEach((id) => { $(id).style.width = '0%'; });
    $('b-left').textContent = '原価';
    $('b-right').textContent = '利益';
    return;
  }
  const loss = res.profit < 0;
  const scale = loss ? res.cost : res.price;
  $('b-cost').style.width = pct((loss ? res.price : res.cost) / scale);
  $('b-profit').style.width = pct(loss ? 0 : res.profit / scale);
  $('b-loss').style.width = pct(loss ? -res.profit / scale : 0);
  $('b-left').textContent = `原価 ${moneyText(res.cost, res.step)}円`;
  $('b-right').textContent = `${loss ? '赤字' : '利益'} ${moneyText(res.profit, res.step)}円`;
}

/** 利益計算書の表：売値・原価・利益と、売値に対する割合。計算で出した値（点線の答えの欄と同じもの）は赤 */
function drawRows(res, out) {
  const cell = (text, red) => `<td${red ? ' class="is-out"' : ''}>${text}</td>`;
  const yenText = (x) => (x === null ? '—' : `${x < 0 ? '−' : ''}${moneyText(x, res ? res.step : 1)}`);
  const pct = (x) => (x === null ? '—' : `${pctText(x)}％`);
  const row = (name, x, p, redX, redP) => `<tr><td>${name}</td>${cell(yenText(x), redX)}${cell(pct(p), redP)}</tr>`;
  $('r-rows').innerHTML = res
    ? row('売値', res.price, 100, out === 'price') + row('原価', res.cost, res.costRate, out === 'cost') + row(res.profit < 0 ? '赤字' : '利益', res.profit, res.rate, false, out === 'rate')
    : row('売値', null, null) + row('原価', null, null) + row('利益', null, null);
}

/** 入れた欄が1つなら、残りの2つを案内する */
function riekiEmpty() {
  if (order.length !== 1) return '3つのうち2つを入れてください';
  return `${RIEKI_FIELDS.filter((f) => f !== order[0]).map((f) => NAME[f]).join('か')}を入れてください`;
}

function update() {
  const out = order.length === 2 ? RIEKI_FIELDS.find((f) => !order.includes(f)) : null;
  // 前に答えを出していた欄は、答えでなくなったら空にする（自分で入れた数字に見えないように）
  RIEKI_FIELDS.forEach((f) => { if (f !== out && !order.includes(f)) $(f).value = ''; });
  const res = out ? rieki({ price: val('price'), cost: val('cost'), rate: val('rate'), out }) : { ok: false, empty: true };
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) $(out).value = res.ok ? (out === 'rate' ? pctText(res.rate) : moneyText(res[out], res.step)) : '';
  setNote(res.error || '', !!res.error);
  drawBar(res.ok ? res : null);
  drawRows(res.ok ? res : null, out);
  const loss = res.ok && res.profit < 0;
  $('r-cap').textContent = loss ? '赤字' : '利益';
  $('r-sum').classList.toggle('is-error', loss);
  $('r-stamp').hidden = !res.ok;
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? riekiEmpty() : '';
    memo(null);
    return;
  }
  $('r-num').textContent = moneyText(res.profit, res.step);
  const lossNow = res.profit < 0;
  memo({
    q: `売値${moneyText(res.price, res.step)}円・原価${moneyText(res.cost, res.step)}円`,
    a: `${lossNow ? '赤字' : '利益'}${moneyText(res.profit, res.step)}円・利益率${pctText(res.rate)}%`,
    img: () => imgCard({
      title: '利益計算書',
      cap: lossNow ? '赤字' : '利益',
      num: moneyText(res.profit, res.step),
      unit: '円',
      sub: `利益率 ${pctText(res.rate)}%`,
      fig: lossNow ? null : { draw: figSegs, h: SEGS_H, segs: [{ v: res.cost, tone: 'pale', text: '原価' }, { v: res.profit, tone: 'soft', text: '利益' }], full: res.price, ends: ['0', `売値 ${moneyText(res.price, res.step)}円`] },
      rows: [['売値', `${moneyText(res.price, res.step)}円`], ['原価', `${moneyText(res.cost, res.step)}円`], ['原価率', `${pctText(res.costRate)}%`]],
      notes: ['利益率は売値に対する割合です'],
    }),
  });
  $('r-rate').textContent = `${pctText(res.rate)}%`;
  $('r-foot').textContent = res.times === null ? '' : `売値は原価の${res.times.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}倍`;
}

/* ---- 入力：入れた欄を覚えて、残りの欄に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    // 自分で入れたときだけ覚える（離れたときの3桁区切りの整え直しでは、入れた順を変えない）
    // 空にした欄は外す（残りの欄に答えを出さない。前に入れた欄を答えで上書きしない）
    if (e.isTrusted) order = el.value.trim() === '' ? order.filter((f) => f !== el.id) : [...order.filter((f) => f !== el.id), el.id].slice(-2);
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${el.id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur([$('price'), $('cost')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  order = [];
  update();
});
enterToNext(INPUTS);
update();
