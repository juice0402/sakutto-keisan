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

test('有給休暇の本文：計算式の例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const f = (hire, on, week) => yukyuFuyo({ hire, on, week });
  const a = f('2025-10-15', '2026-04-15', 4); // 計算式の例：週4日
  assert.deepEqual([yukyuDateText(a.cur.date), a.days, yukyuDateText(a.next.date), a.next.days], ['2026年4月15日', 7, '2027年4月15日', 8]);
  const b = f('2026-01-10', '2026-07-10', 5); // 年度の途中の入社
  assert.deepEqual([yukyuDateText(b.cur.date), b.days, yukyuDateText(b.next.date), b.next.days, b.duty], ['2026年7月10日', 10, '2027年7月10日', 11, true]);
  const c = f('2023-04-01', '2026-10-01', 3); // 週3日・勤続3年6か月
  assert.deepEqual([c.days, c.duty, yukyuTenureText(c)], [8, false, '3年6か月']);
  assert.equal(f('2020-04-01', '2025-10-01', 3).days, 10); // 週3日で10日になるのは5年6か月
  const d = f('2025-08-31', '2026-03-01', 5); // 月末の入社
  assert.deepEqual([yukyuDateText(d.cur.date), d.days, yukyuDateText(d.cur.until)], ['2026年3月1日', 10, '2028年2月29日']);
  assert.equal(f('2025-08-31', '2026-02-28', 5).days, 0);
  const e = f('2026-04-01', '2026-10-01', 5); // 1回目は6か月後
  assert.deepEqual([yukyuDateText(e.cur.date), e.days], ['2026年10月1日', 10]);
  assert.deepEqual([f('2026-04-01', '2026-10-01', 5).days, f('2026-04-01', '2026-10-01', 4).days], [10, 7]); // 週30時間以上
  const g = f('2024-04-01', '2026-10-01', 5); // 前の年の分
  assert.deepEqual([g.days, g.prev.days, yukyuDateText(g.prev.date), yukyuDateText(g.prev.until)], [12, 11, '2025年10月1日', '2027年9月30日']);
  assert.deepEqual(YUKYU_TABLE[3], [5, 6, 6, 8, 9, 10, 11]); // よくある質問：週3日
});
