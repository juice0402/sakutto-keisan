// 清掃の作業時間（#197）と清掃の見積もり（#204）の印刷：作業指示書・見積書を A4 1枚に。ボタンと印刷の CSS はそのページだけ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setInlineScripts } from '../src/layout.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
setInlineScripts(Object.fromEntries(readdirSync(join(HERE, '../src/client')).filter((f) => f.endsWith('.js')).map((f) => [f, '/* */'])));
const html = async (name) => (await import(`../src/pages/${name}.mjs`)).default().html;

test('清掃の作業時間：「印刷する」はメモの段の中で、はじめは隠す。印刷の CSS は A4 で、指示書のほかは出さない', async () => {
  const h = await html('seisou-jikan');
  const bar = h.match(/<div class="cm-add" id="cm-bar"[^>]*>(.*?)<\/div>/s)[1];
  assert.match(bar, /<button type="button" class="tool-btn" id="sj-print" hidden>印刷する<\/button>/);
  assert.match(h, /@media print\{@page\{size:A4;margin:14mm\}/);
  assert.match(h, /\.calc>:not\(\.doc\)/); // 入力欄・メモの段・つづけて使うは出さない
  assert.match(h, /\.site-header,\.site-footer/);
  assert.match(h, /<p class="sj-made">サクッと計算 清掃の作業時間　https:\/\/sakutto-keisan\.com\/seisou-jikan\/<\/p>/);
});

test('ほかの清掃のページには、清掃の作業時間の印刷が入らない', async () => {
  for (const name of ['seisou-mitsumori', 'genba']) {
    const h = await html(name);
    assert.ok(!h.includes('sj-print'), name);
    assert.ok(!h.includes('sj-made'), name);
  }
});

test('清掃の見積もり（#204）：「印刷する」はメモの段の中で、はじめは隠す。印刷の CSS は A4 で、見積書のほかは出さない', async () => {
  const h = await html('seisou-mitsumori');
  const bar = h.match(/<div class="cm-add" id="cm-bar"[^>]*>(.*?)<\/div>/s)[1];
  assert.match(bar, /^<button type="button" class="tool-btn" id="mt-print" hidden>印刷する<\/button>/);
  assert.match(h, /@media print\{@page\{size:A4;margin:14mm\}/);
  assert.match(h, /\.calc>:not\(\.doc\)/);
  assert.match(h, /\.site-header,\.site-footer/);
  assert.match(h, /<p class="mt-date" id="mt-date"><\/p>\s*<p class="doc-title">見積書<\/p>/); // 印刷した日は見積書の上
  assert.match(h, /<div class="mt-made"><p>作業のマスの㎡単価は、歩掛り÷100×清掃員の全国平均の単価×経費の割合で出した目安です。<\/p><p>サクッと計算 清掃の見積もり　https:\/\/sakutto-keisan\.com\/seisou-mitsumori\/<\/p><\/div>/);
  assert.ok(!h.includes('御見積書'));
});

test('ほかの清掃のページには、清掃の見積もりの印刷が入らない', async () => {
  for (const name of ['seisou-jikan', 'genba']) {
    const h = await html(name);
    assert.ok(!h.includes('mt-print'), name);
    assert.ok(!h.includes('mt-made'), name);
    assert.ok(!h.includes('mt-date'), name);
  }
});
