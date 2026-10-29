import { parseNum, fmt } from '../lib/number.mjs';
import { shikumiPoints } from '../lib/shikumi.mjs';
import { amazonPoints } from '../lib/hikaku.mjs';
import { SPU_ITEMS, SPU_BASE, POINT_DAY } from '../data/spu.mjs';
import { POINT_MIN_YEN, POINT_MAX_SHOPS } from '../data/point.mjs';
import { AMAZON_CARD } from '../data/amazon.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('amazon.png');

// 楽天とAmazonのポイント比較：買い物の額・Amazon の商品のポイントの%・使っているもののチェック欄から、両方のポイントの目安と、ちがい
// 5と0のつく日は楽天カード、プライム会員の2%は Amazon Mastercard で払った分なので、えらぶとカードもえらぶ（カードを外すといっしょに外す）
const CFG = { items: SPU_ITEMS, base: SPU_BASE, dayRate: POINT_DAY.rate, dayCap: POINT_DAY.cap, cap: Number($('calc').dataset.cap), minYen: POINT_MIN_YEN, maxShops: POINT_MAX_SHOPS };
const on = { card: false, mobile: false, day: false, marathon: false, acard: false, prime: false };
const NEEDS = { day: 'card', prime: 'acard' };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  document.querySelectorAll('.spu-chk').forEach((b) => b.setAttribute('aria-pressed', String(on[b.dataset.k])));
  const pct = parseNum($('apct').value);
  const badPct = pct !== null && (Number.isNaN(pct) || pct > 100);
  const r = shikumiPoints({ total: parseNum($('total').value), ...on }, CFG);
  $('f-total').classList.toggle('has-error', r.field === 'total');
  $('f-apct').classList.toggle('has-error', badPct);
  const aRate = (pct && !badPct ? pct : 0) + (on.acard ? (on.prime ? AMAZON_CARD.prime : AMAZON_CARD.normal) : 0);
  $('r-rate').textContent = `${r.rate}倍・${Math.round(aRate * 100) / 100}%`; // 楽天の倍率・Amazon の%
  if (!r.ok || badPct) {
    setNote(badPct ? 'Amazonの商品のポイントは100%までにしてください。' : r.error || '', true);
    ['r', 'a'].forEach((k) => {
      $(`v-${k}`).textContent = '—';
      $(`b-${k}`).style.width = '0%';
    });
    $('r-k').textContent = 'ちがい';
    $('r-num').textContent = '？';
    $('r-foot').textContent = r.empty ? '買い物の額を入れてください' : '';
    if (!r.error && !badPct) setNote('');
    memo(null);
    return;
  }
  const a = amazonPoints({ total: r.total, pct: badPct ? null : pct, card: on.acard, prime: on.prime }, AMAZON_CARD);
  setNote(r.mShort ? 'お買い物マラソンは1店舗1,000円以上なので、5店舗なら5,000円からです。' : '');
  const max = Math.max(r.points, a.points, 1);
  $('v-r').textContent = fmt(r.points);
  $('v-a').textContent = fmt(a.points);
  $('b-r').style.width = `${((r.points / max) * 100).toFixed(1)}%`;
  $('b-a').style.width = `${((a.points / max) * 100).toFixed(1)}%`;
  const diff = r.points - a.points;
  $('r-k').textContent = diff > 0 ? '楽天が多い' : diff < 0 ? 'Amazonが多い' : '同じ';
  $('r-num').textContent = fmt(Math.abs(diff));
  memo({
    q: `${$('total').value}円の買い物`,
    a: `楽天${fmt(r.points)}・Amazon${fmt(a.points)}ポイント`,
    img: () => imgCard({
      title: '楽天とAmazonのポイント',
      cap: $('r-k').textContent,
      num: fmt(Math.abs(diff)),
      unit: 'ポイント',
      fig: { kind: 'bars', rows: [{ k: '楽天', v: r.points, text: fmt(r.points), red: diff > 0 }, { k: 'Amazon', v: a.points, text: fmt(a.points), red: diff < 0 }] },
      rows: [['買い物の額', `${$('total').value}円`], ['楽天の倍率', `${r.rate}倍`], ['Amazon', `${Math.round(aRate * 100) / 100}%`]],
      notes: ['目安です。キャンペーンは入れていません'],
    }),
  });
  const none = !Object.values(on).some(Boolean) && !pct;
  $('r-foot').textContent = none ? '使っているものをえらんでください' : '';
}

document.querySelector('.sk-list').addEventListener('click', (e) => {
  const b = e.target.closest('.spu-chk');
  if (!b) return;
  const k = b.dataset.k;
  on[k] = !on[k];
  if (NEEDS[k] && on[k]) on[NEEDS[k]] = true;
  Object.entries(NEEDS).forEach(([dep, need]) => { if (k === need && !on[need]) on[dep] = false; });
  update();
});
numericOnly([$('total'), $('apct')]);
$('total').addEventListener('input', update);
$('apct').addEventListener('input', update);
tidyOnBlur([$('total')], true);
tidyOnBlur([$('apct')], false);
enterToNext([$('total'), $('apct')]);
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('total').value = '';
  $('apct').value = '';
  Object.keys(on).forEach((k) => { on[k] = false; });
  update();
});
update();
