import { fix, fmt } from './number.mjs';

// レシピの人数換算（ブラウザとテストの両方で使う）

export const RECIPE_UNITS = ['g', 'ml', '大さじ', '小さじ', 'カップ', '個', '本', '枚', '片', '合', '少々', '適量'];
const NO_AMOUNT = new Set(['少々', '適量']); // 分量を入れない単位（人数が変わってもそのまま）
const PIECE = new Set(['個', '本', '枚', '片', '合']); // 数える単位（½・⅓ などの分数で出す）

const FRACS = [
  [0, ''], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, ''],
];

/** 倍率：作る人数 ÷ レシピの人数 */
export function peopleRatio(from, to) {
  if (from === null || to === null) return { ok: false, empty: true };
  if (Number.isNaN(from) || from <= 0) return { ok: false, error: 'レシピの人数は0より大きい数字で入れてください。' };
  if (Number.isNaN(to) || to <= 0) return { ok: false, error: '作る人数は0より大きい数字で入れてください。' };
  return { ok: true, ratio: fix(to / from) };
}

/** 倍率：手元にある量 ÷ レシピの量（その材料に合わせる） */
export function haveRatio(orig, have) {
  if (orig === null || have === null) return { ok: false, empty: true };
  if (Number.isNaN(orig) || orig <= 0) return { ok: false, error: '合わせる材料の分量を入れてください。' };
  if (Number.isNaN(have) || have <= 0) return { ok: false, error: '手元にある量は0より大きい数字で入れてください。' };
  return { ok: true, ratio: fix(have / orig) };
}

/** いちばん近い「整数＋¼・⅓・½・⅔・¾」にする。{ text: '1と½', approx: ちょうどでないとき true } */
export function toFraction(x) {
  let whole = Math.floor(x + 1e-9);
  const rest = x - whole;
  let best = FRACS[0];
  for (const f of FRACS) if (Math.abs(rest - f[0]) < Math.abs(rest - best[0])) best = f;
  if (best[0] === 1) {
    whole += 1;
    best = FRACS[0];
  }
  const approx = Math.abs(whole + best[0] - x) > 0.01;
  const text = whole === 0 ? best[1] || '0' : best[1] ? `${whole}と${best[1]}` : String(whole);
  return { text, approx };
}

/** 分量を、料理で使いやすい書き方にする（大さじ⇔小さじ、分数、少々）。approx：ちょうどでないので「約」をつける。sub：カップのml */
export function formatAmount(value, unit) {
  if (NO_AMOUNT.has(unit)) return { text: unit, approx: false };
  if (unit === 'g' || unit === 'ml') {
    const v = value < 1 ? fmt(value, 2) : value < 10 ? fmt(value, 1) : fmt(Math.round(value), 0);
    return { text: `${v}${unit}`, approx: false };
  }
  if (unit === '大さじ' || unit === '小さじ') {
    const tsp = unit === '大さじ' ? value * 3 : value; // 小さじにそろえる（大さじ1＝小さじ3）
    if (tsp < 0.25 - 1e-9) return { text: '少々', approx: false };
    const big = toFraction(tsp / 3);
    const small = toFraction(tsp);
    // 元が大さじなら大さじ½まで、元が小さじなら小さじ3（＝大さじ1）からが大さじ。
    // ただし大さじだと半端で、小さじならちょうどのとき（小さじ2と½ など）は小さじ
    let useBig = unit === '大さじ' ? tsp >= 1.5 - 1e-9 : tsp >= 3 - 1e-9;
    if (useBig && big.approx && !small.approx && tsp < 6) useBig = false;
    return useBig ? { text: `大さじ${big.text}`, approx: big.approx } : { text: `小さじ${small.text}`, approx: small.approx };
  }
  if (unit === 'カップ') {
    const ml = `${fmt(Math.round(value * 200), 0)}ml`; // 1カップ＝200ml
    if (value < 0.25 - 1e-9) return { text: ml, approx: false };
    const f = toFraction(value);
    return { text: `${f.text}カップ`, approx: f.approx, sub: ml };
  }
  if (PIECE.has(unit)) {
    const f = toFraction(value);
    if (f.text === '0') return { text: `${fmt(value, 2)}${unit}`, approx: false };
    return { text: `${f.text}${unit}`, approx: f.approx };
  }
  return { text: `${fmt(value, 2)}${unit}`, approx: false };
}

/**
 * 材料の分量に倍率をかける
 * @param {{name:string, amount:number|null, unit:string}[]} rows
 * @returns {{name:string, unit:string, from?:string, to:string, approx:boolean, sub?:string, error?:string}[]} 空の行は入れない
 */
export function scaleRecipe(rows, ratio) {
  const out = [];
  rows.forEach((r, i) => {
    const name = (r.name || '').trim() || `材料${i + 1}`;
    if (NO_AMOUNT.has(r.unit)) {
      if ((r.name || '').trim() || r.amount !== null) out.push({ name, unit: r.unit, to: r.unit, approx: false });
      return;
    }
    if (r.amount === null) return;
    if (Number.isNaN(r.amount) || r.amount <= 0) {
      out.push({ name, unit: r.unit, to: '', approx: false, error: '分量は0より大きい数字で入れてください。' });
      return;
    }
    const f = formatAmount(fix(r.amount * ratio), r.unit);
    out.push({ name, unit: r.unit, from: formatAmount(r.amount, r.unit).text, to: f.text, approx: f.approx, sub: f.sub });
  });
  return out;
}
