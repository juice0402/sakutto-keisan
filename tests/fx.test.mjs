import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fxNeed, fxPosition, fxAddMoney, fxSwap, swapBars, qtyText, yenText, cutPriceText } from '../src/lib/fx.mjs';

test('取引に必要なお金：レート × 量 × 4％', () => {
  assert.equal(fxNeed(150, 10000), 60000); // 1ドル150円で1万通貨 → 6万円
  assert.equal(fxNeed(150, 1000), 6000);
  assert.equal(fxNeed(162.35, 20000), 129880);
});

test('量とお金の書き方', () => {
  assert.equal(qtyText(10000), '1万通貨');
  assert.equal(qtyText(15000), '1.5万通貨');
  assert.equal(qtyText(1000), '1,000通貨');
  assert.equal(yenText(52000.9), '52,000円');
  assert.equal(cutPriceText(144.803, 'buy'), '144.81円'); // 買い：いまのレートに近いほうへ（切り上げ）
  assert.equal(cutPriceText(155.197, 'sell'), '155.19円'); // 売り：切り捨て
  assert.equal(cutPriceText(144.8, 'buy'), '144.80円');
});

test('証拠金維持率とロスカットまでの余裕（ページの計算例）', () => {
  const r = fxPosition({ money: 100000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(r.need, 60000);
  assert.equal(Math.round(r.ratio), 167);
  assert.equal(r.room, 40000); // あと4万円の損まで
  assert.equal(r.move, 4); // 4円動くと
  assert.equal(cutPriceText(r.buyPrice, 'buy'), '146.00円');
  assert.equal(cutPriceText(r.sellPrice, 'sell'), '154.00円');
  const r2 = fxPosition({ money: 300000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(r2.ratio, 500);
  assert.equal(r2.room, 240000);
  const r3 = fxPosition({ money: 100000, qty: 1000, rate: 150, cut: 100 });
  assert.equal(Math.round(r3.ratio), 1667);
  assert.equal(r3.room, 94000);
  // ロスカットの基準50％：3万円まで減るとロスカット → あと7万円・7円
  const r4 = fxPosition({ money: 100000, qty: 10000, rate: 150, cut: 50 });
  assert.equal(r4.room, 70000);
  assert.equal(cutPriceText(r4.buyPrice, 'buy'), '143.00円');
});

test('維持率：もう基準より下・まちがった入力', () => {
  const r = fxPosition({ money: 50000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(r.over, true);
  assert.equal(r.room, -10000); // 1万円足りない
  assert.equal(fxPosition({ money: null, qty: 10000, rate: 150 }).empty, true);
  assert.equal(fxPosition({ money: 1000, qty: 0, rate: 150 }).field, 'qty');
  assert.equal(fxPosition({ money: 1000, qty: 10000, rate: 0 }).field, 'rate');
  assert.equal(fxPosition({ money: 1000, qty: 10000, rate: 150, cut: 0 }).field, 'cut');
  // とても少ない量なら、買いは0円まで下がっても大丈夫
  assert.equal(fxPosition({ money: 1000000, qty: 1000, rate: 150, cut: 100 }).never, true);
});

test('追証：足りないお金と、耐えたいレートまでの入金（ページの計算例）', () => {
  const base = { money: 50000, qty: 10000, rate: 150, level: 100, cut: 100 };
  assert.equal(fxAddMoney(base).short, 10000); // いまのまま：1万円
  assert.equal(fxAddMoney({ ...base, target: 148 }).loss, 20000);
  assert.equal(fxAddMoney({ ...base, target: 148 }).deposit, 30000); // 148円まで：3万円
  assert.equal(fxAddMoney({ ...base, target: 145 }).deposit, 60000); // 145円まで：6万円
  assert.equal(fxAddMoney({ ...base, target: 152 }).deposit, 30000); // 上がる方（売り）も同じ
  assert.equal(fxAddMoney({ ...base, money: 200000 }).short, 0); // 足りている
  assert.equal(fxAddMoney({ ...base, money: 200000, target: 148 }).deposit, 0);
  assert.equal(fxAddMoney({ ...base, target: NaN }).field, 'target');
});

test('スワップ（ページの計算例）', () => {
  const s = (perDay, qty, days) => fxSwap({ perDay, qty, days });
  assert.deepEqual([s(150, 10000, 30).total, s(150, 10000, 365).total], [4500, 54750]);
  assert.deepEqual([s(150, 30000, 30).total, s(150, 30000, 365).total], [13500, 164250]);
  assert.deepEqual([s(20, 100000, 30).total, s(20, 100000, 365).total], [6000, 73000]);
  assert.equal(s(150, 30000, 1).day, 450);
  assert.equal(s(150, 10000, 0).field, 'days');
  assert.equal(s(150, 10000, 1.5).field, 'days');
  assert.equal(s(null, 10000, 30).empty, true);
});

test('スワップのグラフの棒', () => {
  const y = swapBars(365, 150);
  assert.equal(y.length, 12);
  assert.deepEqual(y.at(-1), { day: 365, value: 54750 });
  assert.ok(y.every((b, i) => i === 0 || b.value > y[i - 1].value));
  assert.equal(swapBars(30, 100).length, 5); // 週ごと
  assert.equal(swapBars(10, 100).length, 10); // 日ごと
  assert.equal(swapBars(1, 100).length, 1);
});
