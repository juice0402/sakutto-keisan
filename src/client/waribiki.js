import { parseNum, fmt } from '../lib/number.mjs';
import { calcDiscount, compareDiscounts, wariLabel } from '../lib/waribiki.mjs';
import { $, enterToNext, tidyOnBlur, numericOnly } from './ui.mjs';

const inPrice = $('price');
const inRate = $('rate');
const inRate2 = $('rate2');
const TILE_PCTS = [10, 20, 30, 40, 50];

// 画面の状態。くらべるときは A・B の値段と割引を持ち、入力欄には「えらんでいるほう」を出す
const S = {
  mode: 'off', // off: 割引後の値段 / compare: 2つくらべる（何％オフ？は割引率の計算のページ）
  active: 'a',
  items: { a: { price: '', rate: '' }, b: { price: '', rate: '' } },
  more: false,
};
let lastKey = '';

const yen = (x) => `${fmt(x)}円`;
const show = (id, on) => { $(id).hidden = !on; };
const item = () => S.items[S.active];
const num = (s) => parseNum(s);

/** 「30%オフ＝3割引き」 */
const convText = (pct) => {
  const w = wariLabel(pct);
  return w ? `${fmt(pct, 1)}％オフ＝${w}` : '';
};

function markErrors(ids) {
  ['price', 'rate', 'rate2'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', ids.includes(id)));
}
const nanIds = (map) => Object.entries(map).filter(([, v]) => Number.isNaN(v)).map(([k]) => k);

function swing(el, key) {
  if (key && key !== lastKey) {
    el.classList.remove('swing');
    void el.offsetWidth;
    el.classList.add('swing');
  }
  lastKey = key;
}

function setNote(note = '', error = false, round = false) {
  show('t-note', !!note);
  $('t-note').textContent = note;
  $('t-note').classList.toggle('is-error', error);
  show('t-round', round);
}

/** 大きな値札 */
function drawTag({ was = '', price = '？', save = '', strong = false, badge = '', conv = '', note = '', error = false, round = false }) {
  show('t-was', !!was);
  $('t-was').innerHTML = was;
  $('t-price').textContent = price;
  $('t-save').textContent = save;
  $('t-save').classList.toggle('is-strong', strong);
  show('t-badge', !!badge);
  $('t-rate').textContent = badge;
  show('t-conv', !!conv);
  $('t-conv').textContent = conv;
  $('tag').classList.toggle('is-empty', price === '？');
  setNote(note, error, round);
  swing($('tag'), price === '？' ? '' : `${price}|${badge}`);
}

/** 小さな値札（2つくらべる） */
function drawMini(k, r, price) {
  const ok = r && r.ok;
  $(`cw-${k}`).innerHTML = ok ? `<s>${yen(price)}</s>` : '';
  $(`cp-${k}`).textContent = ok ? fmt(r.final) : '？';
  $(`cs-${k}`).textContent = ok ? (r.off > 0 ? `${yen(r.off)}引き` : '割引なし') : '未入力';
  show(`cb-${k}`, ok && r.off > 0);
  $(`cr-${k}`).textContent = ok ? `${fmt(r.totalRate, 1)}%` : '';
  const el = $(`cmp-${k}`);
  el.classList.remove('is-win', 'is-lose');
  el.classList.toggle('is-active', S.active === k);
  $(`cl-${k}`).textContent = k.toUpperCase();
}

/* ---- 入力欄とタイル ---- */
/** 「その他」のマスの数字の幅を中身に合わせる（「75%」がほかのタイルと同じに見えるように） */
function fitRate() {
  inRate.style.width = `${Math.max(1, inRate.value.length) + 0.2}ch`;
}

function syncInputs() {
  const it = item();
  if (document.activeElement !== inPrice) inPrice.value = it.price;
  // タイルにある割引なら「その他」は空にしておく（入力中はさわらない）
  const r = num(it.rate);
  const isTile = TILE_PCTS.includes(r);
  if (document.activeElement !== inRate) inRate.value = isTile ? '' : it.rate;
  document.querySelectorAll('.tile[data-pct]').forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.pct) === r)));
  $('f-rate').classList.toggle('is-on', r !== null && !Number.isNaN(r) && !isTile);
  // ラベル・タブ
  const k = S.mode === 'compare' ? S.active.toUpperCase() : '';
  $('l-price').textContent = k ? `${k}の値段` : '元の値段';
  $('l-rate').textContent = k ? `${k}の値引きをえらぶ` : '値引きをえらぶ';
  fitRate();
  ['a', 'b'].forEach((key) => {
    const v = S.items[key];
    const p = num(v.price);
    const q = num(v.rate);
    const ok = p !== null && !Number.isNaN(p);
    $(`tab-${key}`).textContent = ok ? `${yen(p)}${q !== null && !Number.isNaN(q) ? `・${fmt(q)}%` : ''}` : 'まだ入っていません';
    document.querySelector(`.cmp-tab[data-item="${key}"]`).setAttribute('aria-pressed', String(S.active === key));
  });
}

function update() {
  syncInputs();
  if (S.mode === 'compare') return updateCompare();
  const it = S.items.a;
  const price = num(it.price);
  const rate = num(it.rate);
  const rate2 = S.more ? num(inRate2.value) : null;
  markErrors(nanIds({ price, rate, rate2 }));
  const r = calcDiscount({ price, rate, rate2, rounding: $('rounding').value });
  if (r.empty) return drawTag({ save: '値段と割引を入れると、値札ができます' });
  if (!r.ok) return drawTag({ note: r.error, error: true });
  const two = r.steps.length > 1;
  drawTag({
    was: `元の値段 <s>${yen(price)}</s>`,
    price: fmt(r.final),
    save: r.off > 0 ? `${yen(r.off)} おトク！` : '割引なし',
    strong: r.off > 0,
    badge: r.off > 0 ? `${fmt(r.totalRate, 1)}%` : '',
    conv: r.off > 0 ? convText(r.totalRate) : '',
    note: two
      ? `${fmt(r.steps[0].rate)}％オフで${yen(r.steps[0].after)} → さらに${fmt(r.steps[1].rate)}％オフ。合計${fmt(r.totalRate, 1)}％オフです。`
      : '',
    round: r.steps.some((s) => s.rounded),
  });
}

function updateCompare() {
  const a = { price: num(S.items.a.price), rate: num(S.items.a.rate) };
  const b = { price: num(S.items.b.price), rate: num(S.items.b.rate) };
  const cur = S.items[S.active];
  markErrors(nanIds({ price: num(cur.price), rate: num(cur.rate) }));
  const r = compareDiscounts(a, b, $('rounding').value);
  drawMini('a', r.a, a.price);
  drawMini('b', r.b, b.price);
  const v = $('cmp-verdict');
  const err = (r.a && r.a.error) || (r.b && r.b.error);
  v.classList.toggle('is-result', r.ok);
  if (!r.ok) {
    v.textContent = err ? '' : 'AとBを入れると、どっちが安いかわかります';
    setNote(err || '', !!err);
    lastKey = '';
    return;
  }
  const rounded = [...r.a.steps, ...r.b.steps].some((s) => s.rounded);
  if (r.cheaper === 'same') {
    v.innerHTML = 'どちらも<strong>同じ値段</strong>です';
    setNote('', false, rounded);
    return;
  }
  const win = r.cheaper;
  const lose = win === 'a' ? 'b' : 'a';
  $(`cmp-${win}`).classList.add('is-win');
  $(`cmp-${lose}`).classList.add('is-lose');
  $(`cl-${win}`).textContent = `${win.toUpperCase()} が安い！`;
  v.innerHTML = `<b>${win.toUpperCase()}</b> のほうが <strong>${yen(r.diff)}</strong> 安い！`;
  setNote('', false, rounded);
  swing($(`cmp-${win}`).querySelector('.tag-wrap'), `${r.a.final}|${r.b.final}`);
}

/* ---- 操作 ---- */
function setActive(k) {
  S.active = k;
  inPrice.value = S.items[k].price;
  inRate.value = '';
  update();
}

function setMode(next) {
  S.mode = S.mode === next ? 'off' : next; // 同じボタンをもう一度押すと元にもどる
  document.querySelectorAll('[data-mode]').forEach((el) => {
    el.hidden = !el.dataset.mode.split(' ').includes(S.mode);
  });
  show('f-rate2', S.mode === 'off' && S.more);
  $('to-cmp').setAttribute('aria-pressed', String(S.mode === 'compare'));
  $('more').disabled = S.mode !== 'off';
  lastKey = '';
  setNote();
  if (S.mode === 'compare') {
    setActive(S.items.b.price ? 'a' : 'b');
    if (!S.items.b.price) inPrice.focus();
  } else {
    setActive('a');
  }
}

document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-pct]');
  if (!t) return;
  item().rate = t.dataset.pct;
  inRate.value = '';
  update();
});
inPrice.addEventListener('input', () => { item().price = inPrice.value; update(); });
inRate.addEventListener('input', () => { item().rate = inRate.value; fitRate(); update(); });
inRate2.addEventListener('input', update);
$('f-rate').addEventListener('click', () => inRate.focus());
document.querySelectorAll('.cmp-tab, .cmp-item').forEach((el) => el.addEventListener('click', () => setActive(el.dataset.item)));
$('rounding').addEventListener('change', update);
$('more').addEventListener('click', () => {
  S.more = !S.more;
  $('more').setAttribute('aria-pressed', String(S.more));
  show('f-rate2', S.more);
  if (S.more) inRate2.focus();
  update();
});
$('to-cmp').addEventListener('click', () => setMode('compare'));
$('clear').addEventListener('click', () => {
  S.items[S.active] = { price: '', rate: '' };
  [inPrice, inRate, inRate2].forEach((el) => { el.value = ''; });
  update();
  inPrice.focus();
});

numericOnly([inPrice, inRate, inRate2]);
tidyOnBlur([inPrice], true);
inPrice.addEventListener('blur', () => { item().price = inPrice.value; });
enterToNext([inPrice, inRate, inRate2]);
setMode('off');
