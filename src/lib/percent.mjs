import { fix } from './number.mjs';

// パーセントの計算（ブラウザとテストの両方で使う）
// もとの数・割合（％）・その数のうち2つから、残りの1つを出す。その数 ＝ もとの数 × 割合 ÷ 100
// 例：200の15％は30（もとの数200・割合15・その数30）。30は200の何％か、30が15％にあたるもとの数、も同じ式

export const PERCENT_FIELDS = ['base', 'pct', 'part'];
export const PERCENT_MAX = 1e12;

/**
 * @param {{base:number|null, pct:number|null, part:number|null, out:'base'|'pct'|'part'}} p
 *   base：もとの数　pct：割合（％）　part：その数（もとの数の◯％にあたる数）　out：答えを出す欄（入れていない1つ）
 */
export function percent({ base, pct, part, out }) {
  const v = { base, pct, part };
  if (PERCENT_FIELDS.filter((f) => f !== out).some((f) => v[f] === null)) return { ok: false, empty: true };
  const name = { base: 'もとの数', pct: '割合', part: 'その数' };
  for (const f of PERCENT_FIELDS) {
    if (f === out) continue;
    if (Number.isNaN(v[f]) || v[f] < 0) return { ok: false, error: `${name[f]}は、0以上の数字で入れてください。`, field: f };
    if (v[f] > PERCENT_MAX) return { ok: false, error: `${name[f]}が大きすぎます。`, field: f };
  }
  if (out !== 'base' && base === 0 && out === 'pct') return { ok: false, error: 'もとの数が0だと、割合が決まりません。', field: 'base' };
  if (out === 'base' && pct === 0) return { ok: false, error: '割合が0％だと、もとの数が決まりません。', field: 'pct' };
  let b = base;
  let p = pct;
  let q = part;
  if (out === 'part') q = fix((base * pct) / 100);
  else if (out === 'pct') p = fix((part / base) * 100);
  else b = fix((part / pct) * 100);
  return { ok: true, out, base: b, pct: p, part: q };
}

/** 割合のいろいろな言い方：何割（15％ → 1.5割）と、小数（0.15） */
export const wariOf = (pct) => fix(pct / 10);
export const decimalOf = (pct) => fix(pct / 100);
