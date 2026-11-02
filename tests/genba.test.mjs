// 現場手帳（#106）：見本の数字・ページに載せる計算例・使う場面の例
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genbaPlan, genbaPrices, genbaEstimate, genbaToiletMl, genbaRowHtml, hmToMin, minToHm, rowMinutes } from '../src/lib/genba.mjs';
import { minText } from '../src/lib/seisou.mjs';
import { volumeText } from '../src/lib/kishaku.mjs';
import { ROUMU_TANKA, SEISOU_KEIHI } from '../src/data/seisou-tanka.mjs';
import { EX, EX_MITSU, EX_WEEK1, EX_ML, SC_3, SC_TOILET, SC_TOILET1, SC_ML10 } from '../src/pages/genba.mjs';

const ROWS = [{ kind: 'office', name: '事務室', area: 600 }, { kind: 'hall', name: '廊下', area: 300 }, { kind: 'toilet', name: 'トイレ', area: 40 }];
const PRICES = genbaPrices(ROUMU_TANKA.average, SEISOU_KEIHI);

test('見本：事務室600㎡・廊下300㎡・トイレ40㎡・2人・8:00〜11:00', () => {
  const r = genbaPlan({ rows: ROWS, people: 2, start: hmToMin('8:00'), end: hmToMin('11:00') });
  assert.deepEqual(r.items.map((x) => x.minutes), [49, 19, 25]);
  assert.equal(minText(r.total), '1時間33分');
  assert.deepEqual(r.items.map((x) => minToHm(x.to)), ['8:49', '9:08', '9:33']);
  assert.equal(minText(r.free), '1時間27分');
  assert.deepEqual(EX.items.map((x) => x.minutes), [49, 19, 25]);
});

test('見積もりの目安：1回9,030円・週5回で1か月195,650円', () => {
  const e = genbaEstimate(ROWS, PRICES, 260);
  assert.equal(e.once, 9030);
  assert.equal(e.month, 195650);
  assert.equal(e.month, Math.round((9030 * 260) / 12));
  assert.equal(EX_MITSU.month, 195650);
  assert.equal(EX_WEEK1.month, 39130);
  // 時間で入れる行・自分で入れる場所は見積もりに入れない
  const s = genbaEstimate([...ROWS, { kind: 'time', name: '見回り', min: 15 }, { kind: 'own', name: '倉庫', area: 50, speed: 100 }], PRICES, 260);
  assert.equal(s.once, 9030);
  assert.equal(s.skipped, true);
});

test('トイレの消毒液：0.02％・水5Lで原液約17ml', () => {
  assert.equal(volumeText(genbaToiletMl(5)), '17ml');
  assert.equal(volumeText(EX_ML), '17ml');
  assert.equal(volumeText(SC_ML10), '33ml');
  assert.equal(genbaToiletMl(0), null);
});

test('使う場面の例・まちがえやすいところ', () => {
  assert.deepEqual(SC_3.items.map((x) => x.minutes), [33, 13, 17]);
  assert.equal(minText(SC_3.total), '1時間3分');
  assert.equal(minToHm(SC_3.finish), '9:03');
  assert.deepEqual(SC_TOILET.items.map((x) => x.minutes), [25, 37, 15]);
  assert.equal(minText(SC_TOILET.total), '1時間17分');
  assert.equal(minToHm(SC_TOILET.finish), '14:17');
  assert.equal(minText(SC_TOILET.free), '43分');
  assert.equal(SC_TOILET1.total, 49);
});

test('おわりをこえる・翌日にまたぐ・時刻なし', () => {
  const over = genbaPlan({ rows: ROWS, people: 1, start: 480, end: 540 });
  assert.equal(over.total, 98 + 38 + 49);
  assert.equal(over.free, 60 - over.total);
  const night = genbaPlan({ rows: ROWS, people: 2, start: hmToMin('23:00'), end: hmToMin('1:00') });
  assert.equal(night.span, 120);
  assert.equal(minToHm(night.finish), '0:33');
  const noTime = genbaPlan({ rows: ROWS, people: 2, start: null, end: null });
  assert.equal(noTime.items[0].from, undefined);
  assert.equal(noTime.free, null);
});

test('入れていない・まちがった入力', () => {
  assert.equal(genbaPlan({ rows: ROWS.map((r) => ({ ...r, area: null })), people: 2, start: null, end: null }).empty, true);
  assert.equal(genbaPlan({ rows: ROWS, people: null, start: null, end: null }).empty, true); // 人数を待つ
  assert.equal(genbaPlan({ rows: ROWS, people: 0, start: null, end: null }).field, 'people');
  assert.equal(genbaPlan({ rows: [{ kind: 'office', name: 'a', area: 0 }], people: 1, start: null, end: null }).row, 0);
  assert.equal(genbaPlan({ rows: ROWS, people: 2, start: NaN, end: null }).field, 'start');
  assert.ok(Number.isNaN(hmToMin('25:00')));
  assert.equal(hmToMin(''), null);
  assert.equal(rowMinutes({ kind: 'time', min: 15 }, 3), 15); // 時間の行は人数で割らない
  assert.equal(rowMinutes({ kind: 'own', area: 200, speed: 100 }, 2), 60);
  assert.equal(rowMinutes({ kind: 'own', area: 200, speed: null }, 2), null);
});

test('場所の名前はエスケープする', () => {
  const html = genbaRowHtml({ kind: 'toilet', name: '<b>"男子"</b>', area: '' }, 0);
  assert.ok(!html.includes('<b>"'));
  assert.ok(html.includes('&lt;b&gt;&quot;男子&quot;'));
});
