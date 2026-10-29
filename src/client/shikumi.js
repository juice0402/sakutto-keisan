import { parseNum, fmt } from '../lib/number.mjs';
import { shikumiPoints } from '../lib/shikumi.mjs';
import { SPU_ITEMS, SPU_BASE, POINT_DAY } from '../data/spu.mjs';
import { POINT_MIN_YEN, POINT_MAX_SHOPS } from '../data/point.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('shikumi.png');

// 楽天のポイントのしくみ：今月の買い物と、使っているもののチェック欄から、ポイントを「いつもの1倍・SPU・キャンペーン」の3段に分ける
// 5と0のつく日は楽天カードで払った分だけなので、5と0のつく日をえらぶと楽天カードもえらび、楽天カードを外すと5と0のつく日も外す
const CFG = { items: SPU_ITEMS, base: SPU_BASE, dayRate: POINT_DAY.rate, dayCap: POINT_DAY.cap, cap: Number($('calc').dataset.cap), minYen: POINT_MIN_YEN, maxShops: POINT_MAX_SHOPS };
const on = { card: false, mobile: false, day: false, marathon: false };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  document.querySelectorAll('.spu-chk').forEach((b) => b.setAttribute('aria-pressed', String(on[b.dataset.k])));
  const res = shikumiPoints({ total: parseNum($('total').value), ...on }, CFG);
  $('r-rate').textContent = `${res.rate}倍`;
  $('f-total').classList.toggle('has-error', res.field === 'total');
  if (!res.ok) {
    setNote(res.error || '', !!res.error);
    ['base', 'spu', 'camp'].forEach((k) => {
      $(`v-${k}`).textContent = '—';
      $(`b-${k}`).style.width = '0%';
    });
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? '今月の買い物を入れてください' : '';
    memo(null);
    return;
  }
  setNote(res.mShort ? `お買い物マラソンは1店舗1,000円以上なので、5店舗なら5,000円からです。` : '');
  ['base', 'spu', 'camp'].forEach((k) => {
    $(`v-${k}`).textContent = fmt(res[k]);
    $(`b-${k}`).style.width = res.points ? `${((res[k] / res.points) * 100).toFixed(1)}%` : '0%';
  });
  $('r-num').textContent = fmt(res.points);
  memo({
    q: `今月${$('total').value}円`,
    a: `${fmt(res.points)}ポイント（${res.rate}倍）`,
    img: () => imgCard({
      title: '楽天のポイントのしくみ',
      cap: '今月のポイントの目安',
      num: fmt(res.points),
      unit: 'ポイント',
      sub: `${res.rate}倍`,
      fig: { kind: 'bars', rows: [['camp', 'キャンペーン'], ['spu', 'SPU'], ['base', 'いつもの1倍']].map(([k, name]) => ({ k: name, v: res[k], text: fmt(res[k]), red: k === 'camp' })) },
      rows: [['今月の買い物（税込）', `${$('total').value}円`]],
      notes: ['目安です。付与は楽天の計算です'],
    }),
  });
  const none = !on.card && !on.mobile && !on.day && !on.marathon;
  $('r-foot').textContent = none ? '使っているものをえらんでください' : res.capped ? '上限で止まった分があります' : '';
}

document.querySelector('.sk-list').addEventListener('click', (e) => {
  const b = e.target.closest('.spu-chk');
  if (!b) return;
  const k = b.dataset.k;
  on[k] = !on[k];
  if (k === 'day' && on.day) on.card = true;
  if (k === 'card' && !on.card) on.day = false;
  update();
});
numericOnly([$('total')]);
$('total').addEventListener('input', update);
tidyOnBlur([$('total')], true);
enterToNext([$('total')]); // 次はチェック欄なので、キーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('total').value = '';
  Object.keys(on).forEach((k) => { on[k] = false; });
  update();
});
update();
