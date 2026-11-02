// スワップポイントの目安に使う数字（各国の中央銀行の政策金利と、参考のレート）
// 毎月1日、予約タスク「サクッと計算 スワップの金利の更新（Claude）」が中央銀行のページで確かめて、変わっていれば直す（日付も）
// ページの表と出典のリンクは、ここから作る

/** 金利を確かめた日 */
export const FX_RATES_CHECKED = '2026-11-02';

/**
 * 政策金利（％）。rate：いまの金利　since：その金利に決めた日（発表の日）　bank：中央銀行の名前　url：出典
 * アメリカは誘導目標の幅のまん中（3.75〜4.00％ → 3.875）、ユーロ圏は預金ファシリティ金利
 * 南アフリカは 10/19 に公式のページが開けなかったので、報道（Reuters など）で確かめた
 * 11/2：カナダ（10/28 利上げ）・トルコ（10/22 利下げ）は公式の発表で確かめた。ほかは 10/19 のあとの会合で据え置き、または会合なし（報道で確かめた）
 */
export const POLICY_RATES = {
  JPY: { rate: 1.25, since: '2026-09-18', bank: '日本銀行', url: 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf' },
  USD: { rate: 3.875, since: '2026-09-16', bank: 'FRB', url: 'https://www.federalreserve.gov/monetarypolicy/openmarket.htm' },
  EUR: { rate: 2.5, since: '2026-09-10', bank: '欧州中央銀行', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html' },
  GBP: { rate: 3.75, since: '2025-12-18', bank: 'イングランド銀行', url: 'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp' },
  AUD: { rate: 4.6, since: '2026-09-29', bank: 'オーストラリア準備銀行', url: 'https://www.rba.gov.au/' },
  NZD: { rate: 2.75, since: '2026-09-02', bank: 'ニュージーランド準備銀行', url: 'https://www.rbnz.govt.nz/monetary-policy/about-monetary-policy/the-official-cash-rate' },
  CAD: { rate: 2.5, since: '2026-10-28', bank: 'カナダ銀行', url: 'https://www.bankofcanada.ca/2026/10/fad-press-release-2026-10-28/' },
  CHF: { rate: 0, since: '2025-06-19', bank: 'スイス国立銀行', url: 'https://www.snb.ch/en/the-snb/mandates-goals/statistics/statistics-pub/current_interest_exchange_rates' },
  ZAR: { rate: 7.25, since: '2026-09-23', bank: '南アフリカ準備銀行', url: 'https://www.resbank.co.za/' },
  MXN: { rate: 6.5, since: '2026-05-07', bank: 'メキシコ銀行', url: 'https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?sector=18&accion=consultarCuadro&idCuadro=CF101&locale=en' },
  TRY: { rate: 36, since: '2026-10-22', bank: 'トルコ中央銀行', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/en/tcmb+en/main+menu/announcements/press+releases/2026/ano2026-45' },
};

/** 参考のレート（1通貨＝何円）。欧州中央銀行の参照レートから円の通貨ペアを出したもの */
export const FX_SPOT_DATE = '2026-10-30';
export const FX_SPOT_URL = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';
// 1ユーロあたり JPY 175.68・USD 1.1172・GBP 0.83380・AUD 1.5904・NZD 1.9823・CAD 1.5606・CHF 0.9194・ZAR 18.6455・MXN 21.1237・TRY 55.8015
export const FX_SPOT = {
  usdjpy: 157.25,
  eurjpy: 175.68,
  gbpjpy: 210.7,
  audjpy: 110.46,
  nzdjpy: 88.62,
  cadjpy: 112.57,
  chfjpy: 191.08,
  zarjpy: 9.422,
  mxnjpy: 8.317,
  tryjpy: 3.148,
};
