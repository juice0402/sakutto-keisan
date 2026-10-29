import { parseNum, fmt } from '../lib/number.mjs';
import { spuPoints } from '../lib/spu.mjs';
import { SPU_ITEMS, SPU_BASE, SPU_MAX } from '../data/spu.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('spu.png');

// SPU のポイント計算：今月の買い物（税込）と、使っているサービスのチェック欄から、倍率とポイントの目安
// 結果のカードの帯は、全部そろったときの倍率の長さに、楽天会員の1倍と、えらんだサービスの分をぬる
const picked = new Set();
const pct = (rate) => `${((rate / SPU_MAX) * 100).toFixed(2)}%`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function drawBar() {
  const bar = $('spu-bar');
  bar.textContent = '';
  const add = (rate, cls, text) => {
    const s = document.createElement('span');
    s.className = cls;
    s.style.width = pct(rate);
    s.textContent = text;
    bar.append(s);
  };
  add(SPU_BASE, 'spu-seg is-base', String(SPU_BASE));
  SPU_ITEMS.filter((x) => picked.has(x.id)).forEach((x, i) => add(x.rate, i % 2 ? 'spu-seg is-odd' : 'spu-seg is-even', x.rate >= 1 ? `+${x.rate}` : ''));
}

function update() {
  document.querySelectorAll('.spu-chk').forEach((b) => b.setAttribute('aria-pressed', String(picked.has(b.dataset.id))));
  const res = spuPoints({ total: parseNum($('total').value), picked: [...picked] }, SPU_ITEMS, SPU_BASE);
  drawBar();
  $('r-rate').textContent = `${res.rate}倍`;
  $('f-total').classList.toggle('has-error', res.field === 'total');
  if (!res.ok) {
    setNote(res.error || '', !!res.error);
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? '今月の買い物を入れてください' : '';
    memo(null);
    return;
  }
  setNote(res.noCap.length ? `${res.noCap.map((r) => r.name).join('・')}の上限は、公式のページで確かめてください。` : '');
  $('r-num').textContent = fmt(res.points);
  memo({
    q: `今月${$('total').value}円・${picked.size}サービス`,
    a: `${fmt(res.points)}ポイント（${res.rate}倍）`,
    img: () => imgCard({
      title: '今月のSPU',
      cap: 'ポイントの目安',
      num: fmt(res.points),
      unit: 'ポイント',
      sub: `${res.rate}倍`,
      fig: { kind: 'segs', full: SPU_MAX, segs: [{ v: SPU_BASE, tone: 'ink', text: String(SPU_BASE) }, ...SPU_ITEMS.filter((x) => picked.has(x.id)).map((x, i) => ({ v: x.rate, tone: i % 2 ? 'soft' : 'pale', text: `+${x.rate}` }))], ends: ['0', `全部で${SPU_MAX}倍`] },
      rows: [['今月の買い物（税込）', `${$('total').value}円`], ['えらんだサービス', `${picked.size}つ`]],
      notes: ['目安です。付与は楽天の計算です'],
    }),
  });
  if (!picked.size) $('r-foot').textContent = '使っているサービスをえらんでください';
  else if (res.full.length) $('r-foot').textContent = `上限に届いた：${res.full.map((r) => r.name).join('・')}`;
  else if (res.next) $('r-foot').textContent = `${res.next.name}は${fmt(res.next.reach)}円で上限`;
  else $('r-foot').textContent = '';
}

document.querySelector('.spu-list').addEventListener('click', (e) => {
  const b = e.target.closest('.spu-chk');
  if (!b) return;
  if (picked.has(b.dataset.id)) picked.delete(b.dataset.id);
  else picked.add(b.dataset.id);
  update();
});
numericOnly([$('total')]);
$('total').addEventListener('input', update);
tidyOnBlur([$('total')], true);
enterToNext([$('total')]); // 次はチェック欄なので、キーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('total').value = '';
  picked.clear();
  update();
});
update();
