import { fix } from './number.mjs';

// 割り勘（ブラウザとテストの両方で使う）。割り勘の計算（人数で同じ額）と、傾斜の割り勘（多め・ふつう・少なめ）で共通
// 集める額は、えらんだ単位（1円・10円・100円・1,000円）に切り上げる。集めた額と合計の差が「おつり」
// 端数を幹事が払うときは、幹事のほかの人を単位で切り捨てて、残りを幹事が払う

export const WARIKAN_UNITS = [1, 10, 100, 1000];
export const WARIKAN_MAX_PEOPLE = 100;
export const WARIKAN_MAX_TOTAL = 100000000; // 1億円
export const WARIKAN_MAX_RATE = 10;
// 傾斜の割り勘のグループ（rate ははじめの何倍）
export const WARIKAN_GROUPS = [
  { id: 'more', name: '多め', rate: 1.5 },
  { id: 'mid', name: 'ふつう', rate: 1 },
  { id: 'less', name: '少なめ', rate: 0.5 },
];

/** 単位に切り上げ・切り捨て（小数の誤差で 4,000 が 4,100 にならないように fix してから） */
const ceilTo = (x, unit) => Math.ceil(fix(x / unit)) * unit;
const floorTo = (x, unit) => Math.floor(fix(x / unit)) * unit;

function checkTotal(total) {
  if (total === null) return { ok: false, empty: true, missing: 'total' };
  if (Number.isNaN(total) || total <= 0) return { ok: false, error: '合計は、0より大きい数字で入れてください。', field: 'total' };
  if (!Number.isInteger(total)) return { ok: false, error: '合計は、1円単位で入れてください。', field: 'total' };
  if (total > WARIKAN_MAX_TOTAL) return { ok: false, error: '合計は、1億円までです。', field: 'total' };
  return null;
}

/**
 * 割り勘（人数で同じ額）
 * @param {{total:number|null, people:number|null, unit?:number}} p  total：合計（円）　people：人数　unit：集める単位（円）
 * @returns each：1人に集める額　collect：集めた額　change：おつり　low・host：端数を幹事が払うときの、ほかの人と幹事の額
 */
export function warikan({ total, people, unit = 100 }) {
  const bad = checkTotal(total);
  if (bad) return bad;
  // 1人は、12人と入れるとちゅうかもしれないので、まちがいにせず案内だけ
  if (people === null || people === 0 || people === 1) return { ok: false, empty: true, missing: 'people' };
  if (Number.isNaN(people) || !Number.isInteger(people) || people < 2) return { ok: false, error: '人数は、2人からの整数で入れてください。', field: 'people' };
  if (people > WARIKAN_MAX_PEOPLE) return { ok: false, error: `人数は、${WARIKAN_MAX_PEOPLE}人までです。`, field: 'people' };
  const each = ceilTo(total / people, unit);
  const collect = each * people;
  const low = floorTo(total / people, unit);
  return { ok: true, total, people, unit, each, collect, change: collect - total, low, host: total - low * (people - 1), exact: fix(total / people) };
}

/**
 * 傾斜の割り勘：グループごとに、ふつうの人の何倍を払うか
 * @param {{total:number|null, groups:Array<{people:number|null, rate:number|null}>, unit?:number}} p  people が空のグループは0人
 * @returns rows：人がいるグループ（index・人数・何倍・1人に集める額）　base：1倍の人の額（切り上げる前）
 */
export function warikanKeisha({ total, groups, unit = 100 }) {
  const bad = checkTotal(total);
  if (bad) return bad;
  let count = 0;
  let weight = 0;
  for (let i = 0; i < groups.length; i++) {
    const { people, rate } = groups[i];
    if (people === null || people === 0) continue;
    if (Number.isNaN(people) || !Number.isInteger(people) || people < 0) return { ok: false, error: '人数は、0以上の整数で入れてください。', field: `people-${i}` };
    if (rate === null) return { ok: false, empty: true, missing: 'rate', index: i };
    if (Number.isNaN(rate) || rate <= 0) return { ok: false, error: '何倍かは、0より大きい数字で入れてください。', field: `rate-${i}` };
    if (rate > WARIKAN_MAX_RATE) return { ok: false, error: `何倍かは、${WARIKAN_MAX_RATE}倍までです。`, field: `rate-${i}` };
    count += people;
    weight += people * rate;
  }
  if (count === 0) return { ok: false, empty: true, missing: 'people' };
  if (count < 2) return { ok: false, empty: true, missing: 'more' }; // 1人だけ：ほかのグループの人数を入れるとちゅう
  if (count > WARIKAN_MAX_PEOPLE) return { ok: false, error: `人数は、合わせて${WARIKAN_MAX_PEOPLE}人までです。`, field: 'people' };
  const base = total / weight;
  const rows = [];
  groups.forEach(({ people, rate }, index) => {
    if (people > 0) rows.push({ index, people, rate, exact: fix(base * rate), each: ceilTo(base * rate, unit) });
  });
  const collect = rows.reduce((s, r) => s + r.each * r.people, 0);
  return { ok: true, total, unit, people: count, rows, collect, change: collect - total, base: fix(base) };
}
