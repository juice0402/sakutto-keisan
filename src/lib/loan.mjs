import { fix } from './number.mjs';

// ローンの計算（元利均等返済。ブラウザとテストの両方で使う）
// 毎月の返済額 ＝ 借りる額 × 月利 ×（1＋月利）^回数 ÷（（1＋月利）^回数 − 1）。月利 ＝ 年利 ÷ 12。金利0％なら 借りる額 ÷ 回数
// 毎月の返済額は1円未満を切り上げ（返しきれるように）。返済総額は 毎月の返済額 × 回数（最後の回で調整される分は目安）

export const LOAN_MAX_MAN = 100000; // 10億円（万円で入れる）
export const LOAN_MAX_RATE = 20;
export const LOAN_MAX_YEARS = 50;

/** 毎月の返済額（丸める前） */
const payment = (principal, monthRate, n) => (monthRate === 0 ? principal / n : (principal * monthRate * (1 + monthRate) ** n) / ((1 + monthRate) ** n - 1));

/**
 * @param {{man:number|null, rate:number|null, years:number|null}} p  man：借りる額（万円）　rate：年利（％）　years：返済の年数
 * @returns monthly：毎月の返済額（円）　total：返済総額　interest：利息の合計　balance(y)：y年後の残り（目安）
 */
export function loan({ man, rate, years }) {
  if (man === null) return { ok: false, empty: true, missing: 'man' };
  if (Number.isNaN(man) || man <= 0) return { ok: false, error: '借りる額は、0より大きい数字で入れてください。', field: 'man' };
  if (man > LOAN_MAX_MAN) return { ok: false, error: '借りる額は、10億円までです。', field: 'man' };
  if (rate === null) return { ok: false, empty: true, missing: 'rate' };
  if (Number.isNaN(rate) || rate < 0) return { ok: false, error: '金利は、0以上の数字で入れてください。', field: 'rate' };
  if (rate > LOAN_MAX_RATE) return { ok: false, error: `金利は、年${LOAN_MAX_RATE}％までです。`, field: 'rate' };
  if (years === null) return { ok: false, empty: true, missing: 'years' };
  if (Number.isNaN(years) || years <= 0 || !Number.isInteger(fix(years * 12))) return { ok: false, error: '返済の年数は、1か月単位で入れてください。', field: 'years' };
  if (years > LOAN_MAX_YEARS) return { ok: false, error: `返済の年数は、${LOAN_MAX_YEARS}年までです。`, field: 'years' };
  const principal = Math.round(man * 10000);
  const n = Math.round(years * 12);
  const r = rate / 100 / 12;
  const monthly = Math.ceil(fix(payment(principal, r, n)));
  const total = monthly * n;
  /** k回払ったあとの残り（毎月の返済額で払ったときの目安。0より小さくはしない） */
  const balanceAfter = (k) => {
    if (r === 0) return Math.max(0, principal - monthly * k);
    const b = principal * (1 + r) ** k - (monthly * ((1 + r) ** k - 1)) / r;
    return Math.max(0, Math.round(b));
  };
  return { ok: true, principal, n, monthly, total, interest: total - principal, balanceAfter };
}
