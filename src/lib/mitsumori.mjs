import { fix } from './number.mjs';

// 清掃の見積もり計算（ブラウザとテストの両方で使う）
// 1回の料金 ＝ 面積 × ㎡単価、1年 ＝ 1回 × 1年の回数、1か月 ＝ 1年 ÷ 12
// 面積・㎡単価・1か月の料金のうち2つと回数から、残りの1つを出す。金額は1円未満を四捨五入（税抜のまま計算する）

export const MITSU_FIELDS = ['area', 'price', 'month'];

// 回数のマス（1年の回数）。週5回は52週×5回で、祝日の分は引かない（休む契約なら自分で入れる）
export const MITSU_KAISU = [
  { name: '週5回', sub: '平日毎日', year: 260 },
  { name: '週1回', sub: '年52回', year: 52 },
  { name: '月2回', sub: '年24回', year: 24 },
  { name: '月1回', sub: '年12回', year: 12 },
];
export const MITSU_YEAR_MAX = 2000; // 1年の回数の上限（1日に何回も掃除する場所でも足りるように）

const MITSU_NAME = { area: '面積', price: '㎡単価', month: '1か月の料金' };

/** 1年の回数のまちがい（なければ null）。入れていないときは empty */
export function mitsuYearCheck(year) {
  if (year === null) return { ok: false, empty: true, missing: 'year' };
  if (Number.isNaN(year) || year <= 0) return { ok: false, error: '1年の回数は、0より大きい数字で入れてください。', field: 'year' };
  if (!Number.isInteger(year)) return { ok: false, error: '1年の回数は、1回単位で入れてください。', field: 'year' };
  if (year > MITSU_YEAR_MAX) return { ok: false, error: `1年の回数は、${MITSU_YEAR_MAX.toLocaleString('ja-JP')}回までにしてください。`, field: 'year' };
  return null;
}

/**
 * @param {{area:number|null, price:number|null, month:number|null, year:number|null, out:'area'|'price'|'month'}} p
 *   area：面積（㎡）　price：㎡単価（1回・円）　month：1か月の料金（円）　year：1年の回数　out：答えを出す欄
 */
export function mitsumori({ area, price, month, year, out }) {
  const bad = mitsuYearCheck(year);
  if (bad) return bad;
  const v = { area, price, month };
  if (MITSU_FIELDS.filter((f) => f !== out).some((f) => v[f] === null)) return { ok: false, empty: true };
  for (const f of MITSU_FIELDS) {
    if (f !== out && (Number.isNaN(v[f]) || v[f] <= 0)) return { ok: false, error: `${MITSU_NAME[f]}は、0より大きい数字で入れてください。`, field: f };
  }
  let a = area;
  let p = price;
  let yearly;
  if (out === 'month') yearly = area * price * year;
  else {
    yearly = month * 12;
    if (out === 'price') p = yearly / (year * area);
    else a = yearly / (year * price);
  }
  return {
    ok: true,
    out,
    area: fix(a),
    price: fix(p),
    year,
    perMonth: fix(year / 12), // 1か月の回数
    once: Math.round(fix(yearly / year)),
    month: out === 'month' ? Math.round(fix(yearly / 12)) : month,
    yearly: Math.round(fix(yearly)),
  };
}

/**
 * 1年の帯：月ごとの回数（12か月）。12回より多いときは毎月同じ回数、少ないときは、なるべく同じ間をあけた月に1回
 * 年4回なら3・6・9・12月、年6回なら2・4・6・8・10・12月
 */
export function mitsuMonths(year) {
  if (year >= 12) return Array(12).fill(fix(year / 12));
  const months = Array(12).fill(0);
  for (let k = 1; k <= year; k++) months[Math.round((k * 12) / year) - 1] = 1;
  return months;
}

/** 人件費にのせる経費の割合（物品費・業務管理費・一般管理費等を順にかけたもの） */
export const mitsuKeihi = (k) => fix((1 + k.goods / 100) * (1 + k.manage / 100) * (1 + k.general / 100));

/**
 * 作業のマスの㎡単価の目安：歩掛り（100㎡を1回掃除するのに何人。1人＝1日8時間）÷ 100 × 清掃員の単価（1日）× 経費の割合
 * labor：人件費だけの㎡単価　price：経費をのせた㎡単価（0.1円単位に四捨五入）
 */
export function mitsuMeyasu(buai, wage, keihi) {
  const labor = fix((buai / 100) * wage);
  return { labor, price: Math.round(fix(labor * mitsuKeihi(keihi) * 10)) / 10 };
}
