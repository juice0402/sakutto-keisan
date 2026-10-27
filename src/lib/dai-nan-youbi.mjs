import { parseYmd, dayNum, HIZUKE_MIN, HIZUKE_MAX, WEEKDAYS } from './hizuke.mjs';

// 第何曜日の計算（ブラウザとテストの両方で使う）
// その月の1〜7日が第1、8〜14日が第2…（第n ＝（日 − 1）÷ 7 の整数部分 ＋ 1）。その曜日がその月の最後なら「最終」
// 第何週（カレンダーの行）とはちがう。カレンダーは日曜日から始まる7列

/** 曜日の番号（0＝日曜日…6＝土曜日） */
export const ybWeekday = (date) => ((dayNum(date) % 7) + 11) % 7;

/** その月の日数 */
export const ybMonthDays = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** y年m月の第n w曜日の日（その月にないときは null） */
export function ybNth(y, m, n, w) {
  const first = ybWeekday({ y, m, d: 1 });
  const d = 1 + ((w - first + 7) % 7) + (n - 1) * 7;
  return d <= ybMonthDays(y, m) ? d : null;
}

/** カレンダーの何行目（第何週。日曜日から始まるカレンダー） */
export const ybRow = (date) => Math.floor((date.d - 1 + ybWeekday({ y: date.y, m: date.m, d: 1 })) / 7) + 1;

/** カレンダーの42マス（6行×7列。その月の日でないマスは null） */
export function ybGrid(y, m) {
  const first = ybWeekday({ y, m, d: 1 });
  const days = ybMonthDays(y, m);
  return Array.from({ length: 42 }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= days ? d : null;
  });
}

/**
 * 日付（'YYYY-MM-DD'）から、第何◯曜日か
 * n：第何か　w：曜日の番号　last：その月の最後のその曜日か　lastDay：その月の最後のその曜日の日
 */
export function daiNanYoubi(value) {
  if (!value) return { ok: false, empty: true };
  const date = parseYmd(value);
  if (!date || value < HIZUKE_MIN || value > HIZUKE_MAX) return { ok: false, error: '日付は、1873年から2200年までにしてください。' };
  const w = ybWeekday(date);
  const n = Math.floor((date.d - 1) / 7) + 1;
  const days = ybMonthDays(date.y, date.m);
  const lastDay = date.d + Math.floor((days - date.d) / 7) * 7;
  return { ok: true, date, w, youbi: WEEKDAYS[w], n, last: lastDay === date.d, lastDay, days, text: `第${n}${WEEKDAYS[w]}曜日` };
}

/** y年m月から count か月の、第n w曜日（{ y, m, d }。その月にないときは d が null） */
export function ybAhead(y, m, n, w, count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const yy = y + Math.floor((m - 1 + i) / 12);
    const mm = ((m - 1 + i) % 12) + 1;
    return { y: yy, m: mm, d: ybNth(yy, mm, n, w) };
  });
}

// 第何月曜日で決まる祝日（国民の祝日に関する法律 第2条。内閣府「国民の祝日」について）
export const YB_HOLIDAYS = [
  { name: '成人の日', m: 1, n: 2 },
  { name: '海の日', m: 7, n: 3 },
  { name: '敬老の日', m: 9, n: 3 },
  { name: 'スポーツの日', m: 10, n: 2 },
];

/** その年の、第何月曜日で決まる祝日の日 */
export const ybHolidays = (y) => YB_HOLIDAYS.map((h) => ({ ...h, d: ybNth(y, h.m, h.n, 1) }));
