import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNum, roundBy, fmt } from '../src/lib/number.mjs';
import { calcDiscount, calcRate, wariLabel } from '../src/lib/waribiki.mjs';

test('parseNum: 全角・カンマ・単位・空', () => {
  assert.equal(parseNum('１，２００円'), 1200);
  assert.equal(parseNum(' 30％ '), 30);
  assert.equal(parseNum('12.5'), 12.5);
  assert.equal(parseNum('.5'), 0.5);
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('   '), null);
  assert.ok(Number.isNaN(parseNum('abc')));
  assert.ok(Number.isNaN(parseNum('1.2.3')));
});

test('roundBy / fmt', () => {
  assert.equal(roundBy(849.15, 'floor'), 849);
  assert.equal(roundBy(849.5, 'round'), 850);
  assert.equal(roundBy(849.15, 'ceil'), 850);
  assert.equal(roundBy(0.1 * 3 * 10, 'floor'), 3); // 2.9999999999999996 にならない
  assert.equal(fmt(1234567.891), '1,234,567.89');
});

test('割引: ページに載せている計算例', () => {
  assert.equal(calcDiscount({ price: 3980, rate: 20 }).final, 3184);
  assert.equal(calcDiscount({ price: 12800, rate: 35 }).final, 8320);
  const r = calcDiscount({ price: 2000, rate: 30, rate2: 20 });
  assert.deepEqual(r.steps.map((s) => s.after), [1400, 1120]);
  assert.equal(r.off, 880);
  assert.equal(r.totalRate, 44);
});

test('割引: 端数の丸め', () => {
  assert.equal(calcDiscount({ price: 999, rate: 15, rounding: 'floor' }).final, 849);
  assert.equal(calcDiscount({ price: 999, rate: 15, rounding: 'round' }).final, 849);
  assert.equal(calcDiscount({ price: 999, rate: 15, rounding: 'ceil' }).final, 850);
  assert.equal(calcDiscount({ price: 1980, rate: 30 }).final, 1386);
  assert.equal(calcDiscount({ price: 1000, rate: 100 }).final, 0);
  assert.equal(calcDiscount({ price: 1000, rate: 0 }).final, 1000);
});

test('割引: 空・まちがった入力', () => {
  assert.equal(calcDiscount({ price: null, rate: 30 }).empty, true);
  assert.equal(calcDiscount({ price: 1000, rate: null }).empty, true);
  assert.ok(calcDiscount({ price: 1000, rate: 120 }).error);
  assert.ok(calcDiscount({ price: -1, rate: 10 }).error);
  assert.ok(calcDiscount({ price: NaN, rate: 10 }).error);
  assert.ok(calcDiscount({ price: 1000, rate: 10, rate2: 101 }).error);
});

test('割引率を調べる', () => {
  const a = calcRate({ price: 5000, sale: 3500 });
  assert.equal(a.rate, 30);
  assert.equal(a.off, 1500);
  assert.equal(a.increase, false);
  assert.equal(fmt(calcRate({ price: 3000, sale: 2000 }).rate, 1), '33.3');
  assert.equal(calcRate({ price: 1000, sale: 1200 }).increase, true);
  assert.ok(calcRate({ price: 0, sale: 0 }).error);
  assert.equal(calcRate({ price: 1000, sale: null }).empty, true);
});

test('◯割◯分引きの表示', () => {
  assert.equal(wariLabel(30), '3割引き');
  assert.equal(wariLabel(25), '2割5分引き');
  assert.equal(wariLabel(5), '5分引き');
  assert.equal(wariLabel(12.5), '1割2分5厘引き');
  assert.equal(wariLabel(50), '5割引き（半額）');
  assert.equal(wariLabel(100), '10割引き（無料）');
  assert.equal(wariLabel(33.33), null);
  assert.equal(wariLabel(0), null);
});

