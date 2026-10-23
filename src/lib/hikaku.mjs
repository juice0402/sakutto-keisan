// 楽天とAmazonのポイント比較：同じ額を買ったときの Amazon のポイントの目安。DOM は触らない（楽天の分は src/lib/shikumi.mjs）
// Amazon の商品のポイント ＝ 税込 × 商品ページの%（商品ごとにちがうので、見た人が入れる）
// Amazon Mastercard ＝ 税込 × 1.5%（プライム会員は2%）。どちらも1ポイント未満は切り捨て
// Amazon のポイントアップのキャンペーン（プライムデーなど）は入れない（ページに書く）

/**
 * @param {{ total:number, pct:number|null, card:boolean, prime:boolean }} p  total は税込（数字であることは呼ぶ側で確かめる）
 * @param {{ prime:number, normal:number }} cardRate  src/data/amazon.mjs の AMAZON_CARD
 */
export function amazonPoints({ total, pct, card = false, prime = false }, cardRate) {
  const yen = Math.round(total);
  const item = pct ? Math.floor((yen * Math.round(pct * 100)) / 10000) : 0;
  const rate = card ? (prime ? cardRate.prime : cardRate.normal) : 0;
  const cardPts = Math.floor((yen * Math.round(rate * 10)) / 1000);
  return { item, card: cardPts, rate, points: item + cardPts };
}
