// 印刷用の早見表（public/print/*.pdf）：作り直し忘れと、表の数字の点検
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PRINTS, printFile, printHtml, printUrl, THIS_YEAR } from '../src/prints.mjs';
import { calcDiscount, QUICK_PRICES, QUICK_RATES } from '../src/lib/waribiki.mjs';
import { dilute, QUICK_RATIOS, QUICK_TOTALS } from '../src/lib/kishaku.mjs';
import { fmt } from '../src/lib/number.mjs';
import { gakureki } from '../src/lib/gakureki.mjs';
import { volumeText } from '../src/lib/kishaku.mjs';
import { hyohakuAmount } from '../src/data/hyohakuzai.mjs';

const dir = new URL('../public/print/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('../src/data/prints.json', import.meta.url), 'utf8'));
const kindOf = (file) => Object.keys(PRINTS).find((k) => file === `${k}.pdf` || file.startsWith(`${k}-`));

test('PDFが、いまのサイトの計算とデータで作ったものと同じ（ちがえば python3 scripts/make-prints.py で作り直す）', () => {
  for (const [file, sha] of Object.entries(manifest)) {
    const kind = kindOf(file);
    const year = Number((file.match(/-(\d{4})\.pdf$/) || [])[1]) || THIS_YEAR;
    assert.ok(existsSync(new URL(file, dir)), `${file} がない`);
    assert.equal(createHash('sha256').update(printHtml(kind, year)).digest('hex'), sha, `${file} が古い`);
  }
  for (const f of readdirSync(dir)) assert.ok(f in manifest, `${f} が src/data/prints.json にない`);
});

test('年が入らないPDFと、年の入ったPDFがある', () => {
  for (const [kind, p] of Object.entries(PRINTS)) {
    if (!p.yearly) assert.ok(printFile(kind) in manifest, `${kind}.pdf がない`);
  }
  // 1月1日の毎日のビルドで次の年に切りかわる。来年のぶんは毎年11月の予約タスクが足す（なくてもページは去年のPDFにリンクする）
  assert.ok(Object.keys(manifest).some((f) => /-\d{4}\.pdf$/.test(f)));
});

test('学歴：小・中・高の卒業（3月）と次の学校の入学（4月）は、同じ年で和暦も同じ', () => {
  for (let y = THIS_YEAR - 70; y < THIS_YEAR + 2; y++) {
    const r = gakureki({ birth: `${y}-06-01` }).rows;
    for (const [a, b] of [[1, 2], [3, 4], [5, 6]]) {
      assert.equal(r[a].y, r[b].y);
      assert.equal(r[a].wareki, r[b].wareki, `${y}年生まれ ${r[a].school}の卒業`);
    }
  }
});

test('学歴：2019年生まれは平成31年と令和元年の両方を書く', () => {
  const html = printHtml('gakureki', 2026);
  assert.match(html, /<span class="num">2019<\/span><small>平31・令元<\/small>/);
  assert.match(html, /<span class="num">1989<\/span><small>平成元<\/small>/);
});

test('年齢：0歳から100歳、改元の年は2つの元号', () => {
  const html = printHtml('nenrei', 2026);
  assert.match(html, />0<\/td><td class="num">2026</);
  assert.match(html, />100<\/td><td class="num">1926</);
  assert.match(html, /平成31年<br>令和元年/);
  assert.match(html, /<b>2026年<\/b>（令和8年）/);
});

test('消毒液：ページの表と同じ量（水500ml・1L）と、水2L', () => {
  const html = printHtml('hyohakuzai');
  const ml = [...html.matchAll(/class="ml num sans r">([^<]*)/g)].map((m) => m[1]);
  assert.deepEqual(ml, ['1.7ml', '3.3ml', '6.7ml', '4.2ml', '8.4ml', '17ml', '8.5ml', '17ml', '34ml']);
  assert.equal(volumeText(hyohakuAmount('0.05', 1000)), '8.4ml');
});

test('どのPDFも右下にサイト名と、そのページのURLのQRコードの印が1つ', () => {
  for (const kind of Object.keys(PRINTS)) {
    const html = printHtml(kind, THIS_YEAR);
    const urls = [...html.matchAll(/<span class="qr" data-url="([^"]+)"><\/span>/g)].map((m) => m[1]);
    assert.deepEqual(urls, [printUrl(kind)], kind);
    assert.match(printUrl(kind), /^https:\/\/sakutto-keisan\.com\/[a-z-]+\/$/);
    assert.match(html, /<footer><div><b>サクッと計算<\/b>/);
  }
});

test('割引：ページの早見表と同じ値段と率（割引後の値段）', () => {
  const html = printHtml('waribiki');
  const cells = [...html.matchAll(/<td class="num sans r">([^<]*)/g)].map((m) => m[1]);
  assert.equal(cells.length, QUICK_PRICES.length * QUICK_RATES.length);
  assert.deepEqual(cells, QUICK_PRICES.flatMap((p) => QUICK_RATES.map((r) => fmt(calcDiscount({ price: p, rate: r }).final))));
  assert.match(html, /1,980円<\/td><td class="num sans r">1,782<\/td><td class="num sans r">1,584<\/td><td class="num sans r">1,386<\/td><td class="num sans r">990</);
});

test('希釈：ページの早見表と同じ倍率とできあがりの量（原液の量）', () => {
  const html = printHtml('kishaku');
  const cells = [...html.matchAll(/<td class="num sans r">([^<]*)/g)].map((m) => m[1]);
  assert.equal(cells.length, QUICK_RATIOS.length * QUICK_TOTALS.length);
  assert.match(html, />100倍<\/td><td class="num sans r">5ml<\/td><td class="num sans r">10ml<\/td><td class="num sans r">20ml</);
  assert.match(html, />2倍<\/td><td class="num sans r">250ml<\/td><td class="num sans r">500ml<\/td><td class="num sans r">1L</);
  assert.equal(dilute({ ratio: 100, amount: 1000 }).water, 990);
  assert.match(html, /原液10mlに水990ml/);
});
