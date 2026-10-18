import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fxNeed, fxPosition, fxAddMoney, fxSwap, swapBars, yenText, cutPriceText, ratioText, rateDigits, FX_PAIRS } from '../src/lib/fx.mjs';

test('取引に必要なお金：レート × 量 × 4％', () => {
  assert.equal(fxNeed(150, 10000), 60000); // 1ドル150円で1万通貨 → 6万円
  assert.equal(fxNeed(150, 1000), 6000);
  assert.equal(fxNeed(162.35, 20000), 129880);
});

test('お金とレートの書き方', () => {
  assert.equal(yenText(52000.9), '52,000円');
  assert.equal(cutPriceText(144.803, 'buy'), '144.81円'); // 買い：いまのレートに近いほうへ（切り上げ）
  assert.equal(cutPriceText(155.197, 'sell'), '155.19円'); // 売り：切り捨て
  assert.equal(cutPriceText(144.8, 'buy'), '144.80円');
  // ランド円・ペソ円・リラ円は0.001円まで
  assert.equal(rateDigits(8.5), 3);
  assert.equal(rateDigits(150), 2);
  assert.equal(cutPriceText(7.65432, 'buy', 3), '7.655円');
  assert.equal(cutPriceText(9.34567, 'sell', 3), '9.345円');
});

test('通貨ペアは円がつくものだけ（名前が重ならない）', () => {
  assert.ok(FX_PAIRS.every((p) => p.name.endsWith('円') && p.example > 0));
  assert.equal(new Set(FX_PAIRS.map((p) => p.id)).size, FX_PAIRS.length);
  assert.equal(FX_PAIRS[0].name, 'ドル円'); // はじめはドル円
});

test('証拠金維持率とロスカットまでの余裕（ページの計算例）', () => {
  const r = fxPosition({ money: 100000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(r.need, 60000);
  assert.equal(ratioText(r.ratio), '166.6％'); // 166.66…％ は切り捨て
  assert.equal(r.buyRoom, 40000); // 買い：あと4万円の損（4円下がると）
  assert.equal(cutPriceText(r.buyPrice, 'buy'), '146.00円');
  // 売り：上がると必要なお金も増える。(10 + 150) ÷ 1.04 ＝ 153.846…円
  assert.equal(cutPriceText(r.sellPrice, 'sell'), '153.84円');
  assert.equal(Math.floor(r.sellRoom), 38461);
  assert.equal(r.room, 40000); // 買い（はじめは買い）
  const s1 = fxPosition({ money: 100000, qty: 10000, rate: 150, cut: 100, side: 'sell' });
  assert.equal(Math.floor(s1.room), 38461); // 売り：約3.8万円
  assert.equal(cutPriceText(s1.price, 'sell'), '153.84円');
  const r2 = fxPosition({ money: 300000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(r2.ratio, 500);
  assert.equal(r2.room, 240000); // 買い：24万円
  assert.equal(Math.floor(r2.sellRoom), 230769); // 売り：約23万円
  const r3 = fxPosition({ money: 100000, qty: 1000, rate: 150, cut: 100 });
  assert.equal(ratioText(r3.ratio), '1,666.6％');
  assert.equal(r3.room, 94000); // 買い：9.4万円
  assert.equal(Math.floor(r3.sellRoom), 90384); // 売り：約9万円
  // ロスカットの基準50％：買いは3万円まで減るとロスカット → あと7万円・143円
  const r4 = fxPosition({ money: 100000, qty: 10000, rate: 150, cut: 50 });
  assert.equal(r4.buyRoom, 70000);
  assert.equal(cutPriceText(r4.buyPrice, 'buy'), '143.00円');
  // 売りのロスカットのレートで、口座のお金がちょうど「そのレートの必要なお金 × 基準」になる
  const p = r.sellPrice;
  assert.ok(Math.abs(100000 - 10000 * (p - 150) - fxNeed(p, 10000)) < 1e-6);
});

test('維持率の表示は切り捨て（99.99％を100％と見せない）', () => {
  assert.equal(ratioText(99.995), '99.9％');
  assert.equal(ratioText(100), '100％');
});

test('維持率：もう基準より下・まちがった入力', () => {
  const r = fxPosition({ money: 50000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(r.over, true);
  assert.equal(r.room, -10000); // 1万円足りない
  const e = fxPosition({ money: 60000, qty: 10000, rate: 150, cut: 100 });
  assert.equal(e.edge, true); // ちょうど基準
  assert.equal(e.over, false);
  assert.equal(fxPosition({ money: 1000, qty: 10000, rate: 150, cut: null }).missing, 'cut'); // 基準を打ち直している途中
  assert.equal(fxPosition({ money: 1000, qty: 0.5, rate: 150 }).field, 'qty'); // 1通貨より少ない
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
  assert.equal(fxAddMoney({ ...base, target: 152, side: 'sell' }).deposit, 30800); // 売り：152円の必要なお金 60,800円 ＋ 損2万円 − 5万円
  assert.equal(fxAddMoney({ ...base, target: 152 }).field, 'target'); // 買いで、いまより高いレートはまちがい
  assert.equal(fxAddMoney({ ...base, target: 148, side: 'sell' }).field, 'target'); // 売りで、いまより低いレートはまちがい
  assert.equal(fxAddMoney({ ...base, level: null }).missing, 'level'); // 基準を打ち直している途中
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
