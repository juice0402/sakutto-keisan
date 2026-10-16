import { fix, roundBy } from './number.mjs';

// 割引計算（ブラウザとテストの両方で使う）

/** 割引率（%）を「◯割◯分引き」に。小数第2位以下があるときは null */
export function wariLabel(rate) {
  if (!(rate > 0) || rate > 100) return null;
  const t = Math.round(rate * 10); // 0.1% 単位
  if (Math.abs(rate * 10 - t) > 1e-9) return null;
  if (t === 1000) return '10割引き（無料）';
  const wari = Math.floor(t / 100);
  const bu = Math.floor((t % 100) / 10);
  const rin = t % 10;
  const s = `${wari ? `${wari}割` : ''}${bu ? `${bu}分` : ''}${rin ? `${rin}厘` : ''}引き`;
  return t === 500 ? `${s}（半額）` : s;
}

/**
 * 値段から割引後の値段を出す。
 * rate2（さらに割引）は、1回目の割引後の値段にかける。丸めは1回ごと。
 * @returns {{ok:boolean, empty?:boolean, error?:string, steps?:Array, final?:number, off?:number, totalRate?:number}}
 */
export function calcDiscount({ price, rate, rate2 = null, rounding = 'floor' }) {
  if (price === null || rate === null) return { ok: false, empty: true };
  if (Number.isNaN(price) || price < 0) return { ok: false, error: '値段は0以上の数字で入れてください。' };
  if (Number.isNaN(rate) || rate < 0 || rate > 100) return { ok: false, error: '割引率は0〜100の数字で入れてください。' };
  if (rate2 !== null && (Number.isNaN(rate2) || rate2 < 0 || rate2 > 100))
    return { ok: false, error: '「さらに割引」は0〜100の数字で入れてください。' };

  const steps = [];
  let now = price;
  for (const r of rate2 === null ? [rate] : [rate, rate2]) {
    const raw = fix((now * (100 - r)) / 100);
    const after = roundBy(raw, rounding);
    steps.push({ rate: r, before: now, after, off: fix(now - after), rounded: raw !== after });
    now = after;
  }
  const off = fix(price - now);
  const totalRate = price > 0 ? fix((off / price) * 100) : 0;
  return { ok: true, steps, final: now, off, totalRate };
}

/** 元の値段と割引後の値段から、何％オフかを出す */
export function calcRate({ price, sale }) {
  if (price === null || sale === null) return { ok: false, empty: true };
  if (Number.isNaN(price) || price <= 0) return { ok: false, error: '元の値段は0より大きい数字で入れてください。' };
  if (Number.isNaN(sale) || sale < 0) return { ok: false, error: '割引後の値段は0以上の数字で入れてください。' };
  const off = fix(price - sale);
  const rate = fix((off / price) * 100);
  return { ok: true, off, rate, increase: sale > price };
}

/** 「割」の数字を％に（3 → 30、2.5 → 25） */
export const wariToPct = (w) => (w === null || Number.isNaN(w) ? w : fix(w * 10));

/**
 * 2つの割引後の値段をくらべる
 * @param {{price:number|null, rate:number|null}} a
 * @param {{price:number|null, rate:number|null}} b
 */
export function compareDiscounts(a, b, rounding = 'floor') {
  const ra = calcDiscount({ ...a, rounding });
  const rb = calcDiscount({ ...b, rounding });
  if (!ra.ok || !rb.ok) return { ok: false, a: ra, b: rb };
  const diff = fix(Math.abs(ra.final - rb.final));
  const cheaper = ra.final === rb.final ? 'same' : ra.final < rb.final ? 'a' : 'b';
  // 割引額は大きいのに、払う金額は高い（よくある勘ちがい）
  const bigOff = ra.off === rb.off ? null : ra.off > rb.off ? 'a' : 'b';
  return { ok: true, a: ra, b: rb, cheaper, diff, tricky: cheaper !== 'same' && bigOff !== null && bigOff !== cheaper };
}
