import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amazonPoints } from '../src/lib/hikaku.mjs';
import { shikumiPoints } from '../src/lib/shikumi.mjs';
import { SPU_ITEMS, SPU_BASE, POINT_DAY } from '../src/data/spu.mjs';
import { AMAZON_CARD } from '../src/data/amazon.mjs';

const CFG = { items: SPU_ITEMS, base: SPU_BASE, dayRate: POINT_DAY.rate, dayCap: POINT_DAY.cap, cap: 7000, minYen: 1000, maxShops: 10 };

test('ページの計算例：3万円', () => {
  const r = shikumiPoints({ total: 30000, card: true, day: true }, CFG);
  assert.deepEqual([r.rate, r.points], [4, 1116]); // いつもの1倍272＋楽天カード572（通常分300・特典分272）＋5と0のつく日272
  const a = amazonPoints({ total: 30000, pct: 1, card: true, prime: true }, AMAZON_CARD);
  assert.deepEqual([a.item, a.card, a.points], [300, 600, 900]);
});

test('Amazon Mastercard はプライム会員2%・会員でない人1.5%、切り捨て', () => {
  assert.equal(amazonPoints({ total: 30000, pct: null, card: true }, AMAZON_CARD).points, 450);
  assert.equal(amazonPoints({ total: 1999, pct: 0.5, card: true }, AMAZON_CARD).points, 9 + 29);
  assert.equal(amazonPoints({ total: 30000, pct: null, card: false, prime: true }, AMAZON_CARD).points, 0); // プライムでもカードでないと0
  assert.equal(amazonPoints({ total: 12345, pct: 3, card: false }, AMAZON_CARD).points, 370);
});
