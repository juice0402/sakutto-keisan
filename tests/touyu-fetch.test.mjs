// 灯油の値段を毎週取るしくみ（#178）：xlsx の読み取り・灯油の全国の列のえらび方・取れなかったときの値
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readXlsx, makeXlsx, excelDate, cellRef } from '../scripts/xlsx.mjs';
import { findSeriesUrl, pickTouyu, toDay } from '../scripts/fetch-touyu.mjs';
import { touyuNow } from '../src/touyu-now.mjs';
import { TOUYU_PRICE } from '../src/data/touyu.mjs';

test('xlsx を読む：シートの名前・文字・数字', () => {
  const buf = makeXlsx([
    { name: 'レギュラー', cells: { A1: '調査日', B1: '全国', A2: 46342, B2: 175.2 } },
    { name: '灯油', cells: { A1: 'a&b<c', C3: 2563 } },
  ]);
  const sh = readXlsx(buf);
  assert.deepEqual(sh.map((s) => s.name), ['レギュラー', '灯油']);
  assert.equal(sh[0].rows.get(1).get(2), '全国');
  assert.equal(sh[0].rows.get(2).get(2), 175.2);
  assert.equal(sh[1].rows.get(1).get(1), 'a&b<c');
  assert.equal(sh[1].rows.get(3).get(3), 2563);
  assert.deepEqual(cellRef('AB12'), { col: 28, row: 12 });
  assert.equal(excelDate(46342), '2026-11-16');
  assert.equal(toDay('2026/11/16'), '2026-11-16');
  assert.equal(toDay('2026年1月5日'), '2026-01-05');
  assert.equal(toDay('全国'), null);
});

test('結果のページから、いちばん新しい時系列の xlsx を探す', () => {
  const html = '<a href="xlsx/261028.xlsx">詳細</a><a href="xlsx/261028s5.xlsx">時系列</a><a href="./xlsx/261111s5.xlsx">時系列</a>';
  assert.equal(findSeriesUrl(html), 'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx/261111s5.xlsx');
  assert.equal(findSeriesUrl('<a href="x.pdf">'), null);
});

test('灯油の店頭・全国の18Lをえらぶ（配達はえらばない）', () => {
  const sh = readXlsx(
    makeXlsx([
      { name: 'ハイオク', cells: { A1: '調査日', B1: '全国', A2: 46335, B2: 190 } },
      { name: '灯油', cells: { B1: '配達', D1: '店頭', A2: '調査日', B2: '全国', C2: '北海道', D2: '全国', E2: '北海道', A3: 46335, B3: 2700, D3: 2563, A4: 46342, B4: 2710, D4: 2570 } },
    ]),
  );
  assert.deepEqual(pickTouyu(sh), { sheet: '灯油', unit: '18L', weeks: [{ date: '2026-11-09', can: 2563 }, { date: '2026-11-16', can: 2570 }] });
});

test('公表の形（11/17 に CI で見た）：シート「灯油店頭」「灯油配達」・B列が調査日・C列が全国の18L', () => {
  const head = { A1: '灯油店頭\n現金価格※', B1: '調査日', C1: '全         国', D1: '北 海 道 局' };
  const sh = readXlsx(
    makeXlsx([
      { name: 'レギュラー', cells: { A1: 'レギュラー', B1: '調査日', C1: '全         国', B2: 46335, C2: 169.9 } },
      { name: '灯油店頭', cells: { ...head, B2: 33112, C2: 801, D2: 747, B3: 46335, C3: 2589, D3: 2824, A4: '※消費税込み価格。' } },
      { name: '灯油配達', cells: { ...head, A1: '灯油配達', B2: 46335, C2: 2785 } },
    ]),
  );
  assert.deepEqual(pickTouyu(sh), { sheet: '灯油店頭', unit: '18L', weeks: [{ date: '1990-08-27', can: 801 }, { date: '2026-11-09', can: 2589 }] });
});

test('1Lの値段だけなら18倍、灯油がなければ止める', () => {
  const sh = readXlsx(makeXlsx([{ name: '灯油（店頭）', cells: { A1: '調査日', B1: '全国', A2: '2026/11/16', B2: 142.8 } }]));
  assert.deepEqual(pickTouyu(sh), { sheet: '灯油（店頭）', unit: '1L', weeks: [{ date: '2026-11-16', can: 2570 }] });
  assert.throws(() => pickTouyu(readXlsx(makeXlsx([{ name: '軽油', cells: { A1: '全国' } }]))), /灯油/);
});

test('取れなかったときは今の値、取れたら最新の週', () => {
  const dir = mkdtempSync(join(tmpdir(), 'touyu-'));
  const keep = touyuNow(join(dir, 'nai.json'));
  assert.equal(keep.can, TOUYU_PRICE.can);
  assert.equal(keep.date, TOUYU_PRICE.date);
  assert.equal(keep.line, `${TOUYU_PRICE.date}・全国の店頭・18L`);
  const f = join(dir, 'price.json');
  writeFileSync(f, '{こわれた');
  assert.equal(touyuNow(f).can, TOUYU_PRICE.can);
  writeFileSync(f, JSON.stringify({ unit: '18L', weeks: [{ date: '2026-11-09', can: 2563 }, { date: '2026-11-16', can: 2601 }] }));
  assert.deepEqual([touyuNow(f).can, touyuNow(f).date, touyuNow(f).line], [2601, '11月16日調査', '11月16日調査・全国の店頭・18L']);
  writeFileSync(f, JSON.stringify({ unit: '1L', weeks: [{ date: '2026-11-16', can: 2570 }] }));
  assert.equal(touyuNow(f).line, '11月16日調査・全国の店頭1Lの18倍');
  writeFileSync(f, JSON.stringify({ unit: '18L', weeks: [{ date: '2026-09-01', can: 2400 }] })); // 今の値より古い
  assert.equal(touyuNow(f).can, TOUYU_PRICE.can);
  writeFileSync(f, JSON.stringify({ unit: '18L', weeks: [{ date: '2026-11-16', can: 140 }] })); // 18Lに見えない
  assert.equal(touyuNow(f).can, TOUYU_PRICE.can);
});
