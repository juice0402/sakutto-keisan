import { fix, fmt, roundBy } from './number.mjs';

// 残業代（割増賃金）の計算（ブラウザとテストの両方で使う）。時給のページ（残業代の計算）と月給のページ（月給の残業代の計算）で共通
// 1時間あたりの賃金 ＝ 月給 ÷ 1か月の所定労働時間。1か月の所定労働時間 ＝（365 − 年間休日）× 1日の所定労働時間 ÷ 12
// 割増の率は労働基準法の最低の率：残業25％（1か月60時間をこえた分は50％）、深夜25％（上乗せ）、法定休日35％
// 60時間には法定休日の時間を入れない（法定休日でない休みの日の残業は、残業に入れる）
// 端数：1時間あたりの賃金と、1時間あたりの割増の額と、それぞれの金額は1円未満を四捨五入（50銭未満を切り捨て、50銭以上を切り上げ）

export const ZANGYO_LIMIT = 60;
export const ZANGYO_MAX_HOURS = 744; // 31日 × 24時間
// name は明細書の項目の名前（深夜割増は、時間外や休日の分に上乗せする25％だけ）
export const ZANGYO_PARTS = [
  { id: 'over', name: '時間外', rate: 1.25 },
  { id: 'over60', name: '60時間超', rate: 1.5 },
  { id: 'night', name: '深夜割増', rate: 0.25 },
  { id: 'holiday', name: '休日出勤', rate: 1.35 },
];

/** 1時間あたりの割増の額（1円未満は四捨五入） */
export const zangyoUnit = (wage, rate) => roundBy(wage * rate, 'round');

/** 1か月の所定労働時間 */
export const monthHours = (holidays, daily) => fix(((365 - holidays) * daily) / 12);

/**
 * 1時間あたりの賃金を月給から出す
 * @param {{salary:number|null, holidays:number|null, daily:number|null}} p  salary：月給（円）　holidays：年間休日（日）　daily：1日の所定労働時間（時間）
 */
export function zangyoWage({ salary, holidays, daily }) {
  if (salary === null) return { ok: false, empty: true, missing: 'salary' };
  if (Number.isNaN(salary) || salary <= 0) return { ok: false, error: '月給は、0より大きい数字で入れてください。', field: 'salary' };
  if (holidays === null || daily === null) return { ok: false, empty: true, missing: 'days' };
  if (Number.isNaN(holidays) || holidays < 0 || holidays >= 365) return { ok: false, error: '年間休日は、0〜364日で入れてください。', field: 'holidays' };
  if (Number.isNaN(daily) || daily <= 0) return { ok: false, error: '1日の所定時間は、0より大きい数字で入れてください。', field: 'daily' };
  if (daily > 24) return { ok: false, error: '1日の所定時間は、24時間までです。', field: 'daily' };
  const hours = monthHours(holidays, daily);
  return { ok: true, wage: roundBy(salary / hours, 'round'), monthHours: hours };
}

/**
 * 残業代
 * @param {{wage:number, over:number|null, night:number|null, holiday:number|null}} p
 *   wage：1時間あたりの賃金（円）　over：残業の時間（法定休日をのぞく）　night：夜10時〜朝5時にはたらいた時間　holiday：法定休日にはたらいた時間
 */
export function zangyo({ wage, over, night, holiday }) {
  if (Number.isNaN(wage) || wage <= 0) return { ok: false, error: '時給は、0より大きい数字で入れてください。', field: 'wage' };
  const h = { over, night, holiday };
  if (Object.values(h).every((x) => x === null)) return { ok: false, empty: true, missing: 'hours' };
  const label = { over: '残業', night: '深夜', holiday: '休日' };
  for (const k of Object.keys(h)) {
    if (h[k] === null) h[k] = 0;
    else if (Number.isNaN(h[k]) || h[k] < 0) return { ok: false, error: `${label[k]}の時間は、0以上の数字で入れてください。`, field: k };
    else if (h[k] > ZANGYO_MAX_HOURS) return { ok: false, error: `${label[k]}の時間は、1か月${ZANGYO_MAX_HOURS}時間までです。`, field: k };
  }
  const hours = {
    over: Math.min(h.over, ZANGYO_LIMIT),
    over60: fix(Math.max(0, h.over - ZANGYO_LIMIT)),
    night: h.night,
    holiday: h.holiday,
  };
  const parts = ZANGYO_PARTS.filter((p) => hours[p.id] > 0).map((p) => {
    const unit = zangyoUnit(wage, p.rate); // 1時間あたりの額
    return { ...p, hours: hours[p.id], unit, amount: roundBy(unit * hours[p.id], 'round') };
  });
  const total = parts.reduce((s, p) => s + p.amount, 0);
  // 時給の分（残業と休日の時間 × 時給）と、割増で増えた分
  const base = Math.min(total, roundBy(wage * (h.over + h.holiday), 'round'));
  return { ok: true, wage, parts, total, base, extra: total - base };
}

/** 残業1時間あたりの残業代（時給 × 1.25 を四捨五入） */
export const overUnit = (wage) => zangyoUnit(wage, ZANGYO_PARTS[0].rate);

/** 時間の書き方（20.5 → 20時間30分。1分未満は四捨五入。20.30 は20時間18分） */
export function zangyoHoursText(h) {
  const m = Math.round(fix(h * 60));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  if (!hh) return `${mm}分`;
  return mm ? `${fmt(hh, 0)}時間${mm}分` : `${fmt(hh, 0)}時間`;
}
