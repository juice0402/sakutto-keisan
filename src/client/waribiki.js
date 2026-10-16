import { parseNum, fmt } from '../lib/number.mjs';
import { calcDiscount, calcRate, compareDiscounts, wariLabel, wariToPct } from '../lib/waribiki.mjs';
import { $, enterToNext, tidyOnBlur, numericOnly } from './ui.mjs';

const INPUTS = ['price', 'rate', 'rate2', 'sale', 'priceB', 'rateB'].map($);
const [inPrice, inRate, inRate2, inSale, inPriceB, inRateB] = INPUTS;
const units = { rate: 'pct', rateB: 'pct' }; // 割引の欄ごとの単位（pct / wari）
let mode = 'off'; // off: 割引後の値段 / rate: 何％オフ？ / compare: 2つくらべる
let chipTarget = 'rate'; // ボタンを押したときに入れる欄
let lastKey = '';

const yen = (x) => `${fmt(x)}円`;
const show = (id, on) => { $(id).hidden = !on; };

/** 割引の欄の値を％で読む（「割」なら10倍） */
const readRate = (id) => {
  const v = parseNum($(id).value);
  return units[id] === 'wari' ? wariToPct(v) : v;
};
/** 「30%オフ＝3割引き」 */
const convText = (pct) => {
  const w = wariLabel(pct);
  return w ? `${fmt(pct, 1)}％オフ＝${w}` : '';
};

function markErrors(ids) {
  ['price', 'rate', 'rate2', 'sale', 'priceB', 'rateB'].forEach((id) =>
    $(`f-${id}`).classList.toggle('has-error', ids.includes(id)),
  );
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

/** 大きな値札（ふつうの計算・何％オフ？） */
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

function setNote(note, error = false, round = false) {
  show('t-note', !!note);
  $('t-note').textContent = note;
  $('t-note').classList.toggle('is-error', error);
  show('t-round', round);
}

/** 小さな値札（2つくらべる） */
function drawMini(k, r, price) {
  const ok = r && r.ok;
  $(`cw-${k}`).innerHTML = ok ? `<s>${yen(price)}</s>` : '';
  $(`cp-${k}`).textContent = ok ? fmt(r.final) : '？';
  $(`cs-${k}`).textContent = ok ? (r.off > 0 ? `${yen(r.off)}引き` : '割引なし') : '';
  show(`cb-${k}`, ok && r.off > 0);
  $(`cr-${k}`).textContent = ok ? `${fmt(r.totalRate, 1)}%` : '';
  $(`cmp-${k}`).classList.remove('is-win', 'is-lose');
  $(`cl-${k}`).textContent = k.toUpperCase();
}

function updateCompare() {
  const a = { price: parseNum(inPrice.value), rate: readRate('rate') };
  const b = { price: parseNum(inPriceB.value), rate: readRate('rateB') };
  markErrors(nanIds({ price: a.price, rate: a.rate, priceB: b.price, rateB: b.rate }));
  const r = compareDiscounts(a, b, $('rounding').value);
  drawMini('a', r.a, a.price);
  drawMini('b', r.b, b.price);
  const v = $('cmp-verdict');
  const err = (r.a && r.a.error) || (r.b && r.b.error);
  if (!r.ok) {
    v.textContent = err ? '' : 'AとBの値段と割引を入れると、どっちが安いかわかります';
    v.classList.remove('is-result');
    setNote(err || '', !!err, false);
    lastKey = '';
    return;
  }
  const rounded = [...r.a.steps, ...r.b.steps].some((s) => s.rounded);
  v.classList.add('is-result');
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
  setNote(
    r.tricky ? `割引の額は${lose.toUpperCase()}のほうが大きいですが、支払う金額は${win.toUpperCase()}のほうが安くなります。` : '',
    false,
    rounded,
  );
  swing($(`cmp-${win}`).querySelector('.tag-wrap'), `${r.a.final}|${r.b.final}`);
}

function update() {
  syncChips();
  if (mode === 'compare') return updateCompare();
  const price = parseNum(inPrice.value);

  if (mode === 'rate') {
    const sale = parseNum(inSale.value);
    markErrors(nanIds({ price, sale }));
    const r = calcRate({ price, sale });
    if (r.empty) return drawTag({ save: '元の値段と割引後の値段を入れると、何％オフかわかります' });
    if (!r.ok) return drawTag({ note: r.error, error: true });
    if (r.increase) {
      return drawTag({
        was: `元の値段 <s>${yen(price)}</s>`,
        price: fmt(sale),
        save: `${yen(-r.off)} 高くなっています`,
        note: `元の値段より${fmt(-r.rate, 1)}％高い値段です。`,
      });
    }
    const exact = Math.abs(r.rate * 10 - Math.round(r.rate * 10)) < 1e-9;
    return drawTag({
      was: `元の値段 <s>${yen(price)}</s>`,
      price: fmt(sale),
      save: r.off > 0 ? `${yen(r.off)} おトク！` : '割引なし',
      strong: r.off > 0,
      badge: r.off > 0 ? `${fmt(r.rate, 1)}%` : '',
      conv: r.off > 0 && exact ? convText(r.rate) : '',
      note: exact ? '' : `正確には${fmt(r.rate, 4)}％オフです。`,
    });
  }

  const rate = readRate('rate');
  const rate2 = $('f-rate2').hidden ? null : parseNum(inRate2.value);
  markErrors(nanIds({ price, rate, rate2 }));
  const r = calcDiscount({ price, rate, rate2, rounding: $('rounding').value });
  if (r.empty) return drawTag({ save: '値段と割引率を入れると、値札ができます' });
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

/* ---- 割引の単位（％／割）とボタン ---- */
function setUnit(id, unit) {
  if (units[id] === unit) return;
  const el = $(id);
  const v = parseNum(el.value);
  if (v !== null && !Number.isNaN(v)) el.value = String(unit === 'wari' ? fmt(v / 10, 3) : fmt(v * 10, 3)).replaceAll(',', '');
  units[id] = unit;
  $(`u-${id}`).textContent = unit === 'wari' ? '割引き' : '％オフ';
  document.querySelectorAll(`.unit-switch[data-for="${id}"] button`).forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.unit === unit)),
  );
  chipTarget = id;
  update();
}

function syncChips() {
  const unit = units[chipTarget];
  const cur = readRate(chipTarget);
  document.querySelectorAll('#chips .chip').forEach((c) => {
    const pct = Number(c.dataset.pct);
    if (pct !== 50) c.textContent = unit === 'wari' ? `${pct / 10}割` : `${pct}%`;
    c.setAttribute('aria-pressed', String(cur === pct));
  });
  ['rate', 'rateB'].forEach((id) => $(`f-${id}`).classList.toggle('is-target', mode === 'compare' && id === chipTarget));
}

$('chips').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  const pct = Number(c.dataset.pct);
  $(chipTarget).value = String(units[chipTarget] === 'wari' ? pct / 10 : pct);
  update();
});
document.querySelectorAll('.unit-switch').forEach((sw) =>
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setUnit(sw.dataset.for, b.dataset.unit);
  }),
);
[inRate, inRateB].forEach((el) => el.addEventListener('focus', () => { chipTarget = el.id; syncChips(); }));

/* ---- モード ---- */
function setMode(next) {
  mode = next;
  document.querySelectorAll('[data-mode]').forEach((el) => {
    el.hidden = !el.dataset.mode.split(' ').includes(mode);
  });
  if (mode !== 'compare') chipTarget = 'rate';
  lastKey = '';
  setNote('');
  update();
}

function toggleMore() {
  const open = $('f-rate2').hidden;
  show('f-rate2', open);
  $('more').setAttribute('aria-expanded', String(open));
  $('more').textContent = open ? '−さらに割引をやめる' : '＋さらに割引';
  if (open) inRate2.focus();
  update();
}

numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
$('rounding').addEventListener('change', update);
$('more').addEventListener('click', toggleMore);
$('to-cmp').addEventListener('click', () => { setMode('compare'); inPriceB.focus(); });
$('to-rate').addEventListener('click', () => { setMode('rate'); inSale.focus(); });
$('back').addEventListener('click', () => setMode('off'));
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  update();
  inPrice.focus();
});
enterToNext([inPrice, inRate, inSale, inPriceB, inRateB, inRate2]);
tidyOnBlur([inPrice, inSale, inPriceB], true);
setMode('off');
