import { fix } from './number.mjs';

// 灯油代（ブラウザとテストの両方で使う）
// 灯油代 ＝ 1時間に使う灯油（L）× 1日に使う時間 × 1Lの値段。1か月は30日
// 値段は1Lでも18Lでも入れられる：500円以上は18L缶の値段として、18で割って1Lの値段にする（1Lが500円以上、18Lが500円未満になることはないので）
// 1時間に使う灯油のはじめの値（暖房のマス）と、値段のはじめの値は src/data/touyu.mjs（出典つき）

export const TOUYU_CAN = 18; // ポリタンク1つ（L）
export const TOUYU_CAN_PRICE = 500; // これ以上の値段は18Lの値段
export const TOUYU_MAX_LPH = 5;
export const TOUYU_MAX_PRICE = 20000;

/** 1Lの値段（18Lの値段なら18で割る） */
export const literPrice = (price) => (price >= TOUYU_CAN_PRICE ? fix(price / TOUYU_CAN) : price);

/**
 * 灯油代と、18Lが何日もつか
 * @param {{lph:number|null, hours:number|null, price:number|null}} p  lph：1時間に使う灯油（L）　hours：1日に使う時間　price：1Lか18Lの値段（円）
 * @returns hour：1時間の灯油代　canHours：18Lで何時間　hours が空のときは、この2つだけ（day・month・canDays などは null）
 */
export function touyu({ lph, hours, price }) {
  if (lph === null) return { ok: false, empty: true, missing: 'lph' };
  if (Number.isNaN(lph) || lph <= 0) return { ok: false, error: '1時間の灯油は、0より大きい数字で入れてください。', field: 'lph' };
  if (lph > TOUYU_MAX_LPH) return { ok: false, error: `1時間の灯油は、${TOUYU_MAX_LPH}Lまでです。`, field: 'lph' };
  if (price === null) return { ok: false, empty: true, missing: 'price' };
  if (Number.isNaN(price) || price <= 0) return { ok: false, error: '灯油の値段は、0より大きい数字で入れてください。', field: 'price' };
  if (price > TOUYU_MAX_PRICE) return { ok: false, error: `灯油の値段は、${TOUYU_MAX_PRICE.toLocaleString('ja-JP')}円までです。`, field: 'price' };
  const liter = literPrice(price);
  const base = { ok: true, lph, liter, can: price >= TOUYU_CAN_PRICE, hour: fix(lph * liter), canHours: fix(TOUYU_CAN / lph) };
  if (hours === null) return { ...base, hours: null, day: null, month: null, litersDay: null, litersMonth: null, canDays: null, cans: null };
  if (Number.isNaN(hours) || hours < 0) return { ok: false, error: '1日の時間は、0以上の数字で入れてください。', field: 'hours' };
  if (hours > 24) return { ok: false, error: '1日の時間は、24時間までです。', field: 'hours' };
  const litersDay = fix(lph * hours);
  const day = fix(base.hour * hours);
  return {
    ...base,
    hours,
    day,
    month: fix(day * 30),
    litersDay,
    litersMonth: fix(litersDay * 30),
    canDays: litersDay > 0 ? fix(TOUYU_CAN / litersDay) : null,
    cans: fix((litersDay * 30) / TOUYU_CAN),
  };
}
