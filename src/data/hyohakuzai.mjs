// 塩素系漂白剤で作る消毒液の数字と文。次亜塩素酸ナトリウムの薄め方のページ（src/pages/kishaku-uses.mjs）と、印刷用のPDF（src/prints.mjs）で使う
// 数字は出典のページでたしかめたもの（2026-10-17）。表の数字は tests/kishaku.test.mjs でも確かめる
import { dilute, ratioFromPercent } from '../lib/kishaku.mjs';

export const HYOHAKU_SRC = 6; // 漂白剤の濃度（％）。花王のハイターとキッチンハイターは作ったときに6％
export const HYOHAKU_CAP = 25; // ハイターのキャップ1杯（ml）

// 作る濃度と使いみちの例（ノロウイルスの対策）
export const HYOHAKU_TARGETS = [
  { pct: '0.02', ppm: '200ppm', use: '調理器具・ドアノブ・便座' },
  { pct: '0.05', ppm: '500ppm', use: 'テーブル・ドアノブ' },
  { pct: '0.1', ppm: '1000ppm', use: '吐いたもの・便の処理' },
];

export const HYOHAKU_CAUTIONS = [
  '手や指など、体には使わない',
  '酸性の洗剤などとまぜない',
  'スプレーで吹きかけない',
  '換気をする',
  '薄めた液は使うたびに作り、使い切る',
];

export const HYOHAKU_AMOUNT_SOURCES = [
  ['厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/kanren/yobou/040204-1.html'],
  ['目黒区', 'https://www.city.meguro.tokyo.jp/smph/kurashi/hoken_eisei/shinryo/yobo/jiaensosannatoriumuekinotukurika.html'],
];
export const HYOHAKU_CAUTION_SOURCES = [
  ['厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/syoudoku_00001.html'],
  ['花王', 'https://www.kao.com/jp/qa/detail/18916/'],
];

/** 水 water（ml）に入れる漂白剤の量（ml）。漂白剤は HYOHAKU_SRC ％ */
export const hyohakuAmount = (pct, water) =>
  dilute({ ratio: ratioFromPercent(HYOHAKU_SRC, Number(pct)).ratio, amount: water, from: 'water' }).concentrate;
