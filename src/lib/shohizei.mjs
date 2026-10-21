import { fix } from './number.mjs';

// 消費税の計算（ブラウザとテストの両方で使う）
// 税率は10％（ふつう）と8％（軽減税率：酒と外食をのぞく飲食料品・定期購読の新聞）
// 税抜から：消費税 ＝ 税抜 × 税率。税込 ＝ 税抜 ＋ 消費税
// 税込から：消費税 ＝ 税込 × 税率 ÷（100 ＋ 税率）。税抜 ＝ 税込 − 消費税
// 消費税の1円未満は、切り捨て・四捨五入・切り上げのどれか（はじめは切り捨て）。端数があるときだけ、えらぶ所を出す

export const TAX_RATES = [10, 8];
export const TAX_MODES = ['floor', 'round', 'ceil'];
export const TAX_MAX = 1e11;

const roundTax = (x, mode) => {
  const v = fix(x);
  if (mode === 'ceil') return Math.ceil(v);
  if (mode === 'round') return Math.round(v);
  return Math.floor(v);
};

/**
 * @param {{amount:number|null, from:'net'|'gross', rate:number, mode?:'floor'|'round'|'ceil'}} p
 *   amount：入れた値段（円）　from：税抜（net）か税込（gross）か　rate：税率（％）　mode：消費税の1円未満
 * @returns net：税抜　gross：税込　tax：消費税　frac：消費税に1円未満の端数があったか
 */
export function shohizei({ amount, from, rate, mode = 'floor' }) {
  if (amount === null) return { ok: false, empty: true };
  const field = from;
  if (Number.isNaN(amount) || amount < 0) return { ok: false, error: '値段は、0以上の数字で入れてください。', field };
  if (amount > TAX_MAX) return { ok: false, error: '値段が大きすぎます。', field };
  const raw = from === 'net' ? fix((amount * rate) / 100) : fix((amount * rate) / (100 + rate));
  const tax = roundTax(raw, mode);
  const net = from === 'net' ? amount : fix(amount - tax);
  const gross = from === 'net' ? fix(amount + tax) : amount;
  return { ok: true, from, rate, mode, net, gross, tax, frac: raw !== Math.floor(raw) };
}
