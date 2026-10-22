import { test } from 'node:test';
import assert from 'node:assert/strict';
import { furusatoDeadlines, kakuteiEnd, onestopPlan, ONESTOP_MAX } from '../src/lib/furusato-tetsuzuki.mjs';
import { memoSummary, memoText, memoParse, memoCityKey, MEMO_MAX_ROWS } from '../src/lib/furusato-memo.mjs';

const d = (y, m, dd) => ({ y, m, d: dd });
const byKey = (list) => Object.fromEntries(list.map((x) => [x.key, x]));

test('締め切り：10月22日なら、年内の寄付まで70日、申請は2027年1月10日まで80日、確定申告は2027年2月16日〜3月15日', () => {
  const k = byKey(furusatoDeadlines(d(2026, 10, 22)));
  assert.equal(k.kifu.days, 70);
  assert.deepEqual([k.onestop.forYear, k.onestop.date, k.onestop.days], [2026, d(2027, 1, 10), 80]);
  assert.deepEqual([k.kakutei.forYear, k.kakutei.from, k.kakutei.date, k.kakutei.open], [2026, d(2027, 2, 16), d(2027, 3, 15), false]);
  assert.equal(k.kakutei.days, 144);
});

test('締め切り：1月1日〜10日は前の年の寄付の申請、3月15日までは前の年の確定申告', () => {
  const jan = byKey(furusatoDeadlines(d(2027, 1, 10)));
  assert.deepEqual([jan.onestop.forYear, jan.onestop.days], [2026, 0]);
  assert.deepEqual([jan.kifu.forYear, jan.kifu.days], [2027, 355]);
  const jan11 = byKey(furusatoDeadlines(d(2027, 1, 11)));
  assert.deepEqual([jan11.onestop.forYear, jan11.onestop.date], [2027, d(2028, 1, 10)]);
  assert.deepEqual([jan11.kakutei.forYear, jan11.kakutei.open], [2026, false]);
  const feb = byKey(furusatoDeadlines(d(2027, 2, 16)));
  assert.deepEqual([feb.kakutei.forYear, feb.kakutei.open, feb.kakutei.days], [2026, true, 27]);
  const mar = byKey(furusatoDeadlines(d(2027, 3, 16)));
  assert.deepEqual([mar.kakutei.forYear, mar.kakutei.date], [2027, d(2028, 3, 15)]);
});

test('確定申告の終わりの日は3月15日、土日なら次の月曜', () => {
  assert.deepEqual(kakuteiEnd(2027), d(2027, 3, 15)); // 月曜
  assert.deepEqual(kakuteiEnd(2026), d(2026, 3, 16)); // 15日が日曜
  assert.deepEqual(kakuteiEnd(2025), d(2025, 3, 17)); // 15日が土曜
});

test('ワンストップ特例：5つまでなら寄付先の数の封筒、6つ以上や確定申告では使えない', () => {
  const r = onestopPlan({ cities: 3, kakutei: false, card: true });
  assert.deepEqual([r.ok, r.usable, r.envelopes, r.copies.length], [true, true, 3, 1]);
  assert.equal(onestopPlan({ cities: ONESTOP_MAX, kakutei: false, card: false }).copies.length, 2);
  assert.deepEqual([onestopPlan({ cities: 6, kakutei: false, card: true }).usable, onestopPlan({ cities: 6, kakutei: false, card: true }).reason], [false, 'over']);
  assert.deepEqual([onestopPlan({ cities: 2, kakutei: true, card: true }).usable, onestopPlan({ cities: 2, kakutei: true, card: true }).reason], [false, 'kakutei']);
  assert.equal(onestopPlan({ cities: null }).empty, true);
  assert.equal(onestopPlan({ cities: 0 }).field, 'cities');
  assert.equal(onestopPlan({ cities: 1.5 }).field, 'cities');
  assert.equal(onestopPlan({ cities: 31 }).field, 'cities');
});

test('寄付メモ：残り・自治体の数（同じ名前は1つ）・申請書を出していない数', () => {
  const rows = [
    { name: '北海道 白老町', amount: 10000, sent: true },
    { name: '北海道白老町', amount: 15000, sent: false },
    { name: '泉佐野市', amount: 20000, sent: false },
    { name: '', amount: null, sent: false },
  ];
  const s = memoSummary(rows, 57000);
  assert.deepEqual([s.count, s.total, s.cities, s.unsent, s.left, s.over, s.bad], [3, 45000, 2, 2, 12000, false, -1]);
  assert.equal(memoSummary(rows, null).left, null);
  assert.equal(memoSummary([{ name: '甲', amount: 70000, sent: false }], 57000).left, -13000);
  const six = ['あ', 'い', 'う', 'え', 'お', 'か'].map((name) => ({ name, amount: 5000, sent: false }));
  assert.equal(memoSummary(six, null).over, true);
  assert.equal(memoSummary(six.slice(0, 5), null).over, false);
  assert.equal(memoCityKey('　白老町 '), '白老町');
});

test('寄付メモ：控えの文', () => {
  const rows = [{ name: '白老町', amount: 10000, sent: true }, { name: '泉佐野市', amount: 20000, sent: false }];
  const t = memoText(2026, rows, memoSummary(rows, 57000));
  assert.equal(t, 'ふるさと納税 2026年の寄付\n1. 白老町 10,000円 申請書済\n2. 泉佐野市 20,000円 申請書未\n合計 30,000円・自治体 2\n上限の目安 57,000円・のこり 27,000円');
});

test('寄付メモ：保存した記録を読む（形がちがうものは捨てる）', () => {
  assert.deepEqual(memoParse('こわれた'), { years: {} });
  assert.deepEqual(memoParse('{"years":{"2026":{"limit":57000,"rows":[{"name":"白老町","amount":10000,"sent":true},{"name":5,"amount":-1,"sent":"yes"},null]},"20x":{}}}'), {
    years: { 2026: { limit: 57000, rows: [{ name: '白老町', amount: 10000, sent: true }, { name: '', amount: null, sent: false }] } },
  });
  const many = JSON.stringify({ years: { 2026: { rows: Array.from({ length: 50 }, () => ({ name: 'a'.repeat(40), amount: 1 })) } } });
  const r = memoParse(many).years[2026];
  assert.equal(r.rows.length, MEMO_MAX_ROWS);
  assert.equal(r.rows[0].name.length, 20);
  assert.equal(r.limit, null);
});
