import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hensachi, hsFromDev, hsUpper, hsErfc, hsRank, hsPct, hsArea, hsCurve } from '../src/lib/hensachi.mjs';

const upText = (dev) => hsFromDev(dev).up.num;

test('偏差値と上位の割合（ページの早見表と計算例）', () => {
  assert.equal(upText(60), '15.9');
  assert.equal(upText(70), '2.3');
  assert.equal(upText(50), '50.0');
  assert.equal(upText(45), '69.1');
  assert.equal(hsFromDev(45).low.num, '30.9');
  assert.equal(upText(40), '84.1');
  // 早見表（偏差値30〜75の5きざみ）
  assert.deepEqual([30, 35, 40, 45, 50, 55, 60, 65, 70, 75].map(upText), ['97.7', '93.3', '84.1', '69.1', '50.0', '30.9', '15.9', '6.7', '2.3', '0.6']);
  assert.deepEqual([30, 35, 40, 45, 50, 55, 60, 65, 70, 75].map((d) => hsFromDev(d).rank), [98, 94, 85, 70, 50, 31, 16, 7, 3, 1]);
  // 上位と下位の字は足して100
  for (const d of [30, 41.3, 50, 58.8, 63.4, 75]) {
    const r = hsFromDev(d);
    assert.equal(Number(r.up.num) + Number(r.low.num), 100);
  }
});

test('誤差関数の近似は、正確な値と小数1けたの％で同じ', () => {
  // 正確な値（Python の math.erfc で出したもの）とくらべる
  const exact = { 0: 1, 0.5: 0.4795001221869535, 1: 0.15729920705028513, 2: 0.004677734981047265, 3: 2.2090496998585438e-5 };
  for (const [x, v] of Object.entries(exact)) assert.ok(Math.abs(hsErfc(Number(x)) - v) / v < 2e-7, `erfc(${x})`);
  assert.ok(Math.abs(hsErfc(-1) - (2 - exact[1])) < 1e-7);
  // 偏差値0.1きざみで、上位の割合が左右でそろう（50をはさんで足すと100）
  for (let i = 0; i <= 500; i++) {
    const d = 50 + i / 10;
    assert.ok(Math.abs(hsUpper(d) + hsUpper(100 - d) - 100) < 1e-5);
  }
});

test('100人中何番くらい・はしの割合', () => {
  assert.equal(hsRank(15.87), 16);
  assert.equal(hsRank(0.3), 1);
  assert.equal(hsRank(0.01), 1);
  assert.deepEqual(hsPct(0.01), { num: '0.1', unit: '％未満' });
  assert.deepEqual(hsPct(99.99), { num: '99.9', unit: '％超' });
  assert.deepEqual(hsFromDev(100).low, { num: '99.9', unit: '％超' });
});

test('得点・平均点・標準偏差から偏差値', () => {
  const a = hensachi({ dev: null, score: 72, mean: 60, sd: 12, from: 'score' });
  assert.deepEqual([a.ok, a.dev, a.up.num, a.rank], [true, 60, '15.9', 16]);
  // 偏差値は小数1けたに四捨五入（50 + 10 × 5 ÷ 7 ＝ 57.142…）
  assert.equal(hensachi({ dev: null, score: 65, mean: 60, sd: 7, from: 'score' }).dev, 57.1);
  assert.equal(hensachi({ dev: null, score: 48, mean: 60, sd: 12, from: 'score' }).dev, 40);
  // そろっていない
  assert.equal(hensachi({ dev: null, score: 72, mean: null, sd: 12, from: 'score' }).missing, 'mean');
  assert.equal(hensachi({ dev: null, score: 72, mean: 60, sd: null, from: 'score' }).missing, 'sd');
  assert.equal(hensachi({ dev: null, score: null, mean: null, sd: null, from: null }).missing, 'dev');
  // まちがった入力
  assert.equal(hensachi({ dev: null, score: 72, mean: 60, sd: 0, from: 'score' }).field, 'sd');
  assert.equal(hensachi({ dev: null, score: 1e9, mean: 60, sd: 1, from: 'score' }).field, 'sd');
  assert.equal(hensachi({ dev: 1e6, score: null, mean: null, sd: null, from: 'dev' }).field, 'dev');
});

test('偏差値の欄に入れたときは、その数を使う（平均点と標準偏差があれば、その得点も）', () => {
  const a = hensachi({ dev: 65, score: null, mean: null, sd: null, from: 'dev' });
  assert.deepEqual([a.ok, a.dev, a.up.num, a.score], [true, 65, '6.7', null]);
  assert.equal(hensachi({ dev: 65, score: 72, mean: 60, sd: 12, from: 'dev' }).score, 78);
  assert.equal(hensachi({ dev: 62.34, score: null, mean: null, sd: null, from: 'dev' }).dev, 62.3);
});

test('山の絵の形', () => {
  assert.match(hsCurve(), /^M0 /);
  assert.match(hsArea(60), /Z$/);
  assert.ok(!/NaN/.test(hsArea(10) + hsArea(90) + hsArea(50)));
});
