// 読みもの「1日の塩の目標は、みそ汁何杯分？」の本文の数字（自分で確かめた値と比べる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUMS, GOAL, DISH, NA_TO_SALT } from '../src/yomimono/shio-misoshiru.mjs';

test('出典の数字', () => {
  assert.deepEqual(GOAL, { male: 7.5, female: 6.5, juusho: 6.0 });
  assert.equal(DISH[0][1], 1.7);
  assert.equal(NA_TO_SALT, 2.54);
});

test('目標量をみそ汁1杯1.7gで割った杯数', () => {
  assert.equal(NUMS.male, 4.4); // 7.5 ÷ 1.7 ＝ 4.41
  assert.equal(NUMS.female, 3.8); // 6.5 ÷ 1.7 ＝ 3.82
  assert.equal(NUMS.juusho, 3.5); // 6.0 ÷ 1.7 ＝ 3.53
});

test('汁の量と濃さから塩', () => {
  assert.equal(NUMS.s150_08, 1.2);
  assert.equal(NUMS.s200_08, 1.6);
  assert.equal(NUMS.s150_12, 1.8);
  assert.equal(NUMS.thin, 0.6); // 1.2g ÷ 200g
});

test('1日の例とナトリウムの換算', () => {
  assert.equal(NUMS.day, 6.4); // 0.7 ＋ 1.7 ＋ 1.8 ＋ 2.2
  assert.equal(NUMS.na1000, 2.54);
  assert.equal(NUMS.na400, 1.016);
});

import { per, dayParts, dayRest } from '../src/yomimono/shio-misoshiru.mjs';
import { fmt } from '../src/lib/number.mjs';

test('表の％と、本文の言い切り', () => {
  assert.deepEqual(DISH.map(([, s]) => per(s, GOAL.female)), [26, 14, 11, 28, 34, 102, 109]);
  assert.deepEqual(DISH.map(([, s]) => per(s, GOAL.male)), [23, 12, 9, 24, 29, 88, 95]);
  assert.ok(DISH.find(([n]) => n.startsWith('きつねうどん'))[1] > GOAL.female); // うどん1杯で女性の目標量をこえる
  assert.equal(per(NUMS.day, GOAL.female), 98);
  assert.equal(NUMS.wakame, 7.2); // 6.5 ÷ 0.9 ＝ 7.22
  assert.equal(fmt(NUMS.na400, 2), '1.02');
});

test('帯の図の幅', () => {
  assert.deepEqual(dayParts.map((p) => p.w), [10.8, 26.2, 27.7, 33.8]);
  assert.equal(dayRest, 1.5);
  assert.equal(dayParts[0].text, ''); // 細い食パンは字を入れない
});
