import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shichigosan, yakudoshi, yakuOfYear, choju, chojuOfYear, okuizome, shijuku, readYear } from '../src/lib/gyoji.mjs';
import { ymdValue, weekdayOf } from '../src/lib/hizuke.mjs';

const v = (d) => ymdValue(d);

test('七五三：数え年と満年齢の年', () => {
  const g = shichigosan([{ birth: '2023-05-12', sex: 'girl' }], 2026);
  assert.equal(g.ok, true);
  assert.deepEqual(g.rows.map((r) => [r.year, r.items.map((p) => `${p.style}${p.age}`).join(',')]), [
    [2025, 'kazoe3'],
    [2026, 'man3'],
    [2029, 'kazoe7'],
    [2030, 'man7'],
  ]);
  assert.equal(g.next.year, 2026);
  assert.equal(g.rows[0].past, true);
  // 男の子は5歳。3歳は地方によって
  const b = shichigosan([{ birth: '2022-08-01', sex: 'boy' }], 2026);
  assert.deepEqual(b.rows.map((r) => [r.year, r.items.map((p) => `${p.style}${p.age}${p.local ? 'L' : ''}`).join(',')]), [
    [2024, 'kazoe3L'],
    [2025, 'man3L'],
    [2026, 'kazoe5'],
    [2027, 'man5'],
  ]);
  assert.equal(b.next.year, 2026);
});

test('七五三：きょうだいがいっしょに祝える年', () => {
  const g = shichigosan([{ birth: '2021-06-01', sex: 'boy' }, { birth: '2023-04-10', sex: 'girl' }], 2026);
  assert.deepEqual(g.together.map((r) => r.year), [2026]);
  assert.equal(g.next.year, 2026);
  assert.deepEqual(g.next.items.map((p) => `${p.kid}${p.style}${p.age}`), ['0man5', '1man3']);
  // 男の子の3歳（地方によって）もいっしょに数える。同じ年の5歳と7歳は重ならない
  const h = shichigosan([{ birth: '2023-01-05', sex: 'boy' }, { birth: '2023-12-20', sex: 'girl' }], 2026);
  assert.deepEqual(h.together.map((r) => r.year), [2026]);
  assert.equal(h.next.items[0].local, true);
  // 入っていない欄
  assert.deepEqual(shichigosan([{ birth: '', sex: '' }], 2026).missing, { kid: 0, what: 'birth' });
  assert.deepEqual(shichigosan([{ birth: '2023-05-12', sex: '' }], 2026).missing, { kid: 0, what: 'sex' });
  assert.equal(shichigosan([{ birth: '1800-01-01', sex: 'boy' }], 2026).field, 'birth-0');
});

test('厄年（数え年）', () => {
  const m = yakudoshi(1985, 'male', 2026);
  assert.equal(m.kazoe, 42);
  assert.equal(m.now.kind, '本厄');
  assert.equal(m.now.y.big, true);
  assert.equal(m.next.hon, 2045);
  const f = yakudoshi(1994, 'female', 2026);
  assert.equal(f.kazoe, 33);
  assert.equal(f.now.kind, '本厄');
  assert.equal(yakudoshi(1995, 'female', 2026).now.kind, '前厄');
  assert.equal(yakudoshi(1993, 'female', 2026).now.kind, '後厄');
  assert.equal(yakudoshi(1990, 'male', 2026).now, null);
  assert.equal(yakudoshi(1990, 'male', 2026).next.hon, 2031);
  // 2026年の男性の本厄：数え25・42・61 → 2002・1985・1966年生まれ
  assert.deepEqual(yakuOfYear(2026, 'male').map((y) => y.hon), [2002, 1985, 1966]);
  assert.deepEqual(yakuOfYear(2026, 'female').map((y) => y.hon), [2008, 1994, 1990, 1966]);
  assert.deepEqual(yakuOfYear(2026, 'male').map((y) => [y.mae, y.ato]), [[2003, 2001], [1986, 1984], [1967, 1965]]);
  assert.equal(readYear(1985).year, 1985);
  assert.equal(readYear(198).typing, true);
});

test('長寿祝い', () => {
  const c = choju(1966, 2026);
  const kan = c.list.find((x) => x.name === '還暦');
  assert.deepEqual([kan.kazoeYear, kan.manYear, kan.man], [2026, 2026, 60]);
  const koki = c.list.find((x) => x.name === '古希');
  assert.deepEqual([koki.kazoeYear, koki.manYear], [2035, 2036]);
  assert.equal(c.next.name, '還暦');
  assert.equal(choju(1957, 2026).next.name, '古希'); // 数え70は2026年
  assert.equal(choju(1960, 2026).next.name, '緑寿');
  const y = chojuOfYear(2026);
  assert.deepEqual(y.slice(0, 3).map((x) => [x.name, x.kazoeBorn, x.manBorn]), [['還暦', 1966, 1966], ['緑寿', 1961, 1960], ['古希', 1957, 1956]]);
  assert.equal(y.find((x) => x.name === '米寿').kazoeBorn, 1939);
});

test('お食い初め', () => {
  const o = okuizome('2026-10-27');
  assert.equal(v(o.d100), '2027-02-03');
  assert.equal(weekdayOf(o.d100), '水');
  assert.equal(v(o.d100b), '2027-02-04');
  assert.equal(v(o.d120), '2027-02-23');
  assert.deepEqual(o.weekends.before.map(v), ['2027-01-30', '2027-01-31']);
  assert.deepEqual(o.weekends.after.map(v), ['2027-02-06', '2027-02-07']);
  assert.equal(v(okuizome('2026-01-01').d100), '2026-04-10');
  assert.equal(okuizome('').empty, true);
});

test('四十九日と年忌', () => {
  const s = shijuku('2026-10-01');
  assert.deepEqual(s.chuin.map((c) => v(c.date)), ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18']);
  assert.equal(v(s.day49), '2026-11-18');
  assert.equal(weekdayOf(s.day49), '水');
  assert.deepEqual(s.nenki.slice(0, 3).map((n) => [n.name, v(n.date)]), [['一周忌', '2027-10-01'], ['三回忌', '2028-10-01'], ['七回忌', '2032-10-01']]);
  assert.deepEqual(s.weekends.before.map(v), ['2026-11-14', '2026-11-15']);
  const t = shijuku('2026-10-01', true);
  assert.equal(v(t.day49), '2026-11-17');
  assert.equal(v(t.chuin[0].date), '2026-10-06');
  assert.equal(v(shijuku('2024-02-29').nenki[0].date), '2025-02-28');
});
