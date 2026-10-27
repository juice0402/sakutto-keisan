import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gensen, gensenOf, gensenFromFee, gensenParts, shohiOf } from '../src/lib/gensen.mjs';

test('源泉徴収の額：100万円まで10.21％、こえた分は20.42％（国税庁の例）', () => {
  assert.equal(gensenOf(10000), 1021);
  assert.equal(gensenOf(888888), 90755); // 国税庁のあらましの例
  assert.equal(gensenOf(1000000), 102100); // 100万円ちょうど
  assert.equal(gensenOf(1000001), 102100); // 100万1円（1円 × 20.42％ は切り捨てて0円）
  assert.equal(gensenOf(1000005), 102101);
  assert.equal(gensenOf(1500000), 204200); // No.2795 の例
  assert.equal(gensenOf(2000000), 306300);
  assert.equal(gensenOf(12345), 1260); // 1,260.4245円 → 1円未満は切り捨て
  assert.equal(gensenOf(9), 0);
  assert.equal(gensenOf(10), 1);
});

test('消費税を分けて書く・含めて書く・請求しない', () => {
  assert.deepEqual(gensenFromFee(100000, 'sep'), { fee: 100000, tax: 10000, base: 100000, gensen: 10210, billed: 110000, net: 99790 });
  assert.deepEqual(gensenFromFee(100000, 'incl'), { fee: 100000, tax: 10000, base: 110000, gensen: 11231, billed: 110000, net: 98769 });
  assert.deepEqual(gensenFromFee(100000, 'none'), { fee: 100000, tax: 0, base: 100000, gensen: 10210, billed: 100000, net: 89790 });
  assert.equal(shohiOf(12345), 1234);
  assert.equal(gensenFromFee(1000000, 'sep').net, 997900);
  assert.equal(gensenFromFee(1000001, 'sep').net, 997901);
});

test('早見表（ページに載せる数字）', () => {
  const rows = [10000, 30000, 50000, 100000, 300000, 500000, 1000000, 2000000].map((f) => {
    const s = gensenFromFee(f, 'sep');
    return [s.gensen, gensenFromFee(f, 'none').net, s.net];
  });
  assert.deepEqual(rows, [
    [1021, 8979, 9979],
    [3063, 26937, 29937],
    [5105, 44895, 49895],
    [10210, 89790, 99790],
    [30630, 269370, 299370],
    [51050, 448950, 498950],
    [102100, 897900, 997900],
    [306300, 1693700, 1893700],
  ]);
});

test('振り込まれる額から報酬（逆算が元にもどる）', () => {
  const r = gensen({ amount: 99790, from: 'net', mode: 'sep' });
  assert.equal(r.fee, 100000);
  assert.equal(r.exact, true);
  for (const mode of ['sep', 'incl', 'none']) {
    for (const fee of [1, 9, 10, 999, 10000, 33333, 999999, 1000000, 1000001, 1234567, 5000000]) {
      const net = gensenFromFee(fee, mode).net;
      const back = gensen({ amount: net, from: 'net', mode });
      assert.equal(back.ok, true);
      assert.equal(back.exact, true);
      assert.equal(back.net, net, `${mode} ${fee}`);
      assert.ok(back.fee <= fee);
    }
  }
  // 1円ふやしても振り込まれる額が変わらない・2円ふえるところがあるので、ちょうどにならない額もある
  let miss = null;
  for (let n = 9000; n < 9100 && miss === null; n += 1) {
    if (!gensen({ amount: n, from: 'net', mode: 'sep' }).exact) miss = n;
  }
  assert.notEqual(miss, null);
  const m = gensen({ amount: miss, from: 'net', mode: 'sep' });
  assert.equal(m.net, miss + 1);
});

test('まちがった入力', () => {
  assert.equal(gensen({ amount: null, from: 'fee' }).empty, true);
  assert.equal(gensen({ amount: 0, from: 'fee' }).field, 'fee');
  assert.equal(gensen({ amount: Number.NaN, from: 'net' }).field, 'net');
  assert.match(gensen({ amount: 1.5, from: 'fee' }).error, /1円単位/);
  assert.match(gensen({ amount: 2e10, from: 'fee' }).error, /大きすぎ/);
  assert.equal(gensen({ amount: 1e10, from: 'fee' }).ok, true);
});

test('支払う日で内わけが切りかわる（2027年1月1日から防衛特別所得税）', () => {
  assert.equal(gensenParts('2026-12-31', false).from2027, false);
  assert.deepEqual(gensenParts('2026-12-31', false).rows.map((r) => r[0]), ['所得税', '復興特別所得税']);
  assert.deepEqual(gensenParts('2027-01-01', true).rows, [['所得税', '10%・20%'], ['防衛特別所得税', '所得税の1%'], ['復興特別所得税', '所得税の1.1%']]);
});
