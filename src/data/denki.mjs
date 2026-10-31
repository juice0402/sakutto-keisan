// 電気代の計算に使う数字（出典つき。10/21 にメーカー・電力会社・資源エネルギー庁のページで確かめた）
// 単価：全国家庭電気製品公正取引協議会の「新電力料金目安単価」31円/kWh（税込・2022年7月22日改定）。家電のカタログの電気代に使われる
// ※ 省エネ性能カタログと統一省エネラベルは、別の決め方の27円/kWh を使っている（このツールのはじめの値は31円）
export const DENKI_PRICE = {
  value: 31,
  src: '資源エネルギー庁',
  url: 'https://www.enecho.meti.go.jp/category/saving_and_new/saving/general/howto/',
};

// 家電の消費電力の目安（製品のラベル・仕様の数字）。tile: true は計算カードのマスにも出す（マスは2段×3つ）
// short はマスの名前（5文字まで）。cond は表に出す条件
export const DENKI_APPLIANCES = [
  { name: 'こたつ', short: 'こたつ', watt: 600, cond: '家具調・定格', tile: true, src: '山善', url: 'https://book.yamazen.co.jp/product/detail/I00008272' },
  { name: '電気毛布', short: '電気毛布', watt: 54, cond: 'しき毛布・定格', tile: true, src: 'パナソニック', url: 'https://panasonic.jp/danbo/products/DB-U12T/spec.html' },
  { name: 'ホットカーペット', short: 'カーペット', watt: 710, cond: '3畳・定格', tile: true, src: 'パナソニック', url: 'https://panasonic.jp/danbo/products/DC-3NK/spec.html' },
  { name: 'セラミックヒーター', short: 'ヒーター', watt: 1170, cond: '強・50Hz', tile: true, src: 'パナソニック', url: 'https://panasonic.jp/danbo/products/DS-FS1200/spec.html' },
  { name: 'ドライヤー', short: 'ドライヤー', watt: 1200, cond: '', tile: true, src: 'パナソニック', url: 'https://panasonic.jp/hair/products/EH-NA0J/spec.html' },
  { name: 'テレビ', short: 'テレビ', watt: 150, cond: '43型の液晶', tile: true, src: 'パナソニック', url: 'https://panasonic.jp/viera/products/TV-43W90A/spec.html' },
  { name: 'オイルヒーター', watt: 1500, cond: 'いちばん強い段', src: 'デロンギ', url: 'https://www.delonghi.com/ja-jp/p/oiruhi%E3%83%BCta%E3%83%BC-rhj10f1015-dg-oiruhi%E3%83%BCta%E3%83%BC-da%E3%83%BCkugure%E3%83%BC/RHJ10F1015-DG.html?pid=0108776317' },
  { name: '電気ケトル', watt: 1300, cond: '0.8L', src: 'タイガー', url: 'https://www.tiger-corporation.com/ja/jpn/product/kettle-pot/pck-a1/' },
  { name: '電子レンジ', watt: 1400, cond: '消費電力。600Wは温める力', src: 'パナソニック', url: 'https://panasonic.jp/range/products/NE-FL1C/spec.html' },
];

// 家電別の電気代のページ（電気代の計算の下のページ）。マスは強さごとの消費電力（W）
// メーカーが「1時間の消費電力量（Wh）」を出しているもの（こたつ）はその数字、「1時間の電気代」だけのもの（電気毛布・ホットカーペット）は、
// その電気代を31円で割って出した目安の W（表と1時間の電気代はメーカーの表示と同じになる）。最大は製品の消費電力（ヒーターがずっとついたとき）
// product は出典の製品、url は仕様のページ。cond は表示の条件
export const DENKI_USES = [
  {
    slug: 'kotatsu', name: 'こたつ', hours: 8, product: '山善の家具調こたつ（GKR-HDN802H）', url: 'https://book.yamazen.co.jp/product/detail/I00008272',
    modes: [{ b: '強', watt: 180 }, { b: '弱', watt: 70 }, { b: '最大', watt: 600 }], basis: 'wh',
  },
  {
    slug: 'denki-moufu', name: '電気毛布', hours: 8, product: 'パナソニックの電気しき毛布（DB-U12T）', url: 'https://panasonic.jp/danbo/products/DB-U12T/spec.html',
    modes: [{ b: '強', watt: 32 }, { b: '目盛3', watt: 19 }, { b: '最大', watt: 54 }], basis: 'yen', cond: '室温10℃',
  },
  {
    slug: 'hot-carpet', name: 'ホットカーペット', hours: 8, product: 'パナソニックの3畳用（DC-3NK）', url: 'https://panasonic.jp/danbo/products/DC-3NK/spec.html',
    modes: [{ b: '高', watt: 471 }, { b: '中', watt: 335 }, { b: '最大', watt: 710 }], basis: 'yen', cond: '室温15℃',
  },
  {
    slug: 'ceramic-heater', name: 'セラミックヒーター', hours: 4, product: 'パナソニックのセラミックファンヒーター（DS-FS1200）', url: 'https://panasonic.jp/danbo/products/DS-FS1200/spec.html',
    modes: [{ b: '強', watt: 1170 }, { b: '弱', watt: 640 }], basis: 'w', cond: '50Hz',
  },
  {
    slug: 'oil-heater', name: 'オイルヒーター', hours: 8, product: 'デロンギのオイルヒーター（RHJ10F1015-DG）', url: 'https://www.delonghi.com/ja-jp/p/oiruhi%E3%83%BCta%E3%83%BC-rhj10f1015-dg-oiruhi%E3%83%BCta%E3%83%BC-da%E3%83%BCkugure%E3%83%BC/RHJ10F1015-DG.html?pid=0108776317',
    modes: [{ b: '強', watt: 1500 }, { b: '中', watt: 900 }, { b: '弱', watt: 600 }], basis: 'w',
  },
];
// 家電別のページの「メーカーの数字」の表・使う場面の例・まちがえやすいところの出典（10/31 #97 で確かめた）
// 電気毛布：パナソニックのしき毛布（DB-U12T）とかけしき毛布（DB-R31M）の仕様、取扱説明書（DB-U11T）の寝る前の使いかた
// ホットカーペット：パナソニックの1畳・2畳・3畳（DC-1NK・DC-2NK・DC-3NK）の仕様、NKシリーズの面積の切りかえ、UP LIFE の電気代の記事
// セラミックヒーター：パナソニックの DS-FS1200（50Hz・60Hz）と、ひとセンサーの DS-FZS1200（在室45分・不在15分の試験）、UP LIFE の節約の記事
// オイルヒーター：デロンギのよくある質問（1500W・1200Wタイプの1時間の電気代）と製品ページ（サーモスタット・タイマー）
// こたつ：山善の家具調こたつ（GKR-HDN802H）の製品ページと、GKR-802H の取扱説明書（測定の条件・強と弱のちがい・上手な使いかた）
export const DENKI_CHECKED = '2026-10-31';
export const DENKI_MAKER = {
  moufuShiki: { name: 'パナソニック DB-U12T', url: 'https://panasonic.jp/danbo/products/DB-U12T/spec.html' },
  moufuKake: { name: 'パナソニック DB-R31M', url: 'https://panasonic.jp/danbo/products/DB-R31M/spec.html' },
  moufuManual: { name: 'パナソニック DB-U11T の取扱説明書', url: 'https://panasonic.jp/manualdl/p-db/db/db-u11t_01.pdf' },
  carpet1: { name: 'DC-1NK', url: 'https://panasonic.jp/danbo/products/DC-1NK/spec.html' },
  carpet2: { name: 'DC-2NK', url: 'https://panasonic.jp/danbo/products/DC-2NK/spec.html' },
  carpet3: { name: 'DC-3NK', url: 'https://panasonic.jp/danbo/products/DC-3NK/spec.html' },
  carpetSeries: { name: 'NKシリーズ', url: 'https://panasonic.jp/danbo/DC-NK.html' },
  carpetUpLife: { name: 'パナソニック UP LIFE', url: 'https://panasonic.jp/life/housework/100166.html' },
  ceramicFs: { name: 'パナソニック DS-FS1200', url: 'https://panasonic.jp/danbo/products/DS-FS1200/spec.html' },
  ceramicFzs: { name: 'DS-FZS1200', url: 'https://panasonic.jp/danbo/products/DS-FZS1200/feature.html' },
  ceramicUpLife: { name: 'パナソニック UP LIFE', url: 'https://panasonic.jp/life/air/170094.html' },
  oilFaq: { name: 'デロンギのよくある質問', url: 'https://www.delonghi.com/ja-jp/faqs/%E3%81%94%E8%B3%BC%E5%85%A5%E5%89%8D%E3%81%AE%E3%82%88%E3%81%8F%E3%81%82%E3%82%8B%E3%81%94%E8%B3%AA%E5%95%8F/a/253341' },
  oilProduct: { name: 'デロンギ RHJ10F1015-DG', url: 'https://www.delonghi.com/ja-jp/p/oiruhi%E3%83%BCta%E3%83%BC-rhj10f1015-dg-oiruhi%E3%83%BCta%E3%83%BC-da%E3%83%BCkugure%E3%83%BC/RHJ10F1015-DG.html?pid=0108776317' },
  kotatsuHdn: { name: '山善 GKR-HDN802H', url: 'https://book.yamazen.co.jp/product/detail/I00008272' },
  kotatsuManual: { name: '山善 GKR-802H の取扱説明書', url: 'https://book.yamazen.co.jp/downloads/W7N2823PGKR-802H/?mode=view' },
};

// ほかの出典（よくある質問で使う）
export const DENKI_MORE = {
  nitoriKotatsu: { name: 'ニトリ', url: 'https://www.nitori-net.jp/ec/product/5692266/' },
  delonghiFaq: { name: 'デロンギ', url: 'https://www.delonghi.com/ja-jp/faqs/%E3%81%94%E8%B3%BC%E5%85%A5%E5%89%8D%E3%81%AE%E3%82%88%E3%81%8F%E3%81%82%E3%82%8B%E3%81%94%E8%B3%AA%E5%95%8F/a/253341' },
  aircon: { name: 'パナソニック', url: 'https://panasonic.jp/aircon/products/CS-J226D/spec.html' },
};
