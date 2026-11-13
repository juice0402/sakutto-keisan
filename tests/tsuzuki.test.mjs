// つづけて使う（#163・C-027 案A）：# の文字の作り方と読み方、割引の払う割合、割引計算のページの段
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tzHash, tzRead, payPct, waribikiTsuzuki, TZ_KAKERITSU, TZ_WARIKAN } from '../src/lib/tsuzuki.mjs';
import { calcDiscount } from '../src/lib/waribiki.mjs';
import { kakePct } from '../src/lib/kakeritsu.mjs';
import { toolBySlug } from '../src/tools.mjs';
import { nextHtml, nextPicks, relatedHtml, tsuzukiHtml, memoHtml } from '../src/parts.mjs';
import { setInlineScripts } from '../src/layout.mjs';
import { yomimono } from '../src/yomimono/_shelf.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
setInlineScripts(Object.fromEntries(readdirSync(join(HERE, '../src/client')).filter((f) => f.endsWith('.js')).map((f) => [f, '/* */'])));
const plain = (text) => text.map(([s]) => s).join('');

test('tzHash：決めた名前と、合う数字だけ', () => {
  assert.equal(tzHash({ jodai: 2980, rate: 70 }, TZ_KAKERITSU), '#jodai=2980&rate=70');
  assert.equal(tzHash({ jodai: 2980.5, rate: 85.5 }, TZ_KAKERITSU), '#jodai=2980.5&rate=85.5');
  assert.equal(tzHash({ jodai: 2980, people: 3 }, TZ_KAKERITSU), '#jodai=2980');
  assert.equal(tzHash({ total: 2086 }, TZ_WARIKAN), '#total=2086');
  assert.equal(tzHash({ total: 0 }, TZ_WARIKAN), '');
  assert.equal(tzHash({ total: 100000001 }, TZ_WARIKAN), '');
  assert.equal(tzHash({ jodai: 1.234 }, TZ_KAKERITSU), '');
  assert.equal(tzHash({ jodai: NaN, rate: 101 }, TZ_KAKERITSU), '');
});

test('tzRead：数字だけ・決めた名前だけ・上限の中だけ。合わなければ null', () => {
  assert.deepEqual(tzRead('#jodai=2980&rate=70', TZ_KAKERITSU), { jodai: 2980, rate: 70 });
  assert.deepEqual(tzRead('#rate=85.5', TZ_KAKERITSU), { rate: 85.5 });
  assert.deepEqual(tzRead('#total=2086', TZ_WARIKAN), { total: 2086 });
  assert.deepEqual(tzRead('#total=100000000', TZ_WARIKAN), { total: 100000000 });
  for (const h of [
    '', '#', null, undefined, '#jodai=abc', '#jodai=99999999999', '#jodai=-5', '#jodai=0', '#jodai=1.234', '#jodai=1e5', '#jodai=2,980', '#jodai=',
    '#rate=101', '#rate=0', '#people=3', '#jodai=2980&people=3', '#jodai=1&jodai=2', '#jodai=2980&', '#jodai', '#constructor=1', '#__proto__=1',
    '#jodai=<b>1</b>', '#jodai=%31', '#formula', '#total=100000001',
  ]) assert.equal(tzRead(h, h && h.includes('total') ? TZ_WARIKAN : TZ_KAKERITSU), null, String(h));
  assert.equal(tzRead('#total=2086', TZ_KAKERITSU), null);
  assert.equal(tzRead(`#jodai=${'1'.repeat(300)}`, TZ_KAKERITSU), null);
});

test('payPct：割引のあとに払う割合（整数の掛け算で、浮動小数のずれを出さない）', () => {
  assert.equal(payPct(30), 70);
  assert.equal(payPct(30, 20), 56);
  assert.equal(payPct(10, 5), 85.5);
  assert.equal(payPct(15), 85);
  assert.equal(payPct(12.5), 87.5);
  assert.equal(payPct(33.33), 66.7);
  assert.equal(payPct(10, 10), 81);
  assert.equal(payPct(7, 3), 90.2); // 93 × 97 ＝ 9021 → 90.21 → 90.2
  assert.equal(payPct(100), 0);
  assert.equal(payPct(1.234), null);
});

test('waribikiTsuzuki：2,980円の30％オフ → 2,980円の7掛け・2,086円を人数で', () => {
  const r = calcDiscount({ price: 2980, rate: 30 });
  assert.equal(r.final, 2086);
  const t = waribikiTsuzuki({ price: 2980, rate: 30, final: r.final });
  assert.equal(t.kakeritsu.hash, '#jodai=2980&rate=70');
  assert.equal(`掛け率の計算${plain(t.kakeritsu.text)}`, '掛け率の計算で、2,980円の7掛けを開く');
  assert.equal(t.warikan.hash, '#total=2086');
  assert.equal(`割り勘の計算${plain(t.warikan.text)}`, '割り勘の計算で、2,086円を人数で分ける');
  // 数字は赤ペンの印
  assert.deepEqual(t.kakeritsu.text.filter(([, n]) => n).map(([s]) => s), ['2,980円', '7']);
});

test('waribikiTsuzuki：さらに割引・受けとれない率・答えなし・2つくらべる', () => {
  const two = waribikiTsuzuki({ price: 10000, rate: 30, rate2: 20, final: 5600 });
  assert.equal(two.kakeritsu.hash, '#jodai=10000&rate=56');
  assert.equal(plain(two.kakeritsu.text), 'で、10,000円の5.6掛けを開く');
  assert.equal(waribikiTsuzuki({ price: 1000, rate: 10, rate2: 5, final: 855 }).kakeritsu.hash, '#jodai=1000&rate=85.5');
  // 95％オフ（払う5％）は kakePct が50と読むので rate を付けない。100％オフは割り勘もなし
  assert.equal(kakePct(5), 50);
  const r95 = waribikiTsuzuki({ price: 1000, rate: 95, final: 50 });
  assert.equal(r95.kakeritsu.hash, '#jodai=1000');
  assert.equal(plain(r95.kakeritsu.text), 'で、1,000円を上代にして開く');
  const r100 = waribikiTsuzuki({ price: 1000, rate: 100, final: 0 });
  assert.equal(r100.warikan, null);
  assert.equal(r100.kakeritsu.hash, '#jodai=1000');
  // 元の値段0円は掛け率を出さない
  assert.equal(waribikiTsuzuki({ price: 0, rate: 30, final: 0 }).kakeritsu, null);
  assert.deepEqual(waribikiTsuzuki({}), { kakeritsu: null, warikan: null });
  assert.deepEqual(waribikiTsuzuki({ price: 2980, rate: 30, final: 2086, compare: true }), { kakeritsu: null, warikan: null });
  // 大きすぎる値段は付けない
  assert.equal(waribikiTsuzuki({ price: 1e10, rate: 30, final: 7e9 }).kakeritsu, null);
});

test('割引計算のページ：「つぎに」の節は出さず、メモするの段の下に「つづけて使う」（計算2つと読みもの1本）', () => {
  const t = toolBySlug('waribiki');
  assert.equal(t.carry, true);
  assert.equal(nextHtml(t), '');
  const html = tsuzukiHtml(t);
  assert.ok(html.startsWith('<div class="tz" id="tz"><p class="tz-h">つづけて使う</p>'));
  assert.ok(html.includes('<a class="tz-link" id="tz-kakeritsu" href="/kakeritsu/" data-base="/kakeritsu/" data-why="割引を何掛けかに直して、仕入れ値を出す"><b class="tz-name">掛け率の計算</b><span class="tz-t">割引を何掛けかに直して、仕入れ値を出す</span></a>'));
  assert.ok(html.includes('id="tz-warikan" href="/warikan/"'));
  const yomi = yomimono().find((y) => y.tools.includes('waribiki'));
  if (yomi) assert.ok(html.includes('<p class="tz-h">この答えの読みもの</p>') && html.includes(`href="/yomimono/${yomi.slug}/"`));
  assert.equal(nextPicks(t).tools.length, 2);
  const memo = memoHtml(t);
  assert.ok(memo.indexOf('id="cm-bar"') < memo.indexOf('id="tz"') && memo.indexOf('id="tz"') < memo.indexOf('id="cm-list"'));
  // いちばん下の節には、同じ計算と読みものを出さない
  const rel = relatedHtml(t);
  assert.ok(!rel.includes('id="nx"') && !rel.includes('href="/kakeritsu/"') && !rel.includes('href="/warikan/"'));
  if (yomi) assert.ok(!rel.includes(`href="/yomimono/${yomi.slug}/"`));
  // 行の文は全角30字まで
  for (const s of ['掛け率の計算で、999,999,999円の8.55掛けを開く', '割り勘の計算で、99,999,999円を人数で分ける']) assert.ok(s.length <= 30, s);
  // ほかのページはこれまでどおり
  assert.ok(!memoHtml(toolBySlug('kakeritsu')).includes('id="tz"'));
});
