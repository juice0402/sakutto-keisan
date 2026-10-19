import { fix, fmt } from './number.mjs';

// 清掃の作業時間の目安（ブラウザとテストの両方で使う）
// 時間 ＝ 面積 ÷（1人1時間あたりの面積 × 人数）。面積・人数・時間のうち2つから、残りの1つを出す

export const SEISOU_FIELDS = ['area', 'people', 'hours'];

/**
 * @param {{area:number|null, people:number|null, hours:number|null, rate:number|null, out:'area'|'people'|'hours'}} p
 *   rate：1人1時間あたりの面積（㎡）　hours：時間（1.5時間＝1時間30分）　out：答えを出す欄
 * 時間を出すときは1分単位で切り上げ、人数を出すときは1人単位で切り上げ（その時間で終わる人数）、面積を出すときは1㎡単位で切り捨て
 */
export function seisou({ area, people, hours, rate, out }) {
  const v = { area, people, hours };
  if (rate === null) return { ok: false, empty: true, missing: 'rate' };
  if (Number.isNaN(rate) || rate <= 0) return { ok: false, error: '1人1時間あたりの面積は、0より大きい数字で入れてください。', field: 'rate' };
  if (SEISOU_FIELDS.filter((f) => f !== out).some((f) => v[f] === null)) return { ok: false, empty: true };
  const bad = { area: '面積', people: '人数', hours: '時間' };
  for (const f of SEISOU_FIELDS) {
    if (f !== out && (Number.isNaN(v[f]) || v[f] <= 0)) return { ok: false, error: `${bad[f]}は、0より大きい数字で入れてください。`, field: f };
  }
  let a = area;
  let p = people;
  let h = hours;
  if (out === 'hours') h = Math.ceil(fix((area / (rate * people)) * 60)) / 60;
  else if (out === 'people') p = Math.ceil(fix(area / (rate * hours)));
  else a = Math.floor(fix(rate * people * hours));
  // 人数を切り上げたときは、その人数で終わる時間も出す
  const minutes = out === 'people' ? Math.ceil(fix((a / (rate * p)) * 60)) : Math.round(fix(h * 60));
  return {
    ok: true,
    out,
    area: a,
    people: p,
    hours: fix(h),
    minutes,
    personHours: fix(a / rate), // のべの作業時間（1人でやると何時間か）
    perPerson: fix(a / p), // 1人あたりの面積
  };
}

/** 分を「1時間30分」の形に */
export function minText(m) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}分`;
  return r ? `${fmt(h, 0)}時間${r}分` : `${fmt(h, 0)}時間`;
}
