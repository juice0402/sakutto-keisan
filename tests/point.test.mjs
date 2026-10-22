import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marathonPoints, zeinukiOf, pointReach } from '../src/lib/point.mjs';
import { POINT_EVENTS, POINT_SOURCES, POINT_CAPS, POINT_MIN_YEN, POINT_MAX_SHOPS } from '../src/data/point.mjs';

const calc = (total, shops, cap = 7000) => marathonPoints({ total, shops, cap, minYen: POINT_MIN_YEN, maxShops: POINT_MAX_SHOPS });

test('楽天市場のガイドの例：3ショップで税抜5,000円なら、買いまわりの特典は100ポイント', () => {
  const r = calc(5500, 3);
  assert.deepEqual([r.zeinuki, r.base, r.bonus, r.rate, r.all], [5000, 50, 100, 3, 150]);
});

test('ページの計算例：合計3万円・5ショップ、上限に届く合計', () => {
  const r = calc(30000, 5);
  assert.deepEqual([r.zeinuki, r.base, r.bonus, r.left, r.next], [27272, 272, 1088, 5912, 317]);
  // 10ショップ・上限7,000：通常ポイント778で届く → 税抜77,800円・税込85,580円
  assert.equal(pointReach(10, 7000), 85580);
  assert.equal(pointReach(10, 5000), 61160);
  assert.equal(pointReach(10, 10000), 122320);
  assert.equal(pointReach(1, 7000), null);
  const top = calc(85580, 10);
  assert.deepEqual([top.bonus, top.capped, top.left, top.next], [7000, true, 0, 0]);
  assert.equal(calc(85569, 10).capped, false);
});

test('11ショップ以上は10倍のまま、1ショップは特典なし', () => {
  const r = calc(20000, 12);
  assert.deepEqual([r.counted, r.rate, r.bonus, r.next], [10, 10, 181 * 9, 0]);
  const one = calc(3000, 1);
  assert.deepEqual([one.bonus, one.reach, one.next], [0, null, 36]); // 2ショップ目（合計4,000円・税抜3,636円）で36ポイント
  assert.equal(zeinukiOf(1100), 1000);
});

test('まちがった入力', () => {
  assert.equal(calc(null, 3).missing, 'total');
  assert.equal(calc(5000, null).missing, 'shops');
  assert.equal(calc(NaN, 3).field, 'total');
  assert.equal(calc(0, 3).field, 'total');
  assert.equal(calc(2999, 3).field, 'total'); // 1ショップ1,000円以上
  assert.equal(calc(5000, 0).field, 'shops');
  assert.equal(calc(5000, 2.5).field, 'shops');
  assert.equal(calc(2e8, 3).field, 'total');
});

test('回のデータは公式のURLと確かめた日があり、期間の順がただしい', () => {
  for (const e of POINT_EVENTS) {
    assert.match(e.url, /^https:\/\/event\.rakuten\.co\.jp\//);
    assert.match(e.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(e.start < e.end, `${e.start} 〜 ${e.end}`);
    assert.ok(e.cap === null || POINT_CAPS.includes(e.cap), `上限 ${e.cap}`);
  }
  for (let i = 1; i < POINT_EVENTS.length; i++) assert.ok(POINT_EVENTS[i - 1].end < POINT_EVENTS[i].start);
  for (const s of POINT_SOURCES) assert.match(s.url, /^https:\/\//);
});
