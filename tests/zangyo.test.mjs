import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zangyo, zangyoWage, monthHours, zangyoHoursText } from '../src/lib/zangyo.mjs';

// ページの計算例：月給30万円・年間休日120日・1日8時間
const W = zangyoWage({ salary: 300000, holidays: 120, daily: 8 });
const amount = (r, id) => r.parts.find((p) => p.id === id)?.amount;

test('1か月の所定労働時間と1時間あたりの賃金（ページの計算式の例）', () => {
  assert.equal(monthHours(120, 8).toFixed(1), '163.3'); // （365 − 120）× 8 ÷ 12
  assert.equal(W.ok, true);
  assert.equal(W.wage, 1837); // 1,836.73… は四捨五入
  assert.equal(monthHours(105, 8).toFixed(1), '173.3');
  assert.equal(monthHours(120, 7.5), 153.125);
});

test('残業20時間（ページの計算式の例）', () => {
  const r = zangyo({ wage: W.wage, over: 20, night: null, holiday: null });
  assert.equal(r.parts[0].unit, 2296); // 1,837 × 1.25 ＝ 2,296.25
  assert.equal(r.total, 45920);
});

test('残業の時間ごとの残業代（ページの計算例）', () => {
  const t = (over) => zangyo({ wage: W.wage, over, night: null, holiday: null }).total;
  assert.deepEqual([t(10), t(20), t(45), t(80)], [22960, 45920, 103320, 192880]);
  const r = zangyo({ wage: W.wage, over: 80, night: null, holiday: null });
  assert.equal(amount(r, 'over'), 137760); // 60時間 × 2,296円
  assert.equal(r.parts[1].unit, 2756); // 1,837 × 1.5 ＝ 2,755.5
  assert.equal(amount(r, 'over60'), 55120); // 20時間 × 2,756円
});

test('月給ごとの1時間あたりと残業1時間（ページの表。年間休日120日・1日8時間）', () => {
  const row = (salary) => {
    const w = zangyoWage({ salary, holidays: 120, daily: 8 }).wage;
    return [w, zangyo({ wage: w, over: 1, night: null, holiday: null }).total];
  };
  assert.deepEqual(row(200000), [1224, 1530]);
  assert.deepEqual(row(250000), [1531, 1914]);
  assert.deepEqual(row(300000), [1837, 2296]);
  assert.deepEqual(row(400000), [2449, 3061]);
});

test('深夜と休日（ページの計算例）', () => {
  const r = zangyo({ wage: W.wage, over: 20, night: 5, holiday: 8 });
  assert.equal(amount(r, 'night'), 2295); // 459円（1,837 × 0.25）× 5時間
  assert.equal(amount(r, 'holiday'), 19840); // 2,480円（1,837 × 1.35）× 8時間
  assert.equal(r.total, 45920 + 2295 + 19840);
  assert.equal(zangyo({ wage: W.wage, over: 20, night: 5, holiday: null }).total, 48215); // 共有画像の数字
  // 深夜の残業は 25％ ＋ 25％ ＝ 50％、60時間をこえた深夜は 50％ ＋ 25％ ＝ 75％
  const night = zangyo({ wage: 1000, over: 61, night: 61, holiday: null });
  assert.equal(night.total, 60 * 1250 + 1500 + 61 * 250);
  // 深夜だけ（夜勤の決まった時間）は上乗せの25％だけ
  assert.equal(zangyo({ wage: 1000, over: null, night: 8, holiday: null }).total, 2000);
  // 60時間に法定休日の時間は入れない
  const hol = zangyo({ wage: 1000, over: 60, night: null, holiday: 10 });
  assert.equal(amount(hol, 'over60'), undefined);
  assert.equal(hol.total, 75000 + 13500);
});

test('時間の書き方', () => {
  assert.equal(zangyo({ wage: W.wage, over: 20.5, night: null, holiday: null }).total, 47068); // 2,296 × 20.5
  assert.equal(zangyoHoursText(20.5), '20時間30分');
  assert.equal(zangyoHoursText(20), '20時間');
  assert.equal(zangyoHoursText(0.75), '45分');
  assert.equal(zangyoHoursText(20.3), '20時間18分'); // 「20.30」は20時間30分ではない
  assert.equal(zangyoHoursText(1000), '1,000時間');
});

test('まちがった入力・空', () => {
  assert.equal(zangyoWage({ salary: null, holidays: 120, daily: 8 }).empty, true);
  assert.equal(zangyoWage({ salary: 300000, holidays: null, daily: 8 }).missing, 'days');
  assert.equal(zangyoWage({ salary: 0, holidays: 120, daily: 8 }).field, 'salary');
  assert.equal(zangyoWage({ salary: 300000, holidays: 365, daily: 8 }).field, 'holidays');
  assert.equal(zangyoWage({ salary: 300000, holidays: 120, daily: 0 }).field, 'daily');
  assert.equal(zangyoWage({ salary: 300000, holidays: 120, daily: 25 }).field, 'daily');
  assert.equal(zangyoWage({ salary: NaN, holidays: 120, daily: 8 }).field, 'salary');
  assert.equal(zangyo({ wage: 1837, over: null, night: null, holiday: null }).missing, 'hours');
  assert.equal(zangyo({ wage: 0, over: 10, night: null, holiday: null }).field, 'wage');
  assert.equal(zangyo({ wage: 1837, over: NaN, night: null, holiday: null }).field, 'over');
  assert.equal(zangyo({ wage: 1837, over: 745, night: null, holiday: null }).field, 'over');
  const zero = zangyo({ wage: 1837, over: 0, night: null, holiday: null });
  assert.equal(zero.ok, true);
  assert.equal(zero.total, 0);
  assert.equal(zero.parts.length, 0);
  // 大きな数でもこわれない
  const big = zangyo({ wage: zangyoWage({ salary: 9999999999, holidays: 120, daily: 8 }).wage, over: 744, night: 744, holiday: 744 });
  assert.equal(big.ok, true);
  assert.ok(Number.isFinite(big.total));
});
