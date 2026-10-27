import { parseYmd, dayNum, dateOfDay, HIZUKE_MIN, HIZUKE_MAX } from './hizuke.mjs';
import { SHICHIGOSAN, YAKU, CHOJU, CHUIN, NENKI } from '../data/gyoji.mjs';

// 家族の行事の計算（七五三・厄年・長寿祝い・お食い初め・四十九日。ブラウザとテストの両方で使う）
// 数え年：生まれた年を1歳として、元日ごとに1つ上がる（太宰府天満宮・風浪宮）。その年の数え年 ＝ 年 − 生まれた年 ＋ 1

export const GYOJI_YEAR_MIN = 1873;
export const GYOJI_YEAR_MAX = 2200;

/** 日付の欄の値を確かめる（{ date } か { error }） */
function readDate(v, name) {
  if (!v) return { empty: true };
  const d = parseYmd(v);
  if (!d || v < HIZUKE_MIN || v > HIZUKE_MAX) return { error: `${name}は、1873年から2200年までの日付にしてください。` };
  return { date: d };
}
const shift = (d, n) => dateOfDay(dayNum(d) + n);

/** 年の欄の値（4けたの西暦）を確かめる */
export function readYear(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return { empty: true };
  if (!Number.isInteger(n) || n < GYOJI_YEAR_MIN || n > GYOJI_YEAR_MAX) return { error: '生まれた年は、1873〜2200の西暦で入れてください。', typing: n < 1000 };
  return { year: n };
}

/**
 * 七五三：子どもごとに、数え年と満年齢のどちらでも祝える年を出して、年ごとにまとめる
 * 生まれた年で分ける（神社の表と同じ）。数え年の◯歳の年 ＝ 生まれた年 ＋ ◯ − 1、満年齢 ＝ 生まれた年 ＋ ◯
 * @param {{birth:string, sex:'boy'|'girl'|''}[]} kids
 * @param {number} thisYear 今年
 */
export function shichigosan(kids, thisYear) {
  const plans = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    const r = readDate(k.birth, '生年月日');
    if (r.error) return { ok: false, error: r.error, field: `birth-${i}` };
    if (r.empty) return { ok: false, empty: true, missing: { kid: i, what: 'birth' } };
    if (k.sex !== 'boy' && k.sex !== 'girl') return { ok: false, empty: true, missing: { kid: i, what: 'sex' } };
    const y = r.date.y;
    for (const s of SHICHIGOSAN) {
      const who = k.sex === 'boy' ? s.boy : s.girl;
      if (!who) continue;
      const local = who === 'local';
      plans.push({ kid: i, age: s.age, rite: s.rite, local, style: 'kazoe', year: y + s.age - 1 });
      plans.push({ kid: i, age: s.age, rite: s.rite, local, style: 'man', year: y + s.age });
    }
  }
  const years = [...new Set(plans.map((p) => p.year))].sort((a, b) => a - b);
  const rows = years.map((year) => {
    const items = plans.filter((p) => p.year === year).sort((a, b) => a.kid - b.kid || a.age - b.age);
    const kidsIn = new Set(items.map((p) => p.kid));
    return { year, items, past: year < thisYear, together: kids.length > 1 && kidsIn.size === kids.length && year >= thisYear };
  });
  const coming = rows.filter((r) => !r.past);
  const together = coming.filter((r) => r.together);
  // 大きく出す年：きょうだいは全員そろって祝える近い年（男の子の3歳もふくむ）、1人なら男の子の3歳をのぞいた近い年
  const main = kids.length > 1 ? together[0] || null : coming.find((r) => r.items.some((p) => !p.local)) || coming[0] || null;
  return { ok: true, rows, next: main, together, done: !coming.length };
}

/**
 * 厄年（数え年）：前厄・本厄・後厄の年と、今年がどれか
 * @param {number} birthYear @param {'male'|'female'} sex @param {number} thisYear
 */
export function yakudoshi(birthYear, sex, thisYear) {
  const list = YAKU[sex].map((y) => ({
    age: y.age,
    big: !!y.big,
    some: !!y.some,
    mae: birthYear + y.age - 2,
    hon: birthYear + y.age - 1,
    ato: birthYear + y.age,
  }));
  const kazoe = thisYear - birthYear + 1;
  let now = null;
  for (const y of list) {
    if (thisYear === y.mae) now = { kind: '前厄', y };
    else if (thisYear === y.hon) now = { kind: '本厄', y };
    else if (thisYear === y.ato) now = { kind: '後厄', y };
    if (now) break;
  }
  const next = list.find((y) => y.hon > thisYear && !y.some) || list.find((y) => y.hon > thisYear) || null;
  return { kazoe, list, now, next };
}

/** その年に厄年になる生まれた年（早見表。前厄・本厄・後厄） */
export function yakuOfYear(year, sex) {
  return YAKU[sex].map((y) => ({ age: y.age, big: !!y.big, some: !!y.some, mae: year - y.age + 2, hon: year - y.age + 1, ato: year - y.age }));
}

/**
 * 長寿祝い：数え年で祝う年と、満年齢で祝う年。還暦は満60歳＝数え61歳なので同じ年
 * @param {number} birthYear @param {number} thisYear
 */
export function choju(birthYear, thisYear) {
  const list = CHOJU.map((c) => {
    const kanreki = c.kazoe === 61;
    return {
      ...c,
      man: kanreki ? 60 : c.kazoe,
      kazoeYear: birthYear + c.kazoe - 1,
      manYear: kanreki ? birthYear + 60 : birthYear + c.kazoe,
    };
  });
  const next = list.find((c) => c.kazoeYear >= thisYear || c.manYear >= thisYear) || null;
  return { kazoe: thisYear - birthYear + 1, list, next };
}

/** その年に長寿祝いの人の生まれた年（早見表） */
export const chojuOfYear = (year) => choju(0, 0).list.map((c) => ({ ...c, kazoeBorn: year - c.kazoe + 1, manBorn: year - c.man }));

/** 土曜と日曜（その日をふくむ前の週末と、あとの週末） */
function weekendsAround(d) {
  const n = dayNum(d);
  const wd = (((n % 7) + 11) % 7); // 0 が日曜
  const satBefore = n - ((wd + 1) % 7); // その日か前の土曜
  const satAfter = wd === 6 ? n + 7 : n + (6 - wd); // あとの土曜
  return {
    before: [dateOfDay(satBefore), dateOfDay(satBefore + 1)].filter((x) => dayNum(x) <= n),
    after: [dateOfDay(satAfter), dateOfDay(satAfter + 1)].filter((x) => dayNum(x) > n),
  };
}

/**
 * お食い初め：生まれた日を1日目に数えた100日目（99日後）と120日目。0日目に数えた生後100日（100日後）も
 */
export function okuizome(birth) {
  const r = readDate(birth, '生年月日');
  if (r.empty) return { ok: false, empty: true };
  if (r.error) return { ok: false, error: r.error };
  const d100 = shift(r.date, 99);
  return { ok: true, birth: r.date, d100, d100b: shift(r.date, 100), d120: shift(r.date, 119), weekends: weekendsAround(d100) };
}

/**
 * 四十九日：亡くなった日を1日目に数えて、7日ごとの法要（初七日〜四十九日）と年忌
 * taiya：前の日から数える（逮夜。初七日〜四十九日だけ1日早い）
 */
export function shijuku(death, taiya = false) {
  const r = readDate(death, '亡くなった日');
  if (r.empty) return { ok: false, empty: true };
  if (r.error) return { ok: false, error: r.error };
  const d = r.date;
  const chuin = CHUIN.map((name, i) => ({ name, day: (i + 1) * 7, date: shift(d, (i + 1) * 7 - 1 - (taiya ? 1 : 0)) }));
  const nenki = NENKI.map((n) => {
    const y = d.y + n.years;
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const date = d.m === 2 && d.d === 29 && !leap ? { y, m: 2, d: 28 } : { y, m: d.m, d: d.d };
    return { name: n.name, years: n.years, date };
  });
  const day49 = chuin[6].date;
  return { ok: true, death: d, taiya, day49, chuin, nenki, weekends: weekendsAround(day49) };
}
