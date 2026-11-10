// 寄付メモの残りで返礼品をしぼる（#144）：今年の残り・年末まであと何日・# の読み取り・マスとチェック欄の切りかえ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoLeftOf, nenmatsuDaysLeft, nokoriHash, readNokori, jstDate, memoParse } from '../src/lib/furusato-memo.mjs';
import { hrNextState, hrMaxOf } from '../src/client/henreihin-shibori.mjs';

const store = memoParse(JSON.stringify({
  years: {
    2025: { limit: 50000, rows: [{ name: 'A市', amount: 10000, sent: true }] },
    2026: { limit: 57000, rows: [{ name: 'A市', amount: 10000, sent: false }, { name: 'B町', amount: 24000, sent: false }] },
    2027: { limit: 30000, rows: [{ name: 'C村', amount: 30000, sent: false }] },
    2028: { limit: 20000, rows: [{ name: 'D市', amount: 25000, sent: false }] },
    2029: { limit: null, rows: [{ name: 'E市', amount: 10000, sent: false }] },
  },
}));

test('今年の残り：上限57,000円で34,000円寄付したら23,000円', () => {
  assert.equal(memoLeftOf(store, 2026), 23000);
});
test('今年の残り：年がちがう・上限なし・ちょうど・こえているときは null', () => {
  assert.equal(memoLeftOf(store, 2030), null); // 去年のメモしかない（今年がない）
  assert.equal(memoLeftOf(store, 2029), null); // 上限なし
  assert.equal(memoLeftOf(store, 2027), null); // 残り0
  assert.equal(memoLeftOf(store, 2028), null); // こえている
  assert.equal(memoLeftOf({ years: {} }, 2026), null);
  assert.equal(memoLeftOf(memoParse('こわれた'), 2026), null);
});

test('年末まであと何日：11月1日は60日・12月31日は0日・1月1日と10月31日は出さない', () => {
  assert.equal(nenmatsuDaysLeft({ y: 2026, m: 11, d: 1 }), 60);
  assert.equal(nenmatsuDaysLeft({ y: 2026, m: 11, d: 10 }), 51);
  assert.equal(nenmatsuDaysLeft({ y: 2026, m: 12, d: 31 }), 0);
  assert.equal(nenmatsuDaysLeft({ y: 2027, m: 1, d: 1 }), null);
  assert.equal(nenmatsuDaysLeft({ y: 2026, m: 10, d: 31 }), null);
});

test('日本時間の日付：UTC の 12月31日15時は日本の1月1日', () => {
  assert.deepEqual(jstDate(new Date('2026-12-31T15:00:00Z')), { y: 2027, m: 1, d: 1 });
  assert.deepEqual(jstDate(new Date('2026-12-31T14:59:59Z')), { y: 2026, m: 12, d: 31 });
});

test('# の読み取り', () => {
  assert.equal(nokoriHash(23000), '#nokori=23000');
  assert.equal(readNokori(nokoriHash(23000)), 23000);
  assert.equal(readNokori('#nokori=0'), null);
  assert.equal(readNokori('#nokori=abc'), null);
  assert.equal(readNokori('#limit=57000'), null);
  assert.equal(readNokori(''), null);
  assert.equal(readNokori('#nokori=23000&x=<b>'), null);
});

test('マスとチェック欄は、どちらか1つだけが効く', () => {
  let s = { max: 0, memo: false };
  s = hrNextState(s, { tile: 20000 });
  assert.deepEqual(s, { max: 20000, memo: false });
  assert.equal(hrMaxOf(s, 23000), 20000);
  s = hrNextState(s, { memo: true }); // チェックを入れるとマスは「すべて」
  assert.deepEqual(s, { max: 0, memo: true });
  assert.equal(hrMaxOf(s, 23000), 23000);
  s = hrNextState(s, { memo: true }); // もう一度押すと元にもどる
  assert.deepEqual(s, { max: 0, memo: false });
  assert.equal(hrMaxOf(s, 23000), 0);
  s = hrNextState(hrNextState(s, { memo: true }), { tile: 10000 }); // マスを押すとチェックを外す
  assert.deepEqual(s, { max: 10000, memo: false });
});
