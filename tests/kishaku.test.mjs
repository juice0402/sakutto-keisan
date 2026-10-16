import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dilute, ratioFromPercent, waterPart, volumeText, spoonText } from '../src/lib/kishaku.mjs';

const r = (p) => {
  const x = dilute(p);
  return [volumeText(x.concentrate), volumeText(x.water), volumeText(x.total)];
};

test('作りたい量から（ページの計算例）', () => {
  assert.deepEqual(r({ ratio: 100, amount: 500 }), ['5ml', '495ml', '500ml']);
  assert.deepEqual(r({ ratio: 10, amount: 1000 }), ['100ml', '900ml', '1L']);
  assert.deepEqual(r({ ratio: 1, amount: 300 }), ['300ml', '0ml', '300ml']); // 薄めない
});

test('原液の量から・水の量から（ページの計算例）', () => {
  assert.deepEqual(r({ ratio: 50, amount: 10, from: 'concentrate' }), ['10ml', '490ml', '500ml']);
  assert.deepEqual(r({ ratio: 1000, amount: 2000, from: 'water' }), ['2ml', '2L', '2L']); // 2000 ÷ 999 ≒ 2.0ml
  assert.equal(dilute({ ratio: 1000, amount: 2000, from: 'water' }).concentrate.toFixed(3), '2.002');
  assert.ok(dilute({ ratio: 1, amount: 500, from: 'water' }).error);
});

test('濃度（%）から倍率（ページの計算例：6％を0.05％に）', () => {
  const p = ratioFromPercent(6, 0.05);
  assert.equal(p.ratio, 120);
  assert.equal(waterPart(p.ratio), '119');
  assert.deepEqual(r({ ratio: p.ratio, amount: 1000 }), ['8.3ml', '992ml', '1L']);
  assert.ok(ratioFromPercent(0.05, 6).error); // 濃くはできない
  assert.ok(ratioFromPercent(120, 1).error);
  assert.equal(ratioFromPercent(null, 1).empty, true);
});

test('まちがった入力', () => {
  assert.equal(dilute({ ratio: null, amount: 500 }).empty, true);
  assert.ok(dilute({ ratio: 0.5, amount: 500 }).error);
  assert.ok(dilute({ ratio: 10, amount: 0 }).error);
  assert.ok(dilute({ ratio: NaN, amount: 500 }).error);
});

test('量の書き方・計量スプーンの目安', () => {
  assert.equal(volumeText(1500), '1.5L');
  assert.equal(volumeText(999.5), '1L'); // 四捨五入で 1,000ml
  assert.equal(volumeText(2.5), '2.5ml');
  assert.equal(spoonText(5), '小さじ1');
  assert.equal(spoonText(15), '大さじ1');
  assert.equal(spoonText(8.33), '小さじ1と⅔');
  assert.equal(spoonText(100), ''); // 大さじ3より多いときは出さない
  assert.equal(spoonText(0.5), ''); // 小さじ¼より少ないときは出さない
  assert.equal(waterPart(10), '9');
});
