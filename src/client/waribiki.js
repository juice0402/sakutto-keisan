import { parseNum, fmt } from '../lib/number.mjs';
import { calcDiscount, calcRate } from '../lib/waribiki.mjs';
import { $, enterToNext, bindChips, tidyOnBlur, numericOnly } from './ui.mjs';

const els = {
  price: $('price'), rate: $('rate'), rate2: $('rate2'), sale: $('sale'), rounding: $('rounding'),
  fRate2: $('f-rate2'), more: $('more'), sw: $('switch'), clear: $('clear'),
  tag: $('tag'), was: $('t-was'), tPrice: $('t-price'), save: $('t-save'), badge: $('t-badge'), tRate: $('t-rate'),
  note: $('t-note'), round: $('t-round'),
};
let mode = 'off'; // off: 割引後の値段を出す / rate: 何％オフか調べる
let lastKey = '';

const yen = (x) => `${fmt(x)}円`;

function markErrors(ids) {
  ['price', 'rate', 'rate2', 'sale'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', ids.includes(id)));
}

/** 値札を描く */
function drawTag({ was = '', price = '？', save = '', saveStrong = false, badge = '', note = '', error = false, round = false }) {
  els.was.hidden = !was;
  els.was.innerHTML = was;
  els.tPrice.textContent = price;
  els.save.textContent = save;
  els.save.classList.toggle('is-strong', saveStrong);
  els.badge.hidden = !badge;
  els.tRate.textContent = badge;
  els.tag.classList.toggle('is-empty', price === '？');
  els.note.hidden = !note;
  els.note.textContent = note;
  els.note.classList.toggle('is-error', error);
  els.round.hidden = !round;
  // 値段が変わったら値札をゆらす
  const key = `${price}|${badge}`;
  if (price !== '？' && key !== lastKey) {
    els.tag.classList.remove('swing');
    void els.tag.offsetWidth;
    els.tag.classList.add('swing');
  }
  lastKey = key;
}

const empty = (msg) => drawTag({ save: msg });

function update() {
  const price = parseNum(els.price.value);

  if (mode === 'rate') {
    const sale = parseNum(els.sale.value);
    markErrors([Number.isNaN(price) && 'price', Number.isNaN(sale) && 'sale'].filter(Boolean));
    const r = calcRate({ price, sale });
    if (r.empty) return empty('元の値段と割引後の値段を入れると、何％オフかわかります');
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
      saveStrong: r.off > 0,
      badge: r.off > 0 ? `${fmt(r.rate, 1)}%` : '',
      note: exact ? '' : `正確には${fmt(r.rate, 4)}％オフです。`,
    });
  }

  const rate = parseNum(els.rate.value);
  const rate2 = els.fRate2.hidden ? null : parseNum(els.rate2.value);
  markErrors(
    [Number.isNaN(price) && 'price', Number.isNaN(rate) && 'rate', Number.isNaN(rate2) && 'rate2'].filter(Boolean),
  );
  const r = calcDiscount({ price, rate, rate2, rounding: els.rounding.value });
  if (r.empty) return empty('値段と割引率を入れると、値札ができます');
  if (!r.ok) return drawTag({ note: r.error, error: true });

  const two = r.steps.length > 1;
  const rounded = r.steps.some((s) => s.rounded);
  drawTag({
    was: `元の値段 <s>${yen(price)}</s>`,
    price: fmt(r.final),
    save: r.off > 0 ? `${yen(r.off)} おトク！` : '割引なし',
    saveStrong: r.off > 0,
    badge: r.off > 0 ? `${fmt(r.totalRate, 1)}%` : '',
    note: two
      ? `${fmt(r.steps[0].rate)}％オフで${yen(r.steps[0].after)} → さらに${fmt(r.steps[1].rate)}％オフ。合計${fmt(r.totalRate, 1)}％オフです。`
      : '',
    round: rounded,
  });
}

function setMode(next) {
  mode = next;
  document.querySelectorAll('[data-mode]').forEach((el) => {
    el.hidden = el.dataset.mode !== mode;
  });
  els.sw.textContent = mode === 'off' ? '何％オフか調べる ›' : '割引後の値段を出す ›';
  lastKey = '';
  update();
}

function toggleMore() {
  const open = els.fRate2.hidden;
  els.fRate2.hidden = !open;
  els.more.setAttribute('aria-expanded', String(open));
  els.more.textContent = open ? '− さらに割引をやめる' : '＋ さらに割引';
  if (open) els.rate2.focus();
  update();
}

numericOnly([els.price, els.rate, els.rate2, els.sale]);
[els.price, els.rate, els.rate2, els.sale].forEach((el) => el.addEventListener('input', update));
els.rounding.addEventListener('change', update);
els.more.addEventListener('click', toggleMore);
els.sw.addEventListener('click', () => setMode(mode === 'off' ? 'rate' : 'off'));
els.clear.addEventListener('click', () => {
  [els.price, els.rate, els.rate2, els.sale].forEach((el) => {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  els.price.focus();
});
enterToNext([els.price, els.rate, els.sale, els.rate2]);
bindChips();
tidyOnBlur([els.price, els.sale], true);
setMode('off');
