import { parseYmd, dayNum, warekiOf, etoOf, HIZUKE_MIN, HIZUKE_MAX } from './hizuke.mjs';

// 年齢の計算（ブラウザとテストの両方で使う）
// 満年齢：誕生日の前の日が終わると1つ上がる（年齢計算ニ関スル法律）。2月29日生まれは、うるう年でない年は3月1日に上がる
// 学年：4月2日〜翌年4月1日生まれが同じ学年（4月1日生まれは早生まれ）。小学校に入るのは、6歳になったあとの4月
// 数え年：生まれた年を1歳として、1月1日に1つ上がる

const GRADES = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3', '高1', '高2', '高3', '大学1年', '大学2年', '大学3年', '大学4年'];
const PRE = { '-2': '年少', '-1': '年中', 0: '年長' };

/** その年の誕生日（2月29日生まれで、うるう年でない年は3月1日） */
function birthdayIn(y, b) {
  if (b.m === 2 && b.d === 29) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return leap ? { y, m: 2, d: 29 } : { y, m: 3, d: 1 };
  }
  return { y, m: b.m, d: b.d };
}

/** 学年（ふつうの進み方のとき。幼稚園の年少〜大学4年。それ以外は null） */
export function gradeOf(b, on) {
  const schoolYear = b.m < 4 || (b.m === 4 && b.d === 1) ? b.y - 1 : b.y; // 早生まれは1つ上の学年
  const fiscal = on.m >= 4 ? on.y : on.y - 1; // 4月からの年度
  const i = fiscal - schoolYear - 7; // 0 が小1
  if (i >= 0 && i < GRADES.length) return GRADES[i];
  if (PRE[i + 1] !== undefined && i + 1 >= -2) return PRE[i + 1];
  return null;
}

/**
 * @param {{birth:string, on:string}} p  birth：生年月日　on：計算する日（'YYYY-MM-DD'）
 */
export function nenrei({ birth, on }) {
  if (!birth) return { ok: false, empty: true, missing: 'birth' };
  const b = parseYmd(birth);
  if (!b || birth < HIZUKE_MIN || birth > HIZUKE_MAX) return { ok: false, error: '生年月日は、1873年から2200年までの日付にしてください。', field: 'birth' };
  if (!on) return { ok: false, empty: true, missing: 'on' };
  const t = parseYmd(on);
  if (!t || on < HIZUKE_MIN || on > HIZUKE_MAX) return { ok: false, error: '計算する日は、1873年から2200年までの日付にしてください。', field: 'on' };
  if (dayNum(t) < dayNum(b)) return { ok: false, error: '計算する日が、生まれる前になっています。', field: 'on' };
  const thisYear = birthdayIn(t.y, b);
  const passed = dayNum(t) >= dayNum(thisYear);
  const age = t.y - b.y - (passed ? 0 : 1);
  const next = passed ? birthdayIn(t.y + 1, b) : thisYear;
  const untilNext = dayNum(next) - dayNum(t);
  return {
    ok: true,
    age,
    kazoe: t.y - b.y + 1,
    wareki: warekiOf(b),
    eto: etoOf(b.y),
    grade: gradeOf(b, t),
    isBirthday: dayNum(t) === dayNum(thisYear),
    untilNext: dayNum(t) === dayNum(thisYear) ? 0 : untilNext,
    nextAge: passed ? age + 1 : age + 1,
    days: dayNum(t) - dayNum(b), // 生まれてから何日
  };
}
