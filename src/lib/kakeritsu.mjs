import { fix, fmt } from './number.mjs';

// 掛け率の計算（ブラウザとテストの両方で使う）
// 上代（定価）・掛け率・下代（仕入れの値段）のうち2つから、残りの1つと粗利を出す
// 下代 ＝ 上代 × 掛け率。粗利 ＝ 上代 − 下代（上代で売ったとき）。粗利率 ＝ 粗利 ÷ 上代（＝ 100 − 掛け率）
// 1円未満は取引先との決まりで変わるので、丸めずに小数2けたまで出す

export const KAKE_FIELDS = ['jodai', 'rate', 'gedai'];
export const KAKE_TILES = [50, 60, 70, 80]; // 5掛け〜8掛け

/** 掛け率の書き方をそろえる：0.6 → 60、6 → 60（6掛け）、6.5 → 65、60 → 60（％） */
export function kakePct(v) {
  if (v === null || Number.isNaN(v)) return v;
  if (v > 0 && v <= 1) return fix(v * 100);
  if (v > 1 && v < 10) return fix(v * 10);
  return v;
}

/** 「何掛け」の書き方（60 → 6、65 → 6.5） */
export const kakeText = (pct) => fmt(pct / 10, 2);

/**
 * @param {{jodai:number|null, rate:number|null, gedai:number|null, out:'jodai'|'rate'|'gedai'}} p
 *   jodai：上代（円）　rate：掛け率（入れたまま。kakePct でそろえる）　gedai：下代（円）　out：答えを出す欄（入れていない1つ）
 */
export function kakeritsu({ jodai, rate, gedai, out }) {
  const v = { jodai, rate, gedai };
  if (KAKE_FIELDS.filter((f) => f !== out).some((f) => v[f] === null)) return { ok: false, empty: true };
  if (out !== 'jodai' && (Number.isNaN(jodai) || jodai <= 0)) return { ok: false, error: '上代は、0より大きい数字で入れてください。', field: 'jodai' };
  if (out !== 'gedai' && (Number.isNaN(gedai) || gedai <= 0)) return { ok: false, error: '下代は、0より大きい数字で入れてください。', field: 'gedai' };
  let pct = kakePct(rate);
  if (out !== 'rate') {
    if (Number.isNaN(pct) || pct <= 0) return { ok: false, error: '掛け率は、0より大きい数字で入れてください。', field: 'rate' };
    if (pct > 100) return { ok: false, error: '掛け率は、100％（10掛け）までです。', field: 'rate' };
  }
  let j = jodai;
  let g = gedai;
  if (out === 'gedai') g = fix(Math.round(fix(jodai * pct)) / 100);
  else if (out === 'jodai') j = fix(Math.round(fix((gedai / pct) * 10000)) / 100);
  else pct = fix((gedai / jodai) * 100);
  const profit = fix(j - g);
  return { ok: true, out, jodai: j, gedai: g, pct, profit, profitPct: fix((profit / j) * 100) };
}

/** ％の書き方（0.1％まで。四捨五入） */
export const kakePctText = (pct) => fmt(Math.round(fix(pct * 10)) / 10, 1);
