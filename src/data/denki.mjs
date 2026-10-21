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
