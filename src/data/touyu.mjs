// 灯油代の計算に使う数字（出典つき。10/21 にメーカー・資源エネルギー庁のページで確かめた）

// 灯油の値段のはじめの値：資源エネルギー庁「石油製品価格調査」の灯油の店頭価格（全国平均・18L・税込）
// 10月13日調査（10月15日公表）の2,563円。公表の Word と Excel はこの作業環境では開けなかったので、
// 同じ調査をのせている oil-stat.com・エネカルテで数字をたしかめた（9月28日 2,538円・10月5日 2,553円・10月13日 2,563円）
// 調査は毎週（月曜調査・水曜公表）なので、値段は「はじめの値」として欄に入れ、自分の値段に書きかえられるようにする
export const TOUYU_PRICE = {
  can: 2563,
  date: '10月13日調査',
  src: '資源エネルギー庁の価格調査',
  url: 'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html',
};

// 暖房のマス：石油ファンヒーターの燃料消費量（1時間に使う灯油 L、最大〜最小）。ダイニチの2025年モデルの仕様のページの数字
// （FW-32S6・FW-42S6 は生産終了と書いてあるが、同じ大きさの機種の目安として使う）。マスは強（最大）の量、表は強〜弱
// short はマスの名前（木造の畳数）、model はダイニチの型番、cond は表に出す暖房のめやす
export const TOUYU_HEATERS = [
  { short: '9畳', model: 'FW-32S6', cond: '木造9畳・コンクリート12畳', max: 0.311, min: 0.072, url: 'https://www.dainichi-net.co.jp/products/fanheater/lineup/s2025/' },
  { short: '11畳', model: 'FW-42S6', cond: '木造11畳・コンクリート15畳', max: 0.408, min: 0.082, url: 'https://www.dainichi-net.co.jp/products/fanheater/lineup/s2025/' },
  { short: '15畳', model: 'FW-5625L', cond: '木造15畳・コンクリート20畳', max: 0.544, min: 0.12, url: 'https://www.dainichi-net.co.jp/products/fanheater/lineup/l2025/' },
  { short: '17畳', model: 'FW-66L5', cond: '木造17畳・コンクリート23畳', max: 0.642, min: 0.13, url: 'https://www.dainichi-net.co.jp/products/fanheater/lineup/l2025/' },
];
