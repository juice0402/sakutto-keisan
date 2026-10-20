import { fix, fmt } from './number.mjs';

// 清掃の作業時間の目安（ブラウザとテストの両方で使う）
// 時間 ＝ 面積 ÷（1人1時間あたりの面積 × 人数）。面積・人数・時間のうち2つから、残りの1つを出す

export const SEISOU_FIELDS = ['area', 'people', 'hours'];

/**
 * @param {{area:number|null, people:number|null, hours:number|null, speed:number|null, out:'area'|'people'|'hours'}} p
 *   speed：1人1時間あたりの面積（㎡。作業の種類や現場で違うので、自分で入れる）　hours：時間（1.5時間＝1時間30分）　out：答えを出す欄
 * 時間を出すときは1分単位で切り上げ、人数を出すときは1人単位で切り上げ（その時間で終わる人数）、面積を出すときは1㎡単位で切り捨て
 */
export function seisou({ area, people, hours, speed, out }) {
  const v = { area, people, hours };
  if (speed === null) return { ok: false, empty: true, missing: 'speed' };
  if (Number.isNaN(speed) || speed <= 0) return { ok: false, error: '1人1時間あたりの面積は、0より大きい数字で入れてください。', field: 'speed' };
  if (SEISOU_FIELDS.filter((f) => f !== out).some((f) => v[f] === null)) return { ok: false, empty: true };
  const bad = { area: '面積', people: '人数', hours: '時間' };
  for (const f of SEISOU_FIELDS) {
    if (f !== out && (Number.isNaN(v[f]) || v[f] <= 0)) return { ok: false, error: `${bad[f]}は、0より大きい数字で入れてください。`, field: f };
  }
  let a = area;
  let p = people;
  let h = hours;
  if (out === 'hours') h = Math.ceil(fix((area / (speed * people)) * 60)) / 60;
  else if (out === 'people') p = Math.ceil(fix(area / (speed * hours)));
  else a = Math.floor(fix(speed * people * hours));
  // 人数を切り上げたときは、その人数で終わる時間も出す
  const minutes = out === 'people' ? Math.ceil(fix((a / (speed * p)) * 60)) : Math.round(fix(h * 60));
  return {
    ok: true,
    out,
    area: a,
    people: p,
    hours: fix(h),
    minutes,
    personHours: fix(a / speed), // のべの作業時間（1人でやると何時間か）
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

/** 時間の欄に出す数字（1.5＝1時間30分。小数2けたまで） */
export const hoursValue = (m) => fmt(m / 60, 2);

/**
 * 作業のマス：公共の建物の清掃の積算で使う歩掛り（100㎡を1回掃除するのに何人。1人＝1日8時間）から出した、1人1時間あたりの面積
 * 1人1時間あたりの面積 ＝ 100 ÷（歩掛り × 8）を、10㎡単位（50㎡より少ないときは1㎡単位）に丸めた目安
 * buai：清掃員A・B・Cの歩掛りを足したもの。日常清掃は札幌市の清掃業務の積算（床と床以外）、定期清掃は国土交通省の積算要領の検討資料（表面洗浄）から
 */
export const SEISOU_WORKS = [
  { id: 'office', name: '事務室', kind: '日常清掃', buai: 0.034, speed: 370 },
  { id: 'hall', name: '廊下', kind: '日常清掃', buai: 0.026, speed: 480 },
  { id: 'toilet', name: 'トイレ', kind: '日常清掃', buai: 0.254, speed: 49 },
  { id: 'wash', name: '床洗浄', kind: '定期清掃', buai: 0.33, speed: 38 },
];

/** 歩掛り（人／100㎡）から1人1時間あたりの面積 */
export const speedFromBuai = (buai) => fix(100 / (buai * 8));
