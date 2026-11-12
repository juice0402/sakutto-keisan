import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  jstDate, addDays, daysBetween, weekdayOf, jaDate, jaDateTime, passesChecked, deadlineOf, checkedAlerts,
  textOf, norm, kdreamsState, shohizeiStatus, kirokuCount, kirokuReady, inPrintWindow, printsMissing,
  MEMO, nightBody, WATCHED, failureBody, clip, footer, verdict, pickLatest, notedToday, closedAfter,
} from '../scripts/mihari.mjs';

const at = (s) => Date.parse(`${s}+09:00`); // 日本時間の時刻

test('日付は日本時間で数える', () => {
  assert.equal(jstDate(Date.parse('2026-11-01T15:30:00Z')), '2026-11-02');
  assert.equal(jstDate(Date.parse('2026-11-01T14:59:00Z')), '2026-11-01');
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(daysBetween('2026-11-02', '2026-11-18'), 16);
  assert.equal(weekdayOf('2026-11-03'), 2); // 火曜
  assert.equal(jaDate('2026-11-18'), '11月18日');
  assert.equal(jaDateTime('2026-11-01T21:07:00Z'), '2026年11月2日 6:07');
});

test('確認日の期限はテストの決まりと同じ（ふるさと納税：11〜1月は30日・ほかは90日、SPU：90日）', () => {
  // ふるさと納税のテストは日本時間にずらした時刻でくらべるので、確認日から29日めの15時に止まる → 期限は28日め
  assert.equal(passesChecked('furusato', '2026-10-21', at('2026-11-19T14:59:00')), true);
  assert.equal(passesChecked('furusato', '2026-10-21', at('2026-11-19T15:01:00')), false);
  assert.equal(deadlineOf('furusato', '2026-10-21', at('2026-11-02T05:47:00')), '2026-11-18');
  // 10月は90日
  assert.equal(passesChecked('furusato', '2026-08-01', at('2026-10-20T05:00:00')), true);
  // 10月に確かめた90日の出典も、11月になると30日で止まる
  assert.equal(deadlineOf('furusato', '2026-09-20', at('2026-10-25T05:47:00')), '2026-10-31');
  // SPU は確認日から90日めの0時まで
  assert.equal(passesChecked('spu', '2026-10-23', at('2027-01-20T23:59:00')), true);
  assert.equal(passesChecked('spu', '2026-10-23', at('2027-01-21T00:01:00')), false);
  assert.equal(deadlineOf('spu', '2026-10-23', at('2026-11-02T05:47:00')), '2027-01-20');
  // もう過ぎていたら、通っていた最後の日
  assert.equal(deadlineOf('spu', '2026-10-23', at('2027-02-10T05:47:00')), '2027-01-20');
});

test('期限まで10日以内の出典だけを、同じページ・同じ確認日でまとめて近い順に出す', () => {
  const now = at('2026-11-10T05:47:00');
  const rows = checkedAlerts([
    { kind: 'furusato', name: 'A市', url: 'https://a.example/', checked: '2026-10-21' },
    { kind: 'furusato', name: 'B省', url: 'https://b.example/', checked: '2026-10-22' },
    { kind: 'furusato', name: 'C区', url: 'https://c.example/', checked: '2026-11-02' },
    { kind: 'spu', name: '楽天カード', url: 'https://spu.example/', checked: '2026-10-23' },
    { kind: 'spu', name: '楽天市場「SPU」', url: 'https://spu.example/', checked: '2026-10-23' },
  ], now, 10);
  assert.deepEqual(rows.map((r) => [r.names.join('・'), r.deadline, r.left]), [['A市', '2026-11-18', 8], ['B省', '2026-11-19', 9]]);
  const spu = checkedAlerts([{ kind: 'spu', name: 'x', url: 'u', checked: '2026-10-23' }, { kind: 'spu', name: 'y', url: 'u', checked: '2026-10-23' }], at('2027-01-15T05:47:00'), 10);
  assert.deepEqual(spu.map((r) => [r.names, r.left]), [[['x', 'y'], 5]]);
});

test('ページの文を取り出してくらべやすくする', () => {
  const t = textOf('<html><head><title>特設</title><style>p{}</style><script>var a="成立しました"</script></head><body><p>令和８年&nbsp;法案</p><!-- 成立しました --></body></html>');
  assert.equal(t, '特設 令和８年 法案');
  assert.equal(norm('令和８年 ９月１５日　ＳＰＵ'), '令和8年9月15日SPU');
});

test('Kドリームス：メンテナンス中・開けた・ちがうページを分ける', () => {
  assert.equal(kdreamsState({ status: 200, url: 'https://keirin.kdreams.jp/special/spu/', title: '楽天Kドリームス', text: '緊急メンテナンス中のため全てのサービスを停止しております。' }), 'maintenance');
  assert.equal(kdreamsState({ status: 503, url: 'https://keirin.kdreams.jp/special/spu/' }), 'maintenance');
  assert.equal(kdreamsState({ status: 200, url: 'https://keirin.kdreams.jp/maintenance/index.html', text: 'ただいま' }), 'maintenance');
  assert.equal(kdreamsState({ status: 200, url: 'https://keirin.kdreams.jp/', title: 'メンテナンスのお知らせ', text: 'SPU' }), 'maintenance');
  assert.equal(kdreamsState({ status: 200, url: 'https://keirin.kdreams.jp/', text: 'ただいまメンテナンス中です' }), 'maintenance');
  assert.equal(kdreamsState({ status: 200, url: 'https://keirin.kdreams.jp/special/spu/', title: 'SPU', text: '楽天Kドリームス SPU ＋0.5倍 月の獲得上限 システムメンテナンス中は投票できません' }), 'open');
  assert.equal(kdreamsState({ status: 200, url: 'https://keirin.kdreams.jp/', text: '競輪の投票' }), 'unknown');
  assert.equal(kdreamsState({ status: 403 }), 'error');
  assert.equal(kdreamsState({ status: 0 }), 'error');
});

test('消費税：法律になったとはっきり書いてあるときだけ enacted', () => {
  const now = '消費税率引下げ特設サイト 飲食料品の消費税率の引下げについて。なお、内容については、今後、法案が国会に提出され、審議を経た上で可決・成立した場合のものです。今後、最新の情報を随時掲載していく予定です。';
  assert.equal(shohizeiStatus(now).status, 'pending');
  assert.equal(shohizeiStatus(`${now}令和８年12月５日、法律が成立しました。`).status, 'enacted');
  assert.equal(shohizeiStatus(`${now}「飲食料品消費税率の臨時的な引下げに関する法律」が公布されました。`).status, 'enacted');
  assert.equal(shohizeiStatus(`${now}法律が可決・成立いたしました。`).status, 'enacted');
  assert.equal(shohizeiStatus('消費税率の引下げ。飲食料品消費税率の臨時的な引下げ等に関する法律（令和８年法律第９９号）の概要').status, 'enacted');
  // これからの話・ほかの法律は数えない
  assert.equal(shohizeiStatus(`${now}法律が成立しましたら、改めてお知らせします。`).status, 'pending');
  assert.equal(shohizeiStatus(`${now}施行が決まり次第お知らせします。`).status, 'pending');
  assert.equal(shohizeiStatus(`${now}軽減税率は所得税法等の一部を改正する法律（平成28年法律第15号）による。`).status, 'pending');
  assert.equal(shohizeiStatus(`${now}所得税法等の一部を改正する法律（令和８年法律第10号）`).status, 'pending');
  // 法案の文が変わった・廃案は知らせるだけ
  assert.equal(shohizeiStatus('消費税率引下げ特設サイト。法案は国会で審議されています。').status, 'changed');
  assert.equal(shohizeiStatus(`${now}法案は廃案となりました。`).status, 'changed');
  assert.equal(shohizeiStatus('ページが見つかりません').status, 'unknown');
});

test('お買い物マラソンの記録：終わった回6以上・上限がわかっている回4以上', () => {
  const ev = (end, cap = null) => ({ name: 'お買い物マラソン', start: '2026-10-01T20:00', end, cap });
  const list = [ev('2026-10-09T01:59'), ev('2026-10-17T09:59'), ev('2026-10-27T09:59', 7000)];
  assert.deepEqual(kirokuCount(list, at('2026-11-15T05:47:00')), { ended: 3, withCap: 1 });
  assert.deepEqual(kirokuCount(list, at('2026-10-27T09:58:00')), { ended: 2, withCap: 0 });
  const more = [...list, ev('2026-11-10T01:59', 7000), ev('2026-11-20T01:59', 5000), ev('2026-12-11T01:59', 10000)];
  assert.equal(kirokuReady(kirokuCount(more, at('2026-12-15T05:47:00'))), true);
  assert.equal(kirokuReady(kirokuCount(more, at('2026-11-15T05:47:00'))), false);
});

test('早見表：11月1日〜12月20日に、来年の PDF がないときだけ', () => {
  assert.deepEqual([inPrintWindow('2026-10-31'), inPrintWindow('2026-11-01'), inPrintWindow('2026-12-20'), inPrintWindow('2026-12-21')], [false, true, true, false]);
  assert.deepEqual(printsMissing(['nenrei-2026.pdf', 'gakureki-2026.pdf', 'nenrei-2027.pdf'], 2026), ['gakureki-2027.pdf']);
  assert.deepEqual(printsMissing(['nenrei-2027.pdf', 'gakureki-2027.pdf'], 2026), []);
});

test('夜のメモは決まった6行の順で、見つけたことと最後の1行がつく', () => {
  for (const [kind, m] of Object.entries(MEMO)) {
    const body = nightBody(m, '見つけたこと', 'watch.yml');
    const keys = [...body.matchAll(/^- (やること|できあがりの条件|決まったこと|迷ったら|読むファイル|マージ)：/gm)].map((x) => x[1]);
    assert.deepEqual(keys, ['やること', 'できあがりの条件', '決まったこと', '迷ったら', '読むファイル', 'マージ'], kind);
    assert.match(body, /^- マージ：(する|しない)/m, kind);
    assert.ok(body.trim().endsWith(footer('watch.yml')), kind);
    assert.match(body, /## 見張りが見つけたこと\n\n見つけたこと/, kind);
  }
  for (const k of ['watch-point', 'watch-spu', 'watch-furusato', 'links', 'checked', 'kdreams']) assert.match(MEMO[k].merge, /^する/, k);
  for (const k of ['shohizei', 'kiroku', 'prints']) assert.match(MEMO[k].merge, /^しない/, k);
});

test('失敗の Issue：何が止まったか・いつ・URL・ステップ・注記は3つまで200字まで', () => {
  assert.ok(WATCHED['Build and Deploy'].title.includes('本番の公開'));
  const body = failureBody({ what: WATCHED['Build and Deploy'].what, when: '2026年11月2日 6:07', url: 'https://github.com/x/y/actions/runs/1', steps: ['build-deploy › テスト'], notes: ['a'.repeat(300), 'b', 'c', 'd'] });
  assert.match(body, /^本番の公開/);
  assert.match(body, /- いつ：2026年11月2日 6:07（日本時間）/);
  assert.match(body, /- 失敗したジョブとステップ：build-deploy › テスト/);
  assert.equal((body.match(/^ {2}- /gm) || []).length, 3);
  assert.ok(body.includes(`${'a'.repeat(200)}…`));
  assert.ok(!body.includes('  - d'));
  assert.ok(body.trim().endsWith(footer()));
  assert.equal(clip('x\n  y'), 'x y');
});

test('いちばん新しい実行：main の完了した実行だけ・cancelled などは飛ばしてその前を見る・PR の CI は見ない', () => {
  const run = (id, conclusion, created, more = {}) => ({ id, conclusion, status: 'completed', head_branch: 'main', event: 'push', created_at: created, ...more });
  const runs = [
    run(6, 'failure', '2026-11-13T03:00:00Z', { head_branch: 'claude/x' }),
    run(5, 'failure', '2026-11-13T02:30:00Z', { event: 'pull_request' }),
    run(4, null, '2026-11-13T02:00:00Z', { status: 'in_progress' }),
    run(3, 'cancelled', '2026-11-13T01:00:00Z'),
    run(2, 'skipped', '2026-11-13T00:30:00Z'),
    run(1, 'failure', '2026-11-12T23:00:00Z', { event: 'workflow_dispatch' }),
    run(0, 'success', '2026-11-12T22:00:00Z'),
  ];
  assert.equal(pickLatest(runs).id, 1);
  assert.equal(pickLatest([...runs].reverse()).id, 1);
  assert.equal(pickLatest(runs.slice(6)).id, 0);
  assert.equal(pickLatest(runs.slice(0, 5)), null);
});

test('判定は workflow_run と同じ：成功なら閉じる・失敗なら Issue・取り消しなどは何もしない', () => {
  assert.equal(verdict('success'), 'resolve');
  for (const c of ['failure', 'timed_out', 'startup_failure']) assert.equal(verdict(c), 'raise', c);
  for (const c of ['cancelled', 'skipped', 'neutral', 'action_required', null]) assert.equal(verdict(c), 'none', String(c));
});

test('同じ題の Issue には1日1回だけ：今日作った・今日の「まだ続いている」があれば何もしない', () => {
  const now = at('2026-11-13T15:11');
  const bot = (body, created) => ({ user: { type: 'Bot' }, body, created_at: created });
  const old = { created_at: '2026-11-11T01:00:00Z' };
  assert.equal(notedToday({ created_at: '2026-11-12T16:00:00Z' }, [], now), true); // 日本時間 11/13 1:00 に作った
  assert.equal(notedToday(old, [], now), false);
  assert.equal(notedToday(old, [bot('まだ続いている（u）', '2026-11-13T00:20:00Z')], now), true);
  assert.equal(notedToday(old, [bot('まだ続いている（u）', '2026-11-12T14:00:00Z')], now), false); // 日本時間 11/12 23:00
  assert.equal(notedToday(old, [{ user: { type: 'User' }, body: 'まだ続いている', created_at: '2026-11-13T00:20:00Z' }], now), false);
  assert.equal(notedToday(old, [bot('直った（u）', '2026-11-13T00:20:00Z')], now), false);
});

test('3時間ごとの見張り：失敗のあとに閉じられた同じ題の Issue があれば作り直さない', () => {
  const t = WATCHED['Build and Deploy'].title;
  const issues = [
    { number: 9, title: t, closed_at: '2026-11-13T05:00:00Z' },
    { number: 8, title: 'ほかの題', closed_at: '2026-11-13T06:00:00Z' },
    { number: 7, title: t, closed_at: '2026-11-13T05:00:00Z', pull_request: {} },
  ];
  assert.equal(closedAfter(issues, t, '2026-11-13T04:00:00Z').number, 9);
  assert.equal(closedAfter(issues, t, '2026-11-13T05:30:00Z'), null);
  assert.equal(closedAfter([], t, '2026-11-13T04:00:00Z'), null);
});

test('mihari.yml：3時間ごとにも見る（毎朝の点検は1日1回のまま）・見張る workflow は WATCHED と同じ', () => {
  const wf = readFileSync(new URL('../.github/workflows/mihari.yml', import.meta.url), 'utf8');
  assert.match(wf, /^\s*schedule:\n\s*- cron: '47 20 \* \* \*'.*\n\s*- cron: '11 \*\/3 \* \* \*'/m);
  const job = (name) => wf.split(/\n {2}(?=[a-z]+:\n)/).find((b) => b.startsWith(`${name}:`)) || '';
  assert.match(job('latest'), /github\.event\.schedule == '11 \*\/3 \* \* \*'/);
  assert.match(job('latest'), /node scripts\/mihari\.mjs latest/);
  assert.match(job('daily'), /github\.event\.schedule == '47 20 \* \* \*'/);
  assert.doesNotMatch(job('daily'), /\*\/3/);
  assert.match(job('daily'), /node scripts\/mihari\.mjs daily/);
  const listed = wf.match(/workflows: \[(.+)\]/)[1].split(',').map((x) => x.trim());
  assert.deepEqual(listed.sort(), Object.keys(WATCHED).sort());
});
