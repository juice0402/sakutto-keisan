import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daiNanYoubi, ybNth, ybAhead, ybHolidays, ybRow, ybGrid, ybMonthDays } from '../src/lib/dai-nan-youbi.mjs';

test('第何曜日の計算（ページの計算例）', () => {
  const a = daiNanYoubi('2026-10-27');
  assert.deepEqual([a.text, a.n, a.youbi, a.last, a.lastDay], ['第4火曜日', 4, '火', true, 27]);
  const b = daiNanYoubi('2026-10-31');
  assert.deepEqual([b.text, b.last], ['第5土曜日', true]);
  const c = daiNanYoubi('2026-10-20');
  assert.deepEqual([c.text, c.last, c.lastDay], ['第3火曜日', false, 27]);
  // 1〜7日は第1、8日は第2
  assert.equal(daiNanYoubi('2026-10-07').n, 1);
  assert.equal(daiNanYoubi('2026-10-08').n, 2);
  assert.equal(daiNanYoubi('2026-10-28').n, 4);
  assert.equal(daiNanYoubi('2026-10-29').n, 5);
  // うるう年の2月29日（木曜日）は第5木曜日で最終
  const d = daiNanYoubi('2024-02-29');
  assert.deepEqual([d.text, d.last], ['第5木曜日', true]);
  // 2026年2月は28日まで。第4土曜日の28日が最終
  assert.deepEqual([daiNanYoubi('2026-02-28').text, daiNanYoubi('2026-02-28').last], ['第4土曜日', true]);
  assert.equal(ybMonthDays(2024, 2), 29);
  assert.equal(ybMonthDays(2026, 2), 28);
});

test('第何曜日：入れていない・まちがった日付', () => {
  assert.equal(daiNanYoubi('').empty, true);
  assert.ok(daiNanYoubi('2026-02-30').error);
  assert.ok(daiNanYoubi('1800-01-01').error);
});

test('第何週（カレンダーの行）とのちがい', () => {
  // 2026年10月1日は木曜日。10月4日（日）はカレンダーの2行目だが、第1日曜日
  assert.equal(ybRow({ y: 2026, m: 10, d: 4 }), 2);
  assert.equal(daiNanYoubi('2026-10-04').n, 1);
  const g = ybGrid(2026, 10);
  assert.equal(g.length, 42);
  assert.deepEqual(g.slice(0, 5), [null, null, null, null, 1]);
});

test('これから12か月の第4火曜日・第5土曜日', () => {
  const a = ybAhead(2026, 10, 4, 2);
  assert.deepEqual(a.map((x) => `${x.y}-${x.m}-${x.d}`), [
    '2026-10-27', '2026-11-24', '2026-12-22', '2027-1-26', '2027-2-23', '2027-3-23',
    '2027-4-27', '2027-5-25', '2027-6-22', '2027-7-27', '2027-8-24', '2027-9-28',
  ]);
  const b = ybAhead(2026, 10, 5, 6);
  assert.deepEqual(b.map((x) => x.d), [31, null, null, 30, null, null, null, 29, null, 31, null, null]);
  assert.equal(ybNth(2026, 11, 5, 6), null);
});

test('第何月曜日で決まる祝日（国民の祝日に関する法律 第2条）', () => {
  assert.deepEqual(ybHolidays(2025).map((h) => `${h.m}/${h.d}`), ['1/13', '7/21', '9/15', '10/13']);
  assert.deepEqual(ybHolidays(2026).map((h) => `${h.m}/${h.d}`), ['1/12', '7/20', '9/21', '10/12']);
  assert.deepEqual(ybHolidays(2027).map((h) => `${h.m}/${h.d}`), ['1/11', '7/19', '9/20', '10/11']);
});
