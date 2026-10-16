import { fix } from './number.mjs';
import { calcDiscount } from './waribiki.mjs';

// 実質単価（ブラウザとテストの両方で使う）
// 単位は「種類（重さ・量・個数・長さ）」と「いちばん小さい単位への倍率」で持つ

export const UNITS = {
  g: { dim: 'weight', f: 1 },
  kg: { dim: 'weight', f: 1000 },
  ml: { dim: 'volume', f: 1 },
  L: { dim: 'volume', f: 1000 },
  個: { dim: 'count', f: 1 },
  枚: { dim: 'count', f: 1 },
  本: { dim: 'count', f: 1 },
  m: { dim: 'length', f: 1 },
};

/** くらべる基準（100gあたり・100mlあたり・1個あたり・1mあたり） */
export const BASES = {
  weight: { n: 100, label: '100g' },
  volume: { n: 100, label: '100ml' },
  count: { n: 1, label: '1個' },
  length: { n: 1, label: '1m' },
};

export const DIM_JA = { weight: '重さ（g・kg）', volume: '量（ml・L）', count: '個数（個・枚・本）', length: '長さ（m）' };

/** 基準の名前（個数は選んだ単位で「1枚あたり」などに） */
export const baseLabel = (dim, unit) => (dim === 'count' ? `1${unit}` : BASES[dim].label);

/**
 * 1つの商品の単価
 * @param {{price:number|null, qty:number|null, unit:string, packs?:number|null, disc?:number|null}} p
 */
export function calcUnitPrice({ price, qty, unit, packs = null, disc = null }) {
  if (price === null || qty === null) return { ok: false, empty: true };
  if (Number.isNaN(price) || price < 0) return { ok: false, error: '値段は0以上の数字で入れてください。' };
  if (Number.isNaN(qty) || qty <= 0) return { ok: false, error: '量は0より大きい数字で入れてください。' };
  const u = UNITS[unit];
  if (!u) return { ok: false, error: '単位をえらんでください。' };
  const n = packs === null ? 1 : packs;
  if (Number.isNaN(n) || n <= 0) return { ok: false, error: '入り数は0より大きい数字で入れてください。' };
  let pay = price;
  if (disc !== null) {
    const d = calcDiscount({ price, rate: disc });
    if (!d.ok) return { ok: false, error: d.error };
    pay = d.final;
  }
  const amount = fix(qty * n * u.f); // いちばん小さい単位（g・ml・個・m）での量
  const per = fix((pay / amount) * BASES[u.dim].n); // 基準あたりの値段
  return { ok: true, pay, amount, dim: u.dim, per };
}

/**
 * いくつかの商品をくらべる（入っていない商品は飛ばす）
 * @returns {{ok:boolean, results:Array, best?:number[], worst?:number, diff?:number, pct?:number, saving?:number, mismatch?:boolean}}
 */
export function compareUnitPrices(items) {
  const results = items.map((it) => (it ? calcUnitPrice(it) : { ok: false, empty: true }));
  const ok = results.map((r, i) => ({ r, i })).filter((x) => x.r.ok);
  if (ok.length < 2) return { ok: false, results };
  if (new Set(ok.map((x) => x.r.dim)).size > 1) return { ok: false, results, mismatch: true };
  const min = Math.min(...ok.map((x) => x.r.per));
  const best = ok.filter((x) => x.r.per === min).map((x) => x.i);
  if (best.length === ok.length) return { ok: true, results, best, same: true };
  // いちばん安いものと、2番目に安いものをくらべる
  const others = ok.filter((x) => !best.includes(x.i)).sort((a, b) => a.r.per - b.r.per);
  const second = others[0];
  const win = results[best[0]];
  const diff = fix(second.r.per - min);
  const pct = fix((diff / second.r.per) * 100);
  // 安いほうの量を、2番目の単価で買ったときとの差額
  const saving = fix((win.amount / BASES[win.dim].n) * second.r.per - win.pay);
  return { ok: true, results, best, second: second.i, diff, pct, saving };
}

/** 入っている商品を、基準あたりの値段が安い順に並べる（同じ値段は同じ順位） */
export function rankUnitPrices(results) {
  const ok = results.map((r, i) => ({ r, i })).filter((x) => x.r.ok).sort((a, b) => a.r.per - b.r.per || a.i - b.i);
  let rank = 0;
  let prev = null;
  return ok.map((x, n) => {
    if (x.r.per !== prev) rank = n + 1;
    prev = x.r.per;
    return { index: x.i, rank, per: x.r.per };
  });
}
