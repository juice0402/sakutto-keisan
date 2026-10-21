import { fix } from './number.mjs';

// BMI の計算（ブラウザとテストの両方で使う）
// BMI ＝ 体重（kg）÷ 身長（m）÷ 身長（m）。判定は日本肥満学会の基準（e-ヘルスネット）。大人の目安で、子どもには使わない
// 標準体重 ＝ 身長（m）× 身長（m）× 22。普通体重の範囲は、BMI（小数1けた）が18.5以上25.0未満になる体重（0.1kg単位）

export const BMI_LEVELS = [
  { max: 18.5, name: '低体重' },
  { max: 25, name: '普通体重' },
  { max: 30, name: '肥満（1度）' },
  { max: 35, name: '肥満（2度）' },
  { max: 40, name: '肥満（3度）' },
  { max: Infinity, name: '肥満（4度）' },
];

/**
 * @param {{cm:number|null, kg:number|null}} p  cm：身長（cm）　kg：体重（kg）
 */
export function bmi({ cm, kg }) {
  if (cm === null) return { ok: false, empty: true, missing: 'cm' };
  if (Number.isNaN(cm) || cm < 50 || cm > 250) return { ok: false, error: '身長は、50〜250cmで入れてください。', field: 'cm' };
  const m = cm / 100;
  const std = fix(Math.round(m * m * 22 * 10) / 10);
  // 普通体重の範囲：BMI を小数1けたに四捨五入して18.5以上25.0未満になる体重（0.1kg単位）
  const range = [fix(Math.ceil(fix(m * m * 18.45 * 10)) / 10), fix((Math.ceil(fix(m * m * 24.95 * 10)) - 1) / 10)];
  if (kg === null) return { ok: false, empty: true, missing: 'kg', std, range };
  if (Number.isNaN(kg) || kg < 10 || kg > 300) return { ok: false, error: '体重は、10〜300kgで入れてください。', field: 'kg' };
  const value = fix(Math.round(fix((kg / (m * m)) * 10)) / 10); // 小数1けたに四捨五入。判定もこの数で（表示とくいちがわないように）
  const level = BMI_LEVELS.find((l) => value < l.max);
  return { ok: true, value, level: level.name, std, range, diff: fix(kg - std) };
}
