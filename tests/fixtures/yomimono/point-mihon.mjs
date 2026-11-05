// テスト用の見本の読みもの（本番には出ない）。楽天のポイントのカテゴリの見本（手帳の見た目と、カテゴリで見張る言葉を確かめる）
import { section } from '../../../src/layout.mjs';

export default {
  slug: 'point-mihon',
  title: '見本のポイントの読みもの',
  lead: 'カテゴリの見張りの見本です。',
  category: 'point',
  tools: ['point'],
  published: '2026-10-30',
  updated: '2026-10-30',
  description: '楽天のポイントのカテゴリの見本の読みものです。パスが /point/ でなくても、カテゴリで楽天アフィリエイトの決まりの言葉を見張るかを確かめます。2026年10月30日の見本です。',
  body: `
${section('honbun', '本文', '<p>見本の本文です。</p>')}
`,
  faqs: [],
  sources: [{ name: '楽天カード 5と0のつく日', url: 'https://event.rakuten.co.jp/card/pointday/', checked: '2026-10-30', what: '見本' }],
};
