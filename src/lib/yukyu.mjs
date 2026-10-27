import { parseYmd, dayNum, dateOfDay, HIZUKE_MIN, HIZUKE_MAX } from './hizuke.mjs';

// 有給休暇の付与日数（労働基準法39条。ブラウザとテストの両方で使う）
// 入社日から6か月で1回目、そのあと1年ごと。日数は勤続年数と週の所定労働日数で決まる（出勤率8割以上として計算）
// 表は厚生労働省（千葉労働局のリーフレット「労基法39条」）と同じ。tests/yukyu.test.mjs で確かめる

/** 週の所定労働日数ごとの付与日数（勤続 半年・1年半・2年半・3年半・4年半・5年半・6年半以上） */
export const YUKYU_TABLE = {
  5: [10, 11, 12, 14, 16, 18, 20],
  4: [7, 8, 9, 10, 12, 13, 15],
  3: [5, 6, 6, 8, 9, 10, 11],
  2: [3, 4, 4, 5, 6, 6, 7],
  1: [1, 2, 2, 2, 3, 3, 3],
};
/** 週の日数のマス。sub は1年の所定労働日数で決めるときの日数（週5日以上は「以上」） */
export const YUKYU_WEEKS = [
  { week: 5, name: '週5日', sub: '以上', year: '217日以上' },
  { week: 4, name: '週4日', sub: '年169日〜', year: '169〜216日' },
  { week: 3, name: '週3日', sub: '年121日〜', year: '121〜168日' },
  { week: 2, name: '週2日', sub: '年73日〜', year: '73〜120日' },
  { week: 1, name: '週1日', sub: '年48日〜', year: '48〜72日' },
];
/** 勤続の段の名前 */
export const YUKYU_STEPS = ['半年', '1年半', '2年半', '3年半', '4年半', '5年半', '6年半〜'];
export const YUKYU_STEP_LONG = ['6か月', '1年6か月', '2年6か月', '3年6か月', '4年6か月', '5年6か月', '6年6か月以上'];
export const YUKYU_SRC = 'https://jsite.mhlw.go.jp/chiba-roudoukyoku/content/contents/002809224.pdf';

/** n 回目（0から）の付与日数 */
export const yukyuDays = (week, n) => YUKYU_TABLE[week][Math.min(n, 6)];

/**
 * k か月後の同じ日。その月に同じ日がないとき（8月31日の6か月後）は、次の月の1日
 * （期間はその月の終わりで満了するので、付与はその次の日。民法143条）
 */
export function yukyuAddMonths({ y, m, d }, k) {
  const t = (m - 1) + k;
  const yy = y + Math.floor(t / 12);
  const mm = (t % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (d <= last) return { y: yy, m: mm, d };
  return mm === 12 ? { y: yy + 1, m: 1, d: 1 } : { y: yy, m: mm + 1, d: 1 };
}

/** n 回目（0から）の付与日：入社日の 6 ＋ 12n か月後 */
export const yukyuGrantDate = (hire, n) => yukyuAddMonths(hire, 6 + 12 * n);

/** 勤続（何年何か月。入社日から数えた満の月数） */
function tenureMonths(hire, on) {
  return (on.y - hire.y) * 12 + (on.m - hire.m) - (on.d < hire.d ? 1 : 0);
}

/**
 * @param {{hire:string, on:string, week:number|null}} p
 *   hire：入社日　on：計算する日（'YYYY-MM-DD'）　week：週の所定労働日数（5は5日以上）
 * @returns 付与の回数 n（まだなら -1）・いまの日数・いまの分の期限（付与から2年。その前の日まで）・次の付与日と日数・年5日の取得義務の対象か
 */
export function yukyuFuyo({ hire, on, week }) {
  if (!hire) return { ok: false, empty: true, missing: 'hire' };
  const h = parseYmd(hire);
  if (!h || hire < HIZUKE_MIN || hire > HIZUKE_MAX) return { ok: false, error: '入社日は、正しい日付で入れてください。', field: 'hire' };
  if (!YUKYU_TABLE[week]) return { ok: false, empty: true, missing: 'week' };
  if (!on) return { ok: false, empty: true, missing: 'on' };
  const o = parseYmd(on);
  if (!o || on < HIZUKE_MIN || on > HIZUKE_MAX) return { ok: false, error: '計算する日は、正しい日付で入れてください。', field: 'on' };
  if (on < hire) return { ok: false, error: '計算する日は、入社日よりあとにしてください。', field: 'on' };
  const today = dayNum(o);
  let n = -1;
  while (dayNum(yukyuGrantDate(h, n + 1)) <= today) n++;
  const months = tenureMonths(h, o);
  const cur = n >= 0
    ? { n, date: yukyuGrantDate(h, n), days: yukyuDays(week, n), until: dateOfDay(dayNum(yukyuGrantDate(h, n + 2)) - 1) }
    : null;
  const next = { n: n + 1, date: yukyuGrantDate(h, n + 1), days: yukyuDays(week, n + 1) };
  return {
    ok: true,
    week,
    n,
    years: Math.floor(months / 12),
    months: months % 12,
    days: cur ? cur.days : 0,
    cur,
    next,
    // 前の年にもらった分も、まだ時効になっていなければ使える（いまの分の1つ前）
    prev: n >= 1 ? { date: yukyuGrantDate(h, n - 1), days: yukyuDays(week, n - 1), until: dateOfDay(dayNum(yukyuGrantDate(h, n + 1)) - 1) } : null,
    duty: !!cur && cur.days >= 10, // 年5日の取得義務（1年に10日以上もらう人）
  };
}

/** 2027年10月1日 */
export const yukyuDateText = ({ y, m, d }) => `${y}年${m}月${d}日`;

/** 勤続の書き方（1年2か月・6か月・0か月） */
export const yukyuTenureText = (r) => (r.years ? `${r.years}年${r.months ? `${r.months}か月` : ''}` : `${r.months}か月`);
