import { test } from 'node:test';
import assert from 'node:assert/strict';
import { denki } from '../src/lib/denki.mjs';
import { DENKI_PRICE, DENKI_APPLIANCES, DENKI_USES } from '../src/data/denki.mjs';
import { fmt } from '../src/lib/number.mjs';

test('電気代：ページの計算例（単価31円・1か月30日）', () => {
  assert.equal(DENKI_PRICE.value, 31);
  const k = denki({ watt: 600, hours: 8, price: 31 });
  assert.deepEqual([k.hour, k.day, k.month, k.year, k.kwhMonth], [18.6, 148.8, 4464, 54312, 144]);
  const m = denki({ watt: 54, hours: 8, price: 31 });
  assert.equal(fmt(m.day, 1), '13.4');
  assert.equal(fmt(m.month, 0), '402');
  const h = denki({ watt: 1170, hours: 4, price: 31 });
  assert.equal(fmt(h.day, 0), '145');
  assert.equal(fmt(h.month, 0), '4,352');
  const d = denki({ watt: 1200, hours: 0.25, price: 31 });
  assert.deepEqual([d.hour, d.day, d.month], [37.2, 9.3, 279]);
  const t = denki({ watt: 150, hours: 4, price: 31 });
  assert.deepEqual([t.hour, t.day, t.month], [4.65, 18.6, 558]);
});

test('電気代：時間を入れる前は1時間だけ', () => {
  const r = denki({ watt: 600, hours: null, price: 31 });
  assert.equal(r.ok, true);
  assert.equal(r.hour, 18.6);
  assert.equal(r.month, null);
});

test('電気代：家電の表（1時間）と、マスは6つ', () => {
  const hour = (w) => fmt(denki({ watt: w, hours: 1, price: 31 }).hour, 1);
  assert.deepEqual(DENKI_APPLIANCES.map((a) => hour(a.watt)), ['18.6', '1.7', '22', '36.3', '37.2', '4.7', '46.5', '40.3', '43.4']);
  assert.equal(DENKI_APPLIANCES.filter((a) => a.tile).length, 6);
  assert.ok(DENKI_APPLIANCES.filter((a) => a.tile).every((a) => [...a.short].length <= 5));
});

test('電気代：まだ入れていない・まちがった入力', () => {
  assert.deepEqual(denki({ watt: null, hours: 8, price: 31 }), { ok: false, empty: true, missing: 'watt' });
  assert.deepEqual(denki({ watt: 600, hours: 8, price: null }), { ok: false, empty: true, missing: 'price' });
  assert.equal(denki({ watt: 0, hours: 8, price: 31 }).field, 'watt');
  assert.equal(denki({ watt: 30000, hours: 8, price: 31 }).field, 'watt');
  assert.equal(denki({ watt: 600, hours: 25, price: 31 }).field, 'hours');
  assert.equal(denki({ watt: 600, hours: NaN, price: 31 }).field, 'hours');
  assert.equal(denki({ watt: 600, hours: 8, price: 0 }).field, 'price');
  assert.equal(denki({ watt: 600, hours: 8, price: 500 }).field, 'price');
  assert.equal(denki({ watt: 600, hours: 0, price: 31 }).month, 0);
});

test('家電別の電気代：1時間の電気代がメーカーの表示と同じ（単価31円）', () => {
  const hour = (slug) => DENKI_USES.find((u) => u.slug === slug).modes.map((m) => fmt(denki({ watt: m.watt, hours: 1, price: 31 }).hour, 1));
  assert.deepEqual(hour('kotatsu'), ['5.6', '2.2', '18.6']); // 山善：強5.6円・弱2.2円
  assert.deepEqual(hour('denki-moufu'), ['1', '0.6', '1.7']); // パナソニック：強 約1.0円・目盛3 約0.6円
  assert.deepEqual(hour('hot-carpet'), ['14.6', '10.4', '22']); // パナソニック：高 約14.6円・中 約10.4円
  assert.deepEqual(hour('ceramic-heater'), ['36.3', '19.8']);
  assert.deepEqual(hour('oil-heater'), ['46.5', '27.9', '18.6']); // デロンギ：最大約47円・中約28円・弱約19円
});

test('家電別の電気代：表とよくある質問の1か月（1日の時間・30日）', () => {
  const month = (slug) => {
    const u = DENKI_USES.find((x) => x.slug === slug);
    return u.modes.map((m) => fmt(denki({ watt: m.watt, hours: u.hours, price: 31 }).month, 0));
  };
  assert.deepEqual(month('kotatsu'), ['1,339', '521', '4,464']);
  assert.deepEqual(month('denki-moufu'), ['238', '141', '402']);
  assert.deepEqual(month('hot-carpet'), ['3,504', '2,492', '5,282']);
  assert.deepEqual(month('ceramic-heater'), ['4,352', '2,381']);
  assert.deepEqual(month('oil-heater'), ['11,160', '6,696', '4,464']);
});
