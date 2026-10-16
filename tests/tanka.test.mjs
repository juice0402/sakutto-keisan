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

test('単価：割引シール（20%オフは1円未満切り捨て）', () => {
  const a = calcUnitPrice({ price: 298, qty: 1, unit: 'kg', disc: 20 });
  assert.equal(a.pay, 238);
  assert.equal(a.per, 23.8);
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
