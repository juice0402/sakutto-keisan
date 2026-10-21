import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dilute, ratioFromPercent, ratioFromParts, waterPart, volumeText, spoonText, capText, mlValue, literText } from '../src/lib/kishaku.mjs';

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

test('何対何から倍率（ページの計算例：1対3で800ml）', () => {
  assert.equal(ratioFromParts(1, 3).ratio, 4);
  assert.deepEqual(r({ ratio: ratioFromParts(1, 3).ratio, amount: 800 }), ['200ml', '600ml', '800ml']);
  assert.equal(ratioFromParts(2, 3).ratio, 2.5);
  assert.equal(ratioFromParts(1, 0).ratio, 1); // 水なし＝薄めない
  assert.ok(ratioFromParts(0, 3).error);
  assert.ok(ratioFromParts(1, NaN).error);
  assert.equal(ratioFromParts(1, null).empty, true);
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

test('量の欄の数字と L の添え書き', () => {
  assert.equal(mlValue(5), '5');
  assert.equal(mlValue(8.333), '8.3');
  assert.equal(mlValue(2.002), '2');
  assert.equal(mlValue(2002.002), '2,002');
  assert.equal(literText(999), '');
  assert.equal(literText(1000), '＝1L');
  assert.equal(literText(2002.002), '約2L');
  assert.equal(literText(1500), '＝1.5L');
});

// ---- 使いみち別のページの表（src/pages/kishaku-uses.mjs）
const ml = (x) => `${mlValue(x)}ml`;
const fromWater = (ratio, water) => dilute({ ratio, amount: water, from: 'water' });

test('めんつゆ：つけつゆ・かけつゆの量（本文の例：3倍濃縮で100ml）', () => {
  const row = (ratio, amount) => {
    const x = dilute({ ratio, amount });
    return [ml(x.concentrate), ml(x.water)];
  };
  assert.deepEqual(row(ratioFromParts(1, 1).ratio, 100), ['50ml', '50ml']); // 2倍濃縮のつけつゆ
  assert.deepEqual(row(ratioFromParts(1, 3).ratio, 200), ['50ml', '150ml']); // 2倍濃縮のかけつゆ
  assert.deepEqual(row(3, 100), ['33ml', '67ml']); // 3倍濃縮のつけつゆ（1：2）
  assert.deepEqual(row(4, 100), ['25ml', '75ml']); // 4倍濃縮のつけつゆ（1：3）
  assert.equal(waterPart(3), '2');
});

test('塩素系漂白剤の表：6％から0.02・0.05・0.1％（水500ml・1L）', () => {
  const row = (target) => {
    const r = ratioFromPercent(6, target).ratio;
    return [ml(fromWater(r, 500).concentrate), ml(fromWater(r, 1000).concentrate)];
  };
  assert.deepEqual(row(0.02), ['1.7ml', '3.3ml']);
  assert.deepEqual(row(0.05), ['4.2ml', '8.4ml']);
  assert.deepEqual(row(0.1), ['8.5ml', '17ml']);
  // 花王の目安（作ったときの6％）：0.02％は水3Lに約10ml・0.05％は水3Lに約25ml・0.1％は水3Lに約50ml
  assert.equal(Math.round(fromWater(ratioFromPercent(6, 0.02).ratio, 3000).concentrate), 10);
  assert.equal(Math.round(fromWater(ratioFromPercent(6, 0.05).ratio, 3000).concentrate), 25);
  assert.equal(Math.round(fromWater(ratioFromPercent(6, 0.1).ratio, 3000).concentrate), 51);
});

test('ハイターのキャップの杯数（1杯 約25ml）', () => {
  assert.equal(capText(10, 25), '約0.4杯');
  assert.equal(capText(25, 25), '約1杯');
  assert.equal(capText(50.8, 25), '約2杯');
  assert.equal(capText(2, 25), ''); // 0.1杯より少ないときは出さない
});

test('液体肥料の表とマス：水1L・2L・10Lに入れる原液', () => {
  const row = (ratio) => [1000, 2000, 10000].map((w) => ml(fromWater(ratio, w).concentrate));
  assert.deepEqual(row(250), ['4ml', '8ml', '40ml']);
  assert.deepEqual(row(500), ['2ml', '4ml', '20ml']);
  assert.deepEqual(row(1000), ['1ml', '2ml', '10ml']);
  assert.deepEqual(row(2000), ['0.5ml', '1ml', '5ml']);
  // マスの「1Lに◯ml」
  assert.deepEqual([50, 100, 200].map((r) => ml(fromWater(r, 1000).concentrate)), ['20ml', '10ml', '5ml']);
});

test('薄め方の早見表（ページの表：できあがり500ml・1L・2Lの原液の量）', () => {
  const table = {
    2: ['250ml', '500ml', '1L'], 5: ['100ml', '200ml', '400ml'], 10: ['50ml', '100ml', '200ml'], 20: ['25ml', '50ml', '100ml'],
    50: ['10ml', '20ml', '40ml'], 100: ['5ml', '10ml', '20ml'], 200: ['2.5ml', '5ml', '10ml'], 500: ['1ml', '2ml', '4ml'], 1000: ['0.5ml', '1ml', '2ml'],
  };
  for (const [ratio, want] of Object.entries(table)) {
    assert.deepEqual([500, 1000, 2000].map((amount) => volumeText(dilute({ ratio: Number(ratio), amount }).concentrate)), want, `${ratio}倍`);
  }
});
