// 読みもののひな形（`_` で始まるのでビルドは読まない）。このファイルを src/yomimono/<slug>.mjs にコピーして書く
// 書き方は docs/yomimono-neta.md の「書き方」。ファイル名と slug は同じにする（tests/yomimono.test.mjs が見る）
// 本文に出す数字は src/lib の計算か src/data のデータから作り、NUMS にまとめて tests/yomimono-<slug>.test.mjs で確かめる
import { section } from '../layout.mjs';
import { stair, band, zBox } from '../zukai.mjs'; // 図（使う部品だけ残す）

export const NUMS = {
  // 例：answer: touyu({ lph: 0.3, hours: 8, price: TOUYU_PRICE.can }).month,
};

export default {
  slug: 'hinagata', // ローマ字の短い名前。URL は /yomimono/<slug>/。一度公開したら変えない
  title: '問いか短い言い切りの文', // h1 と title の頭
  lead: '1行の説明（全角21字まで）',
  category: 'seikatsu', // src/site.mjs の CATEGORIES の id（seikatsu・gyoji・shigoto・furusato・point・fx）。手帳の見た目と見張る言葉が決まる
  tools: ['touyu-dai'], // つなぐ計算の slug（公開中のもの）。1つめが「自分の数字で確かめる」の先頭と共有画像
  published: '2026-01-01', // 日本時間の YYYY-MM-DD
  updated: '2026-01-01',
  description: '全角80〜120字・数字を入れる・ほかのページと同じにしない。', // 検索結果の説明文
  // h1・リードのあとに入る本文。節は section(id, 見出し, 中身)。id は ym- で始めない（棚の節の id）
  // 自分の文（.prose の文字。表・見出し・SVG はのぞく）は 1,200字以上（scripts/verify-dist.mjs が数える）
  body: `
${section('kotae', '見出し', `<p>答え（数字入り）を最初の1〜2文で。</p>`)}
${section('rei', '場面ごとの計算の例', `<p>数字と答えつきの例。</p>`)}
`,
  faqs: [
    // { q: '問い', a: '<p>答え（1〜2文）</p>' },
  ],
  sources: [
    // { name: '発行元のページの名前', url: 'https://…', checked: '2026-01-01', what: '何を確かめたか' },
  ],
};
