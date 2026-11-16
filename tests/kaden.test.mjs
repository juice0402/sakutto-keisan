// 冬の家電の型番の値段と、この冬の電気代（#172）。見本の JSON は作り話（tests/fixtures/kaden.json）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kdNorm, kdHasModel, kdPick, kdPriceText, kdDay, kdWinter, kdElec, kdBand, kdDaysText, KD_NG } from '../src/lib/kaden.mjs';
import { kadenSection, loadKaden } from '../src/kaden.mjs';
import { DENKI_USES } from '../src/data/denki.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'tests', 'fixtures', 'kaden.json');
const data = JSON.parse(readFileSync(FIX, 'utf8'));
const use = (slug) => DENKI_USES.find((u) => u.slug === slug);

test('5ページに型番が1つずつ', () => {
  assert.deepEqual(DENKI_USES.map((u) => u.model), ['GKR-HDN802H', 'DB-U12T', 'DC-3NK', 'DS-FS1200', 'RHJ10F1015-DG']);
  for (const u of DENKI_USES) assert.ok(u.product.includes(u.model) && u.maker, u.slug);
});

test('型番のならし：全角と半角・大文字と小文字・ハイフンのあるなし', () => {
  assert.equal(kdNorm('ＧＫＲ－ＨＤＮ８０２Ｈ'), 'GKR-HDN802H');
  assert.equal(kdNorm('db‐u12t'), 'DB-U12T');
  assert.ok(kdHasModel('こたつ gkrhdn802h', 'GKR-HDN802H'));
  assert.ok(kdHasModel('DB-U12T-A（ブルー）', 'DB-U12T'));
  assert.ok(kdHasModel('RHJ10F1015DG', 'RHJ10F1015-DG'));
  assert.ok(!kdHasModel('DC-3NKC', 'DC-3NK'), '後ろに英数字が続く別の型番');
  assert.ok(!kdHasModel('XDC-3NK', 'DC-3NK'), '前に英数字が続く別の型番');
  assert.ok(!kdHasModel('GKR-HDN802H用 こたつ布団', 'GKR-HDN802H'), '付属品');
});

test('しぼり方：型番が入り、外す言葉がなく、楽天のリンクのものを、安いほうから3つ', () => {
  assert.deepEqual(kdPick(data.models['GKR-HDN802H'], 'GKR-HDN802H').map((x) => x.price), [14980, 15800, 16500]);
  assert.deepEqual(kdPick(data.models['DB-U12T'], 'DB-U12T').map((x) => x.price), [4980, 5480]);
  assert.deepEqual(kdPick(data.models['DC-3NK'], 'DC-3NK'), []);
  assert.deepEqual(kdPick(data.models['RHJ10F1015-DG'], 'RHJ10F1015-DG').map((x) => x.price), [31800]);
  assert.deepEqual(kdPick(undefined, 'DC-3NK'), []);
  for (const w of KD_NG) assert.deepEqual(kdPick([{ name: `DS-FS1200 ${w}`, price: 100, url: 'https://item.rakuten.co.jp/a/b/' }], 'DS-FS1200'), [], w);
});

test('値段の幅と取った日', () => {
  assert.equal(kdPriceText(4980), '4,900円台から');
  assert.equal(kdPriceText(14980), '1万円台から');
  assert.equal(kdPriceText(980), '980円台から');
  assert.equal(kdDay('2026-11-06T00:30:00.000Z'), '11月6日');
  assert.equal(kdDay('2026-11-05T15:10:00.000Z'), '11月6日', '日本時間で');
});

test('この冬の日数（11月1日〜3月31日。うるう年の2月をふくむ冬は152日）', () => {
  assert.deepEqual(kdWinter(new Date('2026-11-15T12:00:00Z')), { start: 2026, days: 151 });
  assert.deepEqual(kdWinter(new Date('2027-01-20T12:00:00Z')), { start: 2026, days: 151 });
  assert.deepEqual(kdWinter(new Date('2027-11-01T03:00:00Z')), { start: 2027, days: 152 });
  assert.deepEqual(kdWinter(new Date('2028-02-29T03:00:00Z')), { start: 2027, days: 152 });
  assert.deepEqual(kdWinter(new Date('2026-06-01T03:00:00Z')), { start: 2026, days: 151 }, '4〜10月は次の冬');
  assert.deepEqual(kdWinter(new Date('2028-03-31T15:30:00Z')), { start: 2028, days: 151 }, '日本時間の4月1日は次の冬');
  assert.equal(kdDaysText(151), 'この冬（11月1日〜3月31日・151日）');
});

test('この冬の電気代と帯', () => {
  assert.equal(kdElec(32, 8, 31, 151), 1198); // 電気毛布の強
  assert.equal(kdElec(180, 8, 31, 151), 6741); // こたつの強
  const b = kdBand(4980, 1198);
  assert.equal(b.total, 6178);
  assert.equal(b.parts[0].w + b.parts[1].w, 100);
  assert.equal(b.ans, '本体 4,980円＋この冬の電気代 約1,198円 → <b>約6,178円</b>');
});

test('節：見本のデータで出る・0件の型番とデータがないときは出ない', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const h = kadenSection(use('denki-moufu'), data, now);
  assert.ok(h.includes('パナソニック DB-U12T：楽天市場で4,900円台から（11月6日時点）'));
  assert.ok(h.includes('約6,178円'));
  assert.ok(h.includes('この冬（11月1日〜3月31日・151日）'));
  assert.ok(h.includes('<p class="kd-ad">広告　楽天アフィリエイトを利用しています</p>'));
  assert.ok(h.includes('<!-- Rakuten Web Services Attribution Snippet FROM HERE -->\n<a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>\n<!-- Rakuten Web Services Attribution Snippet TO HERE -->'));
  assert.equal((h.match(/class="kd-go"/g) || []).length, 2);
  assert.ok(h.includes('見本の店&lt;E&gt;&amp;'), '店の名前はエスケープ');
  assert.ok(!/<img/.test(h), '商品の画像は使わない');
  assert.ok(!/おすすめ|お得|最安|いちばん安い/.test(h));
  assert.equal(kadenSection(use('kotatsu'), data, now).match(/class="kd-go"/g).length, 2);
  assert.equal(kadenSection(use('hot-carpet'), data, now), '');
  assert.equal(kadenSection(use('kotatsu'), null, now), '');
});

test('キーがないとき：取らずに通り、データがなければ節を出さない', () => {
  const env = { ...process.env };
  delete env.RAKUTEN_APPLICATION_ID;
  delete env.RAKUTEN_ACCESS_KEY;
  delete env.RAKUTEN_AFFILIATE_ID;
  delete env.GITHUB_ACTIONS;
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'fetch-kaden.mjs')], { env, cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(loadKaden(join(ROOT, 'tests', 'fixtures', 'nai.json')), null);
  assert.ok(loadKaden(FIX));
});
