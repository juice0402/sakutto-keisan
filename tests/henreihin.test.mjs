import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAmount, perMan, whenOf, hrPrepare, firstPick, hrNormalize, hrStats } from '../src/lib/henreihin.mjs';

// 商品名はどれも作り話（本物の楽天のデータはリポジトリに入れない。楽天ウェブサービスの規約 第10条9号）
const kg = (name) => readAmount(name, 'kg');
const pick = (r) => r && [r.total, r.basis, r.teiki];

test('お米・肉・魚介：kg と g、×の袋、合計', () => {
  assert.deepEqual(pick(kg('【見本】見本町のお米 5kg×3袋 令和8年産')), [15, '5kg×3袋', 1]);
  assert.deepEqual(pick(kg('見本米 10kg')), [10, '10kg', 1]);
  assert.deepEqual(pick(kg('見本米 10kg（5kg×2袋）')), [10, '5kg×2袋', 1]);
  assert.deepEqual(pick(kg('見本の牛こま切れ 2kg(500g×4パック)')), [2, '500g×4パック', 1]);
  assert.deepEqual(pick(kg('見本の豚肉 300g×6')), [1.8, '300g×6', 1]);
  assert.deepEqual(pick(kg('見本の鶏肉セット もも2kg むね2kg 合計4kg')), [4, '計4kg', 1]);
  assert.deepEqual(pick(kg('見本のうなぎ 3尾 計約450g')), [0.45, '計約450g', 1]);
  assert.deepEqual(pick(kg('見本のいくら ２５０ｇ×２パック')), [0.5, '250g×2パック', 1]);
  assert.deepEqual(pick(kg('見本のほたて 1キロ')), [1, '1kg', 1]);
  assert.equal(kg('見本のかに 姿 1.2kg').shell, true);
  assert.equal(kg('見本のかに むき身 1kg').shell, false);
});

test('定期便は回数をかける。回数が読めなければ出さない', () => {
  assert.deepEqual(pick(kg('【定期便】見本米 5kg 全6回')), [30, '5kg・定期便6回', 6]);
  assert.deepEqual(pick(kg('見本米 10kg×12ヶ月 定期便')), [120, '10kg・定期便12回', 12]);
  assert.deepEqual(pick(kg('見本米 定期便 3回 5kg×2袋')), [30, '5kg×2袋・定期便3回', 3]);
  assert.equal(kg('【定期便】見本米 5kg'), null);
});

test('読めないもの・迷うものは出さない', () => {
  assert.equal(kg('見本米 5kg 10kg 選べる'), null); // 量がいくつも
  assert.equal(kg('見本の牛肉 1.5〜2kg'), null); // 幅がある
  assert.equal(kg('見本の鶏肉 もも2kg むね2kg'), null); // 別の物が同じ量（合計がわからない）
  assert.equal(kg('見本の干物セット 詰め合わせ'), null); // 量が書いていない
  assert.equal(kg(''), null);
  assert.deepEqual(pick(kg('見本の干物 12月1日〜12月25日発送 1kg')), [1, '1kg', 1]); // 日付の「〜」は幅ではない
});

test('量や回数をえらぶ返礼品は出さない（寄付額がどの量の額かわからない）', () => {
  assert.equal(kg('見本米 5kg / 10kg / 20kg'), null);
  assert.equal(kg('見本米 選べる容量 5kg 10kg'), null);
  assert.equal(kg('見本の牛肉【内容量＆発送時期が選べる！】1kg'), null);
  assert.equal(kg('見本の牛肉 切り落とし (500g or 1kg)'), null);
  assert.equal(kg('見本の鮭 約1kg・約2kg'), null);
  assert.equal(kg('見本のしらす 600g～'), null); // 下だけ書いた量
  assert.equal(kg('見本のかに 総重量 700g〜1.3kg'), null);
  assert.equal(kg('見本米 5kg 定期便 3回 6回 12回'), null);
  assert.equal(kg('見本米 5kg 単品・定期便から選べる'), null);
  assert.equal(kg('見本のしらす 最大2kg'), null);
  assert.deepEqual(pick(kg('見本の鮭 約2kg 発送時期が選べる')), [2, '2kg', 1]); // 発送の時期だけえらぶのはよい
  assert.equal(readAmount('見本のトイレットペーパー 24ロールor64ロールor72ロール', 'ロール'), null);
  assert.equal(readAmount('見本のトイレットペーパー 選べるロール数 16・32・64 ロール', 'ロール'), null);
  assert.equal(readAmount('見本のティッシュ 50箱 選べる組数 200組 / 150組', '箱'), null);
  assert.equal(readAmount('見本のティッシュ 15箱 ＆ トイレットペーパー 48ロール セット', '箱'), null); // ほかの物とのセット
});

test('日用品：長巻きはふつうのロールの数に。1箱あたりの組数は数えない', () => {
  assert.deepEqual(pick(readAmount('見本のトイレットペーパー 3倍長持ち 4ロール(ダブル)×12パック', 'ロール')), [144, '4ロール(ダブル)×12パック・3倍巻き', 1]);
  assert.deepEqual(pick(readAmount('見本のトイレットペーパー 48ロール 163ロール相当 3.4倍巻', 'ロール')), [163, '163ロール相当', 1]);
  assert.deepEqual(pick(readAmount('見本のティッシュ 60箱(1箱220組(440枚))(5個入り×12セット)', '箱')), [60, '60箱', 1]);
});

test('日用品：ロールと箱', () => {
  assert.deepEqual(pick(readAmount('見本のトイレットペーパー 12ロール×8パック ダブル', 'ロール')), [96, '12ロール×8パック', 1]);
  assert.deepEqual(pick(readAmount('見本のトイレットペーパー 96ロール(12R×8)', 'ロール')), [96, '12R×8', 1]);
  assert.deepEqual(pick(readAmount('見本のティッシュ 5箱×12パック', '箱')), [60, '5箱×12パック', 1]);
  assert.deepEqual(pick(readAmount('見本のティッシュ 5箱入×12', '箱')), [60, '5箱入×12', 1]);
  assert.equal(readAmount('見本のトイレットペーパー 100m', 'ロール'), null);
});

test('1万円あたり・届く時期', () => {
  assert.equal(perMan(15, 30000), 5);
  assert.equal(perMan(1, 0), 0);
  assert.equal(whenOf('見本米 5kg 1月上旬から順次発送'), '1月上旬から順次発送');
  assert.equal(whenOf('見本のいくら 30日以内に発送'), '30日以内に発送');
  assert.equal(whenOf('見本のかに 年内配送'), '年内配送');
  assert.equal(whenOf('見本米 5kg'), '');
  assert.equal(hrNormalize('５ｋｇ×２'), '5kg×2');
});

test('ページに出す形：ふるさと納税の店だけ・同じ商品は1つ・1万円あたりが多い順。はじめての1件', () => {
  const base = { url: '#', img: '', shop: '見本町', rating: 4.5 };
  const items = [
    { ...base, code: 'a', name: '見本米 5kg', price: 12000, shopCode: 'f000001-mihon', reviews: 30 },
    { ...base, code: 'b', name: '見本米 10kg 1月発送', price: 18000, shopCode: 'f000002-mihon', reviews: 50 },
    { ...base, code: 'b', name: '見本米 10kg 1月発送', price: 18000, shopCode: 'f000002-mihon', reviews: 50 },
    { ...base, code: 'c', name: '見本米 20kg', price: 30000, shopCode: 'f000003-mihon', reviews: 80 },
    { ...base, code: 'd', name: '見本米 5kg', price: 3000, shopCode: 'mihon-shop', reviews: 5 }, // ふるさと納税の店でない
    { ...base, code: 'e', name: '見本米 詰め合わせ', price: 10000, shopCode: 'f000004-mihon', reviews: 9 },
    { ...base, code: 'f', name: '【定期便】見本米 10kg 全3回', price: 40000, shopCode: 'f000005-mihon', reviews: 40 },
  ];
  const list = hrPrepare(items, 'kg');
  assert.deepEqual(list.map((x) => x.code), ['f', 'c', 'b', 'a']);
  assert.equal(Math.round(list[0].per * 100) / 100, 7.5);
  assert.equal(firstPick(list).code, 'b'); // 2万円まで・定期便でない・レビュー10件以上で、届く時期が書いてあるもの
  assert.equal(firstPick([]), null);
});

test('一覧の数字のまとめ（件数・1万円あたりの幅とまん中・定期便・2万円まで）', () => {
  const base = { url: '#', img: '', shop: '見本町', rating: 4.5, reviews: 20 };
  const items = [
    { ...base, code: 'a', name: '見本米 無洗米 5kg', price: 12000, shopCode: 'f000001-mihon' },
    { ...base, code: 'b', name: '見本米 10kg 1月発送', price: 18000, shopCode: 'f000002-mihon' },
    { ...base, code: 'c', name: '見本米 玄米 20kg', price: 30000, shopCode: 'f000003-mihon' },
    { ...base, code: 'f', name: '【定期便】見本米 10kg 全3回', price: 40000, shopCode: 'f000005-mihon' },
  ];
  const st = hrStats(hrPrepare(items, 'kg'));
  // 1万円あたり：f 7.5・c 6.67・b 5.56・a 4.17 → まん中は (6.67 + 5.56) ÷ 2
  assert.equal(st.count, 4);
  assert.equal(Math.round(st.min * 100) / 100, 4.17);
  assert.equal(Math.round(st.max * 100) / 100, 7.5);
  assert.equal(Math.round(st.median * 100) / 100, 6.11);
  assert.equal(st.teiki, 1);
  assert.equal(st.when, 1);
  assert.equal(st.under2, 2);
  assert.equal(Math.round(st.under2Max * 100) / 100, 5.56);
  assert.equal(st.minPrice, 12000);
  assert.equal(st.maxPrice, 40000);
  assert.equal(st.musen, 1);
  assert.equal(st.genmai, 1);
  assert.equal(hrStats([]), null);
});
