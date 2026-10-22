// お買い物マラソン・スーパーSALE の買いまわりのポイント（目安）。ブラウザとテストの両方で使う。DOM は触らない
// 決まり（楽天市場のガイドのページ・2026-10-22 確認）：1ショップ1,000円（税込）以上で1ショップ。10ショップで通常1倍＋特典9倍。
//   ポイントは税抜の金額にかかる。特典は回ごとの上限まで（期間限定ポイント）
// 計算：税抜 ＝ 税込 × 10 ÷ 11（1円未満は切り捨て）、通常ポイント ＝ 税抜の1%（切り捨て）、特典 ＝ 通常ポイント ×（ショップの数 − 1）
//   実際は注文ごとに計算するので、少しずれることがある（ページに「目安」と書く）

export const POINT_TOTAL_MAX = 100000000; // 1億円まで

/** 税込 → 税抜（消費税10%として。1円未満は切り捨て） */
export const zeinukiOf = (total) => Math.floor((Math.round(total) * 10) / 11);

/** 税抜から通常ポイント（1%・切り捨て） */
const baseOf = (zeinuki) => Math.floor(zeinuki / 100);

/** 特典が上限に届く合計（税込）。ショップが1つのときは null */
export function pointReach(shops, cap) {
  if (shops < 2) return null;
  const base = Math.ceil(cap / (shops - 1)); // 通常ポイントがこれだけあれば届く
  return Math.ceil((base * 100 * 11) / 10);
}

/** 特典（上限まで）だけ */
const bonusOf = (total, shops, cap) => Math.min(cap, baseOf(zeinukiOf(total)) * (shops - 1));

/**
 * @param {{ total:number|null, shops:number|null, cap:number, minYen:number, maxShops:number }} p
 */
export function marathonPoints({ total, shops, cap, minYen = 1000, maxShops = 10 }) {
  if (total === null || total === undefined) return { ok: false, empty: true, missing: 'total' };
  if (Number.isNaN(total)) return { ok: false, error: '合計は数字で入れてください。', field: 'total' };
  if (total <= 0) return { ok: false, error: '合計は0より大きい数にしてください。', field: 'total' };
  if (total > POINT_TOTAL_MAX) return { ok: false, error: '合計は1億円までにしてください。', field: 'total' };
  if (shops === null || shops === undefined) return { ok: false, empty: true, missing: 'shops' };
  if (!Number.isInteger(shops) || shops < 1) return { ok: false, error: '店舗の数は1以上の整数で入れてください。', field: 'shops' };
  if (shops > 99) return { ok: false, error: '店舗の数は99までにしてください。', field: 'shops' };
  if (total < minYen * shops) return { ok: false, error: `${shops}店舗なら、合計は${(minYen * shops).toLocaleString('ja-JP')}円以上です。`, field: 'total', short: true };
  const counted = Math.min(shops, maxShops); // 上限の倍率をこえたショップは数えない
  const zeinuki = zeinukiOf(total);
  const base = baseOf(zeinuki);
  const raw = base * (counted - 1);
  const bonus = Math.min(cap, raw);
  const reach = pointReach(counted, cap);
  // あと1ショップ（いちばん少ない1,000円）ふやしたとき
  const next = counted < maxShops ? bonusOf(total + minYen, counted + 1, cap) - bonus : 0;
  return {
    ok: true,
    total,
    shops,
    counted,
    rate: counted, // 通常1倍＋特典（counted − 1）倍
    zeinuki,
    base,
    bonus,
    capped: raw >= cap,
    left: cap - bonus,
    reach,
    next,
    all: base + bonus,
  };
}
