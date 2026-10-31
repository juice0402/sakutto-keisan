import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gakureki, cohortOf } from '../src/lib/gakureki.mjs';
import { wareki, kanshiOf, ERA_TABLE, nenText, nenIfContinued } from '../src/lib/wareki.mjs';
import { gradeOf } from '../src/lib/nenrei.mjs';
import { parseYmd } from '../src/lib/hizuke.mjs';

const line = (r) => `${r.y}/${r.m} ${r.wareki} ${r.school}${r.kind} ${r.age}`;

test('ページの計算例（2004年6月10日生まれ）', () => {
  const r = gakureki({ birth: '2004-06-10' });
  assert.equal(r.early, false);
  assert.deepEqual(r.rows.map(line), [
    '2011/4 平成23 小学校入学 6',
    '2017/3 平成29 小学校卒業 12',
    '2017/4 平成29 中学校入学 12',
    '2020/3 令和2 中学校卒業 15',
    '2020/4 令和2 高校入学 15',
    '2023/3 令和5 高校卒業 18',
    '2023/4 令和5 大学入学 18',
    '2027/3 令和9 大学卒業 22',
  ]);
});

test('早生まれ（1月1日〜4月1日）は前の年の4月2日〜と同じ学年', () => {
  assert.equal(cohortOf(parseYmd('2005-04-01')), 2004);
  assert.equal(cohortOf(parseYmd('2005-01-01')), 2004);
  assert.equal(cohortOf(parseYmd('2004-04-02')), 2004);
  assert.equal(cohortOf(parseYmd('2004-12-31')), 2004);
  const a = gakureki({ birth: '2005-04-01' });
  const b = gakureki({ birth: '2004-04-02' });
  assert.equal(a.early, true);
  assert.deepEqual(a.rows, b.rows);
  // 年齢の計算の学年と同じ（小学校入学の年度に小1）
  for (const birth of ['2004-04-02', '2005-04-01', '2005-04-02', '1987-06-15', '1990-02-28']) {
    const g = gakureki({ birth });
    const first = g.rows[0];
    assert.equal(gradeOf(parseYmd(birth), { y: first.y, m: 4, d: 10 }), '小1', birth);
    assert.equal(gradeOf(parseYmd(birth), { y: g.rows[1].y, m: 3, d: 10 }), '小6', birth);
    assert.equal(gradeOf(parseYmd(birth), { y: g.rows[7].y, m: 3, d: 10 }), '大学4年', birth);
  }
});

test('浪人・留年・短大や専門', () => {
  const r = gakureki({ birth: '2004-06-10', ronin: 1 });
  assert.deepEqual(r.rows.slice(6).map(line), ['2024/4 令和6 大学入学 19', '2028/3 令和10 大学卒業 23']);
  const s = gakureki({ birth: '2004-06-10', ryunen: 1 });
  assert.deepEqual(s.rows.slice(6).map(line), ['2023/4 令和5 大学入学 18', '2028/3 令和10 大学卒業 23']);
  const t = gakureki({ birth: '2004-06-10', tandai: true });
  assert.deepEqual(t.rows.slice(6).map(line), ['2023/4 令和5 短大・専門入学 18', '2025/3 令和7 短大・専門卒業 20']);
  const all = gakureki({ birth: '2004-06-10', ronin: 1, ryunen: 1, tandai: true });
  assert.deepEqual(all.rows.slice(6).map(line), ['2024/4 令和6 短大・専門入学 19', '2027/3 令和9 短大・専門卒業 22']);
});

test('改元の年（平成31年4月・平成元年）と、いちばん古い生年月日', () => {
  const r = gakureki({ birth: '2012-08-01' }); // 2019年4月 小学校入学
  assert.equal(line(r.rows[0]), '2019/4 平成31 小学校入学 6');
  const s = gakureki({ birth: '1982-05-05' }); // 1989年4月 小学校入学
  assert.equal(line(s.rows[0]), '1989/4 平成元 小学校入学 6');
  const old = gakureki({ birth: '1940-04-02' });
  assert.equal(line(old.rows[0]), '1947/4 昭和22 小学校入学 6');
  assert.equal(gakureki({ birth: '1940-04-01' }).field, 'birth');
  assert.deepEqual(gakureki({ birth: '' }), { ok: false, empty: true, missing: 'birth' });
  assert.equal(gakureki({ birth: '2201-01-01' }).field, 'birth');
});

// 早見表（ページの表）：生まれた年（4月2日〜12月31日）ごとの小学校・中学・高校・大学の入学と大学の卒業
test('学歴の早見表の行', () => {
  const row = (y) => gakureki({ birth: `${y}-06-01` }).rows.filter((r) => r.kind === '入学' || r.school === '大学').map((r) => r.y);
  assert.deepEqual(row(1990), [1997, 2003, 2006, 2009, 2013]);
  assert.deepEqual(row(2000), [2007, 2013, 2016, 2019, 2023]);
});

const Y = 2026;
const toW = (seireki) => wareki({ from: 'seireki', seireki, thisYear: Y });
const toS = (era, nen) => wareki({ from: 'wareki', era, nen, thisYear: Y });

test('元号の表（西暦との差と、最後の年）', () => {
  assert.deepEqual(ERA_TABLE.map((e) => [e.name, e.y0, e.last]), [
    ['明治', 1867, 45],
    ['大正', 1911, 15],
    ['昭和', 1925, 64],
    ['平成', 1988, 31],
    ['令和', 2018, 182],
  ]);
});

test('西暦から和暦（ページの計算例と改元の年）', () => {
  assert.equal(toW(2026).text, '令和8年');
  assert.equal(toW(1998).text, '平成10年');
  assert.equal(toW(1975).text, '昭和50年');
  const k = toW(1989);
  assert.deepEqual([k.text, k.note], ['平成元年', '1月7日までは昭和64年']);
  assert.deepEqual([toW(2019).text, toW(2019).note], ['令和元年', '4月30日までは平成31年']);
  assert.deepEqual([toW(1926).text, toW(1926).note], ['昭和元年', '12月24日までは大正15年']);
  assert.deepEqual([toW(1912).text, toW(1912).note], ['大正元年', '7月29日までは明治45年']);
  assert.deepEqual([toW(1868).text, toW(1868).note], ['明治元年', '明治5年までは旧暦で、月日はずれます']);
  assert.equal(toW(1873).note, '');
  assert.deepEqual([toW(2030).text, toW(2030).note, toW(2030).ago], ['令和12年', '令和が続いたときの年です', -4]);
  assert.equal(toW(2200).text, '令和182年');
});

test('和暦から西暦', () => {
  assert.equal(toS('平成', 10).y, 1998);
  assert.equal(toS('昭和', 50).y, 1975);
  assert.equal(toS('令和', 8).y, 2026);
  assert.deepEqual([toS('昭和', 64).y, toS('昭和', 64).note], [1989, '1月8日からは平成元年']);
  assert.deepEqual([toS('平成', 31).y, toS('平成', 31).note], [2019, '5月1日からは令和元年']);
  assert.deepEqual([toS('平成', 1).y, toS('平成', 1).note], [1989, '1月7日までは昭和64年']);
  assert.deepEqual([toS('大正', 15).note, toS('明治', 45).note], ['12月25日からは昭和元年', '7月30日からは大正元年']);
  assert.equal(toS('昭和', 65).error, '昭和は64年までです。');
  assert.equal(toS('令和', 183).error, '2200年（令和182年）までにしてください。');
  assert.equal(toS('平成', 0).field, 'wareki');
  assert.equal(toS('平成', 2.5).field, 'wareki');
  assert.deepEqual(wareki({ from: 'wareki', era: null, nen: 10, thisYear: Y }), { ok: false, empty: true, missing: 'era' });
  assert.deepEqual(wareki({ from: 'wareki', era: '平成', nen: null, thisYear: Y }), { ok: false, empty: true, missing: 'nen' });
  assert.equal(toW(1867).field, 'seireki');
  assert.deepEqual(toW(198), { ok: false, empty: true, missing: 'digits' }); // 4けたを入れているとちゅうは、まちがいにしない
  assert.deepEqual(toW(0), { ok: false, empty: true, missing: 'digits' });
  assert.equal(toW(2201).field, 'seireki');
  assert.equal(toW(1990.5).field, 'seireki');
  // 行き来しても同じ
  for (let y = 1868; y <= 2200; y++) {
    const w = toW(y);
    assert.equal(toS(w.era, w.nen).y, y, String(y));
  }
});

test('六十干支と、何年前', () => {
  assert.deepEqual(kanshiOf(2026), { kanji: '丙午', yomi: 'ひのえうま' });
  assert.deepEqual(kanshiOf(1989), { kanji: '己巳', yomi: 'つちのとみ' });
  assert.deepEqual(kanshiOf(1984), { kanji: '甲子', yomi: 'きのえね' });
  assert.deepEqual(kanshiOf(1966), { kanji: '丙午', yomi: 'ひのえうま' });
  assert.equal(toW(1989).ago, 37);
  assert.equal(nenText('令和', 1), '令和元年');
});

test('元号の年表：どの元号にも名前が入る高さで、年の線はその元号の中', async () => {
  const { nenpyoLayout, nenpyoY } = await import('../src/lib/wareki.mjs');
  const L = nenpyoLayout(2032);
  assert.ok(L.every((r) => r.h >= 18));
  assert.ok(Math.abs(L.reduce((s, r) => s + r.h, 0) - 150) < 1e-9);
  for (const y of [1868, 1911, 1912, 1925, 1926, 1988, 1989, 2018, 2019, 2026, 2031]) {
    const r = L.find((x) => y >= x.from && y < x.to);
    const v = nenpyoY(L, y);
    assert.ok(v > r.top && v < r.top + r.h, String(y));
  }
});

test('元号が続いていたとして数えた年（よくある質問「今年は平成何年」）', () => {
  assert.equal(nenIfContinued('平成', 2026), 38);
  assert.equal(nenIfContinued('昭和', 2026), 101);
  assert.equal(nenIfContinued('平成', 2019), 31);
  assert.equal(nenIfContinued('昭和', 1989), 64);
});

test('入学・卒業年の本文：計算のしかたの例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const rows = (birth) => gakureki({ birth }).rows;
  assert.equal(rows('2010-04-01')[0].y, 2016); // 4月1日生まれは1つ上の学年
  assert.equal(rows('2009-04-02')[0].y, 2016);
  const r98 = rows('1998-08-15'); // 履歴書の学歴
  assert.deepEqual([r98[4].y, r98[4].wareki, r98[7].y, r98[7].wareki], [2014, '平成26', 2021, '令和3']);
  assert.equal(rows('2005-02-10')[3].y, 2020); // 早生まれの中学校の卒業
  assert.equal(cohortOf(parseYmd('2005-02-10')), 2004);
  assert.equal(rows('2023-05-20')[0].y, 2030); // 小学校の入学と卒園の年
  assert.equal(rows('2005-03-15')[0].y + 1, rows('2005-06-01')[0].y); // 早生まれが生まれた年の行を見ると1年おそい
  assert.deepEqual(rows('2005-03-15')[0], rows('2004-06-01')[0]);
  // よくある質問：今年20歳になる人の中学校の卒業（2026年なら2006年生まれ）
  assert.equal(rows('2006-06-01')[3].y, 2022);
  assert.equal(rows('2006-02-01')[3].y, 2021);
});

test('和暦・西暦の変換の本文：計算のしかたの例・使う場面の例・まちがえやすいところ・よくある質問', () => {
  const W = (era, nen) => wareki({ from: 'wareki', era, nen, thisYear: 2026 });
  const S = (y) => wareki({ from: 'seireki', seireki: y, thisYear: 2026 });
  assert.equal(W('昭和', 50).y, 1975); // 計算のしかたの例
  assert.equal(S(1983).text, '昭和58年'); // 生まれた年を和暦で
  assert.deepEqual([W('令和', 12).y, W('令和', 12).ago], [2030, -4]); // 令和12年は2030年で4年後
  assert.deepEqual([W('昭和', 15).y, W('昭和', 15).ago], [1940, 86]); // 昭和15年は1940年で86年前
  assert.equal(S(1989).note, '1月7日までは昭和64年'); // 改元の年
  assert.equal(S(2019).note, '4月30日までは平成31年');
  assert.equal(1975 - 1926, 49); // はじまりの年を引くと1年ずれる
  assert.equal(S(1975).text, '昭和50年');
  assert.equal(W('平成', 20).y, 2008); // よくある質問
  assert.equal(W('昭和', 11).y, 1936);
});
