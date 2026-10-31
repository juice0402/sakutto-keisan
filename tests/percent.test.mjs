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
  const want = { 100: [1, 5, 10, 20, 50], 1000: [10, 50, 100, 200, 500], 3000: [30, 150, 300, 600, 1500], 5000: [50, 250, 500, 1000, 2500] };
  for (const [b, row] of Object.entries(want)) {
    assert.deepEqual([1, 5, 10, 20, 50].map((p) => percent({ base: Number(b), pct: p, part: null, out: 'part' }).part), row);
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

test('パーセントの本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const part = (base, pct) => percent({ base, pct, part: null, out: 'part' }).part;
  const pctOf = (base, p) => percent({ base, pct: null, part: p, out: 'pct' }).pct;
  assert.equal(part(750, 8), 60); // 計算式の例
  assert.equal(pctOf(50, 42), 84); // テストの正答率
  assert.equal(pctOf(800000, 920000), 115); // 売上の前の月とのくらべ
  assert.equal(part(300, 27), 81); // アンケート
  assert.equal(pctOf(10, 15), 150); // 10％が15％になると50％ふえる
  assert.equal(part(9700, 3), 291); // 9,700円の3％を足しても9,991円
  assert.equal(9700 + part(9700, 3), 9991);
  assert.equal(percent({ base: null, pct: 97, part: 9700, out: 'base' }).base, 10000); // もとの数は10,000円
  assert.equal(pctOf(200, 30), 15); // 30は200の15％
  assert.equal(Math.round(pctOf(30, 200) * 10) / 10, 666.7); // 200は30の約666.7％
  assert.equal(part(2000, 100 + 15), 2300); // よくある質問：15％増し
});
