// 図解の式と帯の図（#80）：ふるさと納税と楽天のポイントのページの図の数字が、計算例と同じになっているか
import test from 'node:test';
import assert from 'node:assert/strict';
import { Z_TOP, Z_NENSHU, Z_FUUFU, Z_UCHIWAKE, Z_JOUGEN } from '../src/pages/furusato.mjs';
import { Z_MEMO } from '../src/pages/furusato-tetsuzuki.mjs';
import { Z_POINT } from '../src/pages/point.mjs';
import { Z_SPU } from '../src/pages/spu.mjs';
import { Z_TAISHOU } from '../src/pages/taishou.mjs';
import { Z_SHIKUMI } from '../src/pages/shikumi.mjs';
import { Z_HIKAKU } from '../src/pages/hikaku.mjs';

test('ふるさと納税の図：上限の目安・必要な年収・共働き・内わけ・控除上限額・寄付メモ', () => {
  assert.deepEqual(Z_TOP, { shotokuwari: 235500, ratio: '84.895%', limit: 57000 });
  assert.deepEqual(Z_NENSHU, { man: 452, limit: 50000 });
  assert.deepEqual(Z_FUUFU, { a: 77000, b: 28000, total: 105000 });
  assert.deepEqual(Z_UCHIWAKE, { it: 2450, kihon: 4800, tokurei: 40750, self: 2000 });
  assert.equal(Z_UCHIWAKE.it + Z_UCHIWAKE.kihon + Z_UCHIWAKE.tokurei + Z_UCHIWAKE.self, 50000);
  assert.deepEqual(Z_JOUGEN, { cap: 47100, limit: 57000 });
  assert.equal(Z_MEMO.left, 27000);
  assert.equal(Z_MEMO.limit, Z_TOP.limit);
});

test('楽天のポイントの図：マラソン・SPU・1店舗の判定・しくみ・Amazonとのくらべ', () => {
  assert.deepEqual(Z_POINT, { base: 272, bonus: 1088 });
  assert.deepEqual(Z_SPU, { rate: 7.5, points: 2070, base: 272, rows: [572, 1090, 136] });
  assert.equal(Z_SPU.base + Z_SPU.rows.reduce((a, b) => a + b, 0), Z_SPU.points);
  assert.deepEqual(Z_TAISHOU, { judge: 980, status: 'no' });
  assert.deepEqual(Z_SHIKUMI, { rate: 12, points: 3294, base: 272, spu: 1662, camp: 1360 });
  assert.equal(Z_SHIKUMI.base + Z_SHIKUMI.spu + Z_SHIKUMI.camp, Z_SHIKUMI.points);
  assert.deepEqual(Z_HIKAKU, { r: 1116, rRate: 4, a: 900 });
});
