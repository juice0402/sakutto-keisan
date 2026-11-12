import { fix, roundBy, fmt } from './number.mjs';

// 割引計算（ブラウザとテストの両方で使う）

/** 割引率（%）を「◯割◯分引き」に。小数第2位以下があるときは null */
/** よくある値段の割引の早見表（割引計算のページと印刷用のPDF。「1980円の3割引」のような検索で来る人が、表を見ればわかるように。数字は tests/waribiki.test.mjs で確かめる） */
export const QUICK_PRICES = [500, 600, 880, 980, 1000, 1280, 1500, 1980, 2000, 2980, 3000, 3980, 5000, 10000];
export const QUICK_RATES = [10, 20, 30, 50];

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

/** 元の値段と割引後の値段から、何％オフかを出す（割引率の計算のページ） */
export function calcRate({ price, sale }) {
  if (price === null || sale === null) return { ok: false, empty: true };
  if (Number.isNaN(price) || price <= 0) return { ok: false, error: '元の値段は0より大きい数字で入れてください。', field: 'price' };
  if (Number.isNaN(sale) || sale < 0) return { ok: false, error: '割引後の値段は0以上の数字で入れてください。', field: 'sale' };
  const off = fix(price - sale);
  const rate = fix((off / price) * 100);
  return { ok: true, sale, off, rate, increase: sale > price };
}

/** 元の値段と、値引きの額から何％オフか（「300円引き」は何％オフ？） */
export function rateFromOff({ price, off }) {
  if (price === null || off === null) return { ok: false, empty: true };
  if (Number.isNaN(off) || off < 0) return { ok: false, error: '値引きの額は0以上の数字で入れてください。', field: 'off' };
  if (price > 0 && off > price) return { ok: false, error: '値引きの額は、元の値段までで入れてください。', field: 'off' };
  return calcRate({ price, sale: Number.isNaN(price) ? 0 : fix(price - off) });
}

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

/**
 * 率ごとの割引のページ（/waribiki/30/ など）：割引後の値段から元の値段
 * 元の値段 ＝ 割引後 × 100 ÷（100 − 割引率）。割り切れないときは、切り捨ての割引でその値段になるいちばん安い1円単位の値段（exact: false）
 */
export function originalFrom(sale, rate) {
  if (sale === null) return { ok: false, empty: true };
  if (Number.isNaN(sale) || sale < 0) return { ok: false, error: '値段は0以上の数字で入れてください。' };
  const raw = fix((sale * 100) / (100 - rate));
  if (Number.isInteger(raw)) return { ok: true, price: raw, exact: true };
  let p = Math.ceil(raw);
  while (Math.floor(fix((p * (100 - rate)) / 100)) > sale) p--;
  while (Math.floor(fix((p * (100 - rate)) / 100)) < sale) p++;
  return { ok: true, price: p, exact: false };
}

// ちょいメモの「今日の合計」（割引の計算の8ページで共通。#150）
// メモ { t：ページの slug, d：メモした時刻（ms）, p：払う額, o：安くなった額, e：元の値段が「約」なら 1 }
export const WARI_MEMO_SLUGS = ['waribiki', 'waribiki-ritsu', 'waribiki-10', 'waribiki-15', 'waribiki-20', 'waribiki-30', 'waribiki-40', 'waribiki-50'];

/** 日本時間の日付の番号（同じ日なら同じ数） */
export const jstDay = (ms) => Math.floor((ms + 9 * 3600000) / 86400000);

/** slugs のページで、now と同じ日（日本時間）にメモした数字つきのメモの合計。{ n, p, o, about } */
export function memoTotal(list, slugs, now) {
  const today = jstDay(now);
  const r = { n: 0, p: 0, o: 0, about: false };
  for (const m of list) {
    if (!m || !slugs.includes(m.t) || typeof m.d !== 'number' || jstDay(m.d) !== today) continue;
    if (!Number.isFinite(m.p) || !Number.isFinite(m.o)) continue;
    r.n += 1;
    r.p = fix(r.p + m.p);
    r.o = fix(r.o + m.o);
    if (m.e) r.about = true;
  }
  return r;
}

/** ちょいメモの上の1行。足せるメモがなければ空 */
export function wariMemoLine(list, now) {
  const t = memoTotal(list, WARI_MEMO_SLUGS, now);
  if (!t.n) return '';
  // 「払う」と金額のあいだは改行しない空白（\u00a0）
  return `割引のページで今日メモした${t.n}品：払う\u00a0${fmt(t.p)}円・安くなった\u00a0${t.about ? '約' : ''}${fmt(t.o)}円`;
}
