// お買い物マラソンの過去の開催一覧 /point/kiroku/（#193）：終わった回の数え方・表の作り方・本文の数字
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { kirokuEnded, kirokuCount, kirokuReady, kirokuSpan, kirokuStats, grantIsNext15, expiresIsNextEnd } from '../src/lib/kiroku.mjs';
import { kirokuCount as mihariCount, kirokuReady as mihariReady } from '../scripts/mihari.mjs';
import { setInlineScripts } from '../src/layout.mjs';
import { POINT_EVENTS, POINT_CAPS } from '../src/data/point.mjs';
import { pointReach } from '../src/lib/point.mjs';
import { toolBySlug, CALC_COUNT, TOOLS } from '../src/tools.mjs';
import render, { kirokuTable, kirokuFacts } from '../src/pages/kiroku.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
setInlineScripts(Object.fromEntries(readdirSync(join(HERE, '../src/client')).filter((f) => f.endsWith('.js')).map((f) => [f, '/* */'])));
const at = (s) => Date.parse(`${s}+09:00`);
const rows = (html) => (html.match(/<tbody>([\s\S]*?)<\/tbody>/) || ['', ''])[1].split('<tr>').length - 1;
const ev = (start, end, cap = null, more = {}) => ({ name: 'お買い物マラソン', start, end, cap, url: 'https://example.com/', checked: '2026-10-22', ...more });

test('見張りとページは同じ数え方（src/lib/kiroku.mjs）', () => {
  assert.equal(mihariCount, kirokuCount);
  assert.equal(mihariReady, kirokuReady);
});

test('終わった回：end の時刻を過ぎてから入る', () => {
  const list = [ev('2026-10-04T20:00', '2026-10-09T01:59'), ev('2026-10-24T20:00', '2026-10-27T09:59', 7000)];
  assert.equal(kirokuEnded(list, at('2026-10-27T09:58:00')).length, 1);
  assert.equal(kirokuEnded(list, at('2026-10-27T09:59:01')).length, 2);
  assert.deepEqual(kirokuCount(list, at('2026-11-01T00:00:00')), { ended: 2, withCap: 1 });
});

test('検索に出すのは終わった回6以上・上限が数字の回4以上から', () => {
  assert.equal(kirokuReady({ ended: 5, withCap: 5 }), false);
  assert.equal(kirokuReady({ ended: 6, withCap: 3 }), false);
  assert.equal(kirokuReady({ ended: 6, withCap: 4 }), true);
});

test('期間の長さ：1:59・9:59 の終わりは1分足して数える', () => {
  assert.deepEqual(kirokuSpan(ev('2026-10-04T20:00', '2026-10-09T01:59')), { hours: 102, days: 4, rest: 6 });
  assert.deepEqual(kirokuSpan(ev('2026-10-24T20:00', '2026-10-27T09:59')), { hours: 62, days: 2, rest: 14 });
  assert.deepEqual(kirokuSpan(ev('2026-11-04T20:00', '2026-11-11T01:59')), { hours: 150, days: 6, rest: 6 });
});

test('付与日は終わった月の翌月15日か・有効期限は付与の翌月の末日か', () => {
  const a = ev('2026-10-24T20:00', '2026-10-27T09:59', 7000, { grant: '2026-11-15', expires: '2026-12-31' });
  const b = ev('2026-11-04T20:00', '2026-11-11T01:59', 7000, { grant: '2026-12-15', expires: '2027-01-31' });
  assert.equal(grantIsNext15(a), true);
  assert.equal(grantIsNext15(b), true);
  assert.equal(expiresIsNextEnd(a), true);
  assert.equal(expiresIsNextEnd(b), true);
  assert.equal(grantIsNext15({ ...a, grant: '2026-11-16' }), false);
  assert.equal(expiresIsNextEnd({ ...a, expires: '2026-12-30' }), false);
  assert.equal(grantIsNext15(ev('2026-10-04T20:00', '2026-10-09T01:59')), null);
});

test('上限ごとの回の数と、いちばん長い回・短い回', () => {
  const list = [ev('2026-10-04T20:00', '2026-10-09T01:59'), ev('2026-10-24T20:00', '2026-10-27T09:59', 7000), ev('2026-11-04T20:00', '2026-11-11T01:59', 5000)];
  const s = kirokuStats(list, POINT_CAPS);
  assert.deepEqual(s.byCap, [{ cap: 5000, n: 1 }, { cap: 7000, n: 1 }, { cap: 10000, n: 0 }]);
  assert.equal(s.unknown, 1);
  assert.equal(s.longest.hours, 150);
  assert.equal(s.shortest.hours, 62);
});

test('表：終わった回だけ・新しい回が上・わからない所は「—」・年がちがう日は年を書く', () => {
  const list = [
    ev('2026-10-04T20:00', '2026-10-09T01:59'),
    ev('2026-11-04T20:00', '2026-11-11T01:59', 7000, { grant: '2026-12-15', expires: '2027-01-31' }),
    ev('2026-12-04T20:00', '2026-12-11T01:59', 10000),
  ];
  assert.equal(kirokuTable(list, at('2026-10-01T00:00:00')), '');
  const html = kirokuTable(list, at('2026-11-20T00:00:00'));
  assert.equal(rows(html), 2);
  assert.ok(html.indexOf('11月4日') < html.indexOf('10月4日'), '新しい回が上');
  assert.ok(html.includes('<td class="num">7,000</td><td><span class="nw">12月15日</span></td><td><span class="nw">2027年</span><wbr><span class="nw">1月31日</span></td>'));
  assert.ok(html.includes('<td class="num">—</td><td>—</td><td>—</td>'));
  assert.ok(html.includes('20:00〜</span><wbr><span class="nw">10月9日 1:59'));
  assert.ok(!html.includes('10,000'), '終わっていない回は入らない');
});

test('ページ：11月4日からの回は、終わった日（11月11日 1:59）のあとのビルドで1行ふえる', () => {
  const before = render(at('2026-11-11T01:58:00'));
  const after = render(at('2026-11-11T02:00:00'));
  const table = (h) => (h.match(/<table class="tbl-tight kr-table">[\s\S]*?<\/table>/) || [''])[0];
  assert.equal(rows(table(before.html)), 3);
  assert.equal(rows(table(after.html)), 4);
  assert.ok(after.html.includes('前回は11月4日から11月11日までで、上限は7,000ポイントでした。'));
});

test('ページ：回がたまるまでは noindex でサイトマップの外', () => {
  const now = at('2026-11-23T06:00:00');
  const p = render(now);
  const ready = kirokuReady(kirokuCount(POINT_EVENTS, now));
  assert.equal(p.sitemap, ready);
  assert.equal(p.html.includes('<meta name="robots" content="noindex">'), !ready);
  assert.equal(p.path, '/point/kiroku/');
});

test('本文の数字（2026年11月23日のデータ）', () => {
  const now = at('2026-11-23T06:00:00');
  const f = kirokuFacts(POINT_EVENTS, now);
  assert.equal(f.ended.length, 4);
  assert.equal(f.caps, '上限がわかっている2回は、どれも7,000ポイントでした。');
  const html = render(now).html;
  assert.equal(pointReach(10, 7000), 85580);
  assert.equal(pointReach(5, 7000), 192500);
  assert.ok(html.includes('上限7,000の回は、10店舗なら税込85,580円、5店舗なら税込192,500円の合計で特典が上限に届きます'));
  assert.ok(html.includes('いちばん長いのは11月4日からの6日6時間で、短いのは10月14日からの2日14時間です。'));
  assert.ok(html.includes('付与日から有効期限までは46日から47日です。'));
  assert.ok(html.includes('楽天グループとは関係ありません'));
});

test('tools.mjs：/point/ の下のページ・計算のツールの数には入れない・slug に kiroku', () => {
  const t = toolBySlug('point-kiroku');
  assert.equal(t.parent, 'point');
  assert.equal(t.path, '/point/kiroku/');
  assert.equal(t.noCalc, true);
  assert.equal(CALC_COUNT, TOOLS.filter((x) => x.published && !x.noCalc && !x.slug.startsWith('furusato-henreihin')).length);
});
