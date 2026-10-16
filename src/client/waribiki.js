import { parseNum, fmt } from '../lib/number.mjs';
import { calcDiscount, calcRate, wariLabel } from '../lib/waribiki.mjs';
import { $, copyText, enterToNext, bindChips, tidyOnBlur } from './ui.mjs';

const els = {
  price: $('price'), rate: $('rate'), rate2: $('rate2'), sale: $('sale'), rounding: $('rounding'),
  more: $('more'), fRate2: $('f-rate2'), result: $('result'), label: $('r-label'), main: $('r-main'),
  rows: $('r-rows'), steps: $('r-steps'), msg: $('r-msg'), copy: $('copy'), clear: $('clear'),
};
const ROUND_MSG = { floor: '1円未満は切り捨てています。', round: '1円未満は四捨五入しています。', ceil: '1円未満は切り上げています。' };
let copyTextValue = '';

const mode = () => document.querySelector('input[name="mode"]:checked').value;
const yen = (x) => `${fmt(x)}円`;
const pct = (x, d = 2) => `${fmt(x, d)}%`;
const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;

function markErrors(fields) {
  ['price', 'rate', 'rate2', 'sale'].forEach((id) => {
    $(`f-${id}`).classList.toggle('has-error', fields.includes(id));
  });
}

function show({ label, main, unit, rows = [], steps = '', msg = '', error = false, copy = '' }) {
  els.label.textContent = label;
  els.result.classList.toggle('is-empty', !main);
  els.main.innerHTML = main ? `${main}<small>${unit}</small>` : '—';
  els.rows.innerHTML = rows.join('');
  els.steps.hidden = !steps;
  els.steps.innerHTML = steps;
  els.msg.hidden = !msg;
  els.msg.textContent = msg;
  els.msg.classList.toggle('is-error', error);
  copyTextValue = copy;
  els.copy.disabled = !copy;
}

function update() {
  const price = parseNum(els.price.value);

  if (mode() === 'rate') {
    const sale = parseNum(els.sale.value);
    markErrors([Number.isNaN(price) && 'price', Number.isNaN(sale) && 'sale'].filter(Boolean));
    const r = calcRate({ price, sale });
    if (!r.ok) {
      return show({
        label: '割引率',
        msg: r.error || '元の値段と割引後の値段を入れると、ここに答えが出ます。',
        error: !!r.error,
      });
    }
    if (r.increase) {
      return show({
        label: '値上がり率',
        main: fmt(-r.rate, 1),
        unit: '％アップ',
        rows: [row('高くなった額', yen(-r.off))],
        msg: '割引後の値段が、元の値段より高くなっています。',
        copy: `${yen(price)} → ${yen(sale)}は${pct(-r.rate, 1)}アップ（${yen(-r.off)}高い）`,
      });
    }
    const exact = Math.abs(r.rate * 10 - Math.round(r.rate * 10)) < 1e-9;
    const wari = exact ? wariLabel(r.rate) : null;
    return show({
      label: '割引率',
      main: fmt(r.rate, 1),
      unit: '％オフ',
      rows: [
        row('安くなった額', yen(r.off)),
        wari && row('割で言うと', wari),
        row('支払うのは', `元の値段の${pct(100 - r.rate, 1)}`),
      ].filter(Boolean),
      msg: exact ? '' : '割引率は小数第2位を四捨五入しています。',
      copy: `${yen(price)} → ${yen(sale)}は${pct(r.rate, 1)}オフ（${yen(r.off)}引き）`,
    });
  }

  const rate = parseNum(els.rate.value);
  const useRate2 = !els.fRate2.hidden;
  const rate2 = useRate2 ? parseNum(els.rate2.value) : null;
  markErrors(
    [Number.isNaN(price) && 'price', Number.isNaN(rate) && 'rate', Number.isNaN(rate2) && 'rate2'].filter(Boolean),
  );
  const r = calcDiscount({ price, rate, rate2, rounding: els.rounding.value });
  if (!r.ok) {
    return show({
      label: '割引後の値段',
      msg: r.error || '元の値段と割引率を入れると、ここに答えが出ます。',
      error: !!r.error,
    });
  }
  const two = r.steps.length > 1;
  const wari = wariLabel(r.totalRate);
  const rounded = r.steps.some((s) => s.rounded);
  show({
    label: '割引後の値段',
    main: fmt(r.final),
    unit: '円',
    rows: [
      row('安くなる額', yen(r.off)),
      two && row('合計の割引率', `${pct(r.totalRate)}オフ`),
      !two && wari && row('割で言うと', wari),
      row('支払うのは', `元の値段の${pct(100 - r.totalRate)}`),
    ].filter(Boolean),
    steps: two
      ? `<p>${yen(price)} → ${fmt(r.steps[0].rate)}％オフで${yen(r.steps[0].after)} → さらに${fmt(r.steps[1].rate)}％オフで${yen(r.steps[1].after)}</p>`
      : '',
    msg: rounded ? ROUND_MSG[els.rounding.value] : '',
    copy: `${yen(price)}の${fmt(rate)}％オフ${two ? `、さらに${fmt(rate2)}％オフ` : ''} → ${yen(r.final)}（${yen(r.off)}引き）`,
  });
}

function setMode() {
  const m = mode();
  document.querySelectorAll('[data-mode]').forEach((el) => {
    el.hidden = el.dataset.mode !== m;
  });
  update();
}

function toggleMore(open) {
  els.fRate2.hidden = !open;
  els.more.setAttribute('aria-expanded', String(open));
  els.more.textContent = open ? '− さらに割引をやめる' : '＋ さらに割引する';
  if (open) els.rate2.focus();
  update();
}

document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', setMode));
[els.price, els.rate, els.rate2, els.sale].forEach((el) => el.addEventListener('input', update));
els.rounding.addEventListener('change', update);
els.more.addEventListener('click', () => toggleMore(els.fRate2.hidden));
els.copy.addEventListener('click', () => copyText(copyTextValue, els.copy));
els.clear.addEventListener('click', () => {
  [els.price, els.rate, els.rate2, els.sale].forEach((el) => {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  els.price.focus();
});
enterToNext([els.price, els.rate, els.rate2, els.sale]);
bindChips();
tidyOnBlur([els.price, els.sale], true);
tidyOnBlur([els.rate, els.rate2], false);
setMode();
