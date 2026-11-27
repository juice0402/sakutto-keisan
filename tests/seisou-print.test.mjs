// 清掃の作業時間の印刷（#197）：作業指示書を A4 1枚に。ボタンと印刷の CSS はこのページだけ
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
  assert.ok(!(await html('seisou-mitsumori')).includes('@page'));
});
