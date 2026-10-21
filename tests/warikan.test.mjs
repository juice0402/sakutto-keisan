import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warikan, warikanKeisha } from '../src/lib/warikan.mjs';

test('割り勘：ページの計算例', () => {
  const a = warikan({ total: 12800, people: 4, unit: 100 });
  assert.equal(a.each, 3200);
  assert.equal(a.change, 0);
  assert.equal(a.host, 3200);

  const b = warikan({ total: 10000, people: 3, unit: 100 });
  assert.deepEqual([b.each, b.collect, b.change, b.low, b.host], [3400, 10200, 200, 3300, 3400]);

  const c = warikan({ total: 23500, people: 6, unit: 100 });
  assert.deepEqual([c.each, c.collect, c.change, c.low, c.host], [4000, 24000, 500, 3900, 4000]);

  const d = warikan({ total: 5980, people: 3, unit: 10 });
  assert.deepEqual([d.each, d.change, d.low, d.host], [2000, 20, 1990, 2000]);

  const e = warikan({ total: 10000, people: 3, unit: 1 });
  assert.deepEqual([e.each, e.change, e.low, e.host], [3334, 2, 3333, 3334]);

  const g = warikan({ total: 37800, people: 8, unit: 100 });
  assert.deepEqual([g.each, g.collect, g.change], [4800, 38400, 600]);

  const f = warikan({ total: 37800, people: 8, unit: 1000 });
  assert.deepEqual([f.each, f.collect, f.change, f.low, f.host], [5000, 40000, 2200, 4000, 9800]);
});

test('割り勘：ぴったり割れるときは、小数の誤差で多く集めない', () => {
  for (const [total, people] of [[3000, 3], [9000, 3], [7000, 7], [6900, 3], [33000, 11], [2100, 7]]) {
    const r = warikan({ total, people, unit: 100 });
    assert.equal(r.change, 0, `${total}円 ${people}人`);
    assert.equal(r.each, r.low);
  }
});

test('割り勘：まだ入れていない・まちがった入力', () => {
  assert.deepEqual(warikan({ total: null, people: 4 }), { ok: false, empty: true, missing: 'total' });
  assert.deepEqual(warikan({ total: 1000, people: null }), { ok: false, empty: true, missing: 'people' });
  assert.equal(warikan({ total: 0, people: 4 }).field, 'total');
  assert.equal(warikan({ total: NaN, people: 4 }).field, 'total');
  assert.equal(warikan({ total: 100.5, people: 4 }).field, 'total');
  assert.equal(warikan({ total: 200000000, people: 4 }).field, 'total');
  assert.equal(warikan({ total: 1000, people: 1 }).missing, 'people');
  assert.equal(warikan({ total: 1000, people: 0 }).missing, 'people');
  assert.equal(warikan({ total: 1000, people: 2.5 }).field, 'people');
  assert.equal(warikan({ total: 1000, people: 101 }).field, 'people');
});

test('傾斜の割り勘：ページの計算例', () => {
  const a = warikanKeisha({ total: 30000, unit: 100, groups: [{ people: 1, rate: 2 }, { people: 4, rate: 1 }, { people: 2, rate: 0.5 }] });
  assert.deepEqual(a.rows.map((r) => r.each), [8600, 4300, 2200]);
  assert.equal(a.collect, 30200);
  assert.equal(a.change, 200);
  assert.equal(a.people, 7);

  const b = warikanKeisha({ total: 50000, unit: 100, groups: [{ people: 2, rate: 1.5 }, { people: 5, rate: 1 }, { people: null, rate: 0.5 }] });
  assert.deepEqual(b.rows.map((r) => [r.index, r.each]), [[0, 9400], [1, 6300]]);
  assert.equal(b.change, 300);

  const c = warikanKeisha({ total: 30000, unit: 1, groups: [{ people: 1, rate: 2 }, { people: 4, rate: 1 }, { people: 2, rate: 0.5 }] });
  assert.deepEqual(c.rows.map((r) => r.each), [8572, 4286, 2143]);
});

test('傾斜の割り勘：ぴったりのときはおつりなし、まちがった入力', () => {
  const a = warikanKeisha({ total: 12000, unit: 100, groups: [{ people: 1, rate: 2 }, { people: 2, rate: 1 }, { people: 2, rate: 0.5 }] });
  assert.deepEqual(a.rows.map((r) => r.each), [4800, 2400, 1200]);
  assert.equal(a.change, 0);
  assert.deepEqual(warikanKeisha({ total: 1000, groups: [{ people: null, rate: 2 }, { people: null, rate: 1 }] }), { ok: false, empty: true, missing: 'people' });
  assert.equal(warikanKeisha({ total: 1000, groups: [{ people: 1, rate: 2 }] }).missing, 'more');
  assert.equal(warikanKeisha({ total: 1000, groups: [{ people: 1.5, rate: 2 }, { people: 2, rate: 1 }] }).field, 'people-0');
  assert.equal(warikanKeisha({ total: 1000, groups: [{ people: 1, rate: 0 }, { people: 2, rate: 1 }] }).field, 'rate-0');
  assert.equal(warikanKeisha({ total: 1000, groups: [{ people: 1, rate: 11 }, { people: 2, rate: 1 }] }).field, 'rate-0');
  assert.equal(warikanKeisha({ total: 1000, groups: [{ people: 1, rate: null }, { people: 2, rate: 1 }] }).missing, 'rate');
});

test('合計と人数の早見表（ページの表：100円単位）', () => {
  const table = {
    5000: [1700, 1300, 1000, 900], 10000: [3400, 2500, 2000, 1700], 15000: [5000, 3800, 3000, 2500], 20000: [6700, 5000, 4000, 3400],
    25000: [8400, 6300, 5000, 4200], 30000: [10000, 7500, 6000, 5000], 50000: [16700, 12500, 10000, 8400],
  };
  for (const [total, want] of Object.entries(table)) {
    assert.deepEqual([3, 4, 5, 6].map((people) => warikan({ total: Number(total), people, unit: 100 }).each), want, `${total}円`);
  }
});
