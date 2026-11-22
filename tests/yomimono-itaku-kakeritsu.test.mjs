// 読みもの「委託料30％は何掛け？卸と委託で受け取る額をくらべる」の本文の数字（自分で確かめた値と比べる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUMS, HAYAMI, uketori } from '../src/yomimono/itaku-kakeritsu.mjs';

test('委託料30％は7掛け', () => {
  assert.equal(NUMS.jodai, 2400);
  assert.equal(NUMS.uketori30, 1680);
  assert.equal(NUMS.itakuryo30, 720);
  assert.equal(NUMS.kake30, '7');
  assert.equal(uketori(3000, 30).uketori, 2100);
});

test('早見表（上代2,400円）', () => {
  assert.deepEqual(HAYAMI.map((h) => h.uketori), [2160, 2040, 1920, 1800, 1680, 1560, 1440, 1320, 1200]);
  assert.deepEqual(HAYAMI.map((h) => h.kake), ['9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5']);
});

test('場面ごとの例', () => {
  assert.equal(NUMS.u2500, 1625);
  assert.equal(NUMS.kake2500, '6.5');
  assert.equal(NUMS.gyakuJodai, 3000);
  assert.equal(NUMS.zan, 1080);
  assert.ok(Math.abs(NUMS.zanRate - (1080 / 1680) * 100) < 0.01);
});

test('6掛けの卸とくらべる', () => {
  assert.equal(NUMS.oroshi6, 1440);
  assert.equal(NUMS.sa, 240);
  assert.equal(NUMS.oroshi10, 14400);
  assert.equal(NUMS.itaku6, 10080);
  assert.equal(NUMS.hitsuyou, 9); // 8個は13,440円で届かず、9個で15,120円
});
