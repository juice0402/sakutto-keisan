import { parseYmd, warekiOf, HIZUKE_MAX } from './hizuke.mjs';

// 入学・卒業年の計算（年齢の計算の下のページ。ブラウザとテストの両方で使う）
// 学年は4月2日〜翌年4月1日生まれが同じ（1月1日〜4月1日生まれは早生まれで、前の年の4月2日〜の人と同じ学年）
// 小学校は、6歳になったあとの最初の4月に入学する。いまの6・3・3・4のしくみ（1947年から）で計算するので、1940年4月2日生まれから
// 年齢は、入学は年度のはじめ、卒業は年度の終わりの満年齢（同じ学年なら、みんな同じ）

export const GAKU_MIN = '1940-04-02';

/** 学年のはじめの年（4月2日〜12月31日生まれは生まれた年、1月1日〜4月1日生まれはその前の年） */
export const cohortOf = (b) => (b.m < 4 || (b.m === 4 && b.d === 1) ? b.y - 1 : b.y);

/**
 * @param {{birth:string, ronin?:number, ryunen?:number, tandai?:boolean}} p
 *   birth：生年月日（'YYYY-MM-DD'）　ronin：大学に入るまでの浪人の年数　ryunen：大学での留年の年数　tandai：短大・専門（2年）
 * @returns rows：[{ school, kind:'入学'|'卒業', y, m, wareki:'平成23', age }]（小学校の入学から、大学か短大・専門の卒業まで）
 */
export function gakureki({ birth, ronin = 0, ryunen = 0, tandai = false }) {
  if (!birth) return { ok: false, empty: true, missing: 'birth' };
  const b = parseYmd(birth);
  if (!b || birth > HIZUKE_MAX) return { ok: false, error: '生年月日は、2200年までの日付にしてください。', field: 'birth' };
  if (birth < GAKU_MIN) return { ok: false, error: '1940年4月2日から後の生年月日にしてください。', field: 'birth' };
  const c = cohortOf(b);
  const rows = [];
  const add = (school, kind, y, age) => {
    const m = kind === '入学' ? 4 : 3;
    const w = warekiOf({ y, m, d: 1 });
    rows.push({ school, kind, y, m, wareki: `${w.era}${w.year === 1 ? '元' : w.year}`, age });
  };
  add('小学校', '入学', c + 7, 6);
  add('小学校', '卒業', c + 13, 12);
  add('中学校', '入学', c + 13, 12);
  add('中学校', '卒業', c + 16, 15);
  add('高校', '入学', c + 16, 15);
  add('高校', '卒業', c + 19, 18);
  const last = tandai ? '短大・専門' : '大学';
  const years = tandai ? 2 : 4;
  add(last, '入学', c + 19 + ronin, 18 + ronin);
  add(last, '卒業', c + 19 + ronin + years + ryunen, 18 + ronin + years + ryunen);
  return { ok: true, early: c !== b.y, cohort: c, rows };
}
