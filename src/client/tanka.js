import { parseNum, fmt } from '../lib/number.mjs';
import { compareUnitPrices, UNITS, DIM_JA, baseLabel } from '../lib/tanka.mjs';
import { $, enterToNext, tidyOnBlur, numericOnly } from './ui.mjs';

const KEYS = ['a', 'b', 'c'];
const opt = { c: false, packs: false, disc: false }; // 下の3つのボタン
let lastWin = '';

const yen = (x) => `${fmt(x)}円`;
const perText = (x) => fmt(x, x < 10 ? 2 : 1);
const val = (id) => parseNum($(id).value);
const active = () => KEYS.filter((k) => k !== 'c' || opt.c);

/** 量の表示（1,000g → 1kg のように読みやすく） */
function amountText(amount, unit) {
  const u = UNITS[unit];
  if (u.dim === 'weight') return amount >= 1000 ? `${fmt(amount / 1000, 3)}kg` : `${fmt(amount)}g`;
  if (u.dim === 'volume') return amount >= 1000 ? `${fmt(amount / 1000, 3)}L` : `${fmt(amount)}ml`;
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

function update() {
  const keys = active();
  const items = keys.map(readItem);
  const r = compareUnitPrices(items);
  const firstOk = r.results.findIndex((x) => x.ok);
  const dim = firstOk >= 0 ? r.results[firstOk].dim : UNITS[items[0].unit].dim;
  const base = baseLabel(dim, items[firstOk >= 0 ? firstOk : 0].unit);

  // 入力まちがいの印
  keys.forEach((k, i) => {
    const it = items[i];
    ['price', 'qty', 'packs', 'disc'].forEach((f) => {
      const v = it[f === 'price' ? 'price' : f];
      $(`f-${f}-${k}`).classList.toggle('has-error', Number.isNaN(v));
    });
  });

  // 小さな値札
  keys.forEach((k, i) => {
    const x = r.results[i];
    const el = $(`ti-${k}`);
    el.classList.remove('is-win', 'is-lose');
    el.querySelector('.tag-wrap').classList.toggle('is-empty', !x.ok);
    $(`tl-${k}`).textContent = k.toUpperCase();
    if (x.ok) {
      $(`tb-${k}`).textContent = `${baseLabel(x.dim, items[i].unit)}あたり`;
      $(`tp-${k}`).textContent = perText(x.per);
      $(`ts-${k}`).textContent = `${yen(x.pay)} ／ ${amountText(x.amount, items[i].unit)}`;
    } else {
      $(`tb-${k}`).textContent = `${base}あたり`;
      $(`tp-${k}`).textContent = '？';
      $(`ts-${k}`).textContent = x.error ? 'まちがいがあります' : '入力してください';
    }
  });
  $('ti-c').hidden = !opt.c;
  $('cmp').classList.toggle('cmp-3', opt.c);

  const v = $('verdict');
  const err = r.results.find((x) => x.error);
  if (!r.ok) {
    $('bars').hidden = true;
    v.classList.remove('is-result');
    lastWin = '';
    if (r.mismatch) {
      const dims = [...new Set(r.results.filter((x) => x.ok).map((x) => DIM_JA[x.dim]))];
      v.textContent = '単位の種類がちがいます';
      return setNote(`${dims.join('と')}はくらべられません。同じ種類の単位にしてください。`, true);
    }
    v.textContent = err ? '' : `${keys.length === 3 ? 'A・B・C' : 'AとB'}の値段と量を入れると、どっちが得かわかります`;
    return setNote(err ? err.error : '', !!err);
  }

  // 棒グラフ（基準あたりの値段。安いほど短い）
  const max = Math.max(...r.results.filter((x) => x.ok).map((x) => x.per));
  $('bars').hidden = false;
  $('bars-title').textContent = `${base}あたりの値段`;
  keys.forEach((k, i) => {
    const x = r.results[i];
    $(`br-${k}`).hidden = !(x.ok && (k !== 'c' || opt.c));
    if (!x.ok) return;
    $(`bf-${k}`).style.width = `${Math.max(4, (x.per / max) * 100)}%`;
    $(`bf-${k}`).classList.toggle('is-best', r.best.includes(i));
    $(`bv-${k}`).textContent = `${perText(x.per)}円`;
  });
  KEYS.filter((k) => !keys.includes(k)).forEach((k) => { $(`br-${k}`).hidden = true; });

  v.classList.add('is-result');
  if (r.same) {
    v.innerHTML = 'どれも<strong>同じ単価</strong>です';
    setNote('');
    lastWin = '';
    return;
  }
  const winKeys = r.best.map((i) => keys[i]);
  const okKeys = keys.filter((k, i) => r.results[i].ok);
  okKeys.forEach((k) => $(`ti-${k}`).classList.add(winKeys.includes(k) ? 'is-win' : 'is-lose'));
  winKeys.forEach((k) => { $(`tl-${k}`).textContent = `${k.toUpperCase()} がおトク！`; });
  const W = winKeys.map((k) => k.toUpperCase()).join('と');
  const S = keys[r.second].toUpperCase();
  v.innerHTML = `<b>${W}</b> のほうがおトク！<span class="verdict-sub">${base}あたり <strong>${perText(r.diff)}円</strong> 安い（約${fmt(r.pct, 0)}％）</span>`;
  const win = r.results[r.best[0]];
  const winItem = items[r.best[0]];
  const lines = [];
  if (r.saving >= 1 && winKeys.length === 1) {
    lines.push(`${W}の${amountText(win.amount, winItem.unit)}を${S}の単価で買うと${yen(Math.round(win.pay + r.saving))}なので、${yen(Math.round(r.saving))}おトクです。`);
  }
  const loser = r.results[r.second];
  if (winKeys.length === 1 && win.amount >= loser.amount * 2) lines.push('量が2倍以上あるので、使い切れるかも考えてね。');
  setNote(lines.join(''));
  // 勝ったほうの値札をゆらす
  const key = `${winKeys.join()}|${r.diff}`;
  if (key !== lastWin) {
    const tag = $(`ti-${winKeys[0]}`).querySelector('.tag-wrap');
    tag.classList.remove('swing');
    void tag.offsetWidth;
    tag.classList.add('swing');
  }
  lastWin = key;
}

/* ---- 下の3つのボタン ---- */
function toggle(name, btnId) {
  opt[name] = !opt[name];
  $(btnId).setAttribute('aria-pressed', String(opt[name]));
  if (name === 'c') {
    $('item-c').hidden = !opt.c;
    // 3つめの単位は、量がまだ空ならAと同じに
    if (opt.c && $('qty-c').value === '') $('unit-c').value = $('unit-a').value;
  }
  else document.querySelectorAll(`[data-extra="${name}"]`).forEach((el) => { el.hidden = !opt[name]; });
  document.querySelectorAll('.extra').forEach((row) => {
    row.hidden = !(opt.packs || opt.disc);
  });
  update();
  if (opt[name]) {
    const first = name === 'c' ? $('price-c') : $(`${name}-a`);
    first.focus();
  }
}
$('to-c').addEventListener('click', () => toggle('c', 'to-c'));
$('to-packs').addEventListener('click', () => toggle('packs', 'to-packs'));
$('to-disc').addEventListener('click', () => toggle('disc', 'to-disc'));

/* ---- 入力 ---- */
const inputs = KEYS.flatMap((k) => ['price', 'qty', 'packs', 'disc'].map((f) => $(`${f}-${k}`)));
numericOnly(inputs);
inputs.forEach((el) => el.addEventListener('input', update));
tidyOnBlur(KEYS.flatMap((k) => [$(`price-${k}`), $(`qty-${k}`)]), true);
// 単位を変えたら、量がまだ入っていない商品も同じ単位にそろえる
KEYS.forEach((k) =>
  $(`unit-${k}`).addEventListener('change', (e) => {
    active().filter((o) => o !== k && $(`qty-${o}`).value === '').forEach((o) => { $(`unit-${o}`).value = e.target.value; });
    update();
  }),
);
$('clear').addEventListener('click', () => {
  inputs.forEach((el) => { el.value = ''; });
  update();
  $('price-a').focus();
});
enterToNext(KEYS.flatMap((k) => [$(`price-${k}`), $(`qty-${k}`), $(`packs-${k}`), $(`disc-${k}`)]));
document.querySelectorAll('.extra').forEach((row) => { row.hidden = true; });
update();
