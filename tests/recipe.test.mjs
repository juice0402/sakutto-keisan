import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleRatio, haveRatio, toFraction, formatAmount, scaleRecipe } from '../src/lib/recipe.mjs';

const t = (v, u) => formatAmount(v, u).text;

test('倍率：人数と手元の量', () => {
  assert.equal(peopleRatio(2, 3).ratio, 1.5);
  assert.equal(peopleRatio(4, 1).ratio, 0.25);
  assert.equal(peopleRatio(null, 3).empty, true);
  assert.ok(peopleRatio(0, 3).error);
  assert.equal(haveRatio(300, 450).ratio, 1.5);
  assert.ok(haveRatio(0, 100).error);
});

test('分数：いちばん近い ¼・⅓・½・⅔・¾', () => {
  assert.deepEqual(toFraction(1.5), { text: '1と½', approx: false });
  assert.deepEqual(toFraction(0.5), { text: '½', approx: false });
  assert.equal(toFraction(2).text, '2');
  assert.equal(toFraction(1.25).text, '1と¼');
  assert.equal(toFraction(1 / 3).text, '⅓');
  assert.deepEqual(toFraction(0.7), { text: '⅔', approx: true });
  assert.equal(toFraction(1.95).text, '2');
});

test('分量の書き方：g・ml・大さじ・小さじ・カップ・個・少々', () => {
  assert.equal(t(450, 'g'), '450g');
  assert.equal(t(2.5, 'g'), '2.5g');
  assert.equal(t(0.25, 'g'), '0.25g');
  assert.equal(t(1234.5, 'g'), '1,235g');
  assert.equal(t(300, 'ml'), '300ml');
  assert.equal(t(3, '大さじ'), '大さじ3');
  assert.equal(t(1.5, '大さじ'), '大さじ1と½');
  assert.equal(t(0.25, '大さじ'), '小さじ¾'); // 大さじ¼ → 小さじ¾
  assert.equal(t(4, '小さじ'), '大さじ1と⅓'); // 小さじ4 → 大さじ1と⅓
  assert.equal(t(1, '小さじ'), '小さじ1');
  assert.equal(t(2, '小さじ'), '小さじ2'); // 小さじ3より少ないときは小さじのまま
  assert.equal(t(3, '小さじ'), '大さじ1');
  assert.equal(t(3.5, '小さじ'), '小さじ3と½'); // 大さじだと半端
  assert.equal(t(0.5, '大さじ'), '大さじ½');
  assert.equal(t(0.125, '小さじ'), '少々');
  assert.equal(t(1.5, 'カップ'), '1と½カップ');
  assert.equal(formatAmount(1.5, 'カップ').sub, '300ml');
  assert.equal(t(2.5, '小さじ'), '小さじ2と½'); // 大さじだと半端なので小さじのまま
  assert.deepEqual(formatAmount(1.6, '大さじ'), { text: '大さじ1と⅔', approx: true });
  assert.equal(t(0.1, 'カップ'), '20ml');
  assert.equal(t(1.5, '個'), '1と½個');
  assert.equal(formatAmount(0.7, '個').approx, true);
  assert.equal(t(3, '合'), '3合');
  assert.equal(t(0, '少々'), '少々');
});

test('レシピ2人分 → 3人分（ページの計算例）', () => {
  const rows = [
    { name: '鶏もも肉', amount: 300, unit: 'g' },
    { name: '玉ねぎ', amount: 1, unit: '個' },
    { name: 'しょうゆ', amount: 2, unit: '大さじ' },
    { name: '砂糖', amount: 1, unit: '大さじ' },
    { name: '水', amount: 200, unit: 'ml' },
    { name: '塩', amount: null, unit: '少々' },
    { name: '', amount: null, unit: 'g' }, // 空の行は出さない
  ];
  const out = scaleRecipe(rows, peopleRatio(2, 3).ratio);
  assert.deepEqual(out.map((r) => r.to), ['450g', '1と½個', '大さじ3', '大さじ1と½', '300ml', '少々']);
  assert.equal(out[0].from, '300g');
  assert.equal(scaleRecipe([{ name: '', amount: 100, unit: 'g' }], 2)[0].name, '材料1');
  assert.ok(scaleRecipe([{ name: '卵', amount: 0, unit: '個' }], 2)[0].error);
  assert.equal(scaleRecipe([{ name: '', amount: null, unit: '適量' }], 2).length, 0);
});

test('レシピ4人分 → 1人分（少ない量）', () => {
  const out = scaleRecipe(
    [
      { name: 'しょうゆ', amount: 2, unit: '大さじ' },
      { name: '酒', amount: 1, unit: '大さじ' },
      { name: '卵', amount: 3, unit: '個' },
    ],
    peopleRatio(4, 1).ratio,
  );
  assert.deepEqual(out.map((r) => r.to), ['大さじ½', '小さじ¾', '¾個']);
});
