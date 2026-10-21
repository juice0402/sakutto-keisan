import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loan } from '../src/lib/loan.mjs';
import { bmi } from '../src/lib/bmi.mjs';

test('ローン：毎月の返済額（ページの計算例）', () => {
  const a = loan({ man: 3000, rate: 1, years: 35 });
  assert.deepEqual([a.monthly, a.n], [84686, 420]);
  assert.equal(a.total, 35568120);
  assert.equal(a.interest, 5568120);
  const b = loan({ man: 200, rate: 3, years: 5 });
  assert.equal(b.monthly, 35938);
  const z = loan({ man: 120, rate: 0, years: 2 });
  assert.deepEqual([z.monthly, z.interest], [50000, 0]);
  assert.equal(a.balanceAfter(420), 0);
  assert.ok(a.balanceAfter(120) > a.balanceAfter(240));
});

test('ローン：金利と年数ごとの早見表（3,000万円）', () => {
  const m = (rate, years) => loan({ man: 3000, rate, years }).monthly;
  assert.deepEqual([0.5, 1, 1.5, 2].map((r) => m(r, 35)), [77876, 84686, 91856, 99379]);
  assert.deepEqual([0.5, 1, 1.5, 2].map((r) => m(r, 25)), [106401, 113062, 119981, 127157]); // べつに Python で同じ式を計算して確かめた
});

test('ローン：まだ入れていない・まちがった入力', () => {
  assert.equal(loan({ man: null, rate: 1, years: 35 }).missing, 'man');
  assert.equal(loan({ man: 3000, rate: null, years: 35 }).missing, 'rate');
  assert.equal(loan({ man: 3000, rate: 1, years: null }).missing, 'years');
  assert.equal(loan({ man: 0, rate: 1, years: 35 }).field, 'man');
  assert.equal(loan({ man: 3000, rate: 25, years: 35 }).field, 'rate');
  assert.equal(loan({ man: 3000, rate: 1, years: 60 }).field, 'years');
  assert.equal(loan({ man: 3000, rate: 1, years: 1.01 }).field, 'years');
  assert.equal(loan({ man: 3000, rate: 1, years: 1.5 }).n, 18);
});

test('BMI（ページの計算例）', () => {
  const a = bmi({ cm: 170, kg: 65 });
  assert.deepEqual([a.value, a.level, a.std], [22.5, '普通体重', 63.6]);
  assert.deepEqual(a.range, [53.4, 72.1]);
  assert.equal(bmi({ cm: 160, kg: 47 }).level, '低体重'); // 18.4
  assert.equal(bmi({ cm: 160, kg: 64 }).level, '肥満（1度）'); // 25.0
  assert.equal(bmi({ cm: 160, kg: 63.9 }).value, 25); // 24.96… は四捨五入で25.0
  assert.equal(bmi({ cm: 160, kg: 63.9 }).level, '肥満（1度）');
  assert.equal(bmi({ cm: 160, kg: 63.8 }).level, '普通体重'); // 24.92…（普通体重の範囲の上）
  assert.equal(bmi({ cm: 160, kg: 47.3 }).level, '普通体重'); // 18.47… は18.5（範囲の下）
  assert.equal(bmi({ cm: 160, kg: 47.2 }).level, '低体重');
});

test('身長ごとの標準体重と普通体重の範囲（ページの表）', () => {
  const row = (cm) => { const r = bmi({ cm, kg: null }); return [r.std, ...r.range]; };
  assert.deepEqual(row(150), [49.5, 41.6, 56.1]);
  assert.deepEqual(row(160), [56.3, 47.3, 63.8]);
  assert.deepEqual(row(170), [63.6, 53.4, 72.1]);
  assert.deepEqual(row(180), [71.3, 59.8, 80.8]);
});

test('BMI：まちがった入力', () => {
  assert.equal(bmi({ cm: null, kg: 60 }).missing, 'cm');
  assert.equal(bmi({ cm: 1.7, kg: 60 }).field, 'cm');
  assert.equal(bmi({ cm: 170, kg: 0 }).field, 'kg');
});
