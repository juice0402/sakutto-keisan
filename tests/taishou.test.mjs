import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countJudge } from '../src/lib/taishou.mjs';
import { POINT_COUNT_SOURCES, POINT_MIN_YEN } from '../src/data/point.mjs';

const j = (kind, price, coupon = null) => countJudge({ kind, price, coupon }, POINT_MIN_YEN);

test('1,000円はクーポンのあとの額（ページの計算例）', () => {
  assert.deepEqual([j('normal', 1280, 300).judge, j('normal', 1280, 300).status, j('normal', 1280, 300).short], [980, 'no', 20]);
  assert.equal(j('normal', 1280, 280).status, 'yes'); // ちょうど1,000円は数える
  assert.equal(j('normal', 999).status, 'no');
  assert.equal(j('books', 1500).status, 'yes');
});

test('店の種類', () => {
  assert.equal(j('furusato', 30000).status, 'no');
  assert.equal(j('furusato', null).status, 'no'); // 値段を入れなくても数えない
  assert.equal(j('kinken', 5000).status, 'no');
  assert.equal(j('teiki', 3000).status, 'first');
  assert.equal(j('teiki', 800).status, 'no');
  assert.equal(j('yoyaku', 3000).status, 'maybe');
});

test('まちがった入力', () => {
  assert.equal(j('normal', null).missing, 'price');
  assert.equal(j('normal', 0).field, 'price');
  assert.equal(j('normal', 1000, 1200).field, 'coupon');
  assert.equal(j('normal', 1000, NaN).field, 'coupon');
});

test('出典は確認日から90日以内', () => {
  for (const s of POINT_COUNT_SOURCES) {
    const days = (Date.now() - Date.parse(`${s.checked}T00:00:00+09:00`)) / 86400000;
    assert.ok(days <= 90, `${s.name} を確かめ直して checked を直す`);
  }
});
