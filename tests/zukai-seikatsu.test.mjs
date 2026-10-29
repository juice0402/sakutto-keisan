// 図解の式と帯の図（#81）：生活のページ（割引・買い物・料理・家事）の図の数字が、計算例と同じになっているか
import test from 'node:test';
import assert from 'node:assert/strict';
import { Z_RITSU } from '../src/pages/waribiki.mjs';
import { zOff, OFF_RATES } from '../src/pages/waribiki-off.mjs';
import { Z_MATOME } from '../src/pages/tanka.mjs';
import { Z_KEISHA } from '../src/pages/warikan.mjs';
import { Z_RECIPE } from '../src/pages/recipe.mjs';
import { Z_SENZAI } from '../src/pages/sentaku-senzai.mjs';
import { Z_ENBUN } from '../src/pages/enbun-noudo.mjs';
import { Z_USES } from '../src/pages/kishaku-uses.mjs';

test('割引の図：割引率の計算と、率ごとの割引（2,000円）', () => {
  assert.deepEqual(Z_RITSU, { off: 300, rate: 15 });
  assert.deepEqual(OFF_RATES.map((r) => zOff(r).final), [1800, 1700, 1600, 1400, 1200, 1000]);
  OFF_RATES.forEach((r) => assert.equal(zOff(r).final + zOff(r).off, 2000));
});

test('買い物の図：まとめ買い・傾斜割り勘', () => {
  assert.deepEqual(Z_MATOME, { a: 56.2, b: 59.4, amount: 2100 });
  assert.deepEqual(Z_KEISHA, { base: 4286, each: [8600, 4300, 2200], collect: 30200 });
});

test('料理・家事の図：レシピ・洗剤・塩分濃度・めんつゆ・漂白剤・液肥', () => {
  assert.deepEqual(Z_RECIPE, { ratio: 1.5, to: '450g', one: '150g' });
  assert.deepEqual(Z_SENZAI, { amount: 15, perWash: 12.5, washes: 40 });
  assert.deepEqual(Z_ENBUN, { salt: 15, whole: 2.9 });
  assert.deepEqual(Z_USES, { tsuyu: '33ml', tsuyuWater: '67ml', hyohakuRatio: 120, hyohaku: '8.4ml', ekihi: '2ml' });
});
