// 塩分濃度の計算に使う数字（出典つき。10/21 にメーカー・役所・大学のページで確かめた）
// 塩のスプーンの重さ：サラサラした塩（食塩・精製塩）は小さじ1＝6g・大さじ1＝18g、しっとりした塩（並塩）は5g・15g（塩事業センター。女子栄養大学の重量表も同じ）
export const ENBUN_SPOON = {
  tsp: 6,
  tbsp: 18,
  moist: { tsp: 5, tbsp: 15 },
  src: '塩事業センター',
  url: 'https://www.shiojigyo.com/recipe/tips/other/',
};

// 用途のマス（濃度は、水や食材の重さに対する塩の割合）。range は出典に書いてある言い方、base は何の重さに対してか
export const ENBUN_USES = [
  { short: '浅漬け', pct: 2, name: '浅漬け・塩もみ', range: '野菜の重さの1〜2％', base: '野菜', src: '伯方塩業', url: 'https://www.hakatanoshio.co.jp/salt/cooking/' },
  { short: 'パスタ', pct: 1, name: 'パスタのゆで汁', range: '水1Lに塩5〜10g（0.5〜1％）', base: '水', src: '日本パスタ協会', url: 'https://www.pasta.or.jp/knowledge/boil.html' },
  { short: '砂抜き', pct: 3, name: 'あさりの砂抜き', range: '海水くらい（約3％）', base: '水', src: '愛知県', url: 'https://www.pref.aichi.jp/shokuiku/shokuikunet/mind/recipe/recipe041.html' },
  { short: '梅干し', pct: 18, name: '梅干し', range: '梅の重さの18％', base: '梅', src: '神奈川県', url: 'https://www.pref.kanagawa.jp/docs/cf7/cnt/f450009/p593800.html' },
];

// ほかの出典（よくある質問で使う）
export const ENBUN_MORE = {
  kikkoman: { name: 'キッコーマン', url: 'https://www.kikkoman.co.jp/homecook/basic/seafood/shellfish.html' }, // あさりは2％くらい（3％だと塩味がつく）
  nisshin: { name: '日清製粉ウェルナ', url: 'https://www.nisshin-seifun-welna.com/index/customer/faq/product06.html' }, // 水1Lに塩小さじ1（5g）
  kochi: { name: '高知県', url: 'https://www.nogyo.tosa.pref.kochi.lg.jp/info/dtl.php?ID=5251' }, // 梅干し15％・20％
  eiyo: { name: '女子栄養大学', url: 'https://www.eiyo.ac.jp/yokushiru/2133/' }, // 調味パーセントは材料に対する割合
  sea: { name: '塩事業センター', url: 'https://www.shiojigyo.com/siohyakka/experiment/exp12.html' }, // 海水の塩類は約3.5％、うち食塩は約2.7％
};
