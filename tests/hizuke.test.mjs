import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYmd, weekdayOf, warekiOf, warekiOfYear, etoOf } from '../src/lib/hizuke.mjs';
import { nissu } from '../src/lib/nissu.mjs';
import { nenrei, gradeOf } from '../src/lib/nenrei.mjs';
import { jikan, jikanText, jikanDays } from '../src/lib/jikan.mjs';

test('日付・曜日・和暦・干支', () => {
  assert.equal(parseYmd('2026-02-30'), null);
  assert.deepEqual(parseYmd('2024-02-29'), { y: 2024, m: 2, d: 29 });
  assert.equal(weekdayOf({ y: 2026, m: 10, d: 21 }), '水');
  assert.equal(weekdayOf({ y: 1970, m: 1, d: 1 }), '木');
  assert.equal(weekdayOf({ y: 1900, m: 1, d: 1 }), '月');
  assert.equal(warekiOf({ y: 2019, m: 4, d: 30 }).text, '平成31年');
  assert.equal(warekiOf({ y: 2019, m: 5, d: 1 }).text, '令和元年');
  assert.equal(warekiOf({ y: 1989, m: 1, d: 7 }).text, '昭和64年');
  assert.equal(warekiOf({ y: 1989, m: 1, d: 8 }).text, '平成元年');
  assert.equal(warekiOf({ y: 1926, m: 12, d: 25 }).text, '昭和元年');
  assert.equal(warekiOf({ y: 2026, m: 10, d: 21 }).text, '令和8年');
  assert.deepEqual(warekiOfYear(1989), { text: '平成元年', before: '昭和64年' });
  assert.deepEqual(warekiOfYear(2000), { text: '平成12年', before: null });
  assert.deepEqual([2026, 2024, 2020, 1987].map((y) => etoOf(y).kanji), ['午', '辰', '子', '卯']);
});

test('日数の計算（ページの計算例）', () => {
  const a = nissu({ start: '2026-10-21', days: 100, end: '', out: 'end' });
  assert.deepEqual(a.end, { y: 2027, m: 1, d: 29 });
  const b = nissu({ start: '2026-10-21', days: null, end: '2026-12-25', out: 'days' });
  assert.deepEqual([b.days, b.inclusive, b.weeks, b.weekRest], [65, 66, 9, 2]);
  const c = nissu({ start: '2026-10-21', days: null, end: '2026-10-01', out: 'days' });
  assert.equal(c.days, -20);
  assert.deepEqual(nissu({ start: '2024-02-28', days: 1, end: '', out: 'end' }).end, { y: 2024, m: 2, d: 29 });
  assert.deepEqual(nissu({ start: '2026-01-01', days: 365, end: '', out: 'end' }).end, { y: 2027, m: 1, d: 1 });
});

test('日数の計算：まだ入れていない・まちがった入力', () => {
  assert.equal(nissu({ start: '', days: 3, end: '', out: 'end' }).missing, 'start');
  assert.equal(nissu({ start: '2026-10-21', days: null, end: '', out: null }).missing, 'days');
  assert.equal(nissu({ start: '2026-10-21', days: 1.5, end: '', out: 'end' }).field, 'days');
  assert.equal(nissu({ start: '2026-10-21', days: 200000, end: '', out: 'end' }).field, 'days');
  assert.equal(nissu({ start: '1800-01-01', days: 1, end: '', out: 'end' }).field, 'start');
});

test('年齢の計算（ページの計算例）', () => {
  const a = nenrei({ birth: '1987-06-15', on: '2026-10-21' });
  assert.deepEqual([a.age, a.kazoe, a.wareki.text, a.eto.kanji, a.untilNext], [39, 40, '昭和62年', '卯', 237]);
  const b = nenrei({ birth: '2000-10-22', on: '2026-10-21' });
  assert.equal(b.age, 25);
  assert.equal(b.untilNext, 1);
  const c = nenrei({ birth: '2000-10-21', on: '2026-10-21' });
  assert.deepEqual([c.age, c.isBirthday, c.untilNext], [26, true, 0]);
  // 2月29日生まれは、うるう年でない年は3月1日に1つ上がる
  assert.equal(nenrei({ birth: '2004-02-29', on: '2026-02-28' }).age, 21);
  assert.equal(nenrei({ birth: '2004-02-29', on: '2026-03-01' }).age, 22);
});

test('学年（4月1日生まれは早生まれ）', () => {
  const on = { y: 2026, m: 10, d: 21 };
  assert.equal(gradeOf({ y: 2019, m: 5, d: 10 }, on), '小1');
  assert.equal(gradeOf({ y: 2020, m: 4, d: 1 }, on), '小1');
  assert.equal(gradeOf({ y: 2020, m: 4, d: 2 }, on), '年長');
  assert.equal(gradeOf({ y: 2022, m: 4, d: 2 }, on), '年少');
  assert.equal(gradeOf({ y: 2023, m: 4, d: 2 }, on), null);
  assert.equal(gradeOf({ y: 2013, m: 4, d: 2 }, on), '中1');
  assert.equal(gradeOf({ y: 2009, m: 3, d: 31 }, on), '高3');
  assert.equal(gradeOf({ y: 2005, m: 10, d: 1 }, on), '大学3年');
  assert.equal(gradeOf({ y: 1990, m: 10, d: 1 }, on), null);
});

test('年齢の計算：まちがった入力', () => {
  assert.equal(nenrei({ birth: '', on: '2026-10-21' }).missing, 'birth');
  assert.equal(nenrei({ birth: '2030-01-01', on: '2026-10-21' }).field, 'on');
});

test('時間の計算（ページの計算例）', () => {
  const r = jikan([{ h: 3, m: 45 }, { h: 2, m: 30 }, { h: 7, m: 15 }]);
  assert.deepEqual([r.minutes, r.text, r.hours], [810, '13時間30分', 13.5]);
  assert.equal(jikan([{ h: 1.5, m: null }, { h: null, m: 90 }]).text, '3時間');
  assert.equal(jikan([{ h: 0, m: 45 }]).text, '45分');
  assert.equal(jikanDays(1625), '1日3時間5分');
  assert.equal(jikanDays(1440), '1日');
  assert.equal(jikanText(1500), '25時間');
  assert.equal(jikan([{ h: 0.33, m: null }]).minutes, 20); // 19.8分は四捨五入
});

test('時間の計算：まだ入れていない・まちがった入力', () => {
  assert.equal(jikan([{ h: null, m: null }]).empty, true);
  assert.equal(jikan([{ h: 1, m: null }, { h: NaN, m: null }]).field, 'h-1');
  assert.equal(jikan([{ h: 1, m: 200000 }]).field, 'm-0');
});
