import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITES, isGoogle, windows, tally, judge, baselineOf, recovered, authError, issueBody, titleOf, table, askCloudflare, query, AUTH_BODY,
} from '../scripts/mihari-google.mjs';

const row = (date, siteTag, refererHost, visits, sampleInterval = 1) => ({ sum: { visits }, avg: { sampleInterval }, dimensions: { date, siteTag, refererHost } });
const fanza = SITES[0];

test('Google の検索だけを数える（ほかのサブドメインは入れない）', () => {
  for (const h of ['www.google.com', 'www.google.co.jp', 'google.com', 'google.co.jp', 'WWW.GOOGLE.COM']) assert.equal(isGoogle(h), true, h);
  for (const h of ['accounts.google.com', 'mail.google.com', 'docs.google.com', 'search.yahoo.co.jp', '', null, 'googleusercontent.com', 'notgoogle.com']) assert.equal(isGoogle(h), false, String(h));
});

test('日付：きのうまでの3日と、その前の7日（UTC）', () => {
  const w = windows('2026-11-02');
  assert.deepEqual(w.recent, ['2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepEqual(w.base, ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']);
});

test('行を集めて Google の数を日ごとに足す・倍率はいちばん大きいもの', () => {
  const t = tally([
    row('2026-11-01', fanza.tag, 'www.google.com', 3),
    row('2026-11-01', fanza.tag, 'www.google.co.jp', 2),
    row('2026-11-01', fanza.tag, '', 9),
    row('2026-11-01', fanza.tag, 'accounts.google.com', 7, 10),
  ]);
  assert.deepEqual(t.by, { [fanza.tag]: { '2026-11-01': 5 } });
  assert.equal(t.rate, 10);
  assert.equal(tally([]).rate, 1);
});

test('落ちこみ：直近3日がどれも前の7日の1日平均の半分以下', () => {
  // fanza の 10/30〜 の形（前は1日 47〜79、あとは 4〜6）
  const r = judge([60, 70, 79, 67, 57, 47, 50], [6, 5, 4]);
  assert.equal(r.status, 'drop');
  assert.equal(Math.round(r.avg), 61);
});

test('落ちこみなし：1日でも半分をこえていればふつう', () => {
  assert.equal(judge([40, 40, 40, 40, 40, 40, 40], [5, 21, 5]).status, 'ok');
  assert.equal(judge([40, 40, 40, 40, 40, 40, 40], [20, 20, 20]).status, 'drop'); // ちょうど半分は落ちこみ
  assert.equal(judge([40, 40, 40, 40, 40, 40, 40], [40, 38, 45]).status, 'ok');
});

test('前の7日の1日平均が20未満は見ない', () => {
  const r = judge([19, 19, 19, 19, 19, 19, 19], [0, 0, 0]);
  assert.equal(r.status, 'skip');
  assert.equal(judge([20, 20, 20, 20, 20, 20, 20], [0, 0, 0]).status, 'drop');
  assert.equal(judge([0, 0, 0, 0, 0, 0, 140], [0, 0, 0]).status, 'drop'); // ない日は0として平均
});

test('戻った：きのうが baseline の70%以上で閉じる', () => {
  const body = issueBody(fanza, { avg: 61.2, recent: [['2026-10-30', 6], ['2026-10-31', 5], ['2026-11-01', 4]], rate: 1 });
  const b = baselineOf(body);
  assert.equal(b, 61.2);
  assert.equal(recovered(b, 43), true);
  assert.equal(recovered(b, 42), false);
  assert.equal(recovered(null, 100), false);
  assert.equal(baselineOf('本文に印がない'), null);
});

test('Issue の題と本文', () => {
  assert.equal(titleOf(fanza), 'Google からの訪問が急に減った：av-sale-guide.com');
  const body = issueBody(fanza, { avg: 61.2, recent: [['2026-10-30', 6], ['2026-10-31', 5], ['2026-11-01', 4]], rate: 10 });
  assert.match(body, /前の7日の1日平均：61\.2/);
  assert.match(body, /10月30日 6・10月31日 5・11月1日 4/);
  assert.match(body, /倍率 10（サンプルから数えた目安）/);
  assert.match(body, /Search Console で/);
  assert.match(body, /<!-- baseline: 61\.2 -->/);
  assert.match(body, /見張り（\.github\/workflows\/mihari-google\.yml）が作った\n$/);
  assert.match(AUTH_BODY, /アカウント分析（Account Analytics）：読み取り/);
  const t = table([{ site: fanza, avg: 61.2, recent: [['a', 6], ['b', 5], ['c', 4]], status: 'drop' }], windows('2026-11-02'), 1);
  assert.match(t, /fanza \| 61\.2 \| 6・5・4 \| 落ちこみ/);
});

test('鍵の権限エラー：401・403・GraphQL の errors の権限の言葉', () => {
  assert.equal(authError(401, null), true);
  assert.equal(authError(403, {}), true);
  assert.equal(authError(200, { errors: [{ message: 'not authorized for that account' }] }), true);
  assert.equal(authError(200, { errors: [{ message: 'does not have permission to access this resource' }] }), true);
  assert.equal(authError(200, { errors: [{ message: 'Authentication error' }] }), true);
  assert.equal(authError(200, { errors: [{ message: 'rate limiter budget depleted' }] }), false);
  assert.equal(authError(200, { data: {} }), false);
});

// 見本の返り値で Cloudflare への問い合わせを試す（本物にはつながない）
const fake = (status, json) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => json });

test('Cloudflare の答え：data.viewer と viewer の両方を読む・権限・5xx・つながらない', async () => {
  const rows = [row('2026-11-01', fanza.tag, 'www.google.com', 3)];
  const acc = { accounts: [{ rumPageloadEventsAdaptiveGroups: rows }] };
  assert.deepEqual(await askCloudflare('a', 'b', { fetchImpl: fake(200, { data: { viewer: acc } }) }), { rows });
  assert.deepEqual(await askCloudflare('a', 'b', { fetchImpl: fake(200, { viewer: acc }) }), { rows });
  assert.deepEqual(await askCloudflare('a', 'b', { fetchImpl: fake(403, { errors: [] }) }), { auth: true });
  assert.deepEqual(await askCloudflare('a', 'b', { fetchImpl: fake(200, { data: null, errors: [{ message: 'not authorized' }] }) }), { auth: true });
  assert.match((await askCloudflare('a', 'b', { fetchImpl: fake(502, null) })).skip, /HTTP 502/);
  assert.match((await askCloudflare('a', 'b', { fetchImpl: fake(429, { errors: [{ message: 'rate limited' }] }) })).skip, /HTTP 429/);
  assert.match((await askCloudflare('a', 'b', { fetchImpl: async () => { throw new TypeError('fetch failed'); } })).skip, /つながらない/);
  await assert.rejects(askCloudflare('a', 'b', { fetchImpl: fake(200, { errors: [{ message: 'unknown field' }] }) }), /unknown field/);
});

test('問い合わせ：6サイト・日本だけ・別名なし', () => {
  const q = query('ACC', '2026-10-30', '2026-11-01');
  for (const s of SITES) assert.ok(q.includes(s.tag));
  assert.match(q, /countryName: "JP"/);
  assert.match(q, /date_geq: "2026-10-30", date_leq: "2026-11-01"/);
  assert.equal((q.match(/rumPageloadEventsAdaptiveGroups/g) || []).length, 1);
});
