// パソコンの見開き（10/31 連絡 C-017・#107）：layout.mjs の spread が <main> の中身を左右の段に分ける
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spread } from '../src/layout.mjs';

const strip = (s) => s.replace(/<div class="pc-(left|right)">|<\/div>$/g, '');

test('計算のページ：#calc までが左、そのあとが右。中身と順番は変えない', () => {
  const body = '<h1>割引</h1><p class="lead">説明</p><div class="calc" id="calc"><div><input type="text"><br></div></div><section class="prose"><h2 id="a">A</h2></section>';
  const out = spread(body, '/waribiki/');
  assert.equal(out, '<div class="pc-left"><h1>割引</h1><p class="lead">説明</p><div class="calc" id="calc"><div><input type="text"><br></div></div></div><div class="pc-right"><section class="prose"><h2 id="a">A</h2></section></div>');
  assert.ok(!out.includes('pc-toc'));
});

test('楽天のクレジットのコメントも1文字も変えずに右の段へ', () => {
  const credit = '<!-- Rakuten Web Services Attribution Snippet FROM HERE --><p class="hr-credit"><a href="https://webservice.rakuten.co.jp/">Supported by Rakuten Developers</a></p><!-- TO HERE -->';
  const body = `<h1>米</h1><div class="calc" id="calc"></div><div class="hr-sheet"></div>${credit}`;
  const out = spread(body, '/furusato/henreihin/kome/');
  assert.ok(out.includes(`<div class="hr-sheet"></div>${credit}</div>`));
});

test('トップ：よく使う計算までが左', () => {
  const body = '<div class="hero"><h1>サクッと計算</h1></div><section class="cm" id="tm" hidden><ul></ul></section><section class="cat" aria-labelledby="cat-pick"><ul class="pick-grid"></ul></section><section class="cat" aria-labelledby="cat-seikatsu"></section>';
  const out = spread(body, '/');
  assert.ok(out.startsWith('<div class="pc-left"><div class="hero">'));
  assert.ok(out.includes('cat-pick"><ul class="pick-grid"></ul></section></div><div class="pc-right"><section class="cat" aria-labelledby="cat-seikatsu">'));
});

test('#calc のないページ：h1・説明が左。h2 が3つ以上なら目次', () => {
  const sec = (id) => `<section class="prose"><h2 id="${id}">見出し<b>${id}</b></h2><p>本文</p></section>`;
  const three = spread(`<h1>このサイトについて</h1><p class="lead">説明</p>${sec('a')}${sec('b')}${sec('c')}`, '/about/');
  assert.ok(three.includes('<nav class="pc-toc" aria-label="このページの中"><ul><li><a href="#a">見出しa</a></li><li><a href="#b">見出しb</a></li><li><a href="#c">見出しc</a></li></ul></nav></div><div class="pc-right"><section'));
  const two = spread(`<h1>お問い合わせ</h1>${sec('a')}${sec('b')}`, '/contact/');
  assert.ok(!two.includes('pc-toc'));
  assert.equal(strip(two).replace('</div>', ''), `<h1>お問い合わせ</h1>${sec('a')}${sec('b')}`);
});

test('分けられないときはそのまま', () => {
  assert.equal(spread('<h1>ページが見つかりません</h1><p>x</p>', '/x/'), '<h1>ページが見つかりません</h1><p>x</p>');
});
