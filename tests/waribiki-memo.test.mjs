import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoTotal, wariMemoLine, jstDay, WARI_MEMO_SLUGS } from '../src/lib/waribiki.mjs';

// 2026-11-11 0:00（日本時間）＝ 2026-11-10 15:00 UTC
const midnight = Date.UTC(2026, 10, 10, 15, 0, 0);
const now = midnight + 3 * 3600000; // 11/11 3:00

const memo = (t, d, p, o, e) => ({ t, q: 'q', a: 'a', d, ...(p === undefined ? {} : { p, o }), ...(e ? { e: 1 } : {}) });

test('日本時間の0時で日付が変わる', () => {
  assert.equal(jstDay(midnight), jstDay(midnight + 86399999));
  assert.notEqual(jstDay(midnight - 1), jstDay(midnight));
});

test('今日の8ページのメモだけ足す', () => {
  const list = [
    memo('waribiki', now - 60000, 700, 300),
    memo('waribiki-30', midnight, 1386, 594),
    memo('waribiki-ritsu', now, 800, 200),
    memo('waribiki', midnight - 1, 9999, 9999), // 昨日の23:59:59
    memo('waribiki-50', now, undefined), // 数字のない今までのメモ
    memo('warikan', now, 1000, 0), // ほかの計算のメモ
    { t: 'waribiki', q: 'q', a: 'a', d: now, p: 'x', o: 1 }, // 形のおかしい数
  ];
  assert.deepEqual(memoTotal(list, WARI_MEMO_SLUGS, now), { n: 3, p: 2886, o: 1094, about: false });
  assert.equal(wariMemoLine(list, now), '割引のページで今日メモした3品：払う\u00a02,886円・安くなった\u00a01,094円');
});

test('約が1つまざると「約」', () => {
  const list = [memo('waribiki', now, 700, 300), memo('waribiki-30', now, 1000, 429, true)];
  assert.equal(wariMemoLine(list, now), '割引のページで今日メモした2品：払う\u00a01,700円・安くなった\u00a0約729円');
});

test('0件なら空', () => {
  assert.equal(wariMemoLine([], now), '');
  assert.equal(wariMemoLine([memo('waribiki', midnight - 1, 700, 300)], now), '');
  assert.equal(wariMemoLine([memo('waribiki', now)], now), '');
});

test('8ページの slug がそろっている', async () => {
  const { TOOLS } = await import('../src/tools.mjs');
  const slugs = TOOLS.filter((t) => t.slug === 'waribiki' || t.parent === 'waribiki').map((t) => t.slug).sort();
  assert.deepEqual(slugs, [...WARI_MEMO_SLUGS].sort());
});
