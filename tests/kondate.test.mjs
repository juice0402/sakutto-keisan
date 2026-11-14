import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KONDATE_ING, KONDATE_DISHES } from '../src/data/kondate.mjs';
import {
  KONDATE_KINDS,
  KONDATE_ING_LIST,
  KONDATE_BY_ID,
  KONDATE_WEEKS_MAX,
  KONDATE_EXAMPLE,
  kondateMonday,
  kondateAddDays,
  kondateWeekDates,
  kondateFrom,
  kondateCandidates,
  kondateMakeWeek,
  kondateSwap,
  kondateShopping,
  kondateInitial,
  kondateParse,
  kondateStringify,
  kondateRand,
  kondateExampleWeek,
} from '../src/lib/kondate.mjs';

const ING = KONDATE_ING.flatMap((g) => g.items);
const dish = (id) => KONDATE_BY_ID.get(id);
const ALL = Array(7).fill('おまかせ');

test('料理のデータ：id と name が重ならない・kind が7つのどれか・ings が2〜4つ', () => {
  const ids = KONDATE_DISHES.map((x) => x.id);
  const names = KONDATE_DISHES.map((x) => x.name);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(names).size, names.length);
  for (const x of KONDATE_DISHES) {
    assert.match(x.id, /^[a-z]+$/, x.id);
    assert.ok(KONDATE_KINDS.includes(x.kind), x.id);
    assert.ok(x.ings.length >= 2 && x.ings.length <= 4, x.id);
    assert.equal(new Set(x.ings).size, x.ings.length, x.id);
    for (const i of x.ings) assert.ok(ING.includes(i), `${x.id}：${i}`);
  }
});

test('食材：重ならない・3つのグループ・80まで・どの食材も2品以上で使う', () => {
  assert.deepEqual(KONDATE_ING.map((g) => g.group), ['肉・魚', '野菜', 'ほか']);
  assert.equal(new Set(ING).size, ING.length);
  assert.ok(ING.length <= 80);
  assert.deepEqual(KONDATE_ING_LIST, ING);
  for (const i of ING) {
    const n = KONDATE_DISHES.filter((x) => x.ings.includes(i)).length;
    assert.ok(n >= 2, `${i} は ${n} 品`);
  }
  for (const no of ['米', 'ごはん', 'にんにく', 'しょうが', '小麦粉', 'しょうゆ', 'みそ', '油']) assert.ok(!ING.includes(no), no);
});

test('料理の数：kind ごとと全部', () => {
  const n = (k) => KONDATE_DISHES.filter((x) => x.kind === k).length;
  for (const k of ['肉', '魚', '麺', '丼']) assert.ok(n(k) >= 14, k);
  for (const k of ['カレー', '鍋', 'ほか']) assert.ok(n(k) >= 10, k);
  assert.ok(KONDATE_DISHES.length >= 190 && KONDATE_DISHES.length <= 210);
});

test('日付：週の月曜・日を足す・7日の日付・作り直してよい最初の日', () => {
  assert.equal(kondateMonday(new Date(2026, 10, 9)), '2026-11-09');
  assert.equal(kondateMonday(new Date(2026, 10, 11, 23, 59)), '2026-11-09');
  assert.equal(kondateMonday(new Date(2026, 10, 15)), '2026-11-09');
  assert.equal(kondateMonday(new Date(2026, 10, 16)), '2026-11-16');
  assert.equal(kondateMonday(new Date(2027, 0, 1)), '2026-12-28');
  assert.equal(kondateAddDays('2026-11-09', 7), '2026-11-16');
  assert.deepEqual(kondateWeekDates('2026-12-28'), ['12/28', '12/29', '12/30', '12/31', '1/1', '1/2', '1/3']);
  const wed = new Date(2026, 10, 11);
  assert.equal(kondateFrom('2026-11-09', wed), 2);
  assert.equal(kondateFrom('2026-11-16', wed), 0);
  assert.equal(kondateFrom('2026-11-02', wed), 7);
});

test('組み方：作らない日は空・決まりの kind・同じ料理は週に1回', () => {
  const routine = ['肉', '魚', '麺', '丼', 'カレー', '鍋', '作らない'];
  for (let s = 1; s <= 30; s++) {
    const w = kondateMakeWeek({ routine, rand: kondateRand(s) });
    assert.equal(w.dishes[6], null);
    assert.equal(w.reasons[6], null);
    w.dishes.slice(0, 6).forEach((id, i) => assert.equal(dish(id).kind, routine[i]));
    const ids = w.dishes.filter(Boolean);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('組み方：おまかせの日は7つの kind 全部から・ほかは決まりの日には出ない', () => {
  const kinds = new Set();
  for (let s = 1; s <= 200; s++) kondateMakeWeek({ routine: ALL, rand: kondateRand(s) }).dishes.forEach((id) => kinds.add(dish(id).kind));
  assert.deepEqual([...kinds].sort(), [...KONDATE_KINDS].sort());
  for (const r of ['肉', '魚', '麺', '丼', 'カレー', '鍋']) assert.ok(kondateCandidates(r).every((x) => x.kind !== 'ほか'));
  assert.deepEqual(kondateCandidates('作らない'), []);
});

test('組み方：とめた日は変わらない・とめた日の料理も週1回に数える', () => {
  const week = { dishes: ['gyudon', null, null, null, null, null, 'curry'], locked: [true, false, false, false, false, false, true] };
  const routine = ['丼', '丼', '丼', '丼', '丼', '作らない', '肉'];
  for (let s = 1; s <= 30; s++) {
    const w = kondateMakeWeek({ routine, week, rand: kondateRand(s) });
    assert.equal(w.dishes[0], 'gyudon');
    assert.equal(w.dishes[6], 'curry'); // 決まりが変わってもとめた日はそのまま
    assert.deepEqual(w.locked, week.locked);
    assert.ok(!w.dishes.slice(1).includes('gyudon'));
  }
  assert.deepEqual(week.dishes[1], null); // 元のデータは書きかえない
});

test('組み方：苦手の食材を使う料理は出ない', () => {
  const ng = ['豚こま', '豚バラ肉', '卵', 'ねぎ', '玉ねぎ'];
  for (let s = 1; s <= 30; s++) {
    for (const id of kondateMakeWeek({ routine: ALL, ng, rand: kondateRand(s) }).dishes) {
      assert.ok(!dish(id).ings.some((i) => ng.includes(i)), id);
    }
  }
});

test('組み方：冷蔵庫に丸のある食材を使う料理が先に出る', () => {
  const fridge = ['さば'];
  const w = kondateMakeWeek({ routine: ['魚', '魚', '魚', '魚', '作らない', '作らない', '作らない'], fridge, rand: () => 0.99 });
  // さばの料理は3つ。3日はさば、4日めはほかの魚
  assert.deepEqual(w.dishes.slice(0, 3).map((id) => dish(id).ings.includes('さば')), [true, true, true]);
  assert.equal(dish(w.dishes[3]).ings.includes('さば'), false);
  assert.equal(dish(w.dishes[3]).kind, '魚');
});

test('組み方：候補がない日は空で理由つき', () => {
  const allIng = KONDATE_ING_LIST;
  const w = kondateMakeWeek({ routine: ['肉', '作らない', '魚', '麺', '丼', 'カレー', '鍋'], ng: allIng, rand: () => 0 });
  assert.deepEqual(w.dishes, Array(7).fill(null));
  assert.equal(w.reasons[0], '苦手が多くて合う料理がありません');
  assert.equal(w.reasons[1], null);
  // 苦手で候補が1品だけ → 2日めは重ならない料理がない
  const one = kondateCandidates('カレー', allIng.filter((i) => i !== '豚こま' && i !== 'キャベツ' && i !== 'もやし'));
  assert.deepEqual(one.map((x) => x.id), ['curryitame']);
  const ng2 = allIng.filter((i) => i !== '豚こま' && i !== 'キャベツ' && i !== 'もやし');
  const w2 = kondateMakeWeek({ routine: ['カレー', 'カレー', '作らない', '作らない', '作らない', '作らない', '作らない'], ng: ng2, rand: () => 0 });
  assert.deepEqual(w2.dishes.slice(0, 2), ['curryitame', null]);
  assert.equal(w2.reasons[1], 'ほかの日と重ならない料理がありません');
});

test('組み方：今週の過ぎた日は作り直さない・過ぎた日の料理も週1回に数える', () => {
  const week = { dishes: ['gyudon', 'oyakodon', null, null, null, null, null], locked: Array(7).fill(false) };
  const routine = Array(7).fill('丼');
  for (let s = 1; s <= 20; s++) {
    const w = kondateMakeWeek({ routine, week, from: 2, rand: kondateRand(s) });
    assert.deepEqual(w.dishes.slice(0, 2), ['gyudon', 'oyakodon']);
    assert.ok(w.dishes.slice(2).every((id) => id && id !== 'gyudon' && id !== 'oyakodon'));
  }
  const past = kondateMakeWeek({ routine, week, from: 7, rand: kondateRand(1) });
  assert.deepEqual(past.dishes, week.dishes);
});

test('入れかえ：同じ料理にならない・ほかの日の料理にならない・とめた日と過ぎた日は変えない', () => {
  const routine = ['肉', '魚', '麺', '丼', 'カレー', '鍋', 'おまかせ'];
  const base = kondateMakeWeek({ routine, rand: kondateRand(7) });
  for (let s = 1; s <= 50; s++) {
    for (let day = 0; day < 7; day++) {
      const r = kondateSwap({ routine, week: base, day, rand: kondateRand(s) });
      assert.equal(r.changed, true);
      assert.notEqual(r.dishes[day], base.dishes[day]);
      assert.ok(!base.dishes.includes(r.dishes[day]));
      if (routine[day] !== 'おまかせ') assert.equal(dish(r.dishes[day]).kind, routine[day]);
      r.dishes.forEach((id, i) => i !== day && assert.equal(id, base.dishes[i]));
    }
  }
  const locked = { dishes: base.dishes, locked: [true, false, false, false, false, false, false] };
  assert.equal(kondateSwap({ routine, week: locked, day: 0, rand: kondateRand(1) }).changed, false);
  const r = kondateSwap({ routine, week: base, day: 1, from: 3, rand: kondateRand(1) });
  assert.equal(r.changed, false);
  assert.deepEqual(r.dishes, base.dishes);
  // ほかの候補がないときは変えない
  const ng = KONDATE_ING_LIST.filter((i) => i !== '豚こま' && i !== 'キャベツ' && i !== 'もやし');
  const only = { dishes: ['curryitame', null, null, null, null, null, null], locked: Array(7).fill(false) };
  const r2 = kondateSwap({ routine: ['カレー', ...ALL.slice(1)], ng, week: only, day: 0, rand: () => 0 });
  assert.equal(r2.changed, false);
  assert.equal(r2.dishes[0], 'curryitame');
});

test('買うもの：冷蔵庫に丸のある食材は入らない・今日から先の日だけ・使う曜日が付く', () => {
  const dishes = ['shogayaki', 'yakisoba', null, 'curry', 'butadon', null, 'yasaiitame'];
  const list = kondateShopping(dishes, ['玉ねぎ', 'もやし'], 1);
  const get = (ing) => list.find((x) => x.ing === ing);
  assert.equal(get('玉ねぎ'), undefined);
  assert.equal(get('もやし'), undefined);
  assert.equal(get('豚ロース'), undefined); // 月曜（過ぎた日）だけの食材
  assert.deepEqual(get('豚こま'), { ing: '豚こま', days: [1, 3, 6], label: '火・木・日' });
  assert.equal(get('キャベツ').label, '火・日');
  assert.equal(get('豚バラ肉').label, '金');
  // 先に使う日の順。同じ日は食材の一覧の順
  assert.deepEqual(list.map((x) => x.ing), ['豚こま', 'キャベツ', '焼きそばめん', 'にんじん', 'じゃがいも', '豚バラ肉']);
  // 来週は7日分
  assert.ok(kondateShopping(dishes, [], 0).some((x) => x.ing === '豚ロース'));
});

test('ページの例の週', () => {
  const w = kondateExampleWeek();
  assert.deepEqual(w.dishes, ['rollcabbage', 'sabatatsuta', 'carbonara', 'sakenanban', 'shirasudon', null, 'hayashi']);
  assert.deepEqual(w.dishes.map((id) => id && dish(id).name), ['ロールキャベツ', 'さばの竜田揚げ', 'カルボナーラ', '鮭の南蛮漬け', 'しらす丼', null, 'ハヤシライス']);
  const buy = kondateShopping(w.dishes, KONDATE_EXAMPLE.fridge, 0).map((x) => `${x.ing} ${x.label}`);
  assert.deepEqual(buy, ['合いびき肉 月', 'さば 火', 'ベーコン 水', 'チーズ 水', 'スパゲッティ 水', '鮭 木', 'にんじん 木', 'ピーマン 木', 'しらす 金', 'ねぎ 金', '牛こま 日', 'しめじ 日']);
});

test('データの読み書き：はじめ・こわれた JSON・古い形・知らない id でも止まらない', () => {
  const init = kondateInitial();
  assert.deepEqual(init, { v: 1, routine: ALL, fridge: [], ng: [], weeks: {} });
  for (const bad of ['', '{', 'null', '[]', '1', '"x"', '{"v":0,"routine":["肉"]}', '{"routine":[]}']) assert.deepEqual(kondateParse(bad), init, bad);
  const data = kondateParse(JSON.stringify({
    v: 1,
    routine: ['肉', 'なにか', '魚', '麺', '丼', 'カレー', '作らない'],
    fridge: ['卵', '卵', 'ドラゴンフルーツ', 3],
    ng: 'セロリ',
    weeks: {
      '2026-11-09': { dishes: ['gyudon', 'nakunatta', 5, null, 'oden'], locked: [true, 'true', 1] },
      'mukashi': { dishes: [], locked: [] },
      '2026-11-16': null,
    },
  }));
  assert.deepEqual(data.routine, ['肉', 'おまかせ', '魚', '麺', '丼', 'カレー', '作らない']);
  assert.deepEqual(data.fridge, ['卵']);
  assert.deepEqual(data.ng, []);
  assert.deepEqual(Object.keys(data.weeks), ['2026-11-09']);
  assert.deepEqual(data.weeks['2026-11-09'], {
    dishes: ['gyudon', null, null, null, 'oden', null, null],
    locked: [true, false, false, false, false, false, false],
  });
  assert.deepEqual(kondateParse(kondateStringify(data)), data);
  assert.deepEqual(kondateParse(JSON.stringify({ v: 1, routine: ['肉'] })).routine, ALL);
});

test('データの読み書き：週は52までで古い週から消える', () => {
  const state = kondateInitial();
  let k = '2025-01-06';
  for (let i = 0; i < 60; i++) {
    state.weeks[k] = { dishes: ['gyudon', null, null, null, null, null, null], locked: Array(7).fill(false) };
    k = kondateAddDays(k, 7);
  }
  const back = kondateParse(kondateStringify(state));
  const keys = Object.keys(back.weeks);
  assert.equal(keys.length, KONDATE_WEEKS_MAX);
  assert.equal(keys[0], kondateAddDays('2025-01-06', 7 * 8));
  assert.ok(!('2025-01-06' in back.weeks));
  assert.equal(Object.keys(kondateParse(JSON.stringify({ ...state, v: 1 })).weeks).length, KONDATE_WEEKS_MAX);
});

test('決まった乱数：同じ種なら同じ並び・0以上1未満', () => {
  const a = kondateRand(5);
  const b = kondateRand(5);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('週の見出し・買うもののメモ・これまでの献立', async () => {
  const { kondateWeekLabel, kondateBuyMemo, kondatePastWeeks } = await import('../src/lib/kondate.mjs');
  assert.equal(kondateWeekLabel('2026-11-09'), '11月9日〜15日');
  assert.equal(kondateWeekLabel('2026-11-30'), '11月30日〜12月6日');
  assert.equal(kondateWeekLabel('2026-12-28'), '12月28日〜1月3日');
  const list = [{ ing: '豚こま' }, { ing: 'さば' }];
  assert.deepEqual(kondateBuyMemo('2026-11-09', 1, list), { q: '買うもの（11/10〜11/15）', a: '豚こま・さば' });
  assert.deepEqual(kondateBuyMemo('2026-11-09', 6, list), { q: '買うもの（11/15）', a: '豚こま・さば' });
  assert.equal(kondateBuyMemo('2026-11-09', 0, []), null);
  const weeks = {
    '2026-10-26': { dishes: Array(7).fill(null), locked: Array(7).fill(false) },
    '2026-11-02': { dishes: ['gyudon', null, null, null, null, null, null], locked: Array(7).fill(false) },
    '2026-11-09': { dishes: ['gyudon', null, null, null, null, null, null], locked: Array(7).fill(false) },
  };
  const past = kondatePastWeeks(weeks, '2026-11-09');
  assert.equal(past.length, 1);
  assert.equal(past[0].label, '11/2〜');
  assert.equal(past[0].names[1], '作らない');
  assert.equal(past[0].count, 1);
});

test('ページの例と使う場面の例（/kondate/ の本文の数字）', async () => {
  const P = await import('../src/pages/kondate.mjs');
  assert.deepEqual(P.EX_DISHES.map((x) => (x ? x.name : null)), ['ロールキャベツ', 'さばの竜田揚げ', 'カルボナーラ', '鮭の南蛮漬け', 'しらす丼', null, 'ハヤシライス']);
  assert.equal(P.EX_BUY.length, 12);
  assert.equal(P.EX_BUY_NOFRIDGE.length, 15);
  assert.equal(P.SC_FRIDGE, 28);
  assert.equal(P.SC_NG, 26);
  assert.equal(P.SC_WED.length, 10);
  assert.equal(P.SC_WED.map((x) => x.ing).join('・'), 'ベーコン・チーズ・スパゲッティ・鮭・にんじん・ピーマン・しらす・ねぎ・牛こま・しめじ');
  // 冷蔵庫の丸で外れたのはキャベツ・玉ねぎ・卵の3つ（本文の文）
  const off = P.EX_BUY_NOFRIDGE.map((x) => x.ing).filter((i) => !P.EX_BUY.some((y) => y.ing === i));
  assert.deepEqual(off.sort(), ['キャベツ', '卵', '玉ねぎ'].sort());
  // 苦手にさば・鮭を入れた魚の日は、あじ・ぶり・たらの料理が候補に残る（本文の文）
  const { kondateCandidates } = await import('../src/lib/kondate.mjs');
  const fish = kondateCandidates('魚', ['さば', '鮭']).flatMap((x) => x.ings);
  for (const i of ['あじ', 'ぶり', 'たら']) assert.ok(fish.includes(i), i);
});
