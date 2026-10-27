import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yukyuFuyo, yukyuAddMonths, YUKYU_TABLE, yukyuDateText, yukyuTenureText } from '../src/lib/yukyu.mjs';

test('付与日数の表は厚生労働省（千葉労働局のリーフレット）と同じ', () => {
  assert.deepEqual(YUKYU_TABLE[5], [10, 11, 12, 14, 16, 18, 20]);
  assert.deepEqual(YUKYU_TABLE[4], [7, 8, 9, 10, 12, 13, 15]);
  assert.deepEqual(YUKYU_TABLE[3], [5, 6, 6, 8, 9, 10, 11]);
  assert.deepEqual(YUKYU_TABLE[2], [3, 4, 4, 5, 6, 6, 7]);
  assert.deepEqual(YUKYU_TABLE[1], [1, 2, 2, 2, 3, 3, 3]);
});

test('4月1日入社は10月1日に10日（ページの計算例）', () => {
  const r = yukyuFuyo({ hire: '2026-04-01', on: '2026-10-01', week: 5 });
  assert.equal(r.days, 10);
  assert.equal(yukyuDateText(r.cur.date), '2026年10月1日');
  assert.equal(yukyuDateText(r.cur.until), '2028年9月30日'); // 付与から2年で時効
  assert.equal(yukyuDateText(r.next.date), '2027年10月1日');
  assert.equal(r.next.days, 11);
  assert.equal(r.duty, true);
  assert.equal(yukyuTenureText(r), '6か月');
});

test('6か月より前は0日で、次が1回目', () => {
  const r = yukyuFuyo({ hire: '2026-04-01', on: '2026-09-30', week: 5 });
  assert.equal(r.n, -1);
  assert.equal(r.days, 0);
  assert.equal(r.cur, null);
  assert.equal(yukyuDateText(r.next.date), '2026年10月1日');
  assert.equal(r.duty, false);
  assert.equal(yukyuTenureText(r), '5か月');
});

test('勤続6年6か月から20日のまま。前の年の分も期限まで', () => {
  const r = yukyuFuyo({ hire: '2019-04-01', on: '2026-10-27', week: 5 });
  assert.equal(r.n, 7);
  assert.equal(r.days, 20);
  assert.equal(r.next.days, 20);
  assert.equal(yukyuDateText(r.prev.date), '2025年10月1日');
  assert.equal(yukyuDateText(r.prev.until), '2027年9月30日');
  assert.equal(yukyuTenureText(r), '7年6か月');
});

test('週3日は5日から。10日に届くのは5年6か月（年5日の義務）', () => {
  assert.equal(yukyuFuyo({ hire: '2026-04-01', on: '2026-10-01', week: 3 }).days, 5);
  const a = yukyuFuyo({ hire: '2020-04-01', on: '2025-10-01', week: 3 });
  assert.equal(a.days, 10);
  assert.equal(a.duty, true);
  const b = yukyuFuyo({ hire: '2020-04-01', on: '2024-10-01', week: 3 });
  assert.equal(b.days, 9);
  assert.equal(b.duty, false);
  assert.equal(yukyuFuyo({ hire: '2020-04-01', on: '2021-10-01', week: 4 }).days, 8);
});

test('同じ日がない月は次の月の1日', () => {
  assert.deepEqual(yukyuAddMonths({ y: 2025, m: 8, d: 31 }, 6), { y: 2026, m: 3, d: 1 });
  assert.deepEqual(yukyuAddMonths({ y: 2025, m: 6, d: 30 }, 6), { y: 2025, m: 12, d: 30 });
  assert.deepEqual(yukyuAddMonths({ y: 2025, m: 7, d: 31 }, 6), { y: 2026, m: 1, d: 31 });
  assert.deepEqual(yukyuAddMonths({ y: 2025, m: 10, d: 15 }, 6), { y: 2026, m: 4, d: 15 });
});

test('入れていない・まちがい', () => {
  assert.equal(yukyuFuyo({ hire: '', on: '2026-10-01', week: 5 }).missing, 'hire');
  assert.equal(yukyuFuyo({ hire: '2026-04-01', on: '', week: 5 }).missing, 'on');
  assert.equal(yukyuFuyo({ hire: '2026-04-01', on: '2026-10-01', week: null }).missing, 'week');
  assert.equal(yukyuFuyo({ hire: '2026-04-01', on: '2026-03-01', week: 5 }).field, 'on');
  assert.equal(yukyuFuyo({ hire: '2026-02-30', on: '2026-10-01', week: 5 }).field, 'hire');
});
