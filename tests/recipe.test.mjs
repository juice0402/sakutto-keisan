import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleRatio, haveRatio, toFraction, formatAmount, rawAmount, scaleRecipe, parseRecipeText, cleanOcrText } from '../src/lib/recipe.mjs';

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
  assert.equal(out[2].from, '大さじ2');
  assert.equal(scaleRecipe([{ name: '', amount: 100, unit: 'g' }], 2)[0].name, '材料1');
  assert.ok(scaleRecipe([{ name: '卵', amount: 0, unit: '個' }], 2)[0].error);
  assert.equal(scaleRecipe([{ name: '', amount: null, unit: '適量' }], 2).length, 0);
});

test('元の分量は入れたままの書き方で出す', () => {
  assert.equal(rawAmount(1.2, 'カップ'), '1.2カップ'); // 1と¼カップ に直さない
  assert.equal(rawAmount(0.5, '小さじ'), '小さじ½'); // ちょうどの分数は分数で
  assert.equal(rawAmount(0.333, '大さじ'), '大さじ⅓');
  assert.equal(rawAmount(2.5, 'g'), '2.5g');
  assert.equal(rawAmount(1000, 'g'), '1,000g');
  assert.equal(rawAmount(null, '少々'), '少々');
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

const rowsOf = (text) => parseRecipeText(text).rows.map((r) => [r.name, r.amount, r.unit]);

test('貼り付け：1行に「材料 分量」の形', () => {
  const p = parseRecipeText('材料（2人分）\n鶏もも肉 300g\n玉ねぎ　1/2個\n★しょうゆ…大さじ2\n★砂糖 大1\n(A)みりん 大さじ1と1/2\nごま油 小さじ½\n塩 少々\n\n作り方\n1. 鶏肉を大さじ1の油で焼く');
  assert.equal(p.people, 2);
  assert.deepEqual(p.rows.map((r) => [r.name, r.amount, r.unit]), [
    ['鶏もも肉', 300, 'g'], ['玉ねぎ', 0.5, '個'], ['しょうゆ', 2, '大さじ'], ['砂糖', 1, '大さじ'],
    ['みりん', 1.5, '大さじ'], ['ごま油', 0.5, '小さじ'], ['塩', null, '少々'],
  ]); // 「作り方」から下は読まない
});

test('貼り付け：「材料」と「分量」が2行に分かれた形（レシピサイトをコピーしたとき）', () => {
  const p = parseRecipeText('材料（4人前）\n鶏もも肉\n300g\n玉ねぎ\n1/2個\n調味料\nしょうゆ\n大さじ2\nパセリ\nお好みで');
  assert.equal(p.people, 4);
  assert.deepEqual(p.rows.map((r) => [r.name, r.amount, r.unit]), [['鶏もも肉', 300, 'g'], ['玉ねぎ', 0.5, '個'], ['しょうゆ', 2, '大さじ'], ['パセリ', null, '適量']]);
  assert.deepEqual(p.skipped, []); // 「調味料」は見出しなので数えない
});

test('貼り付け：単位の書き方のゆれ', () => {
  assert.deepEqual(rowsOf('牛乳 200cc\n水 1.5L\n鶏肉 1.2kg\nにんにく 1かけ\nしょうが（チューブ） 2cm\n卵 2〜3個\n水 カップ1/2\n小麦粉 100 g\n全角 ３００ｇ'), [
    ['牛乳', 200, 'ml'], ['水', 1500, 'ml'], ['鶏肉', 1200, 'g'], ['にんにく', 1, '片'], ['しょうが(チューブ)', 2, 'cm'],
    ['卵', 2, '個'], ['水', 0.5, 'カップ'], ['小麦粉', 100, 'g'], ['全角', 300, 'g'],
  ]);
  assert.deepEqual(rowsOf('大根 1/2本\n小松菜 1束\n豆腐 1丁(300g)\n鶏むね肉 1枚（300g）\n卵 1½個'), [
    ['大根', 0.5, '本'], ['小松菜', 1, '束'], ['豆腐', 1, '丁'], ['鶏むね肉', 1, '枚'], ['卵', 1.5, '個'],
  ]); // かっこの中の g より、かっこの外の分量
});

test('貼り付け：「各」は材料ごとに分ける・読めない行', () => {
  assert.deepEqual(rowsOf('しょうゆ・みりん 各大さじ1\n塩、こしょう 各少々'), [
    ['しょうゆ', 1, '大さじ'], ['みりん', 1, '大さじ'], ['塩', null, '少々'], ['こしょう', null, '少々'],
  ]);
  const p = parseRecipeText('塩こしょう\n鶏肉 200g');
  assert.deepEqual(p.skipped, ['塩こしょう']);
  assert.equal(p.rows.length, 1);
});

test('貼り付け：このツールの「結果をコピー」をそのまま読める', () => {
  const p = parseRecipeText('【3人分の材料】（2人分のレシピの1.5倍）\n・鶏もも肉　450g\n・玉ねぎ　1と½個\n・牛乳　約1と½カップ（300ml）\n・塩　少々');
  assert.equal(p.people, 3);
  assert.deepEqual(p.rows.map((r) => [r.name, r.amount, r.unit]), [['鶏もも肉', 450, 'g'], ['玉ねぎ', 1.5, '個'], ['牛乳', 1.5, 'カップ'], ['塩', null, '少々']]);
});

test('写真から読み取った文字を整える', () => {
  const text = cleanOcrText('材 料 （ 2 人 分 ）\n\n鶏 も も 肉        300g\nし ょ う ゆ 大 さ じ 2\n塩 少 々  \n');
  assert.equal(text, '材料（ 2 人分）\n鶏もも肉 300g\nしょうゆ大さじ 2\n塩少々'); // 数字のまわりの空白は読み取りのじゃまにならないので残す
  const p = parseRecipeText(text);
  assert.equal(p.people, 2);
  assert.deepEqual(p.rows.map((r) => [r.name, r.amount, r.unit]), [['鶏もも肉', 300, 'g'], ['しょうゆ', 2, '大さじ'], ['塩', null, '少々']]);
});

test('写真から読み取った文字：注意書き・商品名の記号・ゴミの行', () => {
  const p = parseRecipeText('15:43 10月16日(金) 4G 74%\n材料（4人分）\n「瀬戸のほんじお®」 小さじ1/2\n「固形コンソメ」? 1個\nバター 大さじ2\n＊ 固形コンソメ1個は、顆粒で小さじ2杯です。\n国男関関滞?々図白加胃由季回周昌周り関部\n塩こしょう');
  assert.equal(p.people, 4);
  assert.deepEqual(p.rows.map((r) => [r.name, r.amount, r.unit]), [['瀬戸のほんじお', 0.5, '小さじ'], ['固形コンソメ', 1, '個'], ['バター', 2, '大さじ']]);
  assert.deepEqual(p.skipped, ['塩こしょう']); // ゴミの行は出さない
  assert.deepEqual(rowsOf('* 固形コンソメ1個は、顆粒で小さじ2杯ですず\n※ 鶏肉 1枚\n* バター 大さじ1'), [['バター', 1, '大さじ']]); // 注意書き（読みまちがいで「。」がなくても）
  assert.deepEqual(rowsOf('のローリエ 1枚\nのり 1枚\nドク2拓。。玉ねぎ 1個'), [['ローリエ', 1, '枚'], ['のり', 1, '枚'], ['ドク2拓。。玉ねぎ', 1, '個']]);
  assert.deepEqual(rowsOf('ml 4G @ 74%\nea 1枚\nMozzarella 100g'), [['Mozzarella', 100, 'g']]); // 短いアルファベットだけの名前はゴミ
});

test('写真から読み取った文字：® の読みまちがい（$ ?）', () => {
  assert.equal(cleanOcrText('「瀬戸のほんじお$ 小さじ1/2\n「やさしい塩? 小さじ1\n「サラダ油」? 大さじ1'), '「瀬戸のほんじお小さじ1/2\n「やさしい塩小さじ1\n「サラダ油」大さじ1');
  assert.equal(cleanOcrText('「やさしい塩5」小さじ1/2\nの泊戸のほんじお2? 小さじ1\n卵5個\n「牛乳」 200ml'), '「やさしい塩」小さじ1/2\nの泊戸のほんじお小さじ1\n卵5個\n「牛乳」 200ml');
  assert.deepEqual(rowsOf('の泊戸のほんじお小さじ1').map((r) => r[0]), ['泊戸のほんじお']);
  assert.deepEqual(parseRecipeText('「瀬戸のほんじお 小さじ1/2').rows.map((r) => r.name), ['瀬戸のほんじお']);
});

test('写真から読み取った文字：よくある読みまちがい（1/2 → 172・丸の印）', () => {
  assert.equal(cleanOcrText('ブロッコリー 172個 (150g)\nの⑳ 牛乳 2・172カップ\nの 固形コンソメ 1個\n塩 小さじ174\n鶏肉 172g\n水 1720ml'), 'ブロッコリー 1/2個 (150g)\n牛乳 2・1/2カップ\n固形コンソメ 1個\n塩小さじ1/4\n鶏肉 172g\n水 1720ml');
});
