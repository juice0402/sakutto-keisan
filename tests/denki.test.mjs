import { test } from 'node:test';
import assert from 'node:assert/strict';
import { denki } from '../src/lib/denki.mjs';
import { DENKI_PRICE, DENKI_APPLIANCES } from '../src/data/denki.mjs';
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
