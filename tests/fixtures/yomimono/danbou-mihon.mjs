// テスト用の見本の読みもの（本番には出ない）。短い・よくある質問なしの見本（棚の点検が字数の足りない読みものを止めるかを確かめる）
import { section } from '../../../src/layout.mjs';

export default {
  slug: 'danbou-mihon',
  title: '見本の短い読みもの',
  lead: '字数の足りない見本です。',
  category: 'seikatsu',
  tools: ['touyu-dai'],
  published: '2026-11-01',
  updated: '2026-11-01',
  description: '見本の短い読みものです。灯油代の計算につなぐ見本で、本文が1,200字に足りないので、ビルドのあとの点検で止まることを確かめるために使います。よくある質問の節がない形も見ます。',
  body: `
${section('honbun', '短い本文', '<p>これは短い見本です。</p>')}
`,
  faqs: [],
  sources: [{ name: '資源エネルギー庁の価格調査', url: 'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html', checked: '2026-10-15', what: '灯油の値段' }],
};
