import { roundBy, fix } from './number.mjs';

// 偏差値の計算（ブラウザとテストの両方で使う）
// 偏差値 ＝ 50 ＋ 10 ×（得点 − 平均点）÷ 標準偏差。偏差値は小数1けたに四捨五入して、上位の割合はその偏差値から出す
// 上位◯％ ＝ 標準正規分布で z ＝（偏差値 − 50）÷ 10 より上の割合 ＝ erfc(z ÷ √2) ÷ 2
// テストの点がふつうの山の形（正規分布）に近いときの目安

export const HS_MAX = 1000; // 偏差値の大きさの上限（けたちがいの入力をまちがいにする）

/**
 * 誤差関数の余関数 erfc(x)。チェビシェフ近似（Numerical Recipes の erfcc）で、どの x でも相対誤差が 1.2×10⁻⁷ より小さい
 * （Abramowitz-Stegun 7.1.26 は誤差 1.5×10⁻⁷ で、上位の割合が小さいところで相対誤差が大きくなる）
 */
export function hsErfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** 小数1けたに四捨五入 */
export const hsRound1 = (x) => roundBy(x * 10, 'round') / 10;

/** 偏差値 → 上位の割合（％。0〜100） */
export const hsUpper = (dev) => 50 * hsErfc((dev - 50) / 10 / Math.SQRT2);

/** 100人中何番くらい（上位％を小数1けたにして切り上げ。1より少ないときは1） */
export const hsRank = (upper) => Math.max(1, Math.ceil(hsRound1(upper)));

/** 割合の字（{ num:'15.9', unit:'％' }。0.05％より少ないときは「0.1％未満」、99.95％より多いときは「99.9％超」） */
export function hsPct(p) {
  if (p < 0.05) return { num: '0.1', unit: '％未満' };
  if (p >= 99.95) return { num: '99.9', unit: '％超' };
  return { num: hsRound1(p).toFixed(1), unit: '％' };
}

/** 偏差値から、上位・下位の割合と100人中何番か（上位と下位の字は、足して100になるように） */
export function hsFromDev(dev) {
  const upper = hsUpper(dev);
  const edge = upper < 0.05 || upper >= 99.95;
  return {
    dev,
    upper,
    up: hsPct(upper),
    low: edge ? hsPct(100 - upper) : { num: fix(100 - hsRound1(upper)).toFixed(1), unit: '％' },
    rank: hsRank(upper),
  };
}

/**
 * @param {{dev:number|null, score:number|null, mean:number|null, sd:number|null, from:'dev'|'score'|null}} p
 *   from：あとから入れたほう（'score'＝得点・平均点・標準偏差から偏差値を出す、'dev'＝偏差値の欄の数を使う）
 *   from が 'dev' で平均点と標準偏差があれば、その偏差値になる得点も出す（score）
 */
export function hensachi({ dev, score, mean, sd, from }) {
  const bad = (x) => x !== null && Number.isNaN(x);
  if (bad(mean)) return { ok: false, error: '平均点は、数字で入れてください。', field: 'mean' };
  if (bad(sd) || (sd !== null && sd <= 0 && from === 'score')) return { ok: false, error: '標準偏差は、0より大きい数で入れてください。', field: 'sd' };
  let raw;
  let outScore = null;
  if (from === 'score') {
    if (score === null) return { ok: false, empty: true, missing: 'score' };
    if (bad(score)) return { ok: false, error: '得点は、数字で入れてください。', field: 'score' };
    if (mean === null) return { ok: false, empty: true, missing: 'mean' };
    if (sd === null) return { ok: false, empty: true, missing: 'sd' };
    raw = 50 + (10 * (score - mean)) / sd;
  } else if (from === 'dev') {
    if (dev === null) return { ok: false, empty: true, missing: 'dev' };
    if (bad(dev)) return { ok: false, error: '偏差値は、数字で入れてください。', field: 'dev' };
    raw = dev;
    if (mean !== null && sd !== null && sd > 0) outScore = fix(mean + ((dev - 50) * sd) / 10);
  } else {
    return { ok: false, empty: true, missing: 'dev' };
  }
  if (Math.abs(raw) > HS_MAX) return { ok: false, error: '偏差値が大きすぎます。数字をたしかめてください。', field: from === 'dev' ? 'dev' : 'sd' };
  return { ok: true, ...hsFromDev(hsRound1(raw)), score: outScore };
}

// 正規分布の山の絵（viewBox 0 0 200 72。偏差値20〜80を横いっぱいに、下の線は y＝60）
export const HS_LO = 20;
export const HS_HI = 80;
const HS_BASE = 60;
export const hsX = (dev) => Math.round(((Math.min(HS_HI, Math.max(HS_LO, dev)) - HS_LO) / (HS_HI - HS_LO)) * 2000) / 10;
export const hsY = (dev) => Math.round((HS_BASE - 54 * Math.exp(-(((dev - 50) / 10) ** 2) / 2)) * 10) / 10;

/** 山の線（偏差値 from から to まで。0.5きざみ） */
export function hsCurve(from = HS_LO, to = HS_HI) {
  const a = Math.min(HS_HI, Math.max(HS_LO, from));
  const pts = [a];
  for (let v = Math.ceil(a * 2) / 2; v <= to; v += 0.5) if (v > a) pts.push(v);
  return pts.map((v, i) => `${i ? 'L' : 'M'}${hsX(v)} ${hsY(v)}`).join('');
}

/** 自分より上の分（山の下の、自分の位置から右）をぬる形 */
export const hsArea = (dev) => `${hsCurve(dev, HS_HI)}L${hsX(HS_HI)} ${HS_BASE}L${hsX(dev)} ${HS_BASE}Z`;
