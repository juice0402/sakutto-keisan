import { fix } from './number.mjs';

// 塩分濃度の計算（ブラウザとテストの両方で使う）
// 料理の言い方にそろえて、濃度は「水や食材の重さに対する塩の割合」：塩 ＝ 水や食材の重さ × 濃度
// 塩水として全体に対する濃度（塩 ÷（水 ＋ 塩））も、くらべるために出す
// 水や食材の重さ・濃度・塩のうち2つから、残りの1つを出す。水は1ml＝1gとして計算する
// 塩のスプーンの重さ（食塩 小さじ1＝6g・大さじ1＝18g）は src/data/enbun.mjs（出典つき）

export const ENBUN_FIELDS = ['base', 'pct', 'salt'];
export const ENBUN_MAX = 1000000; // 水や食材・塩は1,000kgまで

/**
 * @param {{base:number|null, pct:number|null, salt:number|null, out:'base'|'pct'|'salt'}} p
 *   base：水や食材の重さ（g）　pct：濃度（％）　salt：塩（g）　out：答えを出す欄（入れていない1つ）
 */
export function enbun({ base, pct, salt, out }) {
  const v = { base, pct, salt };
  if (ENBUN_FIELDS.filter((f) => f !== out).some((f) => v[f] === null)) return { ok: false, empty: true };
  if (out !== 'base') {
    if (Number.isNaN(base) || base <= 0) return { ok: false, error: '水や食材の重さは、0より大きい数字で入れてください。', field: 'base' };
    if (base > ENBUN_MAX) return { ok: false, error: '水や食材の重さは、1,000kgまでです。', field: 'base' };
  }
  if (out !== 'pct') {
    if (Number.isNaN(pct) || pct <= 0) return { ok: false, error: '濃度は、0より大きい数字で入れてください。', field: 'pct' };
    if (pct > 100) return { ok: false, error: '濃度は、100％までです。', field: 'pct' };
  }
  if (out !== 'salt') {
    if (Number.isNaN(salt) || salt <= 0) return { ok: false, error: '塩は、0より大きい数字で入れてください。', field: 'salt' };
    if (salt > ENBUN_MAX) return { ok: false, error: '塩は、1,000kgまでです。', field: 'salt' };
  }
  let b = base;
  let p = pct;
  let s = salt;
  if (out === 'salt') s = fix(Math.round(fix(base * pct)) / 100); // 0.01g まで
  else if (out === 'base') b = fix(Math.round(fix((salt / pct) * 10000)) / 100);
  else p = fix((salt / base) * 100);
  return { ok: true, out, base: b, pct: p, salt: s, whole: fix((s / (b + s)) * 100) };
}

/**
 * 塩の重さを、スプーンの目安の言い方に（1/4 さじ単位。小さじ3杯からは大さじ）
 * 例：15g → 小さじ2と1/2、20g → 大さじ1と小さじ1/4、0.5g → 小さじ1/4より少し
 * @param {number} g  @param {number} tsp 小さじ1の重さ  @param {number} tbsp 大さじ1の重さ
 */
export function spoonText(g, tsp, tbsp) {
  const q = Math.round(fix((g / tsp) * 4)); // 小さじの1/4 がいくつか
  if (q === 0) return '小さじ1/4より少し';
  const frac = (n) => ['', '1/4', '1/2', '3/4'][n];
  const tspText = (n) => {
    const whole = Math.floor(n / 4);
    if (!whole) return `小さじ${frac(n % 4)}`;
    return n % 4 ? `小さじ${whole}と${frac(n % 4)}` : `小さじ${whole}`;
  };
  const per = Math.round(tbsp / tsp) * 4; // 大さじ1は小さじ何個分か（1/4 さじ単位）
  if (q < per) return tspText(q);
  const big = Math.floor(q / per);
  const rest = q % per;
  if (!rest) return `大さじ${big}`;
  return `大さじ${big}と${tspText(rest)}`;
}

/** スプーンの絵に使う数：大さじ何杯と、残りが小さじの1/4 いくつか（spoonText と同じ数え方） */
export function spoonParts(g, tsp, tbsp) {
  const q = Math.round(fix((g / tsp) * 4));
  const per = Math.round(tbsp / tsp) * 4;
  return { big: Math.floor(q / per), quarters: q % per };
}
