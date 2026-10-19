// スワップポイントの目安に使う数字（各国の中央銀行の政策金利と、参考のレート）
// 毎月、予約タスクが中央銀行のページで確かめて、変わっていれば直す（直したら CHECKED と RATES_SOURCE の日付も）
// ページの表と出典のリンクは、ここから作る

/** 金利を確かめた日 */
export const FX_RATES_CHECKED = 'TODO';

/**
 * 政策金利（％）。rate：いまの金利　since：その金利になった日　bank：中央銀行の名前　url：出典
 * アメリカは誘導目標の幅のまん中、ユーロ圏は預金ファシリティ金利
 */
export const POLICY_RATES = {
  JPY: { rate: 0, since: 'TODO', bank: '日本銀行', url: 'TODO' },
  USD: { rate: 0, since: 'TODO', bank: 'FRB', url: 'TODO' },
  EUR: { rate: 0, since: 'TODO', bank: '欧州中央銀行', url: 'TODO' },
  GBP: { rate: 0, since: 'TODO', bank: 'イングランド銀行', url: 'TODO' },
  AUD: { rate: 0, since: 'TODO', bank: 'オーストラリア準備銀行', url: 'TODO' },
  NZD: { rate: 0, since: 'TODO', bank: 'ニュージーランド準備銀行', url: 'TODO' },
  CAD: { rate: 0, since: 'TODO', bank: 'カナダ銀行', url: 'TODO' },
  CHF: { rate: 0, since: 'TODO', bank: 'スイス国立銀行', url: 'TODO' },
  ZAR: { rate: 0, since: 'TODO', bank: '南アフリカ準備銀行', url: 'TODO' },
  MXN: { rate: 0, since: 'TODO', bank: 'メキシコ銀行', url: 'TODO' },
  TRY: { rate: 0, since: 'TODO', bank: 'トルコ中央銀行', url: 'TODO' },
};

/** 参考のレート（1通貨＝何円）。欧州中央銀行の参照レートから円の通貨ペアを出したもの */
export const FX_SPOT_DATE = 'TODO';
export const FX_SPOT_URL = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';
export const FX_SPOT = {
  usdjpy: 150,
  eurjpy: 165,
  gbpjpy: 195,
  audjpy: 98,
  nzdjpy: 88,
  cadjpy: 108,
  chfjpy: 185,
  zarjpy: 8.5,
  mxnjpy: 8,
  tryjpy: 4,
};
