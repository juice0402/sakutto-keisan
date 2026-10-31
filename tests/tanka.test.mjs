import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt } from '../src/lib/number.mjs';
import { calcUnitPrice, compareUnitPrices, baseLabel, rankUnitPrices } from '../src/lib/tanka.mjs';

test('単価：g と kg をそろえる（ページの計算例）', () => {
  const r = compareUnitPrices([
    { price: 198, qty: 500, unit: 'g' },
    { price: 298, qty: 1, unit: 'kg' },
  ]);
  assert.equal(r.results[0].per, 39.6);
  assert.equal(r.results[1].per, 29.8);
  assert.deepEqual(r.best, [1]);
  assert.equal(r.diff, 9.8);
  assert.equal(fmt(r.pct, 0), '25');
  assert.equal(r.saving, 98); // 1kg を A の単価で買うと 396円 → 98円おトク
});

test('単価：ml と L（牛乳）', () => {
  const r = compareUnitPrices([
    { price: 248, qty: 1, unit: 'L' },
    { price: 138, qty: 500, unit: 'ml' },
  ]);
  assert.equal(r.results[0].per, 24.8);
  assert.equal(r.results[1].per, 27.6);
  assert.deepEqual(r.best, [0]);
});

test('単価：入り数（6本パック）', () => {
  const r = compareUnitPrices([
    { price: 1180, qty: 350, unit: 'ml', packs: 6 },
    { price: 208, qty: 350, unit: 'ml' },
  ]);
  assert.equal(fmt(r.results[0].per, 1), '56.2');
  assert.equal(fmt(r.results[1].per, 1), '59.4');
  assert.deepEqual(r.best, [0]);
});

test('単価：個数（ティッシュ5箱と3箱）', () => {
  const r = compareUnitPrices([
    { price: 398, qty: 5, unit: '個' },
    { price: 258, qty: 3, unit: '個' },
  ]);
  assert.equal(r.results[0].per, 79.6);
  assert.equal(r.results[1].per, 86);
  assert.equal(baseLabel('count', '枚'), '1枚');
});

test('単価：割引シール（20%オフは1円未満切り捨て。まとめ買いのページの計算例）', () => {
  const a = calcUnitPrice({ price: 298, qty: 1, unit: 'kg', disc: 20 });
  assert.equal(a.pay, 238);
  assert.equal(a.per, 23.8);
  const r = compareUnitPrices([
    { price: 298, qty: 1, unit: 'kg', disc: 20 },
    { price: 128, qty: 500, unit: 'g' },
  ]);
  assert.deepEqual(r.results.map((x) => x.per), [23.8, 25.6]);
  assert.deepEqual(r.best, [0]);
});

test('単価：お米 5kg と 2kg（実質単価の比較のページの計算例）', () => {
  const r = compareUnitPrices([
    { price: 2480, qty: 5, unit: 'kg' },
    { price: 1080, qty: 2, unit: 'kg' },
  ]);
  assert.deepEqual(r.results.map((x) => x.per), [49.6, 54]);
  assert.equal(r.base.label, '100g');
  assert.deepEqual(r.best, [0]);
});

test('単価：卵 10個と6個（まとめ買いのページの計算例。量を空にして入り数だけ）', () => {
  const r = compareUnitPrices([
    { price: 248, qty: null, unit: 'g', packs: 10 },
    { price: 168, qty: null, unit: 'g', packs: 6 },
  ]);
  assert.deepEqual(r.results.map((x) => x.per), [24.8, 28]);
  assert.equal(r.base.label, '1個');
});

test('単価：3つくらべる・同じ・単位の種類ちがい・入力まちがい', () => {
  const r = compareUnitPrices([
    { price: 100, qty: 100, unit: 'g' },
    { price: 180, qty: 200, unit: 'g' },
    { price: 250, qty: 300, unit: 'g' },
  ]);
  assert.deepEqual(r.best, [2]);
  assert.equal(r.second, 1);
  assert.equal(compareUnitPrices([{ price: 100, qty: 100, unit: 'g' }, { price: 200, qty: 200, unit: 'g' }]).same, true);
  assert.equal(compareUnitPrices([{ price: 100, qty: 100, unit: 'g' }, { price: 100, qty: 100, unit: 'ml' }]).mismatch, true);
  assert.equal(compareUnitPrices([{ price: 100, qty: 100, unit: 'g' }, { price: null, qty: 100, unit: 'g' }]).ok, false);
  assert.ok(calcUnitPrice({ price: 100, qty: 0, unit: 'g' }).error);
  assert.ok(calcUnitPrice({ price: 100, qty: 10, unit: 'g', packs: 0 }).error);
  assert.ok(calcUnitPrice({ price: 100, qty: 10, unit: 'g', disc: 120 }).error);
});

test('単価：8つまでの順位（空の商品は飛ばす・同じ値段は同じ順位）', () => {
  const items = [
    { price: 300, qty: 1000, unit: 'g' }, // 30
    null,
    { price: 198, qty: 500, unit: 'g' }, // 39.6
    { price: 120, qty: 400, unit: 'g' }, // 30
    { price: 98, qty: 400, unit: 'g' }, // 24.5
    { price: null, qty: null, unit: 'g' },
    { price: 500, qty: 1, unit: 'kg' }, // 50
    { price: 450, qty: 1500, unit: 'g' }, // 30
  ];
  const r = compareUnitPrices(items);
  assert.deepEqual(r.best, [4]);
  const rank = rankUnitPrices(r.results);
  assert.deepEqual(rank.map((x) => x.index), [4, 0, 3, 7, 2, 6]);
  assert.deepEqual(rank.map((x) => x.rank), [1, 2, 2, 2, 5, 6]);
});

test('単価：100gより少ない商品があるときは1gあたりでくらべる', () => {
  const r = compareUnitPrices([
    { price: 100, qty: 1, unit: 'g' },
    { price: 1000, qty: 1, unit: 'g' },
  ]);
  assert.equal(r.base.label, '1g');
  assert.equal(r.results[0].per, 100);
  assert.equal(r.results[1].per, 1000);
  assert.equal(r.diff, 900);
  assert.equal(r.pct, 90);
  const big = compareUnitPrices([{ price: 198, qty: 500, unit: 'g' }, { price: 298, qty: 1, unit: 'kg' }]);
  assert.equal(big.base.label, '100g');
  const spice = compareUnitPrices([{ price: 128, qty: 20, unit: 'g' }, { price: 398, qty: 100, unit: 'g' }]);
  assert.equal(spice.base.label, '1g');
  assert.equal(spice.results[0].per, 6.4);
  assert.equal(spice.results[1].per, 3.98);
});

test('単価：単位なし（値段と数量だけ）', () => {
  const r = compareUnitPrices([
    { price: 598, qty: 6, unit: 'なし' },
    { price: 748, qty: 8, unit: 'なし' },
  ]);
  assert.equal(r.base.label, '1つ');
  assert.equal(fmt(r.results[0].per, 2), '99.67');
  assert.equal(r.results[1].per, 93.5);
  assert.deepEqual(r.best, [1]);
  const big = compareUnitPrices([{ price: 198, qty: 500, unit: 'なし' }, { price: 298, qty: 1000, unit: 'なし' }]);
  assert.equal(big.base.label, '100');
  assert.equal(big.results[0].per, 39.6);
  assert.equal(compareUnitPrices([{ price: 100, qty: 100, unit: 'なし' }, { price: 100, qty: 100, unit: 'g' }]).mismatch, true);
});

test('単価：量が空でも、値段と入り数だけでくらべる（1個あたり）', () => {
  const r = compareUnitPrices([
    { price: 980, qty: null, unit: 'なし', packs: 5 },
    { price: 1000, qty: null, unit: 'g', packs: 6 },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.base.label, '1個');
  assert.equal(r.results[0].per, 196);
  assert.equal(fmt(r.results[1].per, 1), '166.7');
  assert.deepEqual(r.best, [1]);
  assert.equal(r.results[1].unit, '個');
  // 入り数も空なら、まだくらべない
  assert.equal(calcUnitPrice({ price: 980, qty: null, unit: 'g', packs: null }).empty, true);
});

test('実質単価の比較の本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const per = (o) => calcUnitPrice(o).per;
  const shown = (x) => fmt(x, x < 10 ? 2 : 1); // 画面の書き方（src/client/tanka.js の perText）
  assert.equal(per({ price: 168, qty: 1.5, unit: 'L' }), 11.2); // 計算式の例：1.5Lで168円のお茶
  const sen = compareUnitPrices([{ price: 258, qty: 400, unit: 'g' }, { price: 548, qty: 1, unit: 'kg' }]); // 詰め替えの洗剤
  assert.deepEqual([sen.results[0].per, sen.results[1].per, sen.best], [64.5, 54.8, [1]]);
  const tp = compareUnitPrices([{ price: 438, qty: 330, unit: 'm' }, { price: 658, qty: 600, unit: 'm' }]); // トイレットペーパー
  assert.deepEqual([shown(tp.results[0].per), shown(tp.results[1].per), tp.base.label, tp.best], ['1.33', '1.1', '1m', [1]]);
  const bag = compareUnitPrices([{ price: 298, qty: 50, unit: '枚' }, { price: 198, qty: 30, unit: '枚' }]); // ゴミ袋
  assert.deepEqual([bag.results[0].per, bag.results[1].per, bag.best], [5.96, 6.6, [0]]);
  const milk = compareUnitPrices([{ price: 248, qty: 1, unit: 'L' }, { price: 118, qty: 500, unit: 'ml' }]); // 多いほうが安いとはかぎらない
  assert.deepEqual([milk.results[0].per, milk.results[1].per, milk.best], [24.8, 23.6, [1]]);
  assert.equal(shown(per({ price: 1180, qty: 350, unit: 'ml' })), '337.1'); // 6本パックに1本の量だけ
  assert.equal(shown(per({ price: 1180, qty: 2100, unit: 'ml' })), '56.2');
  assert.equal(per({ price: 298, qty: 1, unit: 'g' }), 29800); // kgの商品をgのまま
  assert.equal(per({ price: 258, qty: 300, unit: 'g' }), 86); // よくある質問
});
