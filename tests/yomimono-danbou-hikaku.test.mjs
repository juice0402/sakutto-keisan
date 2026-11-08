// 読みもの「冬の暖房代を1か月でくらべる」の本文の数字（自分で計算した値と比べる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NUMS, AIRCON_WATT } from '../src/yomimono/danbou-hikaku.mjs';

const near = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) < d, `${a} と ${b}`);

test('灯油ファンヒーター（FW-32S6・18L 2,563円・1日8時間・30日）', () => {
  near(NUMS.liter, 2563 / 18);
  near(NUMS.fanMax, 0.311 * 8 * 30 * (2563 / 18));
  near(NUMS.fanMin, 0.072 * 8 * 30 * (2563 / 18));
  assert.equal(Math.round(NUMS.fanMax), 10628);
  assert.equal(Math.round(NUMS.fanMin), 2460);
  near(NUMS.litersMonth, 74.64);
  near(NUMS.cansMax, 74.64 / 18);
  near(NUMS.up10, 74.64 * 10);
  assert.equal(Math.round(NUMS.fanDay), 354);
});

test('電気の暖房（1kWh 31円・1日8時間・30日）', () => {
  assert.equal(AIRCON_WATT, 470);
  assert.ok(readFileSync(new URL('../src/pages/denki-uses.mjs', import.meta.url), 'utf8').includes('定格で470W'));
  near(NUMS.air, 3496.8);
  near(NUMS.ceraStrong, 8704.8);
  near(NUMS.ceraWeak, 4761.6);
  near(NUMS.oilStrong, 11160);
  near(NUMS.oilMid, 6696);
  near(NUMS.oilWeak, 4464);
  near(NUMS.airHour, 14.57);
});

test('朝2時間ファンヒーター＋夜6時間エアコン', () => {
  near(NUMS.mixFan, 0.311 * 2 * 30 * (2563 / 18));
  near(NUMS.mixAir, 0.47 * 31 * 6 * 30);
  assert.equal(Math.round(NUMS.mixTotal), 5280);
});
