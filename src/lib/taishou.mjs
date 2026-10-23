// 買いまわりの1店舗の判定（お買い物マラソン・楽天スーパーSALE）。DOM は触らない
// 決まり（楽天市場のヘルプとガイド。2026-10-23 確認）：1店舗は税込1,000円以上。クーポンのあと・送料とラッピング料をのぞいた額で、ポイントで払う分は入れる。同じ店の買い物は合計
// 店の種類：ふつうの店・楽天ブックスは数える。楽天ふるさと納税（2025年10月1日から）と金券類は数えない（金券類は同じ注文のほかの商品も）
// 予約商品で数えるのは、事前告知の予約アイテム・楽天モバイル契約者の先行セール・楽天ブックスとKoboの予約・Rakuten Fashion の予約。定期購入・頒布会は期間中に申し込んだ初回のお届けだけ

export const COUNT_KINDS = ['normal', 'books', 'furusato', 'yoyaku', 'teiki', 'kinken'];

/**
 * @param {{ kind:string, price:number|null, coupon:number|null }} p  price：商品の合計（税込・送料のぞく）　coupon：クーポンの値引き
 * @param {number} minYen  1店舗の最低金額（src/data/point.mjs の POINT_MIN_YEN）
 */
export function countJudge({ kind = 'normal', price, coupon }, minYen) {
  const never = kind === 'furusato' || kind === 'kinken';
  if (price === null || price === undefined) return never ? { ok: true, status: 'no', kind, judge: null } : { ok: false, empty: true, missing: 'price', kind };
  if (Number.isNaN(price) || price <= 0) return { ok: false, error: '商品の値段は0より大きい数にしてください。', field: 'price', kind };
  if (price > 100000000) return { ok: false, error: '商品の値段は1億円までにしてください。', field: 'price', kind };
  const off = coupon === null || coupon === undefined ? 0 : coupon;
  if (Number.isNaN(off) || off < 0) return { ok: false, error: 'クーポンの値引きは0以上の数にしてください。', field: 'coupon', kind };
  if (off > price) return { ok: false, error: 'クーポンの値引きが商品の値段より大きいです。', field: 'coupon', kind };
  const judge = Math.round((price - off) * 100) / 100;
  const enough = judge >= minYen;
  // yes：数える　no：数えない　first：初回のお届けだけ数える（定期購入・頒布会）　maybe：数える予約商品かどうかで決まる
  const status = never || !enough ? 'no' : kind === 'teiki' ? 'first' : kind === 'yoyaku' ? 'maybe' : 'yes';
  return { ok: true, kind, price, coupon: off, judge, enough, status, short: enough ? 0 : Math.ceil(minYen - judge) };
}
