// スワップポイントの目安に使う数字（各国の中央銀行の政策金利と、参考のレート）
// 毎月1日、予約タスク「サクッと計算 スワップの金利の更新（Claude）」が中央銀行のページで確かめて、変わっていれば直す（日付も）
// ページの表と出典のリンクは、ここから作る

/** 金利を確かめた日 */
export const FX_RATES_CHECKED = '2026-10-19';

/**
 * 政策金利（％）。rate：いまの金利　since：その金利に決めた日（発表の日）　bank：中央銀行の名前　url：出典
 * アメリカは誘導目標の幅のまん中（3.75〜4.00％ → 3.875）、ユーロ圏は預金ファシリティ金利
 * 南アフリカは 10/19 に公式のページが開けなかったので、報道（Reuters など）で確かめた
 */
export const POLICY_RATES = {
  JPY: { rate: 1.25, since: '2026-09-18', bank: '日本銀行', url: 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf' },
  USD: { rate: 3.875, since: '2026-09-16', bank: 'FRB', url: 'https://www.federalreserve.gov/monetarypolicy/openmarket.htm' },
  EUR: { rate: 2.5, since: '2026-09-10', bank: '欧州中央銀行', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html' },
  GBP: { rate: 3.75, since: '2025-12-18', bank: 'イングランド銀行', url: 'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp' },
  AUD: { rate: 4.6, since: '2026-09-29', bank: 'オーストラリア準備銀行', url: 'https://www.rba.gov.au/' },
  NZD: { rate: 2.75, since: '2026-09-02', bank: 'ニュージーランド準備銀行', url: 'https://www.rbnz.govt.nz/monetary-policy/about-monetary-policy/the-official-cash-rate' },
  CAD: { rate: 2.25, since: '2025-10-29', bank: 'カナダ銀行', url: 'https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/' },
  CHF: { rate: 0, since: '2025-06-19', bank: 'スイス国立銀行', url: 'https://www.snb.ch/en/the-snb/mandates-goals/statistics/statistics-pub/current_interest_exchange_rates' },
  ZAR: { rate: 7.25, since: '2026-09-23', bank: '南アフリカ準備銀行', url: 'https://www.resbank.co.za/' },
  MXN: { rate: 6.5, since: '2026-05-07', bank: 'メキシコ銀行', url: 'https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?sector=18&accion=consultarCuadro&idCuadro=CF101&locale=en' },
  TRY: { rate: 37, since: '2026-01-22', bank: 'トルコ中央銀行', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/EN/TCMB+EN/Main+Menu/Core+Functions/Monetary+Policy/Central+Bank+Interest+Rates/1+Week+Repo' },
};

/** 参考のレート（1通貨＝何円）。欧州中央銀行の参照レートから円の通貨ペアを出したもの */
export const FX_SPOT_DATE = '2026-10-16';
export const FX_SPOT_URL = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';
// 1ユーロあたり JPY 177.82・USD 1.1253・GBP 0.84385・AUD 1.6171・NZD 1.9868・CAD 1.5935・CHF 0.9272・ZAR 18.4930・MXN 20.6871・TRY 55.7328
export const FX_SPOT = {
  usdjpy: 158.02,
  eurjpy: 177.82,
  gbpjpy: 210.72,
  audjpy: 109.96,
  nzdjpy: 89.5,
  cadjpy: 111.59,
  chfjpy: 191.78,
  zarjpy: 9.616,
  mxnjpy: 8.596,
  tryjpy: 3.191,
};
