import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percent, wariOf, decimalOf } from '../src/lib/percent.mjs';

test('もとの数と割合から、その数（ページの計算例）', () => {
  assert.equal(percent({ base: 200, pct: 15, part: null, out: 'part' }).part, 30);
  assert.equal(percent({ base: 1980, pct: 10, part: null, out: 'part' }).part, 198);
  assert.equal(percent({ base: 3, pct: 33.3, part: null, out: 'part' }).part, 0.999);
});

test('もとの数とその数から割合、割合とその数からもとの数', () => {
  assert.equal(percent({ base: 200, pct: null, part: 30, out: 'pct' }).pct, 15);
  assert.equal(percent({ base: 80, pct: null, part: 120, out: 'pct' }).pct, 150);
  assert.equal(percent({ base: null, pct: 15, part: 30, out: 'base' }).base, 200);
  assert.equal(percent({ base: null, pct: 25, part: 50, out: 'base' }).base, 200);
});

test('割合のいろいろな言い方（ページの表）', () => {
  assert.deepEqual([1, 5, 10, 15, 25, 30, 50, 75, 100].map((p) => [wariOf(p), decimalOf(p)]), [
    [0.1, 0.01], [0.5, 0.05], [1, 0.1], [1.5, 0.15], [2.5, 0.25], [3, 0.3], [5, 0.5], [7.5, 0.75], [10, 1],
  ]);
});

test('よく使う数の早見表（ページの表）', () => {
  const want = { 1000: [10, 50, 100, 200, 300, 500], 5000: [50, 250, 500, 1000, 1500, 2500], 10000: [100, 500, 1000, 2000, 3000, 5000] };
  for (const [b, row] of Object.entries(want)) {
    assert.deepEqual([1, 5, 10, 20, 30, 50].map((p) => percent({ base: Number(b), pct: p, part: null, out: 'part' }).part), row);
  }
});

test('まだ入れていない・まちがった入力', () => {
  assert.equal(percent({ base: 200, pct: null, part: null, out: 'part' }).empty, true);
  assert.equal(percent({ base: NaN, pct: 10, part: null, out: 'part' }).field, 'base');
  assert.equal(percent({ base: 0, pct: null, part: 10, out: 'pct' }).field, 'base');
  assert.equal(percent({ base: null, pct: 0, part: 10, out: 'base' }).field, 'pct');
  assert.equal(percent({ base: 1e13, pct: 10, part: null, out: 'part' }).field, 'base');
  assert.equal(percent({ base: 0, pct: 10, part: null, out: 'part' }).part, 0);
});
