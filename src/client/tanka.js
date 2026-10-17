import { parseNum, fmt } from '../lib/number.mjs';
import { compareUnitPrices, rankUnitPrices, UNITS, DIM_JA, baseLabel } from '../lib/tanka.mjs';
import { $, enterToNext, tidyOnBlur, numericOnly } from './ui.mjs';

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const MAX = KEYS.length;
let shown = 4; // 表示している商品の数（4〜8）
const opt = { packs: false, disc: false };
let lastWin = '';

const yen = (x) => `${fmt(x)}円`;
const perText = (x) => fmt(x, x < 10 ? 2 : 1);
const val = (id) => parseNum($(id).value);
const visible = () => KEYS.slice(0, shown);
const K = (k) => k.toUpperCase();

/** 量の表示（1,000g → 1kg のように読みやすく） */
function amountText(amount, unit) {
  const u = UNITS[unit];
  if (u.dim === 'weight') return amount >= 1000 ? `${fmt(amount / 1000, 3)}kg` : `${fmt(amount)}g`;
  if (u.dim === 'volume') return amount >= 1000 ? `${fmt(amount / 1000, 3)}L` : `${fmt(amount)}ml`;
  if (u.dim === 'none') return fmt(amount);
  return `${fmt(amount)}${unit}`;
}

function readItem(k) {
  return {
    price: val(`price-${k}`),
    qty: val(`qty-${k}`),
    unit: $(`unit-${k}`).value,
    packs: opt.packs ? val(`packs-${k}`) : null,
    disc: opt.disc ? val(`disc-${k}`) : null,
  };
}

function setNote(text = '', error = false) {
  $('t-note').hidden = !text;
  $('t-note').textContent = text;
  $('t-note').classList.toggle('is-error', error);
}

function showEmpty(base, msg) {
  $('t-label').hidden = true;
  $('t-badge').hidden = true;
  $('tag').classList.add('is-empty');
  $('t-base').textContent = `${base}あたり`;
  $('t-price').textContent = '？';
  $('t-sub').textContent = msg;
  $('verdict').hidden = true;
  $('rank-box').hidden = true;
  lastWin = '';
}

function update() {
  const keys = visible();
  const items = keys.map(readItem);
  const r = compareUnitPrices(items);
  const firstOk = r.results.findIndex((x) => x.ok);
  const ref = firstOk >= 0 ? firstOk : 0;
  const dim = firstOk >= 0 ? r.results[firstOk].dim : UNITS[items[0].unit].dim;
  // 基準（100gあたり・1gあたり・1個あたりなど）。くらべられたときは計算で決まった基準を使う
  const refUnit = (r.results[ref] && r.results[ref].unit) || items[ref].unit;
  const base = r.base ? (dim === 'count' ? baseLabel(dim, refUnit) : r.base.label) : baseLabel(dim, refUnit);

  // 入力まちがいの印
  keys.forEach((k, i) => {
    ['price', 'qty', 'packs', 'disc'].forEach((f) => $(`f-${f}-${k}`).classList.toggle('has-error', Number.isNaN(items[i][f])));
  });
  const errIndex = r.results.findIndex((x) => x.error);

  if (!r.ok) {
    if (r.mismatch) {
      const dims = [...new Set(r.results.filter((x) => x.ok).map((x) => DIM_JA[x.dim]))];
      showEmpty(base, '単位の種類がちがいます');
      return setNote(`${dims.join('と')}はくらべられません。同じ種類の単位にしてください。`, true);
    }
    const okCount = r.results.filter((x) => x.ok).length;
    showEmpty(base, okCount === 1 ? 'もう1つ入れると、くらべられます' : '値段と量を2つ以上入れると、いちばんおトクな商品がわかります');
    return setNote(errIndex >= 0 ? `${K(keys[errIndex])}：${r.results[errIndex].error}` : '', errIndex >= 0);
  }

  // 順位と棒グラフ（安いほど短い）
  const rank = rankUnitPrices(r.results);
  const max = Math.max(...rank.map((x) => x.per));
  $('rank-title').textContent = `${base}あたりの値段（安い順）`;
  $('rank').innerHTML = rank
    .map((x) => {
      const res = r.results[x.index];
      const best = x.rank === 1;
      return `<li class="rank-row${best ? ' is-best' : ''}"><span class="rank-no">${x.rank}位</span><span class="rank-k">${K(keys[x.index])}</span><span class="bar-track"><span class="bar-fill${best ? ' is-best' : ''}" style="width:${Math.max(4, (x.per / max) * 100)}%"></span></span><span class="rank-v">${perText(x.per)}円<small>${yen(res.pay)}／${amountText(res.amount, res.unit)}</small></span></li>`;
    })
    .join('');
  $('rank-box').hidden = false;

  // いちばんおトクの値札
  const winKeys = r.best.map((i) => K(keys[i]));
  const win = r.results[r.best[0]];
  $('tag').classList.remove('is-empty');
  $('t-base').textContent = `${base}あたり`;
  $('t-price').textContent = perText(win.per);
  $('t-sub').textContent = `${yen(win.pay)} ／ ${amountText(win.amount, win.unit)}`;
  $('t-label').hidden = false;
  $('t-badge').hidden = !!r.same;
  const v = $('verdict');
  v.hidden = false;

  if (r.same) {
    $('t-label').textContent = 'どれも同じ単価';
    v.classList.add('is-result');
    v.innerHTML = 'どれも<strong>同じ単価</strong>です';
    setNote(errIndex >= 0 ? `${K(keys[errIndex])}：${r.results[errIndex].error}` : '', errIndex >= 0);
    lastWin = '';
    return;
  }
  const W = winKeys.join('と');
  const S = K(keys[r.second]);
  $('t-label').textContent = `${W} がいちばんおトク！`;
  v.classList.add('is-result');
  v.innerHTML = `2位の${S}より <strong>${perText(r.diff)}円</strong> 安い<span class="verdict-sub">${base}あたり・約${fmt(r.pct, 0)}％おトク</span>`;
  const lines = [];
  if (r.saving >= 1 && winKeys.length === 1) {
    lines.push(`${W}の${amountText(win.amount, win.unit)}を${S}の単価で買うと${yen(Math.round(win.pay + r.saving))}なので、${yen(Math.round(r.saving))}おトクです。`);
  }
  if (winKeys.length === 1 && win.amount >= r.results[r.second].amount * 2) lines.push('量が2倍以上あるので、使い切れるかも考えてください。');
  if (errIndex >= 0) lines.push(`（${K(keys[errIndex])}は入力にまちがいがあるので、くらべていません）`);
  setNote(lines.join(''));
  // いちばんおトクが変わったら値札をゆらす
  const key = `${W}|${win.per}`;
  if (key !== lastWin) {
    $('tag').classList.remove('swing');
    void $('tag').offsetWidth;
    $('tag').classList.add('swing');
  }
  lastWin = key;
}

/* ---- 下の3つのボタン ---- */
function addItem() {
  if (shown >= MAX) return;
  const k = KEYS[shown];
  $(`unit-${k}`).value = $('unit-a').value; // 新しい行の単位はAと同じに
  $(`item-${k}`).hidden = false;
  shown += 1;
  refreshAddBtn();
  update();
  $(`price-${k}`).focus();
}
function refreshAddBtn() {
  const btn = $('to-add');
  btn.disabled = shown >= MAX;
  btn.querySelector('span').textContent = shown >= MAX ? `${MAX}つまで` : '＋1つ追加';
}
function toggle(name, btnId) {
  opt[name] = !opt[name];
  $(btnId).setAttribute('aria-pressed', String(opt[name]));
  document.querySelectorAll('.extra').forEach((row) => { row.hidden = !(opt.packs || opt.disc); });
  KEYS.forEach((k) => {
    $(`f-packs-${k}`).hidden = !opt.packs;
    $(`f-disc-${k}`).hidden = !opt.disc;
  });
  update();
  if (opt[name]) $(`${name}-a`).focus();
}
$('to-add').addEventListener('click', addItem);
$('to-packs').addEventListener('click', () => toggle('packs', 'to-packs'));
$('to-disc').addEventListener('click', () => toggle('disc', 'to-disc'));

/* ---- 入力 ---- */
const inputs = KEYS.flatMap((k) => ['price', 'qty', 'packs', 'disc'].map((f) => $(`${f}-${k}`)));
numericOnly(inputs);
inputs.forEach((el) => el.addEventListener('input', update));
tidyOnBlur(KEYS.map((k) => $(`price-${k}`)), true); // 量は3桁区切りにしない（せまい欄でも数字が切れないように）
// 単位の「種類」を変えたとき（g → ml など）だけ、量がまだ空の商品も同じ単位にそろえる
// （g → kg のように同じ種類の中で変えたときは、ほかの商品はそのまま）
KEYS.forEach((k) =>
  $(`unit-${k}`).addEventListener('change', (e) => {
    const dim = UNITS[e.target.value].dim;
    KEYS.filter((o) => o !== k && $(`qty-${o}`).value === '' && UNITS[$(`unit-${o}`).value].dim !== dim).forEach((o) => {
      $(`unit-${o}`).value = e.target.value;
    });
    update();
  }),
);
$('clear').addEventListener('click', () => {
  inputs.forEach((el) => { el.value = ''; });
  update();
  $('price-a').focus();
});
enterToNext(KEYS.flatMap((k) => [$(`price-${k}`), $(`qty-${k}`), $(`packs-${k}`), $(`disc-${k}`)]));
refreshAddBtn();
update();
