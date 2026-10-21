import { fix } from './number.mjs';

// 家電の電気代（ブラウザとテストの両方で使う）
// 電気代 ＝ 消費電力（kW）× 使う時間 × 1kWhあたりの単価。1か月は30日、1年は365日で計算する
// 単価のはじめの値と、家電のマスの消費電力の目安は src/data/denki.mjs（出典つき）

export const DENKI_MAX_WATT = 20000;
export const DENKI_MAX_PRICE = 200;

/**
 * 電気代
 * @param {{watt:number|null, hours:number|null, price:number|null}} p  watt：消費電力（W）　hours：1日に使う時間　price：1kWhあたりの単価（円）
 * @returns hour：1時間の電気代　hours が空のときは hour だけ（day・month・year は null）
 */
export function denki({ watt, hours, price }) {
  if (watt === null) return { ok: false, empty: true, missing: 'watt' };
  if (Number.isNaN(watt) || watt <= 0) return { ok: false, error: '消費電力は、0より大きい数字で入れてください。', field: 'watt' };
  if (watt > DENKI_MAX_WATT) return { ok: false, error: `消費電力は、${DENKI_MAX_WATT.toLocaleString('ja-JP')}Wまでです。`, field: 'watt' };
  if (price === null) return { ok: false, empty: true, missing: 'price' };
  if (Number.isNaN(price) || price <= 0) return { ok: false, error: '単価は、0より大きい数字で入れてください。', field: 'price' };
  if (price > DENKI_MAX_PRICE) return { ok: false, error: `単価は、1kWh${DENKI_MAX_PRICE}円までです。`, field: 'price' };
  const kw = watt / 1000;
  const hour = fix(kw * price);
  if (hours === null) return { ok: true, watt, price, hour, hours: null, day: null, month: null, year: null, kwhMonth: null };
  if (Number.isNaN(hours) || hours < 0) return { ok: false, error: '1日の時間は、0以上の数字で入れてください。', field: 'hours' };
  if (hours > 24) return { ok: false, error: '1日の時間は、24時間までです。', field: 'hours' };
  const day = fix(hour * hours);
  return { ok: true, watt, price, hour, hours, day, month: fix(day * 30), year: fix(day * 365), kwhMonth: fix(kw * hours * 30) };
}
