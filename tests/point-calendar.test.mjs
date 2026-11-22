// 楽天の予定のカレンダー /point/calendar.ics（#190）：ics の形（CRLF・折り返し・エスケープ）・UID・90日をこえた回・5と0のつく日のくり返し
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icsEscape, icsFold, icsUtc } from '../src/lib/ics.mjs';
import render, { pointIcs, calendarEvents, CAL_LINKS, CAL_PATH } from '../src/pages/point-calendar.mjs';
import { POINT_DAY } from '../src/data/spu.mjs';

const EV = [
  { name: 'お買い物マラソン', start: '2026-10-04T20:00', end: '2026-10-09T01:59', cap: null, url: 'https://example.com/a', checked: '2026-10-22' },
  { name: 'お買い物マラソン', start: '2026-11-04T20:00', end: '2026-11-11T01:59', cap: 7000, url: 'https://example.com/b', checked: '2026-11-03' },
];
const at = (s) => Date.parse(`${s}+09:00`);
// 折り返しをもどして、行ごとに
const unfold = (s) => s.replace(/\r\n /g, '').split('\r\n');
const blocks = (s) => unfold(s).join('\n').split('BEGIN:VEVENT').slice(1);

test('エスケープ：\\ ; , 改行', () => {
  assert.equal(icsEscape('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});

test('折り返し：75オクテットまで・文字の途中で切らない・もどすと元の行', () => {
  const line = 'DESCRIPTION:' + 'あいうえお'.repeat(20) + 'abc';
  const out = icsFold(line);
  for (const l of out.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75, l);
  assert.equal(out.replace(/\r\n /g, ''), line);
  assert.equal(icsFold('SHORT:1'), 'SHORT:1');
});

test('日本時間を UTC の Z に', () => {
  assert.equal(icsUtc('2026-11-04T20:00'), '20261104T110000Z');
  assert.equal(icsUtc('2026-11-11T01:59'), '20261110T165900Z');
});

test('ファイルの形：CRLF だけ・頭の行・最後も CRLF', () => {
  const s = pointIcs(EV, POINT_DAY, at('2026-11-22T09:00'));
  assert.ok(s.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(s.endsWith('END:VCALENDAR\r\n'));
  assert.equal(s.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(s.replace(/\r\n/g, '').includes('\r'), false);
  for (const l of s.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75);
  const lines = unfold(s);
  for (const h of ['X-WR-CALNAME:サクッと計算 楽天のポイントの予定', 'X-WR-TIMEZONE:Asia/Tokyo', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D']) assert.ok(lines.includes(h), h);
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, lines.filter((l) => l === 'END:VEVENT').length);
});

test('マラソンの回：題・時刻・上限・UID は start から', () => {
  const [a, b] = blocks(pointIcs(EV, POINT_DAY, at('2026-11-22T09:00')));
  assert.match(a, /\nUID:point-20261004T2000@sakutto-keisan\.com\n/);
  assert.match(a, /\nSUMMARY:お買い物マラソン（楽天市場）\n/);
  assert.match(a, /\nDTSTART:20261004T110000Z\n/);
  assert.match(a, /\nDTEND:20261008T165900Z\n/);
  assert.doesNotMatch(a, /上限/);
  assert.match(b, /買いまわりの上限 7\\,000ポイント/);
  assert.match(b, /エントリー/);
  assert.match(b, /https:\/\/sakutto-keisan\.com\/point\//);
  assert.match(b, /https:\/\/example\.com\/b/);
});

test('UID と中身はビルドの日が変わっても同じ（回が入れかわらないあいだ）', () => {
  assert.equal(pointIcs(EV, POINT_DAY, at('2026-11-12T00:00')), pointIcs(EV, POINT_DAY, at('2026-12-20T00:00')));
  const uids = unfold(pointIcs(EV, POINT_DAY, at('2026-11-22T09:00'))).filter((l) => l.startsWith('UID:'));
  assert.equal(new Set(uids).size, uids.length);
});

test('終わって90日をこえた回は入らない', () => {
  // 10/9 01:59 に終わった回：90日後は 2027-01-07 01:59
  assert.equal(calendarEvents(EV, at('2027-01-07T01:59')).length, 2);
  assert.equal(calendarEvents(EV, at('2027-01-07T02:00')).length, 1);
  assert.equal(calendarEvents(EV, at('2027-03-01T00:00')).length, 0);
  const s = pointIcs(EV, POINT_DAY, at('2027-03-01T00:00'));
  assert.equal(blocks(s).length, 1); // 5と0のつく日だけ
});

test('5と0のつく日：終日・決まった日から毎月くり返す', () => {
  const day = blocks(pointIcs(EV, POINT_DAY, at('2026-11-22T09:00'))).at(-1);
  assert.match(day, /\nUID:point-day-5-0@sakutto-keisan\.com\n/);
  assert.match(day, /\nDTSTART;VALUE=DATE:20261105\n/);
  assert.match(day, /\nDTEND;VALUE=DATE:20261106\n/);
  assert.match(day, /\nRRULE:FREQ=MONTHLY;BYMONTHDAY=5,10,15,20,25,30\n/);
  assert.match(day, /\nSUMMARY:5と0のつく日（楽天カード）\n/);
  assert.ok(day.includes(`＋${POINT_DAY.rate}倍`));
  assert.ok(day.includes(`${POINT_DAY.cap.toLocaleString('en')}ポイント`.replace(',', '\\,')));
  assert.match(day, /楽天カード/);
});

test('ページの返り値は { path, raw }・リンクの行', () => {
  const p = render();
  assert.equal(p.path, CAL_PATH);
  assert.equal(p.html, undefined);
  assert.ok(p.raw.startsWith('BEGIN:VCALENDAR'));
  assert.ok(CAL_LINKS.includes('href="webcal://sakutto-keisan.com/point/calendar.ics"'));
  assert.ok(CAL_LINKS.includes('href="https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fsakutto-keisan.com%2Fpoint%2Fcalendar.ics"'));
});
