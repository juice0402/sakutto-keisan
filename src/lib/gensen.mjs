// 源泉徴収の計算（ブラウザとテストの両方で使う）
// 個人に払う原稿料・デザイン料・講演料などの報酬・料金（国税庁 No.2795）
// 源泉徴収の額 ＝ 100万円以下の部分 × 10.21％、100万円をこえる部分 × 20.42％（＝（額 − 100万円）× 20.42％ ＋ 102,100円）。1円未満は切り捨て
// 消費税を請求書に分けて書くときは、税抜の報酬にだけかける。含めて書くときは税込の額にかける。消費税を請求しないときは報酬にかける
// 2027年1月1日からは、合計の率は同じで、内わけが「所得税・復興特別所得税（所得税の2.1％）」から
// 「所得税・防衛特別所得税（所得税の1％）・復興特別所得税（所得税の1.1％）」に変わる。内わけごとには計算せず、合計の率で1回に出す（国税庁のあらまし）

export const GENSEN_MAX = 1e10; // 100億円まで
export const GENSEN_BORDER = 1000000;
export const GENSEN_NEW_FROM = '2027-01-01'; // 防衛特別所得税がはじまる日（この日から払うもの）
export const GENSEN_MODES = ['sep', 'incl', 'none']; // 分けて書く・含めて書く・請求しない

/** 消費税（10％。1円未満は切り捨て） */
export const shohiOf = (fee) => Math.floor((fee * 10) / 100);

/** 源泉徴収の額（かける額から。1円未満は切り捨て） */
export function gensenOf(base) {
  if (base <= GENSEN_BORDER) return Math.floor((base * 1021) / 10000);
  return Math.floor(((base - GENSEN_BORDER) * 2042) / 10000) + 102100;
}

/** 報酬（税抜）から、消費税・源泉をかける額・源泉・請求額・振り込まれる額 */
export function gensenFromFee(fee, mode = 'sep') {
  const tax = mode === 'none' ? 0 : shohiOf(fee);
  const base = mode === 'incl' ? fee + tax : fee;
  const gensen = gensenOf(base);
  return { fee, tax, base, gensen, billed: fee + tax, net: fee + tax - gensen };
}

/** 内わけ（率だけ。額は合計で1回に出す）。day は 'YYYY-MM-DD'（空なら今日を入れて呼ぶ） */
export function gensenParts(day, over) {
  const income = over ? '10%・20%' : '10%'; // 100万円をこえる部分は20%
  if (day && day >= GENSEN_NEW_FROM) return { rows: [['所得税', income], ['防衛特別所得税', '所得税の1%'], ['復興特別所得税', '所得税の1.1%']], from2027: true };
  return { rows: [['所得税', income], ['復興特別所得税', '所得税の2.1%']], from2027: false };
}

/**
 * @param {{amount:number|null, from:'fee'|'net', mode?:'sep'|'incl'|'none'}} p
 *   amount：入れた額（円）　from：報酬（税抜）か振り込まれる額か　mode：消費税の書き方
 * 振り込まれる額からは、その額が振り込まれるいちばん少ない報酬をさがす。ちょうどその額にならないときは exact: false（1円上の額になる報酬）
 */
export function gensen({ amount, from, mode = 'sep' }) {
  if (amount === null) return { ok: false, empty: true };
  const field = from;
  const name = from === 'fee' ? '報酬' : '振り込まれる額';
  if (Number.isNaN(amount) || amount <= 0) return { ok: false, error: `${name}は、0より大きい数字で入れてください。`, field };
  if (amount !== Math.floor(amount)) return { ok: false, error: `${name}は、1円単位で入れてください。`, field };
  if (amount > GENSEN_MAX) return { ok: false, error: `${name}が大きすぎます。`, field };
  if (from === 'fee') return { ok: true, from, mode, exact: true, ...gensenFromFee(amount, mode) };
  // 振り込まれる額は報酬とともに減らない（1円ふえると0円か1円ふえる）ので、2つに分けてさがす
  let lo = 1;
  let hi = amount * 2;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (gensenFromFee(mid, mode).net >= amount) hi = mid;
    else lo = mid + 1;
  }
  const r = gensenFromFee(lo, mode);
  return { ok: true, from, mode, exact: r.net === amount, want: amount, ...r };
}
