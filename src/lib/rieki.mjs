import { fix, fmt } from './number.mjs';

// 利益率の計算（ブラウザとテストの両方で使う）
// 売値・原価・利益率のうち2つから、残りの1つと利益を出す
// 利益率は「売値に対する利益の割合」（粗利率）。原価に対する割合ではない（原価に30％をのせても利益率は約23％）

export const RIEKI_FIELDS = ['price', 'cost', 'rate'];

/**
 * @param {{price:number|null, cost:number|null, rate:number|null, out:'price'|'cost'|'rate'}} p
 *   out：答えを出す欄（入れていない1つ）。rate は％
 * 売値を出すときは切り上げ（目標の利益率を下回らない）、原価を出すときは切り捨て（原価の上限）。
 * 入れた数字がどれも整数なら1円単位、小数があれば0.01円単位で丸める。利益・利益率は、丸めたあとの売値と原価から出す
 */
export function rieki({ price, cost, rate, out }) {
  const v = { price, cost, rate };
  const ins = RIEKI_FIELDS.filter((f) => f !== out);
  if (ins.some((f) => v[f] === null)) return { ok: false, empty: true };
  if (out !== 'price' && (Number.isNaN(price) || price <= 0)) return { ok: false, error: '売値は、0より大きい数字で入れてください。', field: 'price' };
  if (out !== 'cost' && (Number.isNaN(cost) || cost < 0)) return { ok: false, error: '原価は、0以上の数字で入れてください。', field: 'cost' };
  if (out !== 'rate') {
    if (Number.isNaN(rate) || rate < 0) return { ok: false, error: '利益率は、0以上の数字で入れてください。', field: 'rate' };
    if (rate >= 100) return { ok: false, error: '利益率は、100％より小さい数字で入れてください。', field: 'rate' };
  }
  const step = ins.every((f) => Number.isInteger(v[f])) ? 1 : 0.01;
  let p = price;
  let c = cost;
  if (out === 'price') {
    if (cost === 0) return { ok: false, error: '原価が0円だと、売値が決まりません。', field: 'cost' };
    p = Math.ceil(fix(cost / (1 - rate / 100) / step)) * step;
  } else if (out === 'cost') {
    c = Math.floor(fix((price * (1 - rate / 100)) / step)) * step;
  }
  p = fix(p);
  c = fix(c);
  const profit = fix(p - c);
  return {
    ok: true,
    out,
    step,
    price: p,
    cost: c,
    profit,
    rate: fix((profit / p) * 100),
    costRate: fix((c / p) * 100),
    times: c > 0 ? fix(p / c) : null, // 売値は原価の何倍か
  };
}

/** ％の書き方（0.1％単位で切り捨て。マイナスも小さいほうへ） */
export const pctText = (r) => {
  const x = Math.floor(fix(r * 10)) / 10;
  return `${x < 0 ? '−' : ''}${fmt(Math.abs(x), 1)}`;
};

/** お金の書き方（step が 1 なら円単位、0.01 なら小数2けたまで） */
export const moneyText = (x, step = 1) => fmt(Math.abs(x), step === 1 ? 0 : 2);
