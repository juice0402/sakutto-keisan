// 読みもの「速さのちがう2人で、同じ時刻に終わる場所の分け方」の本文の数字（自分で確かめた値と比べる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUMS, HAYAMI, wakeru, soloMin } from '../src/yomimono/hayasa-wakekata.mjs';

test('120㎡と80㎡の2人で600㎡', () => {
  assert.equal(NUMS.sum, 200);
  assert.equal(NUMS.minutes, 180);
  assert.equal(NUMS.shareA, 360);
  assert.equal(NUMS.shareB, 240);
});

test('半分ずつに分けたとき', () => {
  assert.equal(NUMS.evenA, 150);
  assert.equal(NUMS.evenB, 225);
  assert.equal(NUMS.evenLate, 45);
  assert.equal(NUMS.evenWait, 75);
  assert.equal(soloMin(320, 120), 160);
  assert.equal(soloMin(280, 80), 210);
});

test('早見表', () => {
  assert.deepEqual(HAYAMI.map((h) => [h.a, h.bShare, h.minutes, h.even]), [
    [300, 300, 150, 150],
    [327, 273, 164, 180],
    [360, 240, 180, 225],
    [400, 200, 200, 300],
  ]);
  assert.deepEqual(wakeru(600, [120, 100]).each, [164, 164]);
});

test('3人と、おくれて来る人', () => {
  assert.deepEqual(NUMS.threeShares, [400, 320, 240]);
  assert.equal(NUMS.threeMinutes, 240);
  assert.equal(NUMS.aloneArea, 60);
  assert.equal(NUMS.lateA, 384);
  assert.equal(NUMS.lateB, 216);
  assert.equal(NUMS.lateTotal, 192);
  assert.equal(NUMS.naiveB, 210);
  assert.equal(NUMS.lateSave, 18);
});

test('速さの測り方と目安', () => {
  assert.equal(NUMS.measured, 100);
  assert.equal(NUMS.officeSpeed, 370);
  assert.equal(NUMS.toiletSpeed, 49);
  assert.equal(NUMS.bai, 7);
});
