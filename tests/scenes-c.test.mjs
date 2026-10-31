// 生活と家族の行事の18ページに足した「計算のしくみの例・使う場面の例・まちがえやすいところ・よくある質問」の数（AdSense の再審査 #96）
// ページの文にそのまま書いた数も、ページの中で計算して出す数も、ここで確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcRate, rateFromOff, calcDiscount } from '../src/lib/waribiki.mjs';
import { jikan } from '../src/lib/jikan.mjs';
import { calcUnitPrice, compareUnitPrices } from '../src/lib/tanka.mjs';
import { nissu } from '../src/lib/nissu.mjs';
import { daiNanYoubi, ybNth, ybRow, ybAhead } from '../src/lib/dai-nan-youbi.mjs';
import { warikan, warikanKeisha } from '../src/lib/warikan.mjs';
import { bmi } from '../src/lib/bmi.mjs';
import { hensachi, hsFromDev } from '../src/lib/hensachi.mjs';
import { dilute, ratioFromPercent, volumeText, capText } from '../src/lib/kishaku.mjs';
import { hyohakuAmount, HYOHAKU_CAP, HYOHAKU_SRC } from '../src/data/hyohakuzai.mjs';
import { loan } from '../src/lib/loan.mjs';
import { shohizei } from '../src/lib/shohizei.mjs';
import { nenrei } from '../src/lib/nenrei.mjs';
import { shichigosan, yakudoshi, yakuOfYear, choju, okuizome, shijuku } from '../src/lib/gyoji.mjs';
import { CHOJU, CHOJU_COLORS } from '../src/data/gyoji.mjs';
import { weekdayOf, warekiOfYear } from '../src/lib/hizuke.mjs';
import { fmt, fix } from '../src/lib/number.mjs';

const ymdw = (d) => `${d.y}-${d.m}-${d.d}(${weekdayOf(d)})`;
const after = (start, days) => ymdw(nissu({ start, days, end: '', out: 'end' }).end);
const span = (start, end) => nissu({ start, days: null, end, out: 'days' });

test('割引率の計算：しくみの例・場面・まちがえやすいところ', () => {
  const ex = calcRate({ price: 4980, sale: 3480 });
  assert.equal(ex.off, 1500);
  assert.equal(fmt(ex.rate, 1), '30.1');
  assert.equal(fmt(calcRate({ price: 398, sale: 298 }).rate, 1), '25.1');
  const sale = calcRate({ price: 12800, sale: 9980 });
  assert.equal(sale.off, 2820);
  assert.equal(sale.rate.toFixed(1), '22.0');
  assert.equal(fmt(rateFromOff({ price: 3000, off: 500 }).rate, 1), '16.7');
  assert.equal(calcDiscount({ price: 3000, rate: 15 }).off, 450);
  assert.equal(fmt((300 / 1700) * 100, 1), '17.6'); // 割引後の値段で割ったとき（まちがい）
  assert.equal(calcRate({ price: 2000, sale: 1700 }).rate, 15);
  const two = calcDiscount({ price: 10000, rate: 20, rate2: 10 });
  assert.equal(two.final, 7200);
  assert.equal(two.totalRate, 28);
  assert.equal(two.final - calcDiscount({ price: 10000, rate: 30 }).final, 200);
  assert.equal(calcRate({ price: 1000, sale: 1200 }).rate, -20);
  assert.equal(fmt(calcRate({ price: 1200, sale: 1000 }).rate, 1), '16.7');
  assert.equal((300 / 2000) * 100, 15); // よくある質問
});

test('時間の計算：しくみの例・場面・まちがえやすいところ', () => {
  const ex = jikan([{ h: 1, m: 50 }, { h: 2, m: 40 }]);
  assert.equal(ex.minutes, 270);
  assert.equal(ex.text, '4時間30分');
  const week = jikan(Array.from({ length: 5 }, () => ({ h: 7, m: 45 })));
  assert.equal(week.text, '38時間45分');
  assert.equal(week.hours, 38.75);
  assert.equal(jikan([{ h: null, m: 42 }, { h: null, m: 58 }, { h: 1, m: 25 }]).text, '3時間5分');
  const pay = jikan([{ h: 3, m: 45 }]);
  assert.equal(pay.hours, 3.75);
  assert.equal(1100 * pay.hours, 4125);
  assert.equal(jikan([{ h: 1.3, m: null }]).text, '1時間18分');
  assert.equal(jikan([{ h: 2, m: 40 }, { h: 1, m: 30 }]).text, '4時間10分');
  assert.equal(jikan([{ h: 8, m: 30 }]).minutes - 60, jikan([{ h: 7, m: 30 }]).minutes);
});

test('まとめ買いの単価比較：しくみの例・場面・まちがえやすいところ', () => {
  const per1 = (o) => fmt(calcUnitPrice(o).per, 1);
  assert.equal(calcUnitPrice({ price: 2480, qty: 500, unit: 'ml', packs: 24 }).amount, 12000);
  assert.equal(per1({ price: 2480, qty: 500, unit: 'ml', packs: 24 }), '20.7');
  const tea = compareUnitPrices([{ price: 1058, qty: 2, unit: 'L', packs: 6 }, { price: 198, qty: 2, unit: 'L' }]);
  assert.deepEqual(tea.best, [0]);
  assert.equal(fmt(tea.results[0].per, 1), '8.8');
  assert.equal(fmt(tea.results[1].per, 1), '9.9');
  assert.equal(tea.saving, 130);
  const yog = calcUnitPrice({ price: 198, qty: 400, unit: 'g', disc: 20 });
  assert.equal(yog.pay, 158);
  assert.equal(yog.per, 39.5);
  assert.equal(per1({ price: 128, qty: 75, unit: 'g', packs: 4 }), '42.7');
  assert.equal(calcUnitPrice({ price: 198, qty: 400, unit: 'g' }).per, 49.5);
  assert.equal(per1({ price: 548, qty: 27.5, unit: 'm', packs: 12 }), '1.7');
  assert.equal(per1({ price: 598, qty: 55, unit: 'm', packs: 8 }), '1.4');
  assert.equal(per1({ price: 1180, qty: 2100, unit: 'ml', packs: 6 }), '9.4');
  assert.equal(per1({ price: 1180, qty: 350, unit: 'ml', packs: 6 }), '56.2');
  assert.equal(calcUnitPrice({ price: 298, qty: 1, unit: '個', disc: 50 }).pay, 149);
  assert.equal(per1({ price: 548, qty: null, unit: '個', packs: 12 }), '45.7');
  assert.equal(per1({ price: 598, qty: null, unit: '個', packs: 8 }), '74.8');
});

test('日数の計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  assert.equal(after('2026-04-01', 90), '2026-6-30(火)');
  assert.equal(after('2026-04-10', 90), '2026-7-9(木)');
  const exam = span('2026-10-31', '2027-02-01');
  assert.deepEqual([exam.days, exam.weeks, exam.weekRest], [93, 13, 2]);
  assert.equal(after('2024-05-01', 1000), '2027-1-26(火)');
  assert.equal(after('2026-11-01', 100), '2027-2-9(火)');
  const oct = span('2026-10-01', '2026-10-31');
  assert.deepEqual([oct.days, oct.inclusive], [30, 31]);
  assert.equal(after('2026-03-01', 90), '2026-5-30(土)');
  assert.equal(span('2026-05-30', '2026-06-01').days, 2);
  assert.equal(span('2026-03-01', '2027-03-01').days, 365);
  assert.equal(span('2027-03-01', '2028-03-01').days, 366);
});

test('第何曜日の計算：しくみの例・場面・まちがえやすいところ', () => {
  assert.equal(daiNanYoubi('2026-11-15').text, '第3日曜日');
  assert.equal(daiNanYoubi('2026-11-14').n, 2);
  assert.deepEqual([ybNth(2026, 11, 2, 3), ybNth(2026, 11, 4, 3)], [11, 25]);
  assert.equal(daiNanYoubi('2026-11-11').text, '第2水曜日');
  assert.deepEqual([ybNth(2026, 12, 3, 2), ybNth(2027, 1, 3, 2)], [15, 19]);
  assert.deepEqual(ybAhead(2026, 12, 3, 2, 2).map((a) => a.d), [15, 19]);
  assert.equal(weekdayOf({ y: 2026, m: 12, d: 1 }), '火');
  assert.deepEqual([2, 3, 4].map((w) => ybNth(2026, 12, 5, w)), [29, 30, 31]);
  assert.equal(ybNth(2026, 12, 5, 1), null);
  assert.equal(weekdayOf({ y: 2026, m: 10, d: 1 }), '木');
  assert.equal(daiNanYoubi('2026-10-05').text, '第1月曜日');
  assert.equal(ybRow({ y: 2026, m: 10, d: 5 }), 2);
  assert.equal(ybNth(2026, 12, 4, 4), 24);
});

test('割り勘の計算：しくみの例・場面・まちがえやすいところ', () => {
  const w = (total, people, unit = 100) => warikan({ total, people, unit });
  const ex = w(14300, 4);
  assert.deepEqual([ex.exact, ex.each, ex.collect, ex.change], [3575, 3600, 14400, 100]);
  assert.equal(w(23760, 5, 1).each, 4752);
  assert.deepEqual([w(23760, 5).each, w(23760, 5).change], [4800, 240]);
  assert.deepEqual([w(23760, 5, 1000).each, w(23760, 5, 1000).change], [5000, 1240]);
  assert.equal(6420 + 4380, 10800);
  assert.deepEqual([w(10800, 3).each, w(10800, 3).change], [3600, 0]);
  const host = w(32000, 7);
  assert.deepEqual([host.low, host.host, host.each, host.change], [4500, 5000, 4600, 200]);
  assert.equal(w(18000, 5).each - w(18000, 6).each, 600);
  assert.equal(w(18000, 6).each, 3000);
  assert.equal(shohizei({ amount: 10000, from: 'net', rate: 10 }).gross, 11000);
  assert.equal(w(11000, 4).each, 2800);
  assert.equal(11000 - w(10000, 4).each * 4, 1000);
  assert.deepEqual([w(25010, 8).each, w(25010, 8).change], [3200, 590]);
  assert.deepEqual([w(25010, 8, 10).each, w(25010, 8, 10).change], [3130, 30]);
});

test('傾斜割り勘の計算：しくみの例・場面・まちがえやすいところ', () => {
  const k = (total, groups, unit = 100) => warikanKeisha({ total, groups, unit });
  const ex = k(20000, [{ people: 2, rate: 1.5 }, { people: 3, rate: 1 }]);
  assert.equal(Math.round(ex.base), 3333);
  assert.deepEqual(ex.rows.map((r) => r.each), [5000, 3400]);
  const farewell = k(40000, [{ people: 1, rate: 2 }, { people: 6, rate: 1 }]);
  assert.deepEqual([...farewell.rows.map((r) => r.each), farewell.change], [10000, 5000, 0]);
  const drink = k(27000, [{ people: 5, rate: 1 }, { people: 3, rate: 0.6 }]);
  assert.deepEqual(drink.rows.map((r) => r.each), [4000, 2400]);
  assert.equal(warikan({ total: 50000, people: 10, unit: 100 }).each, 5000);
  const boss = k(50000, [{ people: 1, rate: 1.5 }, { people: 9, rate: 1 }]);
  assert.deepEqual(boss.rows.map((r) => r.each), [7200, 4800]);
  const boss1000 = k(50000, [{ people: 1, rate: 1.5 }, { people: 9, rate: 1 }], 1000);
  assert.deepEqual([...boss1000.rows.map((r) => r.each), boss1000.collect, boss1000.change], [8000, 5000, 53000, 3000]);
});

test('BMIの計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  const ex = bmi({ cm: 158, kg: 52 });
  assert.deepEqual([ex.value, ex.level, ex.std], [20.8, '普通体重', 54.9]);
  const k = bmi({ cm: 175, kg: 78 });
  assert.deepEqual([k.value, k.level, k.range[1]], [25.5, '肥満（1度）', 76.4]);
  assert.equal(fix(78 - k.range[1]), 1.6);
  const g = bmi({ cm: 160, kg: null });
  assert.deepEqual([g.range, g.std], [[47.3, 63.8], 56.3]);
  assert.equal(fmt(65 / 170 / 170, 4), '0.0022');
  assert.equal(bmi({ cm: 170, kg: 65 }).value, 22.5);
  const c = bmi({ cm: 140, kg: 33 });
  assert.deepEqual([c.value, c.level], [16.8, '低体重']);
  assert.deepEqual([bmi({ cm: 170, kg: 72.1 }).value, bmi({ cm: 170, kg: 72.1 }).level], [24.9, '普通体重']);
  assert.deepEqual([bmi({ cm: 170, kg: 72.2 }).value, bmi({ cm: 170, kg: 72.2 }).level], [25, '肥満（1度）']);
  const s = bmi({ cm: 170, kg: null });
  assert.deepEqual([s.std, s.range[1]], [63.6, 72.1]);
});

test('偏差値の計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  const sc = (score, mean, sd) => hensachi({ dev: null, score, mean, sd, from: 'score' });
  const ex = sc(47, 55, 8);
  assert.deepEqual([ex.dev, ex.up.num], [40, '84.1']);
  assert.equal(sc(70, 60, 10).dev, 60);
  assert.equal(sc(65, 50, 15).dev, 60);
  assert.equal(hsFromDev(58).up.num, '21.2');
  assert.equal(Math.round((2000 * 21.2) / 100), 424);
  assert.equal(sc(78, 60, 12).dev, 65);
  assert.deepEqual([hsFromDev(60).up.num, hsFromDev(60).rank], ['15.9', 16]);
  assert.equal(hsFromDev(70).up.num, '2.3');
  assert.equal(sc(72, 60, 4).dev, 80);
  assert.deepEqual([hsFromDev(55).up.num, hsFromDev(65).up.num], ['30.9', '6.7']);
});

test('次亜塩素酸ナトリウムの薄め方：しくみの例・場面・まちがえやすいところ', () => {
  assert.equal(ratioFromPercent(HYOHAKU_SRC, 0.05).ratio, 120);
  assert.equal(ratioFromPercent(HYOHAKU_SRC, 0.02).ratio, 300);
  assert.equal(volumeText(hyohakuAmount('0.02', 2000)), '6.7ml');
  const vomit = hyohakuAmount('0.1', 500);
  assert.deepEqual([volumeText(vomit), capText(vomit, HYOHAKU_CAP)], ['8.5ml', '約0.3杯']);
  const table = hyohakuAmount('0.05', 2000);
  assert.deepEqual([volumeText(table), capText(table, HYOHAKU_CAP)], ['17ml', '約0.7杯']);
  const cap = (HYOHAKU_CAP * HYOHAKU_SRC) / (1000 + HYOHAKU_CAP); // ％
  assert.equal(fmt(cap, 2), '0.15');
  assert.equal(Math.round(cap / 0.05), 3);
  assert.equal(volumeText(hyohakuAmount('0.05', 1000)), '8.4ml');
  assert.equal(fmt((8.4 * 4) / (1000 + 8.4), 3), '0.033');
  assert.equal(volumeText(dilute({ ratio: ratioFromPercent(4, 0.05).ratio, amount: 1000, from: 'water' }).concentrate), '13ml');
  assert.equal(volumeText(dilute({ ratio: 120, amount: 1000, from: 'water' }).total), '1.01L');
  assert.equal(volumeText(dilute({ ratio: 120, amount: 1000, from: 'total' }).concentrate), '8.3ml');
});

test('ローンの計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  const base = loan({ man: 3000, rate: 1, years: 35 });
  assert.equal(base.monthly, 84686);
  assert.equal((base.principal * 0.01) / 12, 25000);
  assert.equal(base.monthly - 25000, 59686);
  const ex = loan({ man: 300, rate: 2, years: 5 });
  assert.deepEqual([ex.monthly, ex.interest], [52584, 155040]);
  const car = loan({ man: 250, rate: 3, years: 5 });
  assert.deepEqual([car.monthly, car.total, car.interest], [44922, 2695320, 195320]);
  const r15 = loan({ man: 3000, rate: 1.5, years: 35 });
  assert.equal(r15.monthly, 91856);
  assert.equal(Math.round((r15.interest - base.interest) / 10000), 301);
  const y25 = loan({ man: 3000, rate: 1, years: 25 });
  assert.equal(y25.monthly, 113062);
  assert.equal(y25.monthly - base.monthly, 28376);
  assert.equal(Math.round((base.interest - y25.interest) / 10000), 165);
  // 元金均等返済（ツールでは出さない。くらべる数だけ）
  const first = Math.round(30000000 / 420 + (30000000 * 0.01) / 12);
  const interest = Math.round(((30000000 * 0.01) / 12) * (420 + 1) / 2);
  assert.equal(first, 96429);
  assert.equal(Math.round((first - base.monthly) / 100) * 100, 11700);
  assert.equal(Math.round(interest / 10000), 526);
  assert.equal(Math.round((base.interest - interest) / 10000), 31);
  const typo = loan({ man: 3000, rate: 0.01, years: 35 });
  assert.equal(typo.monthly, 71554);
  assert.equal(base.monthly - typo.monthly, 13132);
  assert.equal(loan({ man: 3000000, rate: 1, years: 35 }).ok, false);
  assert.equal(loan({ man: 3000, rate: 0, years: 35 }).monthly, 71429);
});

test('消費税の計算：しくみの例・場面・まちがえやすいところ', () => {
  const t = (amount, from, rate) => shohizei({ amount, from, rate });
  assert.deepEqual([t(3300, 'gross', 10).tax, t(3300, 'gross', 10).net], [300, 3000]);
  assert.equal(t(540, 'gross', 8).tax, 40);
  assert.equal(t(4980, 'net', 10).gross, 5478);
  assert.deepEqual([t(680, 'net', 8).gross, t(680, 'net', 10).gross], [734, 748]);
  assert.deepEqual([t(55000, 'gross', 10).tax, t(55000, 'gross', 10).net], [5000, 50000]);
  assert.equal(t(98, 'net', 8).gross * 3, 315);
  assert.equal(t(294, 'net', 8).gross, 317);
  assert.deepEqual([t(1100, 'net', 10).gross, t(1100, 'net', 10).tax], [1210, 110]);
  assert.equal(t(1100, 'gross', 10).net, 1000);
});

test('年齢の計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  const ex = nenrei({ birth: '2010-12-20', on: '2026-10-31' });
  assert.deepEqual([ex.age, ex.kazoe], [15, 17]);
  const doc = nenrei({ birth: '1998-11-20', on: '2026-11-15' });
  assert.deepEqual([doc.age, doc.untilNext, doc.nextAge], [27, 5, 28]);
  assert.equal(nenrei({ birth: '2019-04-01', on: '2026-10-31' }).grade, '小2');
  assert.equal(nenrei({ birth: '2019-04-02', on: '2026-10-31' }).grade, '小1');
  assert.equal(after('2000-01-01', 10000), '2027-5-19(水)');
  assert.equal(nenrei({ birth: '1987-12-10', on: '2026-10-31' }).age, 38);
  const baby = nenrei({ birth: '2025-12-31', on: '2026-01-01' });
  assert.deepEqual([baby.kazoe, baby.age], [2, 0]);
  // 111歳（2026年なら1915年か1914年生まれ。数え111歳は皇寿）
  assert.equal(nenrei({ birth: '1915-01-01', on: '2026-10-31' }).age, 111);
  assert.equal(nenrei({ birth: '1914-12-31', on: '2026-10-31' }).age, 111);
  assert.deepEqual([warekiOfYear(1915).text, warekiOfYear(1914).text], ['大正4年', '大正3年']);
  assert.equal(CHOJU.find((c) => c.name === '皇寿').kazoe, 111);
});

test('七五三の計算：しくみの例・場面・まちがえやすいところ', () => {
  const boy = shichigosan([{ birth: '2021-06-01', sex: 'boy' }], 2026).rows.filter((r) => r.items[0].age === 5).map((r) => r.year);
  assert.deepEqual(boy, [2025, 2026]);
  const sib = shichigosan([{ birth: '2020-06-01', sex: 'girl' }, { birth: '2022-06-01', sex: 'boy' }], 2026);
  assert.deepEqual(sib.together.map((r) => [r.year, r.items.map((p) => `${p.style}${p.age}`).join(',')]), [[2026, 'kazoe7,kazoe5'], [2027, 'man7,man5']]);
  const sis = shichigosan([{ birth: '2024-06-01', sex: 'girl' }, { birth: '2025-06-01', sex: 'girl' }], 2026);
  assert.deepEqual(sis.together[0].year, 2027);
  assert.deepEqual(sis.together[0].items.map((p) => `${p.style}${p.age}`), ['man3', 'kazoe3']);
  const g24 = shichigosan([{ birth: '2024-06-01', sex: 'girl' }], 2026).rows.filter((r) => r.items[0].age === 3).map((r) => r.year);
  assert.deepEqual(g24, [2026, 2027]);
  const dec = shichigosan([{ birth: '2023-12-20', sex: 'girl' }], 2026).rows.find((r) => r.items[0].style === 'man' && r.items[0].age === 3);
  assert.equal(dec.year, 2026);
  assert.equal(nenrei({ birth: '2023-12-20', on: '2026-11-15' }).age, 2);
});

test('厄年の計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  const f94 = yakudoshi(1994, 'female', 2026);
  assert.deepEqual([f94.kazoe, f94.now.kind, f94.now.y.big], [33, '本厄', true]);
  assert.equal(yakudoshi(1985, 'male', 2026).now.kind, '本厄');
  const m03 = yakudoshi(2003, 'male', 2026);
  assert.deepEqual([m03.now.kind, m03.now.y.mae, m03.now.y.hon, m03.now.y.ato, m03.now.y.age], ['前厄', 2026, 2027, 2028, 25]);
  assert.equal(nenrei({ birth: '1985-12-15', on: '2026-10-15' }).age, 40);
  assert.equal(yakudoshi(1985, 'male', 2026).kazoe, 42);
  const f66 = yakudoshi(1966, 'female', 2026);
  assert.deepEqual([f66.kazoe, f66.now.y.some], [61, true]);
  assert.deepEqual(yakuOfYear(2026, 'male').map((r) => r.hon), [2002, 1985, 1966]);
  assert.deepEqual(yakuOfYear(2026, 'female').filter((r) => !r.some).map((r) => r.hon), [2008, 1994, 1990]);
});

test('長寿祝いの計算：しくみの例・場面・まちがえやすいところ・色', () => {
  const cy = (born, name) => choju(born, 2026).list.find((c) => c.name === name);
  assert.deepEqual([cy(1956, '古希').kazoeYear, cy(1956, '古希').manYear, cy(1956, '喜寿').kazoeYear], [2025, 2026, 2032]);
  assert.deepEqual([cy(1966, '還暦').kazoeYear, cy(1966, '還暦').manYear, cy(1966, '古希').kazoeYear, cy(1966, '古希').manYear], [2026, 2026, 2035, 2036]);
  assert.deepEqual([cy(1939, '米寿').kazoeYear, cy(1939, '米寿').manYear], [2026, 2027]);
  assert.equal(2025 - 1966 + 1, 60); // 数え60歳になる年
  assert.equal(warekiOfYear(1966).text, '昭和41年');
  // 色は高島屋の案内のとおり（百寿・茶寿・皇寿はなし）
  assert.deepEqual(CHOJU.map((c) => CHOJU_COLORS[c.name] || '—'), ['赤', '緑', '藍色', '黄色', 'オレンジ', 'ベージュ', '紫', '白', '—', '—', '—']);
});

test('お食い初めの計算：しくみの例・場面・まちがえやすいところ・よくある質問', () => {
  const o = (b) => okuizome(b);
  assert.deepEqual([ymdw(o('2026-06-15').d100), ymdw(o('2026-06-15').d120)], ['2026-9-22(火)', '2026-10-12(月)']);
  const m3 = o('2026-03-03');
  assert.equal(ymdw(m3.d100), '2026-6-10(水)');
  assert.deepEqual([m3.weekends.before.map(ymdw), m3.weekends.after.map(ymdw)], [['2026-6-6(土)', '2026-6-7(日)'], ['2026-6-13(土)', '2026-6-14(日)']]);
  assert.deepEqual([ymdw(o('2026-02-20').d100), ymdw(o('2026-02-20').d120)], ['2026-5-30(土)', '2026-6-19(金)']);
  assert.deepEqual([ymdw(o('2026-05-10').d100), ymdw(o('2026-05-10').d100b)], ['2026-8-17(月)', '2026-8-18(火)']);
  assert.equal(ymdw(o('2026-01-10').d100), '2026-4-19(日)');
  assert.equal(ymdw(o('2027-12-01').d100), '2028-3-9(木)');
});

test('四十九日の計算：しくみの例・場面・まちがえやすいところ', () => {
  const m3 = shijuku('2026-03-10');
  assert.deepEqual([ymdw(m3.chuin[0].date), ymdw(m3.day49)], ['2026-3-16(月)', '2026-4-27(月)']);
  assert.deepEqual(m3.weekends.before.map(ymdw), ['2026-4-25(土)', '2026-4-26(日)']);
  const d = shijuku('2026-12-20');
  assert.equal(ymdw(d.day49), '2027-2-6(土)');
  assert.equal(after('2026-12-20', 49), '2027-2-7(日)');
  const nen = (name) => d.nenki.find((n) => n.name === name).date.y;
  assert.deepEqual([nen('一周忌'), nen('三回忌'), nen('七回忌')], [2027, 2028, 2032]);
  assert.equal(ymdw(shijuku('2026-12-20', true).day49), '2027-2-5(金)');
});
