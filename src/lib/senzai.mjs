import { fix } from './number.mjs';

// 洗濯洗剤の量（ブラウザとテストの両方で使う）
// 1回の量 ＝ 水の量 ÷ 表示の水 × 表示の洗剤（ボトルの「水30Lに10mL」）
// メーカーが水量ごとの表を出している洗剤（table）は、表の水量のうち近いものの量（同じ近さなら多いほう。花王「40Lなら45Lの目安」）
// 表のいちばん多い水量をこえたら、そこからは割合で。キャップ1杯の量（cap）がわかる洗剤だけ、キャップ何杯（0.1杯単位）
// 値段と内容量を入れると、1回いくら（値段 × 1回の量 ÷ 内容量）と1本で何回（内容量 ÷ 1回の量の切り捨て）。液体洗剤は 1g ≒ 1mL として同じ数でわる

export const SENZAI_MAX_WATER = 200;
export const SENZAI_MAX_AMOUNT = 1000;

/** 表の水量のうち、いちばん近いものの量（同じ近さなら多いほう）。表の上より多い水は割合で */
export function tableAmount(table, water) {
  const [lastW, lastA] = table[table.length - 1];
  if (water > lastW) return fix((lastA * water) / lastW);
  let best = table[0];
  for (const row of table) if (Math.abs(row[0] - water) <= Math.abs(best[0] - water)) best = row;
  return best[1];
}

/**
 * @param {{baseWater:number|null, baseAmount:number|null, water:number|null, price?:number|null, content?:number|null, table?:number[][]|null, cap?:number|null}} p
 *   baseWater・baseAmount：ボトルの表示（水◯Lに◯mL）　water：洗濯の水の量（L）　price：1本の値段（円）　content：内容量（g か mL）
 */
export function senzai({ baseWater, baseAmount, water, price = null, content = null, table = null, cap = null }) {
  if (baseWater === null || baseAmount === null) return { ok: false, empty: true, missing: 'base' };
  if (Number.isNaN(baseWater) || baseWater <= 0 || baseWater > SENZAI_MAX_WATER) return { ok: false, error: `表示の水は、0より大きく${SENZAI_MAX_WATER}Lまでの数字で入れてください。`, field: 'base-water' };
  if (Number.isNaN(baseAmount) || baseAmount <= 0 || baseAmount > SENZAI_MAX_AMOUNT) return { ok: false, error: `表示の洗剤は、0より大きく${SENZAI_MAX_AMOUNT}mLまでで入れてください。`, field: 'base-amount' };
  if (water === null) return { ok: false, empty: true, missing: 'water' };
  if (Number.isNaN(water) || water <= 0 || water > SENZAI_MAX_WATER) return { ok: false, error: `水の量は、0より大きく${SENZAI_MAX_WATER}Lまでの数字で入れてください。`, field: 'water' };
  const amount = table ? tableAmount(table, water) : fix((water * baseAmount) / baseWater);
  const res = { ok: true, water, amount, caps: cap ? Math.round((amount / cap) * 10) / 10 : null, perWash: null, washes: null };
  if (price !== null && !Number.isNaN(price) && price > 0 && content !== null && !Number.isNaN(content) && content > 0) {
    res.perWash = fix((price * amount) / content);
    res.washes = Math.floor(fix(content / amount));
  }
  return res;
}
