// 読みもの「「通常価格から30％オフ」の通常価格は、いつの値段？」の本文の数字（自分で確かめた値と比べる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUMS, REI, kangae } from '../src/yomimono/tsujo-kakaku.mjs';

const near = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) < d, `${a} と ${b}`);

test('2つの値段から何％オフか', () => {
  near(NUMS.r30, 30);
  near(NUMS.r1980, (500 / 1980) * 100);
  near(NUMS.kibou, (1520 / 5500) * 100);
  near(NUMS.mae, (420 / 4400) * 100);
  assert.equal(NUMS.off1980, 500);
});

test('8週間・過半・2週間の考え方（週の数の例）', () => {
  const r = Object.fromEntries(REI.map((x) => [x.id, x]));
  assert.deepEqual([r.a.ok, r.b.ok, r.c.ok, r.d.ok, r.e.ok], [true, false, false, true, true]);
  assert.equal(r.b.gap, 3);
  assert.equal(r.b.kahan, true);
  assert.equal(r.c.kahan, false); // 4週は8週のちょうど半分で、過半ではない
  assert.equal(r.d.n, 5);
  assert.equal(r.e.sold, 3);
  assert.equal(r.e.n, 2);
  // 通算2週間に足りない
  assert.equal(kangae(['', '', '', '', '', '', 'n', 'o']).ok, false);
  // 最後に売ってからちょうど2週たつ
  assert.equal(kangae(['n', 'n', 'n', 'n', 'n', 'n', 'o', 'o']).ok, false);
});
