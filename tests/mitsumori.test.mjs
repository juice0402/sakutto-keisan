import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mitsumori, mitsuMonths, mitsuKeihi, mitsuMeyasu, MITSU_KAISU } from '../src/lib/mitsumori.mjs';
import { SEISOU_WORKS } from '../src/lib/seisou.mjs';
import { ROUMU_TANKA, SEISOU_KEIHI } from '../src/data/seisou-tanka.mjs';

const pick = (r) => [r.once, r.month, r.yearly];

test('ページの計算例：300㎡を㎡単価8円で週5回', () => {
  const r = mitsumori({ area: 300, price: 8, month: null, year: 260, out: 'month' });
  assert.deepEqual(pick(r), [2400, 52000, 624000]);
  assert.equal(r.perMonth.toFixed(1), '21.7');
});

test('1か月の料金から㎡単価・面積', () => {
  const p = mitsumori({ area: 300, price: null, month: 52000, year: 260, out: 'price' });
  assert.deepEqual([p.price, ...pick(p)], [8, 2400, 52000, 624000]);
  const a = mitsumori({ area: null, price: 8, month: 52000, year: 260, out: 'area' });
  assert.equal(a.area, 300);
  // よくある質問の例：200㎡・週1回・1か月2万円なら、㎡単価は約23.08円
  const q = mitsumori({ area: 200, price: null, month: 20000, year: 52, out: 'price' });
  assert.equal(q.price.toFixed(2), '23.08');
});

test('床洗浄を月1回・年4回', () => {
  assert.deepEqual(pick(mitsumori({ area: 100, price: 78, month: null, year: 12, out: 'month' })), [7800, 7800, 93600]);
  assert.deepEqual(pick(mitsumori({ area: 100, price: 78, month: null, year: 4, out: 'month' })), [7800, 2600, 31200]);
});

test('まちがった入力・空', () => {
  assert.deepEqual(mitsumori({ area: 300, price: 8, month: null, year: null, out: 'month' }), { ok: false, empty: true, missing: 'year' });
  assert.deepEqual(mitsumori({ area: 300, price: null, month: null, year: 260, out: 'month' }), { ok: false, empty: true });
  assert.equal(mitsumori({ area: 0, price: 8, month: null, year: 260, out: 'month' }).field, 'area');
  assert.equal(mitsumori({ area: 300, price: NaN, month: null, year: 260, out: 'month' }).field, 'price');
  assert.equal(mitsumori({ area: 300, price: null, month: -1, year: 260, out: 'price' }).field, 'month');
  assert.equal(mitsumori({ area: 300, price: 8, month: null, year: 0, out: 'month' }).field, 'year');
  assert.equal(mitsumori({ area: 300, price: 8, month: null, year: 2.5, out: 'month' }).field, 'year');
  assert.equal(mitsumori({ area: 300, price: 8, month: null, year: 2001, out: 'month' }).field, 'year');
  assert.equal(mitsumori({ area: 300, price: 8, month: null, year: 2000, out: 'month' }).ok, true);
});

test('1年の帯（月ごとの回数）', () => {
  const on = (y) => mitsuMonths(y).flatMap((n, i) => (n ? [i + 1] : []));
  assert.deepEqual(on(4), [3, 6, 9, 12]);
  assert.deepEqual(on(6), [2, 4, 6, 8, 10, 12]);
  assert.deepEqual(on(1), [12]);
  assert.deepEqual(on(2), [6, 12]);
  assert.equal(mitsuMonths(260)[0].toFixed(1), '21.7');
  assert.equal(mitsuMonths(12).every((n) => n === 1), true);
  for (let y = 1; y < 12; y++) assert.equal(mitsuMonths(y).reduce((s, n) => s + n, 0), y, `年${y}回`);
});

test('回数のマスと早見表', () => {
  assert.deepEqual(MITSU_KAISU.map((k) => k.year), [260, 52, 24, 12]);
  assert.deepEqual([156, 104].map((y) => (y / 12).toFixed(1)), ['13.0', '8.7']); // 週3回・週2回
});

test('清掃員の単価：資料の全国平均は10地区のA・B・Cの単純平均', () => {
  const all = ROUMU_TANKA.regions.flatMap((r) => [r.a, r.b, r.c]);
  assert.equal(all.length, 30);
  assert.equal(Math.round(all.reduce((s, x) => s + x, 0) / all.length), ROUMU_TANKA.average);
  assert.equal(ROUMU_TANKA.average, 16793);
  const tokyo = ROUMU_TANKA.regions.find((r) => r.name === '東京');
  assert.deepEqual([tokyo.a, tokyo.b, tokyo.c], [23700, 18800, 17300]);
});

test('清掃員の単価は年度が新しいか（次の年度の単価が出たら直す）', () => {
  const limit = new Date(`${ROUMU_TANKA.until}T00:00:00+09:00`).getTime() + 90 * 86400000;
  assert.ok(Date.now() < limit, `${ROUMU_TANKA.year}の建築保全業務労務単価が古くなりました。国土交通省の次の年度の単価に直してください`);
});

test('作業のマスの㎡単価の目安（ページの表）', () => {
  assert.equal(mitsuKeihi(SEISOU_KEIHI).toFixed(4), '1.4067');
  const got = SEISOU_WORKS.map((w) => mitsuMeyasu(w.buai, ROUMU_TANKA.average, SEISOU_KEIHI));
  assert.deepEqual(got.map((m) => m.price), [8, 6.1, 60, 78]);
  assert.deepEqual(got.map((m) => m.labor.toFixed(2)), ['5.71', '4.37', '42.65', '55.42']);
});
