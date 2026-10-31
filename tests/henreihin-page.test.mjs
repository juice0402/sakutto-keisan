// 返礼品のページ（見本のデータ tests/fixtures/henreihin.json で作る）：一覧の上の数字の1行と「選ぶときに見るところ」（10/31 AdSense の再審査）
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.HENREIHIN = 'fixture';
const { setInlineScripts } = await import('../src/layout.mjs');
setInlineScripts(Object.fromEntries(['henreihin.js', 'notes.js'].map((f) => [f, '/* テストではスクリプトの中身は見ない */'])));
const { default: render } = await import('../src/pages/henreihin.mjs');
const pages = Object.fromEntries(render().map((p) => [p.path, p.html]));

test('カテゴリのページ：一覧の上にその日の数字、下に「選ぶときに見るところ」', () => {
  const kome = pages['/furusato/henreihin/kome/'];
  assert.ok(kome.includes('<p class="hr-sum">この一覧は7件。1万円あたりの量は3.3〜7.1kgで、まん中は5.9kgです。</p>'));
  assert.ok(kome.includes('id="erabi"'));
  assert.ok(kome.indexOf('class="hr-sum"') < kome.indexOf('class="hr-list"')); // 数字は一覧より上
  assert.ok(kome.indexOf('id="erabi"') < kome.indexOf('id="faq"'));
});

test('5件より少ない一覧は、上の数字の行を出さない', () => {
  // 見本の日用品はトイレットペーパー4件・ティッシュ3件
  assert.ok(!pages['/furusato/henreihin/nichiyouhin/'].includes('class="hr-sum"'));
});

test('入口：カテゴリの件数とまん中の量', () => {
  const top = pages['/furusato/henreihin/'];
  assert.ok(top.includes('4つのカテゴリで24件をのせています。1万円あたりの量のまん中は、お米が5.9kg、'));
  assert.ok(top.includes('id="erabi"'));
});
