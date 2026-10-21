import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shohizei } from '../src/lib/shohizei.mjs';

const net = (amount, rate, mode) => shohizei({ amount, from: 'net', rate, mode });
const gross = (amount, rate, mode) => shohizei({ amount, from: 'gross', rate, mode });

test('税抜から税込（ページの計算例）', () => {
  assert.deepEqual([net(1980, 10).tax, net(1980, 10).gross], [198, 2178]);
  assert.deepEqual([net(1980, 8).tax, net(1980, 8).gross], [158, 2138]); // 158.4 は切り捨て
  assert.equal(net(1980, 8).frac, true);
  assert.equal(net(1980, 10).frac, false);
  assert.equal(net(1980, 8, 'round').gross, 2138);
  assert.equal(net(1980, 8, 'ceil').gross, 2139);
});

test('税込から税抜（ページの計算例）', () => {
  const r = gross(1000, 10);
  assert.deepEqual([r.tax, r.net], [90, 910]); // 1,000 × 10/110 ＝ 90.9… は切り捨て
  assert.deepEqual([gross(1000, 10, 'round').tax, gross(1000, 10, 'round').net], [91, 909]);
  assert.deepEqual([gross(1080, 8).tax, gross(1080, 8).net], [80, 1000]);
  assert.deepEqual([gross(2178, 10).tax, gross(2178, 10).net], [198, 1980]);
});

test('よくある値段の早見表（ページの表）', () => {
  const want = { 100: [110, 108], 298: [327, 321], 500: [550, 540], 980: [1078, 1058], 1000: [1100, 1080], 1980: [2178, 2138], 2980: [3278, 3218], 5000: [5500, 5400], 10000: [11000, 10800] };
  for (const [p, row] of Object.entries(want)) {
    assert.deepEqual([10, 8].map((rate) => net(Number(p), rate).gross), row, `${p}円`);
  }
});

test('まだ入れていない・まちがった入力', () => {
  assert.equal(shohizei({ amount: null, from: 'net', rate: 10 }).empty, true);
  assert.equal(shohizei({ amount: NaN, from: 'gross', rate: 10 }).field, 'gross');
  assert.equal(shohizei({ amount: 1e12, from: 'net', rate: 10 }).field, 'net');
  assert.equal(net(0, 10).gross, 0);
});
