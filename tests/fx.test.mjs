import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fxNeed, fxRatio, fxPosition, swapPerDay, fxSwapEstimate, swapText, swapBars, yenText, qtyText, levText, cutPriceText, ratioText, rateDigits, FX_PAIRS, fxLot, fxLotLoss } from '../src/lib/fx.mjs';
import { POLICY_RATES, FX_SPOT, FX_RATES_CHECKED, FX_SPOT_DATE } from '../src/data/fx-swap.mjs';

test('取引に必要なお金：レート × 量 × 4％', () => {
  assert.equal(fxNeed(150, 10000), 60000); // 1ドル150円で1万通貨 → 6万円
  assert.equal(fxNeed(150, 1000), 6000);
  assert.equal(fxNeed(162.35, 20000), 129880);
});

test('証拠金維持率：レバレッジから（ページの計算例）', () => {
  const r = fxRatio({ money: 100000, rate: 150, lev: 10 });
  assert.equal(r.amount, 1000000); // 取引額100万円
  assert.equal(qtyText(r.qty), '6,666'); // 約6,666通貨（切り捨て）
  assert.equal(r.need, 40000);
  assert.equal(ratioText(r.ratio), '250％');
  // 計算例の表：口座のお金10万円・ドル円150円
  const row = (lev) => {
    const x = fxRatio({ money: 100000, rate: 150, lev });
    return [qtyText(x.qty), ratioText(x.ratio)];
  };
  assert.deepEqual(row(1), ['666', '2,500％']);
  assert.deepEqual(row(5), ['3,333', '500％']);
  assert.deepEqual(row(10), ['6,666', '250％']);
  assert.deepEqual(row(25), ['16,666', '100％']);
  assert.equal(ratioText(fxRatio({ money: 100000, rate: 150, lev: 3 }).ratio), '833.3％'); // 2,500 ÷ 3 は切り捨て
});

test('証拠金維持率：通貨の量から', () => {
  const r = fxRatio({ money: 100000, rate: 150, qty: 10000, from: 'qty' });
  assert.equal(r.amount, 1500000);
  assert.equal(levText(r.lev), '15');
  assert.equal(r.need, 60000);
  assert.equal(ratioText(r.ratio), '166.6％');
  assert.equal(r.short, 0);
  assert.equal(levText(fxRatio({ money: 100000, rate: 150, qty: 1000, from: 'qty' }).lev), '1.5');
  assert.equal(levText(fxRatio({ money: 300000, rate: 150, qty: 10000, from: 'qty' }).lev), '5');
  assert.equal(levText(fxRatio({ money: 70000, rate: 150, qty: 10000, from: 'qty' }).lev), '21.43'); // 21.428… は切り上げ
  // 25倍より大きい量：取引に必要なお金が足りない
  const over = fxRatio({ money: 100000, rate: 150, qty: 20000, from: 'qty' });
  assert.equal(levText(over.lev), '30');
  assert.equal(ratioText(over.ratio), '83.3％');
  assert.equal(over.short, 20000);
});

test('証拠金維持率：まちがった入力', () => {
  assert.equal(fxRatio({ money: null, rate: 150, lev: 10 }).empty, true);
  assert.equal(fxRatio({ money: 100000, rate: 150, lev: null }).empty, true);
  assert.equal(fxRatio({ money: 100000, rate: 150, qty: null, from: 'qty' }).empty, true);
  assert.equal(fxRatio({ money: 0, rate: 150, lev: 10 }).field, 'money');
  assert.equal(fxRatio({ money: 100000, rate: 0, lev: 10 }).field, 'rate');
  assert.equal(fxRatio({ money: 100000, rate: 150, lev: 0 }).field, 'lev');
  assert.equal(fxRatio({ money: 100000, rate: 150, lev: 26 }).field, 'lev'); // 25倍まで
  assert.equal(fxRatio({ money: 100000, rate: 150, lev: 25 }).ok, true);
  assert.equal(fxRatio({ money: 100, rate: 150, lev: 1 }).field, 'lev'); // 1通貨も買えない
  assert.equal(fxRatio({ money: 100000, rate: 150, qty: 0.5, from: 'qty' }).field, 'qty');
  assert.equal(fxRatio({ money: 100000, rate: 150, lev: NaN }).field, 'lev');
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

test('ロスカットまでの余裕（ページの計算例）', () => {
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

test('ロスカット：もう基準より下・まちがった入力', () => {
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

test('スワップの目安（ページの計算例）', () => {
  // 金利の差3％・1ドル150円・1万通貨：150万円 × 3％ ÷ 365 ＝ 約123円
  assert.equal(swapText(swapPerDay(10000, 150, 3)), '123');
  assert.equal(swapText(swapPerDay(1000, 8.5, 6)), '1.4'); // 10円より少ないときは0.1円まで
  assert.equal(swapText(-123.4), '123'); // マイナスはつけない（払うかどうかは別に書く）
});

test('スワップの目安：金利の差の向き・まちがった入力', () => {
  for (const p of FX_PAIRS) {
    const buy = fxSwapEstimate({ pair: p.id, side: 'buy', qty: 10000 });
    const sell = fxSwapEstimate({ pair: p.id, side: 'sell', qty: 10000 });
    const diff = POLICY_RATES[p.cur].rate - POLICY_RATES.JPY.rate;
    assert.ok(Math.abs(buy.diff - diff) < 1e-9, p.id);
    assert.equal(sell.diff, -buy.diff || 0); // 売りは反対
    assert.ok(Math.abs(buy.day - (10000 * FX_SPOT[p.id] * diff) / 100 / 365) < 1e-6, p.id);
    assert.ok(Math.abs(buy.year - buy.day * 365) < 1e-6);
  }
  assert.equal(fxSwapEstimate({ pair: 'usdjpy', qty: null }).empty, true);
  assert.equal(fxSwapEstimate({ pair: 'usdjpy', qty: 0.5 }).field, 'qty');
  assert.equal(fxSwapEstimate({ pair: 'usdjpy', qty: NaN }).field, 'qty');
});

test('スワップの目安に使う数字：そろっている・新しい', () => {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  assert.match(FX_RATES_CHECKED, iso);
  assert.match(FX_SPOT_DATE, iso);
  for (const c of ['JPY', ...FX_PAIRS.map((p) => p.cur)]) {
    const r = POLICY_RATES[c];
    assert.ok(Number.isFinite(r.rate) && r.rate >= -1 && r.rate < 100, c);
    assert.match(r.since, iso, c);
    assert.match(r.url, /^https:\/\//, c);
  }
  for (const p of FX_PAIRS) assert.ok(FX_SPOT[p.id] > 0 && p.example === FX_SPOT[p.id], p.id);
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

test('通貨の量（ロット）：ページの計算例', () => {
  assert.equal(fxLotLoss(100000, 2), 2000);
  const r = fxLot({ money: 100000, loss: 2000, width: 0.2, rate: 150 });
  assert.equal(r.qty, 10000);
  assert.equal(r.need, 60000);
  assert.equal(r.lossAt, 2000);
  assert.equal(r.short, 0);
  assert.equal(r.stop, 149.8);
  assert.equal(fxLot({ money: 100000, loss: 2000, width: 0.5, rate: 150 }).qty, 4000);
  assert.equal(fxLot({ money: 100000, loss: 2000, width: 0.3, rate: 150 }).qty, 6000); // 6,666 → 6,000（1,000通貨単位で切り捨て）
  assert.equal(fxLot({ money: 100000, loss: 1000, width: 2, rate: 150 }).under, true);
  const big = fxLot({ money: 100000, loss: 5000, width: 0.2, rate: 150 });
  assert.equal(big.qty, 25000);
  assert.equal(big.short, 50000); // 25,000通貨は15万円いる
});

test('通貨の量（ロット）：まちがい', () => {
  assert.equal(fxLot({ money: null, loss: 2000, width: 0.2, rate: 150 }).empty, true);
  assert.equal(fxLot({ money: 1000, loss: 2000, width: 0.2, rate: 150 }).field, 'loss');
  assert.equal(fxLot({ money: 100000, loss: 2000, width: 0, rate: 150 }).field, 'width');
  assert.equal(fxLot({ money: 100000, loss: 2000, width: 150, rate: 150 }).field, 'width');
});

test('証拠金維持率の本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const q = (money, rate, qty) => fxRatio({ money, rate, qty, from: 'qty' });
  const f = q(200000, 150, 20000); // 計算式の例
  assert.deepEqual([f.amount, f.lev, f.need, ratioText(f.ratio)], [3000000, 15, 120000, '166.6％']);
  const a = q(500000, 150, 10000); // 50万円・1万通貨
  assert.deepEqual([a.amount, a.lev, a.need, ratioText(a.ratio)], [1500000, 3, 60000, '833.3％']);
  const b = fxRatio({ money: 400000, rate: 150, lev: 5 }); // レバレッジ5倍まで
  assert.deepEqual([b.amount, qtyText(b.qty), ratioText(b.ratio)], [2000000, '13,333', '500％']);
  const c = q(200000, 170, 10000); // ユーロ円
  assert.deepEqual([c.need, ratioText(c.ratio)], [68000, '294.1％']);
  const d = fxRatio({ money: 100000, rate: 150, lev: 25 }); // 25倍いっぱい
  assert.deepEqual([qtyText(d.qty), ratioText(d.ratio)], ['16,666', '100％']);
  assert.equal(ratioText(q(100000, 150, 16666).ratio), '100％');
  assert.equal(Math.round(16666 * 0.01), 167);
  assert.equal(ratioText(q(100000 - 16666 * 0.01, 149.99, 16666).ratio), '99.8％');
  assert.deepEqual([ratioText(q(100000, 150, 1000).ratio), ratioText(q(100000, 150, 10000).ratio)], ['1,666.6％', '166.6％']); // ロットの取りちがえ
  const e = fxRatio({ money: 100000, rate: 150, lev: 5 }); // よくある質問：5倍で500％、8割の損まで
  assert.equal(ratioText(e.ratio), '500％');
  assert.equal(Math.round(fxPosition({ money: 100000, qty: e.qty, rate: 150, cut: 100 }).room), 80000);
});

test('ロスカットの本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const p = (money, qty, rate, cut, side = 'buy') => fxPosition({ money, qty, rate, cut, side });
  const f = p(200000, 20000, 150, 50); // 計算式の例
  assert.deepEqual([f.need, f.room, f.price], [120000, 140000, 143]);
  const a = p(500000, 50000, 150, 100); // 50万円・5万通貨
  assert.deepEqual([a.room, a.price], [200000, 146]);
  const b = p(300000, 10000, 150, 50, 'sell'); // 売り
  assert.deepEqual([Math.floor(b.room), cutPriceText(b.price, 'sell', 2), b.buyRoom], [264705, '176.47円', 270000]);
  const c = p(50000, 10000, 150, 100); // 足りないお金
  assert.deepEqual([c.over, Math.ceil(-c.room)], [true, 10000]);
  const m1 = [p(100000, 10000, 150, 100), p(100000, 10000, 150, 50)]; // 基準100％と50％
  assert.deepEqual(m1.map((r) => [r.room, r.price]), [[40000, 146], [70000, 143]]);
  assert.deepEqual([p(200000, 20000, 150, 100).room, p(170000, 20000, 150, 100).room], [80000, 50000]); // 含み損を入れない
  const g = p(100000, 10000, 150, 100); // よくある質問：基準100％なら必要なお金と同じくらい残る
  assert.equal(100000 - g.room, g.need);
});

test('スワップの本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  assert.equal(Math.round(swapPerDay(10000, 100, 4)), 110); // 計算式の例：豪ドル
  const peso = swapPerDay(100000, 8, 6.5); // メキシコペソ10万通貨
  assert.deepEqual([Math.round(peso), Math.round(peso * 30)], [142, 4274]);
  const usd = swapPerDay(10000, 150, 3); // ドル円1万通貨・3％（売りなら払う）
  assert.deepEqual([Math.round(usd), Math.round(usd * 30), Math.round(usd * 365)], [123, 3699, 45000]);
  assert.equal(Math.round(swapPerDay(10000, 150, 2)), 82); // 2％に縮む
  assert.equal(1500000 * 0.03, 45000); // 3％を1日の率とまちがえる
  assert.equal(10000 * 4.5, 45000); // 4.5円下がると為替の損45,000円
});

test('ロットの本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const l = (money, loss, width, rate = 150) => fxLot({ money, loss, width, rate });
  const f = l(500000, fxLotLoss(500000, 1), 0.25); // 計算式の例
  assert.deepEqual([fxLotLoss(500000, 1), f.qty], [5000, 20000]);
  const a = l(300000, fxLotLoss(300000, 3), 0.6); // 30万円の3％
  assert.deepEqual([fxLotLoss(300000, 3), a.qty, a.need, a.stop], [9000, 15000, 90000, 149.4]);
  const b = l(200000, fxLotLoss(200000, 2), 0.08); // 幅がせまい
  assert.deepEqual([b.qty, b.need, b.short], [50000, 300000, 100000]);
  const c = l(1000000, fxLotLoss(1000000, 2), 1, 200); // ポンド円
  assert.deepEqual([fxLotLoss(1000000, 2), c.qty, c.need], [20000, 20000, 160000]);
  const m = l(100000, 2000, 20); // 銭の数のまま
  assert.deepEqual([m.raw, m.under], [100, true]);
  assert.equal(l(100000, 2000, 0.2).qty, 10000);
  assert.deepEqual([Math.round(10000 * 0.2), Math.round(10000 * 0.5), l(100000, 2000, 0.5).qty], [2000, 5000, 4000]); // 幅を広げる
  assert.equal(10 * 10000 * 0.2, 20000); // 10ロットを1万通貨の会社で
  assert.deepEqual([l(100000, 10000, 1).qty, 10000 * 0.1], [10000, 1000]); // よくある質問：1万通貨で1円
});
