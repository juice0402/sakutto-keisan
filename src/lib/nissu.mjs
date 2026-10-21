import { parseYmd, dayNum, dateOfDay, HIZUKE_MIN, HIZUKE_MAX } from './hizuke.mjs';

// 日数の計算（ブラウザとテストの両方で使う）
// はじめの日と、日数かおわりの日のどちらか（あとから入れたほう）から、もう片方を出す
// 日数は、はじめの日を数えない（民法の初日不算入と同じ。10月1日の3日後は10月4日）。はじめの日も数えた日数も出す

export const NISSU_MAX = 100000;

/**
 * @param {{start:string, days:number|null, end:string, out:'days'|'end'}} p
 *   start・end：'YYYY-MM-DD'　days：何日後（0以上の整数）　out：答えを出す欄
 */
export function nissu({ start, days, end, out }) {
  if (!start) return { ok: false, empty: true, missing: 'start' };
  const s = parseYmd(start);
  if (!s || start < HIZUKE_MIN || start > HIZUKE_MAX) return { ok: false, error: 'はじめの日は、1873年から2200年までの日付にしてください。', field: 'start' };
  if (!out) return { ok: false, empty: true, missing: 'days' };
  let diff;
  if (out === 'end') {
    if (days === null) return { ok: false, empty: true, missing: 'days' };
    if (Number.isNaN(days) || days < 0 || !Number.isInteger(days)) return { ok: false, error: '日数は、0以上の整数で入れてください。', field: 'days' };
    if (days > NISSU_MAX) return { ok: false, error: `日数は、${NISSU_MAX.toLocaleString('ja-JP')}日までです。`, field: 'days' };
    diff = days;
  } else {
    if (!end) return { ok: false, empty: true, missing: 'days' };
    const e = parseYmd(end);
    if (!e || end < HIZUKE_MIN || end > HIZUKE_MAX) return { ok: false, error: 'おわりの日は、1873年から2200年までの日付にしてください。', field: 'end' };
    diff = dayNum(e) - dayNum(s);
  }
  const endDate = dateOfDay(dayNum(s) + diff);
  const abs = Math.abs(diff);
  return {
    ok: true,
    out,
    start: s,
    end: endDate,
    days: diff, // マイナスは「◯日前」
    inclusive: abs + 1, // はじめの日も数えた日数
    weeks: Math.floor(abs / 7),
    weekRest: abs % 7,
  };
}
