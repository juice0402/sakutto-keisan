// ふるさと納税の上限の目安（総務省の式。ブラウザとテストの両方で使う）
// 上限 ＝ 住民税の所得割（調整控除のあと）× 20% ÷（90% − 所得税率 × 1.021）＋ 2,000円。1,000円未満は切り捨て
// 所得税率は、住民税の課税所得から人的控除差調整額を引いた額の帯で決める（地方税法。特例控除の割合の表）
// 年収から出すとき（はじめての3問）は、給与だけ・社会保険料は年収の15%・ほかの控除なしと仮定する。数字は src/data/furusato.mjs

// 特例控除の割合の帯（課税所得 − 人的控除差調整額）と所得税率。0円より下は所得税率0（割合90%）
export const TOKUREI_BANDS = [
  [1950000, 0.05],
  [3300000, 0.1],
  [6950000, 0.2],
  [9000000, 0.23],
  [18000000, 0.33],
  [40000000, 0.4],
  [Infinity, 0.45],
];
export const FURUSATO_RATES = TOKUREI_BANDS.map((b) => b[1]);

const fzBand = (bands, x) => bands.find((b) => x <= b[0]);
const fzBandValue = (bands, x) => fzBand(bands, x)[1];
const fzFloor = (x, unit) => Math.floor(x / unit) * unit;

/** 特例控除の割合（90% − 所得税率 × 1.021）。小数の誤差を消す */
export const tokureiRatio = (rate) => Number((0.9 - rate * 1.021).toFixed(6));

/** 所得割（調整控除のあと）と所得税率から上限の目安（1,000円未満切り捨て） */
export const limitOf = (shotokuwari, rate) => fzFloor((shotokuwari * 0.2) / tokureiRatio(rate) + 2000, 1000);

/** 給与所得（年収 − 給与所得控除） */
export function kyuyoShotoku(income, cfg) {
  if (income <= cfg.kyuyoMin) return 0;
  const base = cfg.round4000 && income >= 1625000 && income < 6600000 ? fzFloor(income, 4000) : income;
  const [, rate, add] = fzBand(cfg.kyuyoBands, income);
  const byBand = rate ? base - (base * rate + add) : income - add;
  return Math.max(0, Math.min(income - cfg.kyuyoMin, byBand));
}

/**
 * はじめての3問：年収と家族から
 * @param {{income:number|null, spouse:boolean, koukou:number, daigaku:number}} p
 *   income：年収（給与の額面・円）　spouse：配偶者を扶養（収入なし）　koukou：扶養している高校生（16〜18歳）　daigaku：大学生（19〜22歳）
 * @param {object} cfg  src/data/furusato.mjs の FURUSATO_YEARS[年]
 */
export function furusatoLimit({ income, spouse = false, koukou = 0, daigaku = 0 }, cfg) {
  if (income === null || income === undefined) return { ok: false, empty: true, missing: 'income' };
  if (!Number.isFinite(income) || income <= 0) return { ok: false, error: '年収を入れてください。', field: 'income' };
  if (income > 1e9) return { ok: false, error: '年収は10億円までにしてください。', field: 'income' };
  const kyuyo = kyuyoShotoku(income, cfg);
  // 所得金額調整控除：年収850万円をこえて、23歳未満の扶養親族がいる人
  const kids = koukou + daigaku;
  const adjust = income > 8500000 && kids > 0 ? Math.ceil((Math.min(income, 10000000) - 8500000) * 0.1) : 0;
  const total = Math.max(0, kyuyo - adjust); // 合計所得金額（＝総所得金額等）
  const social = Math.floor(income * cfg.socialRate);
  const people = 1 + (spouse ? 1 : 0) + kids;

  // 住民税：所得割がかからない人
  const hikazei = cfg.hikazei.per * people + cfg.hikazei.plus + (people > 1 ? cfg.hikazei.family : 0);
  // 所得税の課税所得（税率を見るため）
  const itBasic = fzBandValue(cfg.basicIncomeTax, total);
  const itDeduct = social + itBasic + (spouse ? fzBandValue(cfg.spouseIncomeTax, total) : 0) + koukou * cfg.koukou.incomeTax + daigaku * cfg.daigaku.incomeTax;
  const itTaxable = fzFloor(Math.max(0, total - itDeduct), 1000);
  // 住民税の課税所得と所得割
  const rtDeduct = social + fzBandValue(cfg.basicResident, total) + (spouse ? fzBandValue(cfg.spouseResident, total) : 0) + koukou * cfg.koukou.resident + daigaku * cfg.daigaku.resident;
  const taxable = fzFloor(Math.max(0, total - rtDeduct), 1000);
  const diff = fzBandValue(cfg.diffBasic, total) + (spouse ? fzBandValue(cfg.diffSpouse, total) : 0) + koukou * cfg.diffKoukou + daigaku * cfg.diffDaigaku;
  let shotokuwari = 0;
  if (total > hikazei && taxable > 0) {
    const before = fzFloor(taxable * 0.06, 100) + fzFloor(taxable * 0.04, 100); // 市町村6%・都道府県4%
    let adj = 0;
    if (total <= 25000000) adj = taxable <= 2000000 ? Math.min(diff, taxable) * 0.05 : Math.max((diff - (taxable - 2000000)) * 0.05, 2500);
    shotokuwari = Math.max(0, Math.floor(before - adj));
  }
  if (shotokuwari === 0) {
    return { ok: true, none: true, income, kyuyo, total, social, taxable, shotokuwari: 0, limit: 0 };
  }
  // 特例控除の割合を決める所得税率
  const sabun = diff + Math.max(0, itBasic - cfg.basicIncomeTaxBase);
  const rateBase = taxable - sabun;
  const rate = rateBase < 0 ? 0 : fzBandValue(TOKUREI_BANDS, rateBase);
  const limit = limitOf(shotokuwari, rate);
  return {
    ok: true,
    none: false,
    income,
    kyuyo,
    total,
    social,
    itTaxable,
    itRate: fzBandValue(TOKUREI_BANDS, itTaxable), // 所得税の税率（確定申告で戻る分の目安）
    taxable,
    shotokuwari,
    rate,
    ratio: tokureiRatio(rate),
    limit,
    jumin: limit - 2000, // ワンストップ特例なら、翌年度の住民税から減る額（上限まで寄付したとき）
  };
}

/**
 * 寄付したい額から、上限がその額に届く年収の目安（1万円きざみ）。上限は年収とともに増えるので、2つに分けて探す
 * @param {{target:number|null, spouse:boolean, koukou:number, daigaku:number}} p  target：寄付したい額（円）
 * @param {object} cfg  src/data/furusato.mjs の FURUSATO_YEARS[年]
 */
export function furusatoIncomeFor({ target, spouse = false, koukou = 0, daigaku = 0 }, cfg) {
  if (target === null || target === undefined) return { ok: false, empty: true, missing: 'target' };
  if (!Number.isFinite(target) || target <= 0) return { ok: false, error: '寄付したい額を入れてください。', field: 'target' };
  if (target <= 2000) return { ok: false, error: '2,000円より多い額を入れてください。', field: 'target' };
  const limitAt = (man) => furusatoLimit({ income: man * 10000, spouse, koukou, daigaku }, cfg);
  let lo = 1;
  let hi = 100000; // 1万円〜10億円
  if (limitAt(hi).limit < target) return { ok: false, error: '年収10億円でも届かない額です。', field: 'target' };
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (limitAt(mid).limit >= target) hi = mid;
    else lo = mid + 1;
  }
  const res = limitAt(lo);
  return { ok: true, target, man: lo, income: lo * 10000, limit: res.limit, jumin: res.jumin, rate: res.rate };
}

/**
 * 控除上限額の計算：住民税の決定通知書の所得割（調整控除のあと・税額控除の前）と、所得税率から
 * @param {{shotokuwari:number|null, rate:number|null}} p
 */
export function furusatoFromNotice({ shotokuwari, rate }) {
  if (shotokuwari === null || shotokuwari === undefined) return { ok: false, empty: true, missing: 'shotokuwari' };
  if (!Number.isFinite(shotokuwari) || shotokuwari < 0) return { ok: false, error: '所得割の額を入れてください。', field: 'shotokuwari' };
  if (shotokuwari > 1e9) return { ok: false, error: '所得割は10億円までにしてください。', field: 'shotokuwari' };
  if (rate === null || rate === undefined) return { ok: false, empty: true, missing: 'rate' };
  if (shotokuwari === 0) return { ok: true, none: true, shotokuwari: 0, rate, limit: 0 };
  const cap = Math.floor(shotokuwari * 0.2);
  const ratio = tokureiRatio(rate);
  const limit = limitOf(shotokuwari, rate);
  return { ok: true, none: false, shotokuwari, rate, cap, ratio, limit, jumin: limit - 2000 };
}
