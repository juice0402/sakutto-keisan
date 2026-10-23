import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shikumiPoints } from '../src/lib/shikumi.mjs';
import { SPU_ITEMS, SPU_BASE, POINT_DAY } from '../src/data/spu.mjs';
import { AMAZON_CARD, AMAZON_SOURCES } from '../src/data/amazon.mjs';

const CFG = { items: SPU_ITEMS, base: SPU_BASE, dayRate: POINT_DAY.rate, dayCap: POINT_DAY.cap, cap: 7000, minYen: 1000, maxShops: 10 };
const calc = (total, on = {}) => shikumiPoints({ total, ...on }, CFG);

test('ページの計算例：3万円', () => {
  const zero = calc(30000);
  assert.deepEqual([zero.rate, zero.points, zero.spu, zero.camp], [1, 272, 0, 0]);
  const all = calc(30000, { card: true, mobile: true, day: true, marathon: true });
  assert.equal(all.rate, 12);
  assert.deepEqual([all.base, all.spu, all.day, all.marathon, all.points], [272, 1662, 272, 1088, 3294]);
  assert.equal(all.capped, false);
});

test('5と0のつく日は楽天カードで払った分だけ・上限1,000', () => {
  const noCard = calc(30000, { day: true });
  assert.deepEqual([noCard.rate, noCard.day, noCard.dayNoCard], [1, 0, true]);
  const big = calc(330000, { card: true, day: true });
  assert.equal(big.day, 1000);
  assert.equal(big.capped, true);
  assert.deepEqual([POINT_DAY.rate, POINT_DAY.cap], [1, 1000]);
});

test('お買い物マラソンは5店舗で＋4倍を上限まで。5,000円より少ないと入らない', () => {
  assert.equal(calc(30000, { marathon: true }).marathon, 1088);
  assert.equal(calc(300000, { marathon: true }).marathon, 7000);
  const short = calc(4000, { marathon: true });
  assert.deepEqual([short.marathon, short.mShort], [0, true]);
});

test('まちがった入力', () => {
  assert.equal(calc(null).empty, true);
  assert.equal(calc(0).field, 'total');
  assert.equal(calc(NaN).field, 'total');
  assert.equal(calc(null, { card: true, mobile: true }).rate, 7);
});

test('Amazon の数字は公式のURLと確かめた日つき（確認日から90日以内）', () => {
  assert.deepEqual(AMAZON_CARD, { prime: 2, normal: 1.5 });
  for (const s of [...AMAZON_SOURCES, POINT_DAY]) {
    assert.match(s.url, /^https:\/\//);
    const days = (Date.now() - Date.parse(`${s.checked}T00:00:00+09:00`)) / 86400000;
    assert.ok(days <= 90, `${s.name} を確かめ直して checked を直す`);
  }
});
