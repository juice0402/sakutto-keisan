// 固定ページ：お問い合わせ（SITE.contact）は URL が入っているときだけ出す（10/31 しょーくん）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE } from '../src/site.mjs';
import render from '../src/pages/info.mjs';

const byPath = () => Object.fromEntries(render().map((p) => [p.path, p.html]));

test('お問い合わせの URL が空なら、ページもリンクも出ない', () => {
  const was = SITE.contact;
  SITE.contact = '';
  try {
    const pages = byPath();
    assert.equal(pages['/contact/'], undefined);
    for (const html of Object.values(pages)) assert.ok(!html.includes('href="/contact/"'));
  } finally {
    SITE.contact = was;
  }
});

test('お問い合わせの URL を入れると、ページ・フッター・このサイトについて・プライバシーポリシーに出る', () => {
  const was = SITE.contact;
  SITE.contact = 'https://forms.gle/mihon';
  try {
    const pages = byPath();
    const c = pages['/contact/'];
    assert.ok(c);
    assert.ok(c.includes('<h1>お問い合わせ</h1>'));
    assert.ok(c.includes('href="https://forms.gle/mihon" rel="noopener"'));
    assert.ok(!c.includes('noindex'));
    assert.ok(pages['/about/'].includes('<h2 id="contact">お問い合わせ</h2>'));
    assert.ok(pages['/privacy/'].includes('お問い合わせについて'));
    for (const html of Object.values(pages)) assert.ok(html.includes('<a href="/contact/">お問い合わせ</a>'));
  } finally {
    SITE.contact = was;
  }
});

test('このサイトについて：カテゴリごとの計算の数と中身の作り方', () => {
  const about = byPath()['/about/'];
  assert.match(about, /生活・お買い物が\d+、家族の行事が\d+、/);
  assert.ok(about.includes('id="make"'));
});
