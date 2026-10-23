// Amazon のポイントの数字（楽天のポイントのしくみ・楽天とAmazonのくらべで使う）。Amazon と三井住友カードの公式のページで確かめたものだけ
// Amazon の商品のポイントは商品ごとにちがう（商品ページに「◯ポイント（◯%）」と出る）。Amazon Mastercard は Amazon.co.jp で使うとプライム会員2%・会員でない人1.5%
// 見張りは SPU と同じ（scripts/watch-pages.mjs spu）。確認日から90日でテストが止まる

export const AMAZON_CARD = { prime: 2, normal: 1.5 }; // Amazon Mastercard の Amazon.co.jp での還元率（%）

export const AMAZON_SOURCES = [
  { name: 'About Amazon「Amazonポイントの貯め方＆使い方」', url: 'https://www.aboutamazon.jp/news/guide/how-to-earn-and-use-amazon-points', checked: '2026-10-23', what: '商品ごとのポイント・Amazon Mastercard' },
  { name: '三井住友カード「Amazon Mastercard」', url: 'https://www.smbc-card.com/nyukai/affiliate/amazon/index.jsp', checked: '2026-10-23', what: 'Amazon Mastercard の還元率' },
];
