import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kakeritsu, kakePct, kakeText, kakePctText } from '../src/lib/kakeritsu.mjs';

test('掛け率の書き方をそろえる（6掛け・60％・0.6）', () => {
  assert.deepEqual([0.6, 6, 6.5, 60, 65, 10, 75, 0.55].map(kakePct), [60, 60, 65, 60, 65, 10, 75, 55]);
  assert.equal(kakePct(null), null);
  assert.equal(kakeText(60), '6');
  assert.equal(kakeText(65), '6.5');
  assert.equal(kakeText(62.5), '6.25');
});

test('上代と掛け率から下代（ページの計算例）', () => {
  const a = kakeritsu({ jodai: 3000, rate: 60, gedai: null, out: 'gedai' });
  assert.deepEqual([a.gedai, a.profit, a.profitPct], [1800, 1200, 40]);
  assert.equal(kakeritsu({ jodai: 3000, rate: 6, gedai: null, out: 'gedai' }).gedai, 1800); // 6掛け
  assert.equal(kakeritsu({ jodai: 1980, rate: 65, gedai: null, out: 'gedai' }).gedai, 1287);
  assert.equal(kakeritsu({ jodai: 1234, rate: 55, gedai: null, out: 'gedai' }).gedai, 678.7); // 1円未満も出す
});

test('上代と下代から掛け率', () => {
  const r = kakeritsu({ jodai: 2000, rate: null, gedai: 1300, out: 'rate' });
  assert.equal(r.pct, 65);
  assert.equal(kakeText(r.pct), '6.5');
  assert.equal(r.profitPct, 35);
  const r2 = kakeritsu({ jodai: 3000, rate: null, gedai: 1000, out: 'rate' });
  assert.equal(kakePctText(r2.pct), '33.3');
  // 下代が上代より高いとき（粗利がマイナス）
  const r3 = kakeritsu({ jodai: 1000, rate: null, gedai: 1200, out: 'rate' });
  assert.deepEqual([r3.pct, r3.profit], [120, -200]);
});

test('下代と掛け率から上代', () => {
  assert.equal(kakeritsu({ jodai: null, rate: 60, gedai: 1800, out: 'jodai' }).jodai, 3000);
  assert.equal(kakeritsu({ jodai: null, rate: 65, gedai: 1000, out: 'jodai' }).jodai, 1538.46);
});

test('上代と掛け率の早見表（ページの表）', () => {
  const table = { 1000: [500, 600, 700, 800], 2000: [1000, 1200, 1400, 1600], 3000: [1500, 1800, 2100, 2400], 5000: [2500, 3000, 3500, 4000], 10000: [5000, 6000, 7000, 8000] };
  for (const [jodai, want] of Object.entries(table)) {
    assert.deepEqual([50, 60, 70, 80].map((rate) => kakeritsu({ jodai: Number(jodai), rate, gedai: null, out: 'gedai' }).gedai), want);
  }
  assert.deepEqual([1980, 2980, 4980].map((jodai) => kakeritsu({ jodai, rate: 60, gedai: null, out: 'gedai' }).gedai), [1188, 1788, 2988]);
});

test('まだ入れていない・まちがった入力', () => {
  assert.equal(kakeritsu({ jodai: 3000, rate: null, gedai: null, out: 'gedai' }).empty, true);
  assert.equal(kakeritsu({ jodai: 0, rate: 60, gedai: null, out: 'gedai' }).field, 'jodai');
  assert.equal(kakeritsu({ jodai: NaN, rate: 60, gedai: null, out: 'gedai' }).field, 'jodai');
  assert.equal(kakeritsu({ jodai: 3000, rate: 0, gedai: null, out: 'gedai' }).field, 'rate');
  assert.equal(kakeritsu({ jodai: 3000, rate: 120, gedai: null, out: 'gedai' }).field, 'rate');
  assert.equal(kakeritsu({ jodai: 3000, rate: null, gedai: 0, out: 'rate' }).field, 'gedai');
});
