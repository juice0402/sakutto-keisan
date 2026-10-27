import { test } from 'node:test';
import assert from 'node:assert/strict';
import { senzai, tableAmount } from '../src/lib/senzai.mjs';
import { SENZAI, SENZAI_WATER, SENZAI_CHECKED } from '../src/data/senzai.mjs';

const by = (id) => SENZAI.find((s) => s.id === id);
const calc = (s, water, extra = {}) => senzai({ baseWater: s.water, baseAmount: s.amount, water, table: s.table ?? null, cap: s.cap ?? null, ...extra });

test('アタックZERO は花王の表と同じ量とキャップの杯数', () => {
  const a = by('attack');
  // 花王 製品Q&A：30L 約10ml 0.3杯・45L 約15ml 0.5杯・55L 約20ml 0.7杯・65L 約25ml 0.8杯・75L 約30ml 1杯
  const want = [[30, 10, 0.3], [45, 15, 0.5], [55, 20, 0.7], [65, 25, 0.8], [75, 30, 1]];
  for (const [w, amt, caps] of want) {
    const r = calc(a, w);
    assert.equal(r.amount, amt, `${w}L`);
    assert.equal(r.caps, caps, `${w}L`);
  }
  assert.equal(calc(a, 40).amount, 15); // 花王「40Lなら45Lの目安」
});

test('ボトルの表示の水量では、表示と同じ量', () => {
  assert.equal(calc(by('nanox'), 30).amount, 10);
  assert.equal(calc(by('ariel'), 30).amount, 13);
  assert.equal(calc(by('top'), 30).amount, 30);
  assert.equal(calc(by('nanox'), 30).caps, null); // キャップの目もりがわからない洗剤は杯数を出さない
});

test('早見表（ページの表と同じ）', () => {
  const rows = SENZAI.map((s) => [45, 65].map((w) => calc(s, w).amount));
  assert.deepEqual(rows, [[15, 25], [15, 21.6666666667], [19.5, 28.1666666667], [45, 65]]);
  assert.deepEqual(SENZAI_WATER, [30, 45, 65]);
});

test('1回いくら・1本で何回', () => {
  const r = calc(by('nanox'), 45, { price: 500, content: 600 });
  assert.equal(r.perWash, 12.5);
  assert.equal(r.washes, 40);
  assert.equal(calc(by('nanox'), 45, { price: 500, content: null }).perWash, null);
});

test('表の上より多い水は割合で', () => {
  assert.equal(tableAmount(by('attack').table, 90), 36);
});

test('まちがった入力と、まだのとき', () => {
  assert.deepEqual(senzai({ baseWater: null, baseAmount: null, water: 30 }), { ok: false, empty: true, missing: 'base' });
  assert.deepEqual(senzai({ baseWater: 30, baseAmount: 10, water: null }), { ok: false, empty: true, missing: 'water' });
  assert.equal(senzai({ baseWater: 0, baseAmount: 10, water: 30 }).field, 'base-water');
  assert.equal(senzai({ baseWater: 30, baseAmount: NaN, water: 30 }).field, 'base-amount');
  assert.equal(senzai({ baseWater: 30, baseAmount: 10, water: 500 }).field, 'water');
});

test('出典の確認日から90日をこえていない', () => {
  const days = (Date.now() - Date.parse(SENZAI_CHECKED)) / 86400000;
  assert.ok(days < 90, `洗剤の量の確認日 ${SENZAI_CHECKED} から90日をこえた。メーカーのページで確かめ直す`);
  for (const s of SENZAI) assert.match(s.url, /^https:\/\//);
});
