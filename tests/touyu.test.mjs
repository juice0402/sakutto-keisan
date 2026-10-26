import { test } from 'node:test';
import assert from 'node:assert/strict';
import { touyu, literPrice } from '../src/lib/touyu.mjs';
import { TOUYU_PRICE, TOUYU_HEATERS } from '../src/data/touyu.mjs';
import { fmt, yenBand } from '../src/lib/number.mjs';

const P = TOUYU_PRICE.can;

test('値段のはじめの値と、1Lか18Lかの読み方', () => {
  assert.equal(P, 2563);
  assert.equal(fmt(literPrice(P), 1), '142.4');
  assert.equal(literPrice(130), 130); // 500円より安いのは1Lの値段
  assert.equal(literPrice(500), fix18(500));
});
const fix18 = (x) => Number((x / 18).toFixed(10));

test('ページの計算例（1時間0.3L・1日8時間・18L 2,563円）', () => {
  const r = touyu({ lph: 0.3, hours: 8, price: P });
  assert.equal(r.litersMonth, 72);
  assert.equal(fmt(r.month, 0), '10,252');
  assert.equal(r.canDays, 7.5);
  assert.equal(r.cans, 4);
  assert.equal(touyu({ lph: 0.3, hours: 8, price: 142.4 }).can, false); // 1Lで入れても同じように計算する
});

test('18Lが何日もつかの早見表（ページの表）', () => {
  const want = {
    0.1: ['45', '22.5', '15'],
    0.2: ['22.5', '11.3', '7.5'],
    0.3: ['15', '7.5', '5'],
    0.5: ['9', '4.5', '3'],
  };
  for (const [lph, row] of Object.entries(want)) {
    assert.deepEqual([4, 8, 12].map((h) => fmt(touyu({ lph: Number(lph), hours: h, price: P }).canDays, 1)), row, `${lph}L`);
  }
});

test('ファンヒーターの表（強〜弱の1時間の灯油代）とマスは4つ', () => {
  assert.equal(TOUYU_HEATERS.length, 4);
  const hour = (l) => fmt(touyu({ lph: l, hours: 1, price: P }).hour, 1);
  assert.deepEqual(TOUYU_HEATERS.map((h) => [hour(h.max), hour(h.min)]), [['44.3', '10.3'], ['58.1', '11.7'], ['77.5', '17.1'], ['91.4', '18.5']]);
  assert.ok(TOUYU_HEATERS.every((h) => h.max > h.min && [...h.short].length <= 3));
});

test('時間を入れる前は1時間と、18Lで何時間か', () => {
  const r = touyu({ lph: 0.3, hours: null, price: P });
  assert.equal(r.ok, true);
  assert.equal(r.canHours, 60);
  assert.equal(r.month, null);
});

test('まだ入れていない・まちがった入力', () => {
  assert.deepEqual(touyu({ lph: null, hours: 8, price: P }), { ok: false, empty: true, missing: 'lph' });
  assert.deepEqual(touyu({ lph: 0.3, hours: 8, price: null }), { ok: false, empty: true, missing: 'price' });
  assert.equal(touyu({ lph: 0, hours: 8, price: P }).field, 'lph');
  assert.equal(touyu({ lph: 6, hours: 8, price: P }).field, 'lph');
  assert.equal(touyu({ lph: 0.3, hours: 25, price: P }).field, 'hours');
  assert.equal(touyu({ lph: 0.3, hours: 8, price: 0 }).field, 'price');
  assert.equal(touyu({ lph: 0.3, hours: 8, price: 30000 }).field, 'price');
  const z = touyu({ lph: 0.3, hours: 0, price: P });
  assert.deepEqual([z.month, z.canDays], [0, null]);
});

test('説明文の値段は幅で書く（yenBand）', () => {
  assert.equal(yenBand(2563), '2,500円台'); // 灯油18Lのはじめの値
  assert.equal(yenBand(10252), '1万円台'); // 1か月の灯油代の例
  assert.equal(yenBand(980), '980円台');
  assert.equal(yenBand(6500), '6,500円台');
  assert.equal(yenBand(23000), '2万円台');
});
