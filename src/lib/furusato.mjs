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

// 所得税の速算表（課税所得 → 税額。国税庁 No.2260）。控除の内わけで、所得税から戻る額の上限に使う
const IT_TABLE = [
  [1950000, 0.05, 0],
  [3300000, 0.1, 97500],
  [6950000, 0.2, 427500],
  [9000000, 0.23, 636000],
  [18000000, 0.33, 1536000],
  [40000000, 0.4, 2796000],
  [Infinity, 0.45, 4796000],
];
const fzIncomeTax = (taxable) => {
  const [, rate, minus] = fzBand(IT_TABLE, taxable);
  return Math.max(0, Math.floor(taxable * rate - minus));
};

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

/** 配偶者特別控除の額（配偶者の合計所得の区分 × 本人の合計所得 900万円以下・950万円以下・1,000万円以下） */
function spouseSpecial(table, spouseTotal, total) {
  if (total > 10000000) return 0;
  const row = table.find((r) => spouseTotal <= r[0]);
  return row ? row[1][total <= 9000000 ? 0 : total <= 9500000 ? 1 : 2] : 0;
}

/**
 * はじめての3問：年収と家族から
 * @param {{income:number|null, spouse:boolean, spouseIncome:number|null, koukou:number, daigaku:number}} p
 *   income：年収（給与の額面・円）　spouse：配偶者を扶養（収入なし）　koukou：扶養している高校生（16〜18歳）　daigaku：大学生（19〜22歳）
 *   spouseIncome：配偶者の年収（給与の額面・円。共働き・夫婦の上限で使う）。入れると、配偶者の合計所得から配偶者控除か配偶者特別控除を決める
 * @param {object} cfg  src/data/furusato.mjs の FURUSATO_YEARS[年]
 */
export function furusatoLimit({ income, spouse = false, spouseIncome = null, koukou = 0, daigaku = 0 }, cfg) {
  if (income === null || income === undefined) return { ok: false, empty: true, missing: 'income' };
  if (!Number.isFinite(income) || income <= 0) return { ok: false, error: '年収を入れてください。', field: 'income' };
  if (income > 1e9) return { ok: false, error: '年収は10億円までにしてください。', field: 'income' };
  const kyuyo = kyuyoShotoku(income, cfg);
  // 所得金額調整控除：年収850万円をこえて、23歳未満の扶養親族がいる人
  const kids = koukou + daigaku;
  const adjust = income > 8500000 && kids > 0 ? Math.ceil((Math.min(income, 10000000) - 8500000) * 0.1) : 0;
  const total = Math.max(0, kyuyo - adjust); // 合計所得金額（＝総所得金額等）
  const social = Math.floor(income * cfg.socialRate);
  // 配偶者：収入なし（spouse）か、配偶者の年収から。配偶者控除（koujo）・配偶者特別控除（tokubetsu）・なし
  let haigu = spouse ? 'koujo' : null;
  let spouseTotal = 0;
  if (spouseIncome !== null && spouseIncome !== undefined) {
    spouseTotal = kyuyoShotoku(spouseIncome, cfg);
    haigu = spouseTotal <= cfg.spouseLimit ? 'koujo' : spouseTotal <= cfg.spouseSpecialMax ? 'tokubetsu' : null;
  }
  const isSpouse = haigu === 'koujo';
  const people = 1 + (isSpouse ? 1 : 0) + kids;

  // 住民税：所得割がかからない人
  const hikazei = cfg.hikazei.per * people + cfg.hikazei.plus + (people > 1 ? cfg.hikazei.family : 0);
  // 所得税の課税所得（税率を見るため）
  const itBasic = fzBandValue(cfg.basicIncomeTax, total);
  const itSpouse = isSpouse ? fzBandValue(cfg.spouseIncomeTax, total) : haigu === 'tokubetsu' ? spouseSpecial(cfg.spouseSpecialIncomeTax, spouseTotal, total) : 0;
  const itDeduct = social + itBasic + itSpouse + koukou * cfg.koukou.incomeTax + daigaku * cfg.daigaku.incomeTax;
  const itTaxable = fzFloor(Math.max(0, total - itDeduct), 1000);
  // 住民税の課税所得と所得割
  const rtSpouse = isSpouse ? fzBandValue(cfg.spouseResident, total) : haigu === 'tokubetsu' ? spouseSpecial(cfg.spouseSpecialResident, spouseTotal, total) : 0;
  const rtDeduct = social + fzBandValue(cfg.basicResident, total) + rtSpouse + koukou * cfg.koukou.resident + daigaku * cfg.daigaku.resident;
  const taxable = fzFloor(Math.max(0, total - rtDeduct), 1000);
  // 調整控除の人的控除の差（配偶者特別控除の分はない。綾川町の令和8年度以降の表）
  const diff = fzBandValue(cfg.diffBasic, total) + (isSpouse ? fzBandValue(cfg.diffSpouse, total) : 0) + koukou * cfg.diffKoukou + daigaku * cfg.diffDaigaku;
  let shotokuwari = 0;
  if (total > hikazei && taxable > 0) {
    const before = fzFloor(taxable * 0.06, 100) + fzFloor(taxable * 0.04, 100); // 市町村6%・都道府県4%
    let adj = 0;
    if (total <= 25000000) adj = taxable <= 2000000 ? Math.min(diff, taxable) * 0.05 : Math.max((diff - (taxable - 2000000)) * 0.05, 2500);
    shotokuwari = Math.max(0, Math.floor(before - adj));
  }
  if (shotokuwari === 0) {
    return { ok: true, none: true, income, kyuyo, total, social, taxable, shotokuwari: 0, limit: 0, haigu: rtSpouse ? haigu : null };
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
    haigu: rtSpouse ? haigu : null, // 受けた配偶者の控除（本人の合計所得が1,000万円をこえると、なし）
  };
}

/** 配偶者控除・配偶者特別控除になる配偶者の年収（給与だけのとき）の上限（1,000円きざみ）。共働き・夫婦の上限のよくある質問 */
export function spouseIncomeEdges(cfg) {
  const edge = (limit) => {
    let y = 0;
    while (kyuyoShotoku(y + 1000, cfg) <= limit) y += 1000;
    return y;
  };
  return { koujo: edge(cfg.spouseLimit), tokubetsu: edge(cfg.spouseSpecialMax) };
}

/**
 * 共働き・夫婦の上限：2人の年収と、扶養している16歳以上の子と、子を扶養する人から、それぞれの上限と合計
 * 配偶者控除・配偶者特別控除は、年収の多いほう（同じならあなた）だけが受ける（2人がおたがいに受けることはできない）
 * @param {{income1:number|null, income2:number|null, koukou:number, daigaku:number, kidsWith:1|2}} p  income1：あなたの年収（円）　income2：配偶者の年収（円。0もよい）
 */
export function furusatoCouple({ income1, income2, koukou = 0, daigaku = 0, kidsWith = 1 }, cfg) {
  for (const [v, field] of [[income1, 'income1'], [income2, 'income2']]) {
    if (v === null || v === undefined) return { ok: false, empty: true, missing: field };
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: '年収を入れてください。', field };
    if (v > 1e9) return { ok: false, error: '年収は10億円までにしてください。', field };
  }
  if (income1 === 0 && income2 === 0) return { ok: false, error: 'どちらかの年収を入れてください。', field: 'income1' };
  const kids = { koukou, daigaku };
  const firstHigh = income1 >= income2;
  const one = (income, other, claim, withKids) =>
    income > 0
      ? furusatoLimit({ income, spouseIncome: claim ? other : null, ...(withKids ? kids : {}) }, cfg)
      : { ok: true, none: true, income: 0, limit: 0, haigu: null };
  const a = one(income1, income2, firstHigh, kidsWith === 1);
  const b = one(income2, income1, !firstHigh, kidsWith === 2);
  return { ok: true, a, b, total: a.limit + b.limit };
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
 * 控除の内わけ：寄付額を、所得税から戻る分・住民税の基本分・住民税の特例分・自己負担に分ける（総務省の式）
 * 所得税 ＝（寄付額 − 2,000円）× 所得税率 × 1.021、基本分 ＝（寄付額 − 2,000円）× 10%、
 * 特例分 ＝（寄付額 − 2,000円）×（90% − 所得税率 × 1.021）を所得割の20%まで。1円未満は四捨五入（目安）。のこりが自己負担
 * 所得税と基本分の、所得に対する上限（40%・30%）は、給与の人の目安では届かないので入れない
 * @param {{donation:number|null, income:number|null, spouse:boolean, koukou:number, daigaku:number}} p  donation：1年の寄付の合計（円）
 */
export function furusatoBreakdown({ donation, income, spouse = false, koukou = 0, daigaku = 0 }, cfg) {
  if (donation === null || donation === undefined) return { ok: false, empty: true, missing: 'donation' };
  if (!Number.isFinite(donation) || donation <= 0) return { ok: false, error: '寄付の合計を入れてください。', field: 'donation' };
  if (donation > 1e9) return { ok: false, error: '寄付の合計は10億円までにしてください。', field: 'donation' };
  const r = furusatoLimit({ income, spouse, koukou, daigaku }, cfg);
  if (!r.ok) return r;
  if (r.none) return { ok: true, none: true, donation, limit: 0, it: 0, kihon: 0, tokurei: 0, self: donation, over: donation };
  const base = Math.max(0, donation - 2000);
  // 所得税がかからない人（課税所得0円）は所得税からは戻らない。戻るのは所得税（復興特別所得税こみ）の額まで
  const itRate = r.itTaxable > 0 ? r.itRate : 0;
  const itTax = Math.floor(fzIncomeTax(r.itTaxable) * 1.021);
  const it = Math.min(Math.round(base * itRate * 1.021), itTax);
  const kihon = Math.round(base * 0.1);
  const cap = Math.floor(r.shotokuwari * 0.2);
  const raw = base * tokureiRatio(r.rate);
  const capped = raw > cap;
  // 特例分は、所得税と基本分の残りを埋める額（税率が同じなら合計で寄付額 − 2,000円）。四捨五入の1円のずれを出さない
  const tokurei = capped ? cap : itRate === r.rate && it < itTax ? base - it - kihon : Math.round(raw);
  const self = donation - it - kihon - tokurei;
  return { ok: true, none: false, donation, limit: r.limit, it, kihon, tokurei, cap, capped, self, over: Math.max(0, self - 2000), itRate, rate: r.rate };
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
