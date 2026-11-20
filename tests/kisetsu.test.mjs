// トップの「◯月の計算」（#188）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KISETSU } from '../src/data/kisetsu.mjs';
import { TOOLS } from '../src/tools.mjs';
import renderHome, { homePicks, seasonTools } from '../src/pages/index.mjs';
import { setInlineScripts } from '../src/layout.mjs';
import { readdirSync } from 'node:fs';

// テストではスクリプトの中身は見ない
setInlineScripts(Object.fromEntries(readdirSync(new URL('../src/client', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => [f, '/* */'])));

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const section = (html) => html.match(/<section class="cat" aria-labelledby="cat-season">[\s\S]*?<\/section>/)?.[0] || '';
const names = (sec) => [...sec.matchAll(/<span class="tool-name">([^<]+)<\/span>/g)].map((m) => m[1]);

test('12か月ぶん：tools.mjs にあって published・その月のよく使う計算にない・同じ月で重ならない', () => {
  assert.deepEqual(Object.keys(KISETSU).map(Number), MONTHS);
  for (const m of MONTHS) {
    const list = KISETSU[m];
    assert.ok(list.length >= 3, `${m}月`);
    assert.equal(new Set(list).size, list.length, `${m}月に重なり`);
    const picks = homePicks(m).map((t) => t.slug);
    for (const s of list) {
      const t = TOOLS.find((x) => x.slug === s);
      assert.ok(t && t.published, `${m}月 ${s} が公開されていない`);
      assert.ok(!picks.includes(s), `${m}月 ${s} はよく使う計算に出ている`);
    }
    assert.equal(seasonTools(m).length, list.length, `${m}月`);
  }
});

test('11月は七五三・灯油代・電気毛布・こたつ、12月はふるさと納税はいつまで・灯油代・こたつ・電気毛布', () => {
  assert.deepEqual(seasonTools(11).map((t) => t.slug), ['shichigosan', 'touyu-dai', 'denki-moufu', 'kotatsu']);
  assert.deepEqual(seasonTools(12).map((t) => t.slug), ['furusato-shimekiri', 'touyu-dai', 'kotatsu', 'denki-moufu']);
});

test('月をかえて作ると見出しと中身が変わる。よく使う計算のすぐ下で、パソコンでは右の段のいちばん上', () => {
  const nov = renderHome(11).html;
  const dec = renderHome(12).html;
  const jun = renderHome(6).html;
  assert.ok(nov.includes('<h2 id="cat-season">11月の計算</h2>'));
  assert.ok(dec.includes('<h2 id="cat-season">12月の計算</h2>'));
  assert.ok(jun.includes('<h2 id="cat-season">6月の計算</h2>'));
  assert.notDeepEqual(names(section(nov)), names(section(dec)));
  assert.notDeepEqual(names(section(nov)), names(section(jun)));
  // 下のページ（こたつ・電気毛布）もこの節には出る
  assert.ok(section(nov).includes('href="/kotatsu/"') && section(nov).includes('href="/denki-moufu/"'));
  assert.ok(nov.includes('<div class="pc-right">\n<section class="cat" aria-labelledby="cat-season">'));
  assert.ok(nov.indexOf('cat-season') < nov.indexOf('id="site"'));
});
