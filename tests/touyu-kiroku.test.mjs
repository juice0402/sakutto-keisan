// 灯油の値段の記録（#180）：冬の切り分け・前の週との差・直近12週の表・節を出さないとき・見張りの調査日の読み取り
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { winterOf, winterDay, touyuRecord, touyuHistory } from '../src/touyu-now.mjs';
import { kirokuHtml } from '../src/pages/touyu-dai.mjs';
import { inTouyuSeason, touyuDayOf, touyuStale } from '../scripts/mihari.mjs';

// 月曜ごとの値段（start から n 週、1週ごとに +step 円）
const weekly = (start, n, can, step = 5) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${start}T00:00:00Z`) + i * 7 * 86400000).toISOString().slice(0, 10), can: can + i * step }));

test('冬は10月から翌年3月まで（名前は始まりの年）', () => {
  assert.equal(winterOf('2026-10-05'), 2026);
  assert.equal(winterOf('2026-12-28'), 2026);
  assert.equal(winterOf('2027-01-04'), 2026);
  assert.equal(winterOf('2027-03-29'), 2026);
  assert.equal(winterOf('2027-04-05'), null);
  assert.equal(winterOf('2026-09-28'), null);
  assert.equal(winterDay('2026-10-01', 2026), 0);
  assert.equal(winterDay('2026-11-01', 2026), 31);
  assert.equal(winterDay('2027-03-31', 2026), 181);
});

test('記録：この冬と前の冬に分け、直近12週を新しい順に前の週との差つきで', () => {
  const weeks = [...weekly('2025-09-01', 40, 2400), ...weekly('2026-06-01', 24, 2500, 3)];
  const rec = touyuRecord(weeks);
  assert.equal(rec.cur.year, 2026);
  assert.deepEqual(rec.cur.weeks.map((w) => w.date), ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  assert.equal(rec.prev.year, 2025);
  assert.equal(rec.prev.weeks[0].date, '2025-10-06');
  assert.equal(rec.prev.weeks[rec.prev.weeks.length - 1].date, '2026-03-30');
  assert.equal(rec.rows.length, 12);
  assert.deepEqual(rec.rows[0], { date: '2026-11-09', can: 2569, diff: 3 });
  assert.equal(rec.rows[11].date, '2026-08-24');
  assert.equal(rec.rows[11].diff, 3); // 表のいちばん古い週も、その前の週との差
  // 前の週がない・値段が下がった・同じ
  const r2 = touyuRecord([{ date: '2026-10-05', can: 2600 }, { date: '2026-10-12', can: 2590 }, { date: '2026-10-19', can: 2590 }]);
  assert.deepEqual(r2.rows.map((r) => r.diff), [0, -10, null]);
});

test('前の冬のデータがなければ、この冬だけ', () => {
  const rec = touyuRecord(weekly('2026-10-05', 3, 2550));
  assert.equal(rec.prev, null);
  assert.equal(rec.cur.weeks.length, 3);
  const html = kirokuHtml(rec);
  assert.match(html, /class="lc-a"/);
  assert.doesNotMatch(html, /class="lc-b"/);
  assert.match(html, /この冬だけ/);
});

test('節を出さないとき：週がない・いちばん新しい週が冬でない・おかしな値', () => {
  assert.equal(touyuRecord([]), null);
  assert.equal(touyuRecord(null), null);
  assert.equal(touyuRecord(weekly('2026-05-04', 4, 2500)), null);
  assert.equal(touyuRecord([{ date: '2026-10-05', can: 150 }]), null);
  assert.equal(kirokuHtml(null), '');
});

test('ファイルから：ない・はじめの値より古いときは null、あれば記録と単位', () => {
  const dir = mkdtempSync(join(tmpdir(), 'touyu-'));
  const file = join(dir, 'price.json');
  assert.equal(touyuHistory(join(dir, 'none.json')), null);
  writeFileSync(file, JSON.stringify({ unit: '18L', weeks: weekly('2026-09-28', 3, 2550) }));
  assert.equal(touyuHistory(file, { day: '2026-10-13' }), null);
  writeFileSync(file, JSON.stringify({ unit: '1L', weeks: weekly('2026-10-05', 6, 2550) }));
  const rec = touyuHistory(file, { day: '2026-10-13' });
  assert.equal(rec.unit, '1L');
  assert.equal(rec.rows[0].date, '2026-11-09');
});

test('記録の絵と表：数字は HTML の文字、絵は role="img" と aria-label', () => {
  const rec = touyuRecord([...weekly('2025-10-06', 26, 2400), ...weekly('2026-10-05', 6, 2550)]);
  const html = kirokuHtml(rec);
  assert.match(html, /<figure class="lc" role="img" aria-label="[^"]*この冬は10月5日の2,550円から11月9日の2,575円。前の冬は10月6日の2,400円から3月30日の2,525円。"/);
  assert.match(html, /<span class="lc-end" style="[^"]*">2,575円<\/span>/);
  assert.match(html, /<td>11月9日<\/td><td class="num">2,575円<\/td><td class="num">\+5円<\/td>/);
  assert.match(html, /資源エネルギー庁「石油製品価格調査」<\/a>をもとに作成/);
  assert.doesNotMatch(html, /高い|安い|見通し/);
});

test('見張り：灯油の値段の調査日（10月〜3月・14日より古いと知らせる）', () => {
  assert.equal(inTouyuSeason('2026-10-01'), true);
  assert.equal(inTouyuSeason('2027-03-31'), true);
  assert.equal(inTouyuSeason('2027-04-01'), false);
  assert.equal(inTouyuSeason('2026-09-30'), false);
  assert.equal(touyuDayOf('灯油の値段 11月9日調査・全国の店頭・18L', '2026-11-18'), '2026-11-09');
  assert.equal(touyuDayOf('１２月２９日調査', '2027-01-10'), '2026-12-29');
  assert.equal(touyuDayOf('10月13日調査 … 11月9日調査', '2026-11-18'), '2026-11-09');
  assert.equal(touyuDayOf('調査日なし', '2026-11-18'), null);
  assert.equal(touyuStale('2026-11-09', '2026-11-23'), false);
  assert.equal(touyuStale('2026-11-09', '2026-11-24'), true);
  assert.equal(touyuStale(null, '2026-11-24'), true);
});
