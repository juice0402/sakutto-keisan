import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enbun, spoonText, spoonParts } from '../src/lib/enbun.mjs';
import { ENBUN_SPOON, ENBUN_USES } from '../src/data/enbun.mjs';
import { fmt } from '../src/lib/number.mjs';

const { tsp, tbsp } = ENBUN_SPOON;
const salt = (base, pct) => enbun({ base, pct, salt: null, out: 'salt' }).salt;

test('塩のスプーンの重さ（塩事業センター）と用途のマス', () => {
  assert.deepEqual([tsp, tbsp], [6, 18]);
  assert.deepEqual(ENBUN_USES.map((u) => [u.short, u.pct]), [['浅漬け', 2], ['パスタ', 1], ['砂抜き', 3], ['梅干し', 18]]);
});

test('水や食材の重さと濃度から塩（ページの計算例とよくある質問）', () => {
  const r = enbun({ base: 500, pct: 3, salt: null, out: 'salt' });
  assert.equal(r.salt, 15);
  assert.equal(fmt(r.whole, 1), '2.9'); // 15 ÷ 515
  assert.equal(spoonText(15, tsp, tbsp), '小さじ2と1/2');
  assert.equal(salt(300, 2), 6);
  assert.equal(spoonText(6, tsp, tbsp), '小さじ1');
  assert.equal(salt(2000, 18), 360);
  assert.equal(salt(333, 2), 6.66); // 0.01g まで
});

test('塩から濃度、塩と濃度から水や食材の重さ', () => {
  assert.equal(enbun({ base: 1000, pct: null, salt: 15, out: 'pct' }).pct, 1.5);
  assert.equal(enbun({ base: null, pct: 2, salt: 10, out: 'base' }).base, 500);
  assert.equal(enbun({ base: null, pct: 3, salt: 10, out: 'base' }).base, 333.33);
});

test('塩の量の早見表（ページの表）', () => {
  const want = {
    200: [[2, '小さじ1/4'], [4, '小さじ3/4'], [6, '小さじ1']],
    500: [[5, '小さじ3/4'], [10, '小さじ1と3/4'], [15, '小さじ2と1/2']],
    1000: [[10, '小さじ1と3/4'], [20, '大さじ1と小さじ1/4'], [30, '大さじ1と小さじ2']],
    2000: [[20, '大さじ1と小さじ1/4'], [40, '大さじ2と小さじ3/4'], [60, '大さじ3と小さじ1']],
  };
  for (const [base, row] of Object.entries(want)) {
    assert.deepEqual([1, 2, 3].map((p) => [salt(Number(base), p), spoonText(salt(Number(base), p), tsp, tbsp)]), row, `${base}`);
  }
});

test('スプーンの言い方と絵の数', () => {
  assert.equal(spoonText(0.5, tsp, tbsp), '小さじ1/4より少し');
  assert.equal(spoonText(18, tsp, tbsp), '大さじ1');
  assert.equal(spoonText(36, tsp, tbsp), '大さじ2');
  assert.deepEqual(spoonParts(15, tsp, tbsp), { big: 0, quarters: 10 });
  assert.deepEqual(spoonParts(20, tsp, tbsp), { big: 1, quarters: 1 });
});

test('まだ入れていない・まちがった入力', () => {
  assert.equal(enbun({ base: 500, pct: null, salt: null, out: 'salt' }).empty, true);
  assert.equal(enbun({ base: 0, pct: 2, salt: null, out: 'salt' }).field, 'base');
  assert.equal(enbun({ base: NaN, pct: 2, salt: null, out: 'salt' }).field, 'base');
  assert.equal(enbun({ base: 500, pct: 0, salt: null, out: 'salt' }).field, 'pct');
  assert.equal(enbun({ base: 500, pct: 120, salt: null, out: 'salt' }).field, 'pct');
  assert.equal(enbun({ base: 500, pct: null, salt: 0, out: 'pct' }).field, 'salt');
  assert.equal(enbun({ base: 2000000, pct: 2, salt: null, out: 'salt' }).field, 'base');
});

test('塩の重さとスプーンの目安（ページの表）', () => {
  const want = { 1: '小さじ1/4', 2: '小さじ1/4', 3: '小さじ1/2', 5: '小さじ3/4', 6: '小さじ1', 9: '小さじ1と1/2', 10: '小さじ1と3/4', 12: '小さじ2', 15: '小さじ2と1/2', 18: '大さじ1', 20: '大さじ1と小さじ1/4', 30: '大さじ1と小さじ2' };
  for (const [g, text] of Object.entries(want)) assert.equal(spoonText(Number(g), tsp, tbsp), text, `${g}g`);
});
