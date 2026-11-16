// 読みもの「消毒液を薄めるとき、勤め先で決まっていること」の本文の数字（自分で確かめた値と比べる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUMS, amountFor } from '../src/yomimono/shoudoku-kimari.mjs';
import { volumeText, capText } from '../src/lib/kishaku.mjs';

const near = (a, b, d = 0.001) => assert.ok(Math.abs(a - b) < d, `${a} と ${b}`);

test('6％の漂白剤で作る量', () => {
  assert.equal(NUMS.r01, 60);
  assert.equal(NUMS.r002, 300);
  near(NUMS.pet01, 500 / 59);
  near(NUMS.l002, 1000 / 299);
  near(NUMS.l01, 1000 / 59);
  near(NUMS.b3, 3000 / 299);
  near(NUMS.b5, 5000 / 299);
  assert.equal(volumeText(NUMS.pet01), '8.5ml');
  assert.equal(volumeText(NUMS.l002), '3.3ml');
  assert.equal(volumeText(NUMS.l01), '17ml');
  assert.equal(volumeText(NUMS.b3), '10ml');
  assert.equal(volumeText(NUMS.b5), '17ml');
});

test('ペットボトルのキャップ（約5ml）の杯数', () => {
  assert.equal(capText(NUMS.pet01, 5), '約1.7杯');
  assert.equal(capText(NUMS.l002, 5), '約0.7杯');
  assert.equal(NUMS.capRatio, 5);
});

test('広島市の表（5％・10％の原液、水1L）と同じ量になる', () => {
  assert.equal(volumeText(amountFor(5, 0.1, 1000)), '20ml');
  assert.equal(volumeText(amountFor(5, 0.02, 1000)), '4ml');
  assert.equal(volumeText(amountFor(10, 0.1, 1000)), '10ml');
  assert.equal(volumeText(amountFor(10, 0.02, 1000)), '2ml');
});

test('濃度のちがう原液を、ほかの濃度の量で入れたとき', () => {
  near(NUMS.over, (6 * 20) / 1020); // 約0.12％
  near(NUMS.under, (5 * 17) / 1017); // 約0.084％
});
