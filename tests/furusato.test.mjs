import { test } from 'node:test';
import assert from 'node:assert/strict';
import { furusatoLimit, furusatoFromNotice, furusatoIncomeFor, furusatoCouple, furusatoBreakdown, spouseIncomeEdges, kyuyoShotoku, tokureiRatio, limitOf, TOKUREI_BANDS } from '../src/lib/furusato.mjs';
import { FURUSATO_YEARS, FURUSATO_SOURCES, FURUSATO_TETSUZUKI_SOURCES, FURUSATO_SEIDO_SOURCES, FURUSATO_FUUFU_SOURCES } from '../src/data/furusato.mjs';

const Y2026 = FURUSATO_YEARS[2026];
const man = (x) => x * 10000;
const lim = (income, fam = {}, cfg = Y2026) => furusatoLimit({ income: man(income), ...fam }, cfg).limit;

// 計算のしかたが合っているかを、前の年の税制の早見表（ふるなび 2024年3月公開・社会保険料15%・調整控除と所得金額調整控除を入れたもの）で確かめる
// 2024年の寄付＝令和6年分の所得税・令和7年度の住民税（給与所得控除の最低保障55万円・4,000円きざみ、所得税の基礎控除48万円）
const Y2024 = {
  ...Y2026,
  kyuyoMin: 550000,
  kyuyoBands: [[1800000, 0.4, -100000], ...Y2026.kyuyoBands],
  round4000: true,
  basicIncomeTax: [[24000000, 480000], [24500000, 320000], [25000000, 160000], [Infinity, 0]],
};
const FAM = {
  single: {},
  couple: { spouse: true },
  k: { koukou: 1 },
  d: { daigaku: 1 },
  ck: { spouse: true, koukou: 1 },
  kd: { koukou: 1, daigaku: 1 },
  ckd: { spouse: true, koukou: 1, daigaku: 1 },
};
const FURUNAVI = {
  300: [28000, 19000, 19000, 15000, 11000, 7000, null],
  400: [42000, 33000, 33000, 29000, 25000, 21000, 12000],
  500: [61000, 49000, 49000, 44000, 40000, 36000, 28000],
  600: [77000, 69000, 69000, 66000, 60000, 57000, 43000],
  700: [108000, 86000, 86000, 83000, 78000, 75000, 66000],
  800: [129000, 120000, 120000, 116000, 110000, 107000, 85000],
  900: [152000, 143000, 141000, 138000, 132000, 128000, 119000],
};

test('前の年の税制では、ふるなびの早見表（300〜900万円・7つの家族）と同じになる', () => {
  for (const [income, row] of Object.entries(FURUNAVI)) {
    const got = Object.values(FAM).map((f) => lim(Number(income), f, Y2024));
    row.forEach((want, i) => {
      if (want !== null) assert.equal(got[i], want, `${income}万 ${Object.keys(FAM)[i]}`);
    });
  }
});

test('2026年の寄付（令和8年分・令和9年度）のページの計算例', () => {
  // 年収500万円・ひとり：給与所得356万、社会保険料75万、住民税の課税所得238万、所得割238,000−調整控除2,500＝235,500
  // 人的控除差調整額＝基礎控除の差5万＋（所得税の基礎控除104万−48万）＝61万 → 238万−61万＝177万 → 所得税率5%
  const r = furusatoLimit({ income: man(500) }, Y2026);
  assert.deepEqual([r.kyuyo, r.social, r.taxable, r.shotokuwari, r.rate, r.ratio], [3560000, 750000, 2380000, 235500, 0.05, 0.84895]);
  assert.equal(r.limit, 57000);
  assert.equal(r.jumin, 55000);
  // 300万円・ひとり 28,000円、1,000万円・ひとり 177,000円（さとふるの2026年の早見表と同じ）
  assert.equal(lim(300), 28000);
  assert.equal(lim(1000), 177000);
});

test('2026年の早見表（ページの表）。300万円の大学生・600万円の大学生・1,000万円の夫婦＋高校生は手で計算して確かめた', () => {
  // 前の年とちがうのは、所得税の基礎控除が上がって所得税率が下がる人（特例控除の割合が上がり、上限が少し下がる）
  const want = {
    300: [28000, 19000, 19000, 14000, 11000, 6000, 2000],
    500: [57000, 49000, 49000, 44000, 40000, 36000, 28000],
    600: [77000, 69000, 69000, 62000, 57000, 54000, 43000],
    1000: [177000, 167000, 163000, 159000, 153000, 150000, 140000],
    1200: [236000, 236000, 221000, 208000, 218000, 199000, 196000], // 合計所得1,000万円をこえると配偶者控除なし
  };
  for (const [income, row] of Object.entries(want)) {
    assert.deepEqual(Object.values(FAM).map((f) => lim(Number(income), f)), row, `${income}万`);
  }
});

test('給与所得控除の最低保障74万円と、所得割がかからない人', () => {
  assert.equal(kyuyoShotoku(man(74), Y2026), 0);
  assert.equal(kyuyoShotoku(man(150), Y2026), 760000);
  assert.equal(kyuyoShotoku(man(200), Y2026), 1260000); // 190〜220万円も収入−74万円
  assert.equal(kyuyoShotoku(man(220), Y2026), 1460000);
  assert.equal(kyuyoShotoku(man(1000), Y2026), 8050000);
  // 年収119万円・ひとりは所得割がかからない（柏市の令和9年度の表）
  assert.equal(furusatoLimit({ income: 1190000 }, Y2026).none, true);
  // 扶養1人なら186万円まで
  assert.equal(furusatoLimit({ income: 1860000, spouse: true }, Y2026).none, true);
  // 年収150万円・ひとり：所得割8,000円 → 上限3,000円
  const r = furusatoLimit({ income: man(150) }, Y2026);
  assert.deepEqual([r.shotokuwari, r.limit], [8000, 3000]);
});

test('年収850万円をこえて子どもがいると所得金額調整控除', () => {
  const r = furusatoLimit({ income: man(900), koukou: 1 }, Y2026);
  assert.equal(r.total, 7050000 - 50000);
  assert.equal(furusatoLimit({ income: man(900) }, Y2026).total, 7050000);
});

test('上限は年収とともに増える（寄付額から年収の目安を2つに分けて探せる）', () => {
  for (const f of Object.values(FAM)) {
    let prev = 0;
    for (let m = 50; m <= 30000; m++) {
      const l = lim(m, f);
      assert.ok(l >= prev, `${m}万 ${JSON.stringify(f)}`);
      prev = l;
    }
  }
});

test('寄付額から年収の目安（ページの計算例・よくある質問・早見表）', () => {
  const at = (target, fam = {}) => furusatoIncomeFor({ target, ...fam }, Y2026);
  // 1万円きざみで上から見ていったときと同じ（いちばん低い年収）
  const scan = (target, fam) => {
    for (let m = 1; m <= 100000; m++) if (lim(m, fam) >= target) return m;
    return null;
  };
  for (const t of [10000, 20000, 30000, 50000, 90000, 100000, 150000, 300000, 500000, 1000000]) {
    for (const f of [{}, { spouse: true }, { koukou: 1 }, { daigaku: 1 }, { koukou: 1, daigaku: 1 }, { spouse: true, koukou: 1, daigaku: 1 }]) {
      assert.equal(at(t, f).man, scan(t, f), `${t} ${JSON.stringify(f)}`);
    }
  }
  // よくある質問：上限が1万円になる年収、5万円・30万円・50万円
  assert.deepEqual([at(10000).man, at(10000, { spouse: true }).man], [183, 228]);
  assert.deepEqual([at(50000).man, at(50000).limit, at(50000, { spouse: true }).man], [452, 50000, 503]);
  assert.deepEqual([at(300000).man, at(500000).man], [1362, 1933]);
  // 年収1,200万円ほどをこえると配偶者の控除がなくなり、夫婦もひとりと同じ
  assert.equal(at(250000).man, at(250000, { spouse: true }).man);
  assert.notEqual(at(200000).man, at(200000, { spouse: true }).man);
  // 早見表の一部（ひとり・夫婦）
  assert.deepEqual([20000, 100000, 1000000].map((t) => at(t).man), [237, 677, 3116]);
  assert.deepEqual([20000, 100000, 1000000].map((t) => at(t, { spouse: true }).man), [301, 727, 3116]);
  // 1つ下の年収では届かない
  assert.ok(lim(451) < 50000 && lim(452) >= 50000);
});

test('寄付額から年収の目安：まだ入れていない・まちがった入力', () => {
  assert.deepEqual(furusatoIncomeFor({ target: null }, Y2026), { ok: false, empty: true, missing: 'target' });
  assert.equal(furusatoIncomeFor({ target: 0 }, Y2026).field, 'target');
  assert.equal(furusatoIncomeFor({ target: NaN }, Y2026).field, 'target');
  assert.equal(furusatoIncomeFor({ target: 2000 }, Y2026).error, '2,000円より多い額を入れてください。');
  assert.equal(furusatoIncomeFor({ target: 1e9 }, Y2026).error, '年収10億円でも届かない額です。');
  assert.equal(furusatoIncomeFor({ target: 3000 }, Y2026).man, 146); // 上限3,000円は年収146万円から（150万円で3,000円）
});

test('まだ入れていない・まちがった入力', () => {
  assert.deepEqual(furusatoLimit({ income: null }, Y2026), { ok: false, empty: true, missing: 'income' });
  assert.equal(furusatoLimit({ income: 0 }, Y2026).field, 'income');
  assert.equal(furusatoLimit({ income: NaN }, Y2026).field, 'income');
  assert.equal(furusatoLimit({ income: 2e9 }, Y2026).field, 'income');
});

test('決定通知書の所得割から（控除上限額の計算）', () => {
  const r = furusatoFromNotice({ shotokuwari: 235500, rate: 0.05 });
  assert.deepEqual([r.cap, r.ratio, r.limit, r.jumin], [47100, 0.84895, 57000, 55000]);
  assert.equal(furusatoFromNotice({ shotokuwari: 300000, rate: 0.1 }).limit, 77000); // 60,000 ÷ 79.79% ＋ 2,000
  assert.equal(furusatoFromNotice({ shotokuwari: 600000, rate: 0.2 }).limit, 174000); // 120,000 ÷ 69.58% ＋ 2,000
  assert.equal(furusatoFromNotice({ shotokuwari: 0, rate: 0.05 }).none, true);
  assert.deepEqual(furusatoFromNotice({ shotokuwari: null, rate: 0.05 }), { ok: false, empty: true, missing: 'shotokuwari' });
  assert.deepEqual(furusatoFromNotice({ shotokuwari: 100000, rate: null }), { ok: false, empty: true, missing: 'rate' });
  assert.equal(furusatoFromNotice({ shotokuwari: -1, rate: 0.05 }).field, 'shotokuwari');
});

test('特例控除の割合の表（練馬区の表と同じ）', () => {
  assert.deepEqual(TOKUREI_BANDS.map((b) => tokureiRatio(b[1])), [0.84895, 0.7979, 0.6958, 0.66517, 0.56307, 0.4916, 0.44055]);
  assert.equal(tokureiRatio(0), 0.9);
  assert.equal(limitOf(100000, 0.05), 25000);
});

test('出典は確認日から90日以内（11〜1月は30日以内）', () => {
  const today = new Date(Date.now() + 9 * 3600e3); // 日本時間
  const month = today.getUTCMonth() + 1;
  const max = month >= 11 || month === 1 ? 30 : 90;
  for (const s of [...FURUSATO_SOURCES, ...FURUSATO_TETSUZUKI_SOURCES, ...FURUSATO_SEIDO_SOURCES, ...FURUSATO_FUUFU_SOURCES]) {
    const days = (today - new Date(`${s.checked}T00:00:00+09:00`)) / 86400e3;
    assert.ok(days <= max, `${s.name} の確認日 ${s.checked} から${Math.floor(days)}日たっている。本文を開いて確かめ直し、checked を直す`);
    assert.match(s.url, /^https:\/\//);
  }
});

test('共働き・夫婦の上限：配偶者控除・配偶者特別控除（令和8年分・令和9年度）', () => {
  const cpl = (income1, income2, fam = {}) => furusatoCouple({ income1: man(income1), income2: man(income2), ...fam }, Y2026);
  // 配偶者の年収136万円までは配偶者控除（収入なしと同じ）、137万円から配偶者特別控除、207万円をこえるとなし
  assert.deepEqual(spouseIncomeEdges(Y2026), { koujo: 1360000, tokubetsu: 2070000 });
  assert.equal(cpl(500, 136).a.haigu, 'koujo');
  assert.equal(cpl(500, 136).a.limit, lim(500, { spouse: true }));
  assert.equal(cpl(500, 137).a.haigu, 'tokubetsu');
  assert.equal(cpl(500, 208).a.haigu, null);
  assert.equal(cpl(500, 250).a.limit, lim(500));
  // 配偶者特別控除が小さくなるほど上限は上がる（500万円の人）
  assert.deepEqual([136, 150, 180, 200, 250].map((b) => cpl(500, b).a.limit), [49000, 49000, 51000, 56000, 57000]);
  // ページの計算例：600万円と300万円・600万円と150万円・500万円と150万円
  const ex = cpl(600, 300);
  assert.deepEqual([ex.a.limit, ex.b.limit, ex.total, ex.a.haigu], [77000, 28000, 105000, null]);
  assert.deepEqual([cpl(600, 150).a.limit, cpl(600, 150).total], [69000, 72000]);
  assert.equal(cpl(500, 150).a.limit, 49000);
  // 子の扶養はえらんだほうだけ
  assert.equal(cpl(600, 300, { koukou: 1, kidsWith: 1 }).a.limit, lim(600, { koukou: 1 }));
  assert.equal(cpl(600, 300, { koukou: 1, kidsWith: 2 }).b.limit, lim(300, { koukou: 1 }));
  // 配偶者特別控除はおたがいには受けない（年収の多いほう、同じならあなた）
  const same = cpl(180, 180);
  assert.deepEqual([same.a.haigu, same.b.haigu], ['tokubetsu', null]);
  // 本人の合計所得が1,000万円をこえると配偶者の控除はない
  assert.equal(cpl(1300, 0).a.haigu, null);
  // 収入なしの配偶者は「—」、まちがい
  assert.equal(cpl(600, 0).b.none, true);
  assert.equal(furusatoCouple({ income1: null, income2: 0 }, Y2026).missing, 'income1');
  assert.equal(furusatoCouple({ income1: 0, income2: 0 }, Y2026).error, 'どちらかの年収を入れてください。');
  assert.equal(furusatoCouple({ income1: 5e6, income2: -1 }, Y2026).field, 'income2');
});

test('控除の内わけ（ページの計算例と表）', () => {
  const b = (donation, income = 500, fam = {}) => furusatoBreakdown({ donation, income: man(income), ...fam }, Y2026);
  const ex = b(50000);
  assert.deepEqual([ex.it, ex.kihon, ex.tokurei, ex.self, ex.limit], [2450, 4800, 40750, 2000, 57000]);
  // 上限までは自己負担2,000円、こえると特例分が所得割の20%（47,100円）で止まる
  assert.deepEqual([10000, 30000, 57000].map((d) => b(d).self), [2000, 2000, 2000]);
  const over = b(70000);
  assert.deepEqual([over.tokurei, over.cap, over.self, over.capped], [47100, 47100, 12629, true]);
  assert.equal(b(100000).self, 38097);
  // 上限ちょうどの寄付は、ほとんどの年収・家族で自己負担2,000円
  for (const inc of [300, 400, 600, 800, 1000, 1500]) for (const fam of [{}, { spouse: true }, { koukou: 1, daigaku: 1 }]) {
    const L = lim(inc, fam);
    assert.equal(b(L, inc, fam).self, 2000, `${inc}万 ${JSON.stringify(fam)}`);
  }
  // 所得割がかからない年収は全部自己負担、まちがい
  assert.deepEqual([b(10000, 100).none, b(10000, 100).self], [true, 10000]);
  assert.equal(furusatoBreakdown({ donation: null, income: man(500) }, Y2026).missing, 'donation');
  assert.equal(furusatoBreakdown({ donation: 10000, income: null }, Y2026).missing, 'income');
  assert.equal(furusatoBreakdown({ donation: 0, income: man(500) }, Y2026).field, 'donation');
});
