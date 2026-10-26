import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcDiscount, originalFrom, wariLabel } from '../src/lib/waribiki.mjs';
import { OFF_RATES, OFF_PRICES, OFF_SALES } from '../src/pages/waribiki-off.mjs';

test('率ごとの割引：割引後の値段（ページの例と早見表）', () => {
  assert.deepEqual(OFF_RATES, [10, 15, 20, 30, 40, 50]);
  assert.equal(calcDiscount({ price: 2000, rate: 30 }).final, 1400);
  assert.equal(calcDiscount({ price: 2000, rate: 15 }).final, 1700);
  assert.equal(calcDiscount({ price: 980, rate: 15 }).final, 833);
  assert.equal(calcDiscount({ price: 1980, rate: 10 }).final, 1782);
  for (const r of OFF_RATES) for (const p of OFF_PRICES) assert.ok(calcDiscount({ price: p, rate: r }).final <= p);
  assert.equal(wariLabel(15), '1割5分引き');
  assert.equal(wariLabel(50), '5割引き（半額）');
});

test('率ごとの割引：割引後の値段から元の値段', () => {
  assert.deepEqual(originalFrom(1400, 30), { ok: true, price: 2000, exact: true });
  assert.deepEqual(originalFrom(1000, 30), { ok: true, price: 1429, exact: false });
  assert.equal(Math.floor((1429 * 70) / 100), 1000);
  assert.equal(Math.floor((1428 * 70) / 100), 999);
  assert.deepEqual(originalFrom(1000, 20), { ok: true, price: 1250, exact: true });
  assert.deepEqual(originalFrom(500, 50), { ok: true, price: 1000, exact: true });
  assert.deepEqual(originalFrom(1000, 15), { ok: true, price: 1177, exact: false });
  assert.equal(Math.floor((1177 * 85) / 100), 1000);
  // 割引後から出した元の値段を割り引くと、もとの割引後にもどる
  for (const r of OFF_RATES) for (const s of OFF_SALES) assert.equal(calcDiscount({ price: originalFrom(s, r).price, rate: r }).final, s);
  assert.equal(originalFrom(null, 30).empty, true);
});
