import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rieki, pctText, moneyText } from '../src/lib/rieki.mjs';

test('売値と原価から利益率（ページの計算例）', () => {
  const r = rieki({ price: 1500, cost: 1000, out: 'rate' });
  assert.equal(r.profit, 500);
  assert.equal(pctText(r.rate), '33.3'); // 33.33…％ は切り捨て
  assert.equal(pctText(r.costRate), '66.6');
  assert.equal(r.times, 1.5);
});

test('原価と利益率から売値（切り上げ。ページの計算例）', () => {
  const row = (rate) => rieki({ cost: 1000, rate, out: 'price' }).price;
  assert.deepEqual([row(20), row(30), row(40), row(50)], [1250, 1429, 1667, 2000]);
  const r = rieki({ cost: 1000, rate: 30, out: 'price' });
  assert.equal(r.profit, 429);
  assert.equal(pctText(r.rate), '30'); // 1,429円なら30.02％。目標を下回らない
  assert.ok(r.rate >= 30);
  assert.equal(rieki({ cost: 0, rate: 30, out: 'price' }).field, 'cost'); // 原価0円では売値が決まらない
});

test('売値と利益率から原価の上限（切り捨て）', () => {
  const r = rieki({ price: 1000, rate: 30, out: 'cost' });
  assert.equal(r.cost, 700);
  assert.equal(r.profit, 300);
  const r2 = rieki({ price: 999, rate: 33, out: 'cost' });
  assert.equal(r2.cost, 669); // 669.33… は切り捨て
  assert.ok(r2.rate >= 33);
});

test('原価の何倍の値段にすると利益率は何％か（ページの表）', () => {
  const t = (k) => pctText(rieki({ price: 1000 * k, cost: 1000, out: 'rate' }).rate);
  assert.deepEqual([t(1.2), t(1.3), t(1.5), t(2), t(3)], ['16.6', '23', '33.3', '50', '66.6']);
});

test('赤字・小数・まちがった入力', () => {
  const loss = rieki({ price: 800, cost: 1000, out: 'rate' });
  assert.equal(loss.profit, -200);
  assert.equal(pctText(loss.rate), '−25');
  assert.equal(moneyText(loss.profit), '200'); // マイナスはつけない（赤字は別に書く）
  const dec = rieki({ cost: 12.5, rate: 30, out: 'price' });
  assert.equal(dec.step, 0.01);
  assert.equal(dec.price, 17.86); // 17.857… は0.01円で切り上げ
  assert.equal(moneyText(dec.price, dec.step), '17.86');
  assert.equal(rieki({ price: 1500, cost: null, out: 'rate' }).empty, true);
  assert.equal(rieki({ price: 0, cost: 100, out: 'rate' }).field, 'price');
  assert.equal(rieki({ price: 1500, cost: NaN, out: 'rate' }).field, 'cost');
  assert.equal(rieki({ cost: 1000, rate: 100, out: 'price' }).field, 'rate');
  assert.equal(rieki({ price: 1000, rate: 120, out: 'cost' }).field, 'rate');
  assert.equal(rieki({ price: 1500, cost: 0, out: 'rate' }).times, null); // 原価0円
});
