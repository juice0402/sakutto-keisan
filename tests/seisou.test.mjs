import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seisou, minText, hoursValue, SEISOU_WORKS, speedFromBuai } from '../src/lib/seisou.mjs';

const S = 100; // 1人1時間に100㎡

test('面積と人数から時間（ページの計算例）', () => {
  const t = (area, people) => minText(seisou({ area, people, speed: S, out: 'hours' }).minutes);
  assert.equal(t(300, 1), '3時間');
  assert.equal(t(600, 2), '3時間');
  assert.equal(t(1000, 3), '3時間20分');
  assert.equal(t(150, 2), '45分');
  const r = seisou({ area: 1000, people: 3, speed: S, out: 'hours' });
  assert.equal(hoursValue(r.minutes), '3.33');
  assert.equal(r.personHours, 10); // のべ10時間
  assert.equal(Math.round(r.perPerson), 333);
  assert.equal(minText(seisou({ area: 1001, people: 3, speed: S, out: 'hours' }).minutes), '3時間21分'); // 1分単位で切り上げ
});

test('面積と時間から人数（切り上げ。ページの計算例）', () => {
  const r = seisou({ area: 1500, hours: 2, speed: S, out: 'people' });
  assert.equal(r.people, 8); // 7.5人 → 8人
  assert.equal(minText(r.minutes), '1時間53分'); // 8人なら 1,500 ÷ 800 ＝ 1.875時間 → 112.5分 → 113分
  assert.equal(seisou({ area: 600, hours: 3, speed: S, out: 'people' }).people, 2);
});

test('人数と時間から面積（切り捨て）', () => {
  assert.equal(seisou({ people: 2, hours: 1.5, speed: S, out: 'area' }).area, 300);
  assert.equal(seisou({ people: 1, hours: 1, speed: 33.3, out: 'area' }).area, 33);
});

test('自分の速さの出し方（ページのよくある質問）', () => {
  // 2人で300㎡を1時間30分 → 300 ÷ 2 ÷ 1.5 ＝ 100㎡。その速さで300㎡・2人なら1時間30分
  assert.equal(300 / 2 / 1.5, 100);
  assert.equal(minText(seisou({ area: 300, people: 2, speed: 100, out: 'hours' }).minutes), '1時間30分');
});

test('まちがった入力', () => {
  assert.equal(seisou({ area: 300, people: 1, speed: null, out: 'hours' }).missing, 'speed');
  assert.equal(seisou({ area: 300, people: 1, speed: 0, out: 'hours' }).field, 'speed');
  assert.equal(seisou({ area: null, people: 1, speed: S, out: 'hours' }).empty, true);
  assert.equal(seisou({ area: 0, people: 1, speed: S, out: 'hours' }).field, 'area');
  assert.equal(seisou({ area: 300, people: NaN, speed: S, out: 'hours' }).field, 'people');
  assert.equal(seisou({ area: 300, hours: 0, speed: S, out: 'people' }).field, 'hours');
  assert.equal(minText(0), '0分');
  assert.equal(minText(60), '1時間');
  assert.equal(minText(1500), '25時間');
});

test('作業のマスの速さ（歩掛りから。ページの表）', () => {
  const round = (x) => (x < 50 ? Math.round(x) : Math.round(x / 10) * 10);
  for (const w of SEISOU_WORKS) assert.equal(w.speed, round(speedFromBuai(w.buai)), w.id);
  assert.equal(Math.round(speedFromBuai(0.034)), 368); // 事務室の日常清掃：100 ÷（0.034 × 8）
  assert.equal(Math.round(speedFromBuai(0.026)), 481); // 廊下の日常清掃
  assert.equal(Math.round(speedFromBuai(0.254)), 49); // トイレの日常清掃
  assert.equal(Math.round(speedFromBuai(0.33)), 38); // 事務室の床の定期清掃（表面洗浄）
  assert.equal(Math.round(speedFromBuai(0.744)), 17); // トイレの床の定期清掃（表面洗浄）
  // 事務室の日常清掃で1,000㎡を2人なら
  assert.equal(minText(seisou({ area: 1000, people: 2, speed: 370, out: 'hours' }).minutes), '1時間22分');
});
